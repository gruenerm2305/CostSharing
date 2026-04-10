import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { Category } from './entities/category.entity';
import { ReceiptItem } from '../receipts/entities/receipt-item.entity';

export interface CategoryMappingResult {
  categoryId?: string;
  confidence: number;
  reasoning?: string;
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(ReceiptItem)
    private readonly receiptItemsRepository: Repository<ReceiptItem>,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.model = this.configService.get<string>('GEMINI_MODEL') || 'gemma-4-31b-it';
    this.baseUrl = this.configService.get<string>('GEMINI_BASE_URL') || 'https://generativelanguage.googleapis.com/v1beta';
  }

  async create(userId: string, name: string, color?: string, icon?: string): Promise<Category> {
    const category = this.categoriesRepository.create({
      userId,
      name,
      color,
      icon,
    });

    return this.categoriesRepository.save(category);
  }

  async findAllByUser(userId: string): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: { userId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id, userId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(id: string, userId: string, updates: Partial<Category>): Promise<Category> {
    const category = await this.findOne(id, userId);
    
    Object.assign(category, updates);
    
    return this.categoriesRepository.save(category);
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      const category = await this.findOne(id, userId);

      await this.receiptItemsRepository
        .createQueryBuilder()
        .update(ReceiptItem)
        .set({ categoryId: null })
        .where('categoryId = :categoryId', { categoryId: id })
        .execute();

      await this.categoriesRepository.remove(category);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Error deleting category ${id}: ${this.getErrorMessage(error)}`);
      throw new BadRequestException(
        'Kategorie konnte nicht geloescht werden. Bitte pruefe, ob sie noch verwendet wird und versuche es erneut.',
      );
    }
  }

  async mapItemToCategory(itemName: string, userId: string): Promise<CategoryMappingResult> {
    try {
      const userCategories = await this.findAllByUser(userId);

      if (userCategories.length === 0) {
        this.logger.log('No categories defined by user, returning uncategorized');
        return {
          confidence: 1,
          reasoning: 'No categories defined by user',
        };
      }

      const categoriesText = userCategories
        .map((cat) => `- ${cat.name} (ID: ${cat.id})`)
        .join('\n');

      const prompt = `Du bist ein Kategorisierungs-System. Antworte nur mit dem XML <mapping>...</mapping>, kein Markdown, kein Text davor oder danach.
    Der Benutzer hat folgende Kategorien definiert:
${categoriesText}

Ordne den folgenden Artikel einer passenden Kategorie zu:
Artikel: ${itemName}

Antworte AUSSCHLIESSLICH im folgenden XML-Format:

<mapping>
  <categoryId>{categoryId oder leer wenn keine Zuordnung}</categoryId>
  <confidence>0.0-1.0</confidence>
  <reasoning>Kurze Erklärung</reasoning>
</mapping>

Wenn keine Kategorie passt (confidence < 0.5), lasse categoryId leer.`;

      const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await axios.post(url, {
        systemInstruction: {
          parts: [
            {
              text: 'Gib ausschliesslich das XML <mapping>...</mapping> zurueck. Kein Markdown, keine Erklaerungen, kein Text davor oder danach.',
            },
          ],
        },
        contents: [
          { role: 'user', parts: [{ text: prompt }] },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          thinkingConfig: this.getThinkingConfig(),
        },
      });

      const xmlContent = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!xmlContent) {
        throw new BadRequestException('Empty response from Gemini');
      }

      const result = await this.parseCategoryMapping(xmlContent);

      if (result.categoryId) {
        const isValid = userCategories.some((cat) => cat.id === result.categoryId);
        
        if (!isValid) {
          this.logger.warn(`LLM suggested invalid category ID: ${result.categoryId}`);
          return {
            confidence: 0,
            reasoning: 'Invalid category suggested by AI',
          };
        }
      }

      if (result.confidence < 0.5) {
        return {
          confidence: result.confidence,
          reasoning: result.reasoning || 'Low confidence match',
        };
      }

      return result;
    } catch (error) {
      this.logger.error('Error mapping item to category:', this.getErrorMessage(error));
      return {
        confidence: 0,
        reasoning: 'Error during categorization',
      };
    }
  }

  private async parseCategoryMapping(xmlContent: string): Promise<CategoryMappingResult> {
    try {
      const xmlMatches = xmlContent.match(/<mapping>[\s\S]*?<\/mapping>/g);
      const cleanXml = xmlMatches && xmlMatches.length > 0
        ? xmlMatches[xmlMatches.length - 1]
        : xmlContent;

      const parsed = await parseStringPromise(cleanXml);
      const mapping = parsed.mapping;

      return {
        categoryId: mapping.categoryId?.[0] || undefined,
        confidence: Number.parseFloat(mapping.confidence?.[0] || '0'),
        reasoning: mapping.reasoning?.[0] || undefined,
      };
    } catch (error) {
      this.logger.error('Error parsing category mapping XML:', this.getErrorMessage(error));
      return {
        confidence: 0,
        reasoning: 'Failed to parse AI response',
      };
    }
  }

  private getThinkingConfig(): { thinkingLevel: 'minimal' } | undefined {
    if (this.model.startsWith('gemma-4')){
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
