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
    this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    this.model = this.configService.get<string>('OPENROUTER_MODEL') || 'anthropic/claude-3-5-sonnet-20241022';
    this.baseUrl = this.configService.get<string>('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1';
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
          confidence: 1.0,
          reasoning: 'No categories defined by user',
        };
      }

      const categoriesText = userCategories
        .map((cat) => `- ${cat.name} (ID: ${cat.id})`)
        .join('\n');

      const prompt = `Du bist ein Kategorisierungs-System. Der Benutzer hat folgende Kategorien definiert:
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

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 500,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Cost-Tracking App',
          },
        },
      );

      const xmlContent = response.data.choices[0].message.content;

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
      const xmlRegex = /<mapping>[\s\S]*<\/mapping>/;
      const xmlMatch = xmlRegex.exec(xmlContent);
      const cleanXml = xmlMatch ? xmlMatch[0] : xmlContent;

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

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
