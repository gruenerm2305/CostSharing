import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemClaim } from '../splitting/entities/item-claim.entity';
import { Receipt } from './entities/receipt.entity';

@Injectable()
export class ReceiptClaimsService {
  constructor(
    @InjectRepository(ItemClaim)
    private readonly itemClaimsRepository: Repository<ItemClaim>,
  ) {}

  async addClaimsToReceipts(receipts: Receipt[], userId: string): Promise<void> {
    for (const receipt of receipts) {
      await this.addClaimsToReceipt(receipt, userId);
    }
  }

  async addClaimsToReceipt(receipt: Receipt, userId: string): Promise<void> {
    const claims = await this.itemClaimsRepository.find({
      where: { receiptId: receipt.id, claimerUserId: userId },
    });

    const allClaims = await this.itemClaimsRepository.find({
      where: { receiptId: receipt.id },
    });

    const otherClaimsTotal = allClaims
      .filter((c) => c.claimerUserId !== userId)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    let myTotal = 0;
    if (receipt.userId === userId) {
      myTotal = Number(receipt.totalAmount) - otherClaimsTotal;
    } else {
      myTotal = claims.reduce((sum, claim) => sum + Number(claim.amount), 0);
    }

    (receipt as any).myTotal = myTotal;
    (receipt as any).isParticipant = receipt.userId !== userId;
    (receipt as any).hasAnyClaims = allClaims.length > 0;
    (receipt as any).isShared =
      allClaims.length > 0 || (receipt as any).sharedWith?.length > 0 || !!receipt.shareToken;

    if (receipt.userId === userId && otherClaimsTotal > 0) {
      (receipt as any).showMyTotal = true;
    }
  }

  async getClaimsForReceipt(receiptId: string): Promise<ItemClaim[]> {
    return this.itemClaimsRepository.find({ where: { receiptId } });
  }
}
