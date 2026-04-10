import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

export interface OcrCategoryOption {
  id: string;
  name: string;
}

export interface OcrResult {
  date?: string;
  merchant?: string;
  categoryId?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount?: number;
  taxAmount?: number;
  rawXml: string;
  needsReview: boolean;
  extractionErrors?: string[];
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.model = this.configService.get<string>('GEMINI_MODEL') || 'gemma-4-31b-it';
    this.baseUrl = this.configService.get<string>('GEMINI_BASE_URL') || 'https://generativelanguage.googleapis.com/v1beta';
  }

  async processReceipt(
    imageBuffer: Buffer,
    mimeType: string,
    availableCategories: OcrCategoryOption[] = [],
  ): Promise<OcrResult> {
    try {
      const base64Image = imageBuffer.toString('base64');

      const prompt = this.getOcrPrompt(availableCategories);

      const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await axios.post(url, {
        systemInstruction: {
          parts: [
            {
              text: 'Gib ausschliesslich das XML <receipt>...</receipt> zurueck. Kein Markdown, keine Erklaerungen, keine Listen, kein Text davor oder danach.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
          thinkingConfig: this.getThinkingConfig(),
        },
      });

      const parts = response.data.candidates?.[0]?.content?.parts || [];
      const xmlContent = parts.map((part: { text?: string }) => part.text || '').join('');
      if (!xmlContent || !xmlContent.includes('<receipt>')) {
        throw new BadRequestException('Gemini response missing <receipt> XML');
      }

      const ocrResult = await this.parseXmlResponse(xmlContent);
      const categoryId = this.getValidatedCategoryId(ocrResult.categoryId, availableCategories);
      const hasInvalidCategory = Boolean(ocrResult.categoryId && !categoryId);

      if (hasInvalidCategory) {
        this.logger.warn(`OCR returned invalid categoryId: ${ocrResult.categoryId}`);
      }

      const needsReview = this.performReviewCheck(ocrResult, hasInvalidCategory);

      return {
        items: ocrResult.items || [],
        ...ocrResult,
        categoryId,
        rawXml: xmlContent,
        needsReview,
      };
    } catch (error) {
      this.logger.error('Error processing receipt:', this.getErrorMessage(error));
      throw new BadRequestException('Failed to process receipt image');
    }
  }

  private async parseXmlResponse(xmlContent: string): Promise<Partial<OcrResult>> {
    try {
      let cleanedXml = xmlContent.replace(/\\n/g, '\n');
      cleanedXml = cleanedXml.replace(/\\"/g, '"');
      cleanedXml = cleanedXml.trim();

      cleanedXml = cleanedXml.replace(/&(?![a-zA-Z]+;|#\d+;)/g, '&amp;');

      cleanedXml = cleanedXml.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
      
      this.logger.debug('Cleaned XML for parsing:', cleanedXml.substring(0, 200));

      const xmlMatches = cleanedXml.match(/<receipt>[\s\S]*?<\/receipt>/g);
      const finalXml = xmlMatches && xmlMatches.length > 0
        ? xmlMatches[xmlMatches.length - 1]
        : cleanedXml;

      this.logger.debug('Parsing XML...');
      const parsed = await parseStringPromise(finalXml);
      const receipt = parsed.receipt;

      if (!receipt) {
        throw new Error('No receipt element found in XML');
      }

      let dateStr = receipt.date?.[0];
      if (!dateStr || !this.isValidDate(dateStr)) {
        this.logger.warn(`Invalid date format received: ${dateStr}, using today's date`);
        dateStr = new Date().toISOString().split('T')[0];
      }

      const items = receipt.items?.[0]?.item?.map((item: any) => {
        const parsedItem = {
          name: item.name?.[0] || '',
          quantity: Number.parseFloat(item.quantity?.[0] || '1'),
          unitPrice: Number.parseFloat(item.unitPrice?.[0] || '0'),
          totalPrice: Number.parseFloat(item.totalPrice?.[0] || '0'),
        };
        this.logger.debug(`Parsed item: ${parsedItem.name} - ${parsedItem.quantity} x ${parsedItem.unitPrice}`);
        return parsedItem;
      }) || [];

      this.logger.log(`Successfully parsed ${items.length} items from XML`);

      const result = {
        date: dateStr,
        merchant: receipt.merchant?.[0] || 'Unknown',
        categoryId: receipt.categoryId?.[0]?.trim() || undefined,
        items,
        totalAmount: Number.parseFloat(receipt.totalAmount?.[0] || '0'),
        taxAmount: receipt.taxAmount?.[0] ? Number.parseFloat(receipt.taxAmount[0]) : undefined,
      };

      this.logger.debug(`OCR Result: ${result.items.length} items, total: ${result.totalAmount}`);

      return result;
    } catch (error) {
      this.logger.error('Error parsing XML:', this.getErrorMessage(error));
      this.logger.error('XML content:', xmlContent);
      throw new BadRequestException('Failed to parse OCR response');
    }
  }

  private isValidDate(dateStr: string): boolean {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) return false;
    
    const date = new Date(dateStr);
    return date instanceof Date && !Number.isNaN(date.getTime());
  }

  private performReviewCheck(result: Partial<OcrResult>, hasInvalidCategory = false): boolean {
    if (hasInvalidCategory) {
      return true;
    }

    if (!result.date || !result.merchant || !result.totalAmount) {
      return true;
    }

    return false;
  }

  private getOcrPrompt(availableCategories: OcrCategoryOption[]): string {
    const categoriesSection = this.getCategoriesPromptSection(availableCategories);

    return `
    Du bist ein OCR-System fuer Kassenbelege. Antworte NUR mit dem XML-Block <receipt>...</receipt>.
    Kein Markdown, keine Erklaerungen, keine Listen, kein Text davor oder danach.

EXTRAKTIONSAUFGABE:
Extrahiere die folgenden Informationen aus dem Belegbild:

1. DATUM (erforderlich): Das Kaufdatum im Format YYYY-MM-DD (z.B. 2024-01-15)
2. HÄNDLER (erforderlich): Name des Geschäfts oder Unternehmens
3. KATEGORIE-ID (optional): Genau eine Kategorie-ID aus der bereitgestellten Liste oder leer
4. ARTIKEL (erforderlich): Vollständige Liste aller Artikel mit:
   - Artikelname
   - Menge (numerisch, z.B. 1.0 oder 2.5)
   - Einzelpreis (in Euro, z.B. 9.99)
   - Gesamtpreis pro Artikel (Menge × Einzelpreis)
5. GESAMTSUMME (erforderlich): Die Endsumme des Belegs
6. MEHRWERTSTEUER (optional): Der Steuerbetrag, falls angegeben

VERFUEGBARE KATEGORIEN:
${categoriesSection}

RUECKGABEFORMAT:
Gib NUR das reine XML zurueck. KEIN Markdown, KEINE Code-Bloecke, KEINE zusaetzlichen Erklaerungen.
Die Antwort muss mit <receipt> beginnen und mit </receipt> enden.

XML-STRUKTUR (genau so verwenden):
<receipt>
  <date>YYYY-MM-DD</date>
  <merchant>Genauer Händlername</merchant>
  <categoryId>UUID aus Liste oder leer</categoryId>
  <items>
    <item>
      <name>Artikelname</name>
      <quantity>1.0</quantity>
      <unitPrice>9.99</unitPrice>
      <totalPrice>9.99</totalPrice>
    </item>
  </items>
  <totalAmount>9.99</totalAmount>
  <taxAmount>1.59</taxAmount>
</receipt>

KRITISCHE REGELN:
1. Beginne deine Antwort direkt mit <receipt> - KEIN Text davor
2. DATUM MUSS im Format YYYY-MM-DD sein (z.B. 2024-12-08)
3. Alle Zahlen mit Punkt als Dezimaltrennzeichen (9.99 nicht 9,99)
4. categoryId darf NUR eine ID aus VERFUEGBARE KATEGORIEN sein, sonst leer lassen
5. Sonderzeichen als XML-Entities: & wird zu &amp; , < wird zu &lt; , > wird zu &gt;
6. KEINE Markdown Code-Bloecke (kein \`\`\`xml)
7. KEINE Escape-Sequenzen wie \\n - nutze normale Zeilenumbrueche
8. Ende deine Antwort mit </receipt> - KEIN Text danach
9. Sollte kein Datum erkannbar sein fülle -- ein.

FALSCH: \`\`\`xml<receipt>...</receipt>\`\`\`
RICHTIG: <receipt>...</receipt>`;
  }

  private getCategoriesPromptSection(availableCategories: OcrCategoryOption[]): string {
    if (availableCategories.length === 0) {
      return '- Keine Kategorien vorhanden. categoryId leer lassen.';
    }

    return availableCategories
      .map((category) => `- ${category.id}: ${category.name}`)
      .join('\n');
  }

  private getValidatedCategoryId(
    categoryId: string | undefined,
    availableCategories: OcrCategoryOption[],
  ): string | undefined {
    const trimmedCategoryId = categoryId?.trim();
    if (!trimmedCategoryId) {
      return undefined;
    }

    const validCategoryIds = new Set(availableCategories.map((category) => category.id));
    if (!validCategoryIds.has(trimmedCategoryId)) {
      return undefined;
    }

    return trimmedCategoryId;
  }

  private getThinkingConfig(): { thinkingLevel: 'minimal' } | undefined {
    if (this.model.startsWith('gemma-4')) {
      return { thinkingLevel: 'minimal' };
    }

    return undefined;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
