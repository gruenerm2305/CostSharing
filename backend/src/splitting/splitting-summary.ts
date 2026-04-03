import { Receipt } from '../receipts/entities/receipt.entity';
import { ItemClaim } from './entities/item-claim.entity';
import { ReceiptParticipant } from './entities/receipt-participant.entity';

export function buildSplitSummary(
  receipt: Receipt,
  claims: ItemClaim[],
  participants: ReceiptParticipant[],
) {
  const userTotals = new Map<string, number>();
  const userItems = new Map<string, any[]>();

  for (const claim of claims) {
    const current = userTotals.get(claim.claimerUserId) || 0;
    userTotals.set(claim.claimerUserId, current + Number(claim.amount));

    const items = userItems.get(claim.claimerUserId) || [];
    const item = receipt.items.find((i) => i.id === claim.itemId);
    if (item) {
      items.push({
        itemId: claim.itemId,
        itemName: item.name,
        amount: claim.amount,
        claimedQuantity: claim.claimedQuantity,
        claimedPercentage: claim.claimedPercentage,
      });
    }
    userItems.set(claim.claimerUserId, items);
  }

  const totalClaimed = Array.from(userTotals.values()).reduce((sum, val) => sum + val, 0);
  const ownerAmount = Number(receipt.totalAmount) - totalClaimed;

  const summary = participants.map((p) => ({
    userId: p.userId,
    role: p.role,
    total: userTotals.get(p.userId) || 0,
    items: userItems.get(p.userId) || [],
  }));

  const ownerInSummary = summary.find((s) => s.userId === receipt.userId);
  if (ownerInSummary) {
    ownerInSummary.total = ownerAmount;
  } else {
    summary.push({
      userId: receipt.userId,
      role: 'owner',
      total: ownerAmount,
      items: [],
    });
  }

  return {
    receiptId: receipt.id,
    totalAmount: receipt.totalAmount,
    totalClaimed,
    ownerAmount,
    participants: summary,
  };
}
