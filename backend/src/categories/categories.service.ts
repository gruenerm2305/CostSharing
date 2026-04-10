import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { ReceiptItem } from '../receipts/entities/receipt-item.entity';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(ReceiptItem)
    private readonly receiptItemsRepository: Repository<ReceiptItem>,
  ) {
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

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return JSON.stringify(error);
  }
}
