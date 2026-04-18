import { Receipt } from './entities/receipt.entity';

export function buildReceiptStatistics(receipts: Receipt[]) {
  let totalAmount = 0;

  const byCategory: Record<string, number> = {};
  const categoryColors: Record<string, string> = {};
  const byDate: Record<
    string,
    {
      categories: Array<{
        name: string;
        amount: number;
        color: string;
      }>;
    }
  > = {};

  const addCategoryAmount = (
    target: Record<string, number>,
    categoryName: string,
    amount: number,
  ) => {
    target[categoryName] = (target[categoryName] || 0) + amount;
  };

  const addDateCategoryAmount = (
    dateStr: string,
    categoryName: string,
    amount: number,
    color: string,
  ) => {
    if (!byDate[dateStr]) {
      byDate[dateStr] = { categories: [] };
    }

    const existing = byDate[dateStr].categories.find((entry) => entry.name === categoryName);
    if (existing) {
      existing.amount += amount;
      return;
    }

    byDate[dateStr].categories.push({ name: categoryName, amount, color });
  };

  receipts.forEach((receipt) => {
    const price = Number(receipt.totalAmount) || 0;
    const dateStr = new Date(receipt.date).toISOString().split('T')[0];
    const catName = receipt.category?.name || 'Unkategorisiert';
    const catColor = receipt.category?.color || '#cccccc';

    totalAmount += price;

    addCategoryAmount(byCategory, catName, price);
    addDateCategoryAmount(dateStr, catName, price, catColor);

    if (!categoryColors[catName]) {
      categoryColors[catName] = catColor;
    }
  });

  return {
    totalAmount,
    receiptCount: receipts.length,
    byCategory,
    categoryColors,
    byDate,
  };
}
