import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Receipt } from './entities/receipt.entity';
import { ReceiptItem } from './entities/receipt-item.entity';
import { ReceiptParticipant } from '../splitting/entities/receipt-participant.entity';
import { OcrService } from '../ocr/ocr.service';
import { ValidationService } from '../validation/validation.service';
import { CategoriesService } from '../categories/categories.service';
import { ReceiptClaimsService } from './receipt-claims.service';
import { buildReceiptStatistics } from './receipts-statistics';
import * as fs from 'node:fs/promises';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    @InjectRepository(Receipt)
    private readonly receiptsRepository: Repository<Receipt>,
    @InjectRepository(ReceiptItem)
    private readonly receiptItemsRepository: Repository<ReceiptItem>,
    @InjectRepository(ReceiptParticipant)
    private readonly participantsRepository: Repository<ReceiptParticipant>,
    private readonly ocrService: OcrService,
    private readonly validationService: ValidationService,
    private readonly categoriesService: CategoriesService,
    private readonly receiptClaimsService: ReceiptClaimsService,
  ) {}

  async processReceiptImage(userId: string, file: Express.Multer.File): Promise<Receipt> {
    try {
      this.logger.log(`Processing receipt image for user ${userId}`);

      const imageBuffer = await fs.readFile(file.path);
      const userCategories = await this.categoriesService.findAllByUser(userId);

      const ocrResult = await this.ocrService.processReceipt(
        imageBuffer,
        file.mimetype,
        userCategories.map((category) => ({ id: category.id, name: category.name })),
      );

      this.logger.debug(`OCR Result - Items: ${ocrResult.items?.length || 0}`);

      if (!ocrResult.items || ocrResult.items.length === 0) {
        this.logger.warn('OCR returned no items. Using fallback empty receipt.');
      }

      const receipt = this.receiptsRepository.create({
        userId,
        date: ocrResult.date ? new Date(ocrResult.date) : new Date(),
        merchant: ocrResult.merchant || 'Unknown Merchant',
        categoryId: ocrResult.categoryId,
        totalAmount: ocrResult.totalAmount || 0,
        taxAmount: ocrResult.taxAmount,
        imageUrl: file.path,
        rawXml: ocrResult.rawXml,
      });

      const savedReceipt = await this.receiptsRepository.save(receipt);
      this.logger.log(`Receipt saved with ID: ${savedReceipt.id}`);

      let items = [];
      if (ocrResult.items && ocrResult.items.length > 0) {
        items = ocrResult.items.map((item) =>
          this.receiptItemsRepository.create({
            receiptId: savedReceipt.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            needsReview: false,
          }),
        );

        await this.receiptItemsRepository.save(items);
        this.logger.log(`Created ${items.length} items for receipt ${savedReceipt.id}`);
      }

      const validationResult = this.validationService.validateReceipt(savedReceipt, items);

      if (!validationResult.isValid) {
        savedReceipt.validationErrors = validationResult.errors;
        await this.receiptsRepository.save(savedReceipt);
        this.logger.log(`Receipt marked for review: ${validationResult.errors.join(', ')}`);
      }

      const finalReceipt = await this.findOne(savedReceipt.id, userId);
      this.logger.log(`Returning receipt with ${finalReceipt.items?.length || 0} items`);
      return finalReceipt;
    } catch (error) {
      this.logger.error('Error processing receipt:', this.getErrorMessage(error));
      throw error;
    }
  }

  async createManual(
    userId: string,
    data: {
      date: Date;
      merchant: string;
      categoryId?: string;
      totalAmount: number;
      items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        categoryId?: string;
      }>;
    },
  ): Promise<Receipt> {
    const receipt = this.receiptsRepository.create({
      userId,
      date: data.date,
      merchant: data.merchant,
      categoryId: data.categoryId,
      totalAmount: data.totalAmount,
    });

    const savedReceipt = await this.receiptsRepository.save(receipt);

    const items = data.items.map((item) =>
      this.receiptItemsRepository.create({
        receiptId: savedReceipt.id,
        ...item,
      }),
    );

    await this.receiptItemsRepository.save(items);

    return this.findOne(savedReceipt.id, userId);
  }

  async findAll(userId: string): Promise<Receipt[]> {
    const ownReceipts = await this.receiptsRepository.find({
      where: { userId },
      relations: ['items'],
      order: { date: 'DESC' },
    });

    const participations = await this.participantsRepository.find({
      where: { userId },
      select: ['receiptId']
    });

    let sharedReceipts: Receipt[] = [];
    if (participations.length > 0) {
      const receiptIds = participations.map(p => p.receiptId);
      sharedReceipts = await this.receiptsRepository.find({
        where: { id: In(receiptIds) },
        relations: ['items'],
        order: { date: 'DESC' },
      });
    }

    const allReceipts = [...ownReceipts];
    for (const sharedReceipt of sharedReceipts) {
      if (!allReceipts.some(r => r.id === sharedReceipt.id)) {
        allReceipts.push(sharedReceipt);
      }
    }

    await this.receiptClaimsService.addClaimsToReceipts(allReceipts, userId);

    return allReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async findOne(id: string, userId: string): Promise<Receipt> {
    const receipt = await this.receiptsRepository.findOne({
      where: { id, userId },
      relations: ['items', 'items.category'],
    });

    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    await this.receiptClaimsService.addClaimsToReceipt(receipt, userId);

    return receipt;
  }

  async update(
    id: string,
    userId: string,
    updates: {
      date?: Date;
      merchant?: string;
      categoryId?: string;
      totalAmount?: number;
      taxAmount?: number;
      items?: Array<{
        id?: string;
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        categoryId?: string;
      }>;
    },
  ): Promise<Receipt> {
    const receipt = await this.findOne(id, userId);

    if (updates.date) receipt.date = updates.date;
    if (updates.merchant) receipt.merchant = updates.merchant;
    if (updates.categoryId !== undefined) receipt.categoryId = updates.categoryId;
    if (updates.totalAmount !== undefined) receipt.totalAmount = updates.totalAmount;
    if (updates.taxAmount !== undefined) receipt.taxAmount = updates.taxAmount;

    await this.receiptsRepository.save(receipt);

    if (updates.items) {
      await this.receiptItemsRepository.delete({ receiptId: id });

      const newItems = updates.items.map((item) =>
        this.receiptItemsRepository.create({
          receiptId: id,
          ...item,
        }),
      );

      await this.receiptItemsRepository.save(newItems);
    }

    const updatedReceipt = await this.findOne(id, userId);
    const validationResult = this.validationService.validateReceipt(
      updatedReceipt,
      updatedReceipt.items,
    );

    if (!validationResult.isValid) {
      updatedReceipt.validationErrors = validationResult.errors;
      await this.receiptsRepository.save(updatedReceipt);
    } else {
      updatedReceipt.validationErrors = [];
      await this.receiptsRepository.save(updatedReceipt);
    }

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const receipt = await this.findOne(id, userId);
    
    if (receipt.imageUrl) {
      try {
        await fs.unlink(receipt.imageUrl);
      } catch (error) {
        this.logger.warn(`Failed to delete image file: ${receipt.imageUrl}`);
      }
    }

    await this.receiptsRepository.remove(receipt);
  }

  async getShareLink(id: string, userId: string): Promise<{ shareToken: string; shareUrl: string }> {
    const receipt = await this.findOne(id, userId);

    if (!receipt.shareToken) {
      receipt.shareToken = randomUUID();
      await this.receiptsRepository.save(receipt);
    }

    const shareUrl = `${process.env.FRONTEND_URL}/receipt/splitting/shared/${receipt.shareToken}`;
    return { shareToken: receipt.shareToken, shareUrl };
  }

  async getReceiptByShareToken(shareToken: string) {
    const receipt = await this.receiptsRepository.findOne({
      where: { shareToken },
      relations: ['items'],
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    const claims = await this.receiptClaimsService.getClaimsForReceipt(receipt.id);

    return {
      id: receipt.id,
      merchant: receipt.merchant,
      date: receipt.date,
      totalAmount: receipt.totalAmount,
      items: receipt.items,
      sharedWith: receipt.sharedWith || [],
      claims: claims,
    };
  }

  async getStatistics(userId: string, startDate?: string, endDate?: string) {
    const query = this.receiptsRepository.createQueryBuilder('receipt')
      .leftJoinAndSelect('receipt.items', 'items')
      .leftJoinAndSelect('items.category', 'category')
      .where('receipt.userId = :userId', { userId });

    if (startDate) {
      query.andWhere('receipt.date >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('receipt.date <= :endDate', { endDate });
    }

    const receipts = await query.getMany();

    return buildReceiptStatistics(receipts);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
