import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Receipt } from './entities/receipt.entity';
import { ReceiptItem } from './entities/receipt-item.entity';
import { ReceiptParticipant } from '../splitting/entities/receipt-participant.entity';
import { ItemClaim } from '../splitting/entities/item-claim.entity';
import { OcrService } from '../ocr/ocr.service';
import { ValidationService } from '../validation/validation.service';
import { CategoriesService } from '../categories/categories.service';
import { ReceiptClaimsService } from './receipt-claims.service';
import { buildReceiptStatistics } from './receipts-statistics';
import * as fs from 'node:fs/promises';
import AdmZip from 'adm-zip';

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
    @InjectRepository(ItemClaim)
    private readonly itemClaimsRepository: Repository<ItemClaim>,
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
      relations: ['items', 'category'],
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
    const participations = await this.participantsRepository.find({
      where: { userId },
      select: ['receiptId'],
    });

    const sharedReceiptIds = participations.map((participation) => participation.receiptId);

    const query = this.receiptsRepository.createQueryBuilder('receipt')
      .leftJoinAndSelect('receipt.items', 'items')
      .leftJoinAndSelect('receipt.category', 'category')
      .where(
        new Brackets((qb) => {
          qb.where('receipt.userId = :userId', { userId });

          if (sharedReceiptIds.length > 0) {
            qb.orWhere('receipt.id IN (:...sharedReceiptIds)', { sharedReceiptIds });
          }
        }),
      );

    if (startDate) {
      query.andWhere('receipt.date >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('receipt.date <= :endDate', { endDate });
    }

    const receipts = await query.getMany();
    const receiptIds = receipts.map((receipt) => receipt.id);
    const claims = receiptIds.length > 0
      ? await this.itemClaimsRepository.find({
          where: { receiptId: In(receiptIds) },
          select: ['receiptId', 'itemId', 'claimerUserId', 'amount'],
        })
      : [];

    const userScopedReceipts = this.toUserScopedReceipts(receipts, userId, claims);

    return buildReceiptStatistics(userScopedReceipts);
  }

  private toUserScopedReceipts(receipts: Receipt[], userId: string, claims: ItemClaim[]): Receipt[] {
    const claimsByReceiptItem = new Map<string, ItemClaim[]>();
    const claimsByReceipt = new Map<string, ItemClaim[]>();

    claims.forEach((claim) => {
      const itemKey = `${claim.receiptId}:${claim.itemId}`;
      const byItem = claimsByReceiptItem.get(itemKey) || [];
      byItem.push(claim);
      claimsByReceiptItem.set(itemKey, byItem);

      const byReceipt = claimsByReceipt.get(claim.receiptId) || [];
      byReceipt.push(claim);
      claimsByReceipt.set(claim.receiptId, byReceipt);
    });

    return receipts
      .map((receipt) => {
        const receiptClaims = claimsByReceipt.get(receipt.id) || [];

        const otherClaimsOnReceipt = receiptClaims
          .filter((claim) => claim.claimerUserId !== userId)
          .reduce((sum, claim) => sum + (Number(claim.amount) || 0), 0);

        const myClaimsOnReceipt = receiptClaims
          .filter((claim) => claim.claimerUserId === userId)
          .reduce((sum, claim) => sum + (Number(claim.amount) || 0), 0);

        const myTotalAmount = receipt.userId === userId
          ? Math.max((Number(receipt.totalAmount) || 0) - otherClaimsOnReceipt, 0)
          : Math.max(myClaimsOnReceipt, 0);

        const userItems = (receipt.items || []).map((item: any) => {
          const itemAmount = Number(item.totalPrice) || 0;
          const itemKey = `${receipt.id}:${item.id}`;
          const itemClaims = claimsByReceiptItem.get(itemKey) || [];

          const otherClaimsOnItem = itemClaims
            .filter((claim) => claim.claimerUserId !== userId)
            .reduce((sum, claim) => sum + (Number(claim.amount) || 0), 0);

          const myClaimsOnItem = itemClaims
            .filter((claim) => claim.claimerUserId === userId)
            .reduce((sum, claim) => sum + (Number(claim.amount) || 0), 0);

          const myItemAmount = receipt.userId === userId
            ? Math.max(itemAmount - otherClaimsOnItem, 0)
            : Math.max(myClaimsOnItem, 0);

          return {
            ...item,
            totalPrice: this.roundMoney(myItemAmount),
          };
        });

        return {
          ...receipt,
          totalAmount: this.roundMoney(myTotalAmount),
          items: userItems,
        } as Receipt;
      })
      .filter((receipt) => (Number(receipt.totalAmount) || 0) > 0);
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  async exportReceiptsZip(userId: string): Promise<Buffer> {
    const receipts = await this.receiptsRepository.find({
      where: { userId },
      relations: ['items', 'category'],
      order: { date: 'DESC' },
    });

    const receiptsWithItems = receipts.filter((receipt) => receipt.items && receipt.items.length > 0);

    const zip = new AdmZip();

    receiptsWithItems.forEach((receipt) => {
      const csvContent = this.buildReceiptCsv(receipt);
      const dateStr = this.formatDate(receipt.date);
      const fileName = `receipt-${dateStr}-${receipt.id}.csv`;
      zip.addFile(fileName, Buffer.from(csvContent, 'utf8'));
    });

    return zip.toBuffer();
  }

  private buildReceiptCsv(receipt: Receipt): string {
    const header = [
      'receiptId',
      'receiptDate',
      'merchant',
      'itemName',
      'quantity',
      'unitPrice',
      'totalPrice',
      'categoryName',
    ];

    const rows = [header.join(';')];
    const dateStr = this.formatDate(receipt.date);

    receipt.items.forEach((item) => {
      const row = [
        receipt.id,
        dateStr,
        receipt.merchant || '',
        item.name || '',
        this.formatNumber(item.quantity, 3),
        this.formatNumber(item.unitPrice, 2),
        this.formatNumber(item.totalPrice, 2),
        receipt.category?.name || 'Unkategorisiert',
      ].map(this.escapeCsvValue);

      rows.push(row.join(';'));
    });

    return rows.join('\n');
  }

  private formatDate(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString().split('T')[0];
  }

  private formatNumber(value: number | string | null | undefined, decimals: number): string {
    if (value === null || value === undefined) {
      return '';
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return '';
    }

    return numeric.toFixed(decimals).replace('.', ',');
  }

  private escapeCsvValue(value: string): string {
    const needsQuotes = /[;"\n\r]/.test(value);
    if (!needsQuotes) {
      return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
