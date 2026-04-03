import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptItem } from '../receipts/entities/receipt-item.entity';
import { UsersService } from '../users/users.service';
import { ReceiptParticipant } from './entities/receipt-participant.entity';
import { ItemClaim } from './entities/item-claim.entity';
import { ClaimItemDto } from './dto/claim-item.dto';
import {
  calculateAllocation,
  calculateOwnerShare,
  calculateRemaining,
} from './splitting-calculations';
import { buildSplitSummary } from './splitting-summary';

@Injectable()
export class SplittingService {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptsRepository: Repository<Receipt>,
    @InjectRepository(ReceiptItem)
    private readonly receiptItemsRepository: Repository<ReceiptItem>,
    @InjectRepository(ReceiptParticipant)
    private readonly participantsRepository: Repository<ReceiptParticipant>,
    @InjectRepository(ItemClaim)
    private readonly itemClaimsRepository: Repository<ItemClaim>,
    private readonly usersService: UsersService,
  ) {}

  async inviteParticipant(receiptId: string, requesterId: string, userId: string) {
    const receipt = await this.receiptsRepository.findOne({ where: { id: receiptId } });
    if (!receipt) throw new NotFoundException('Receipt not found');
    if (receipt.userId !== requesterId) throw new ForbiddenException('Only owner can invite');

    await this.ensureOwnerParticipant(receiptId, requesterId);

    const invitee = await this.usersService.findById(userId);
    if (!invitee) throw new NotFoundException('User not found');

    const existing = await this.participantsRepository.findOne({ where: { receiptId, userId } });
    if (existing) return existing;

    const participant = this.participantsRepository.create({
      receiptId,
      userId,
      role: 'participant',
    });
    return this.participantsRepository.save(participant);
  }

  async claimItem(
    receiptId: string,
    itemId: string,
    userId: string,
    dto: ClaimItemDto,
  ) {
    const receipt = await this.receiptsRepository.findOne({ where: { id: receiptId } });
    if (!receipt) throw new NotFoundException('Receipt not found');

    await this.ensureOwnerParticipant(receiptId, receipt.userId);

    const isOwner = receipt.userId === userId;
    let participant = await this.participantsRepository.findOne({ where: { receiptId, userId } });
    
    if (!isOwner && !participant) {
      participant = this.participantsRepository.create({
        receiptId,
        userId,
        role: 'participant',
      });
      await this.participantsRepository.save(participant);
    }

    const item = await this.receiptItemsRepository.findOne({ where: { id: itemId, receiptId } });
    if (!item) throw new NotFoundException('Item not found');

    const existingClaims = await this.itemClaimsRepository.find({ where: { itemId } });
    
    const otherClaims = existingClaims.filter(c => c.claimerUserId !== userId);
    
    const totalClaimedAmount = otherClaims.reduce(
      (sum, c) => sum + Number(c.amount),
      0,
    );

    const allocation = calculateAllocation(item, dto, totalClaimedAmount);

    let claim = await this.itemClaimsRepository.findOne({ where: { itemId, claimerUserId: userId } });
    if (claim) {
      claim.claimedQuantity = allocation.claimedQuantity;
      claim.claimedPercentage = allocation.claimedPercentage;
      claim.amount = allocation.amount;
    } else {
      claim = this.itemClaimsRepository.create({
        receiptId,
        itemId,
        claimerUserId: userId,
        ...allocation,
      });
    }

    const saved = await this.itemClaimsRepository.save(claim);

    const receiptClaims = await this.itemClaimsRepository.find({ where: { receiptId } });
    const ownerPay = calculateOwnerShare(receipt.totalAmount, receiptClaims);
    const updatedClaims = await this.itemClaimsRepository.find({ where: { itemId } });
    const finalClaimedAmount = updatedClaims.reduce((sum, c) => sum + Number(c.amount), 0);

    const { remainingQuantity, remainingPercentage } = calculateRemaining(
      item,
      finalClaimedAmount,
    );

    return { claim: saved, ownerPay, remainingQuantity, remainingPercentage };
  }

  private async ensureOwnerParticipant(receiptId: string, ownerId: string) {
    const existingOwner = await this.participantsRepository.findOne({ where: { receiptId, userId: ownerId } });
    if (!existingOwner) {
      const ownerParticipant = this.participantsRepository.create({
        receiptId,
        userId: ownerId,
        role: 'owner',
      });
      await this.participantsRepository.save(ownerParticipant);
    }
  }


  async getClaims(receiptId: string, userId: string) {
    const receipt = await this.receiptsRepository.findOne({ where: { id: receiptId } });
    if (!receipt) throw new NotFoundException('Receipt not found');

    const isOwner = receipt.userId === userId;
    const participant = await this.participantsRepository.findOne({ where: { receiptId, userId } });
    if (!isOwner && !participant) {
      throw new ForbiddenException('Not authorized to view this receipt');
    }

    const claims = await this.itemClaimsRepository.find({ 
      where: { receiptId },
      order: { createdAt: 'ASC' }
    });

    return claims;
  }

  async getSummary(receiptId: string, userId: string) {
    const receipt = await this.receiptsRepository.findOne({ 
      where: { id: receiptId },
      relations: ['items']
    });
    if (!receipt) throw new NotFoundException('Receipt not found');

    const isOwner = receipt.userId === userId;
    const participant = await this.participantsRepository.findOne({ where: { receiptId, userId } });
    if (!isOwner && !participant) {
      throw new ForbiddenException('Not authorized to view this receipt');
    }

    const claims = await this.itemClaimsRepository.find({ where: { receiptId } });
    const participants = await this.participantsRepository.find({ where: { receiptId } });

    return buildSplitSummary(receipt, claims, participants);
  }

  async removeClaim(receiptId: string, itemId: string, userId: string) {
    const claim = await this.itemClaimsRepository.findOne({
      where: { receiptId, itemId, claimerUserId: userId }
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    await this.itemClaimsRepository.remove(claim);
    return { message: 'Claim removed successfully' };
  }

  async revokeShare(receiptId: string, userId: string) {
    const receipt = await this.receiptsRepository.findOne({ where: { id: receiptId } });
    if (!receipt) throw new NotFoundException('Receipt not found');
    if (receipt.userId !== userId) throw new ForbiddenException('Only owner can revoke share');

    await this.itemClaimsRepository.delete({ receiptId });

    await this.participantsRepository.delete({ receiptId });

    receipt.shareToken = null;
    await this.receiptsRepository.save(receipt);
    
    return { message: 'Receipt is now private' };
  }

  async leaveReceipt(receiptId: string, userId: string) {
    const participant = await this.participantsRepository.findOne({ where: { receiptId, userId } });
    if (!participant) {
      throw new NotFoundException('Not a participant of this receipt');
    }
    
    const receipt = await this.receiptsRepository.findOne({ where: { id: receiptId } });
    if (receipt && receipt.userId === userId) {
        throw new ForbiddenException('Owner cannot leave receipt. Use revoke share or delete receipt.');
    }

    await this.itemClaimsRepository.delete({ receiptId, claimerUserId: userId });

    await this.receiptItemsRepository.update(
      { receiptId, assignedToUserId: userId },
      { assignedToUserId: null, sharedQuantity: null, sharedPercentage: null }
    );

    await this.participantsRepository.remove(participant);

    return { message: 'Successfully left the receipt' };
  }
}
