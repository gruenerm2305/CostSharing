import { BadRequestException, ConflictException } from '@nestjs/common';
import { ReceiptItem } from '../receipts/entities/receipt-item.entity';
import { ClaimItemDto } from './dto/claim-item.dto';
import { ItemClaim } from './entities/item-claim.entity';

export function calculateAllocation(
  item: ReceiptItem,
  dto: ClaimItemDto,
  totalClaimedAmount: number,
) {
  let hasQuantity = dto.claimedQuantity !== undefined && dto.claimedQuantity !== null;
  let hasPercentage = dto.claimedPercentage !== undefined && dto.claimedPercentage !== null;

  if (
    hasQuantity &&
    Number(dto.claimedQuantity) === 0 &&
    hasPercentage &&
    Number(dto.claimedPercentage) > 0
  ) {
    hasQuantity = false;
  }

  if (!hasQuantity && !hasPercentage) {
    throw new BadRequestException('claimed_quantity or claimed_percentage required');
  }

  const availableAmount = Number(item.totalPrice) - totalClaimedAmount;

  if (hasQuantity) {
    const qty = Number(dto.claimedQuantity);
    if (qty <= 0) throw new BadRequestException('claimed_quantity must be > 0');

    const requestedAmount = (qty / Number(item.quantity)) * Number(item.totalPrice);

    if (requestedAmount > availableAmount + 0.01) {
      throw new ConflictException('Claimed amount exceeds available amount');
    }

    return { claimedQuantity: qty, claimedPercentage: null, amount: requestedAmount };
  }

  const pct = Number(dto.claimedPercentage);
  if (pct <= 0 || pct > 1) {
    throw new BadRequestException('claimed_percentage must be between 0 and 1');
  }

  const requestedAmount = pct * Number(item.totalPrice);

  if (requestedAmount > availableAmount + 0.01) {
    throw new ConflictException('Claimed percentage exceeds available amount');
  }

  return { claimedQuantity: null, claimedPercentage: pct, amount: requestedAmount };
}

export function calculateOwnerShare(totalAmount: number, claims: ItemClaim[]): number {
  const totalClaims = claims.reduce((sum, c) => sum + Number(c.amount), 0);
  const ownerPay = Number(totalAmount) - totalClaims;
  return ownerPay < 0 ? 0 : Number(ownerPay.toFixed(2));
}

export function calculateRemaining(
  item: ReceiptItem,
  totalClaimedAmount: number,
) {
  const remainingAmount = Number(item.totalPrice) - totalClaimedAmount;
  const remainingQuantity = (remainingAmount / Number(item.totalPrice)) * Number(item.quantity);
  const remainingPercentage = remainingAmount / Number(item.totalPrice);

  return { remainingQuantity, remainingPercentage };
}
