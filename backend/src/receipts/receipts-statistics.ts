import { Receipt } from './entities/receipt.entity';

export function buildReceiptStatistics(receipts: Receipt[]) {
  let totalAmount = 0;

  const byCategory: Record<string, number> = {};
  const categoryColors: Record<string, string> = {};

  receipts.forEach((receipt) => {
    totalAmount += Number(receipt.totalAmount);
    receipt.items.forEach((item) => {
      const catName = item.category ? item.category.name : 'Unkategorisiert';
      const catColor = item.category ? item.category.color : '#cccccc';
      const price = Number(item.totalPrice) || 0;

      byCategory[catName] = (byCategory[catName] || 0) + price;
      if (!categoryColors[catName]) {
        categoryColors[catName] = catColor;
      }
    });
  });

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
  receipts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  receipts.forEach((receipt) => {
    const dateStr = new Date(receipt.date).toISOString().split('T')[0];
    if (!byDate[dateStr]) {
      byDate[dateStr] = { categories: [] };
    }

    const categoryTotals: Record<string, { amount: number; color: string }> = {};
    receipt.items.forEach((item) => {
      const catName = item.category ? item.category.name : 'Unkategorisiert';
      const catColor = item.category ? item.category.color : '#cccccc';
      const price = Number(item.totalPrice) || 0;

      if (!categoryTotals[catName]) {
        categoryTotals[catName] = { amount: 0, color: catColor };
      }

      categoryTotals[catName].amount += price;
    });

    byDate[dateStr].categories = Object.entries(categoryTotals).map(
      ([name, { amount, color }]) => ({
        name,
        amount,
        color,
      }),
    );
  });

  return {
    totalAmount,
    receiptCount: receipts.length,
    byCategory,
    categoryColors,
    byDate,
  };
}
