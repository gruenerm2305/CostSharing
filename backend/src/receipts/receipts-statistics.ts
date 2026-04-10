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
    const items = receipt.items || [];
    const categorizedItems = items.filter((item: any) => item.category?.name);

    totalAmount += price;

    if (categorizedItems.length > 0) {
      let categorizedTotal = 0;

      categorizedItems.forEach((item: any) => {
        const itemName = item.category.name;
        const itemColor = item.category.color || '#cccccc';
        const itemAmount = Number(item.totalPrice) || 0;

        categorizedTotal += itemAmount;
        addCategoryAmount(byCategory, itemName, itemAmount);
        addDateCategoryAmount(dateStr, itemName, itemAmount, itemColor);

        if (!categoryColors[itemName]) {
          categoryColors[itemName] = itemColor;
        }
      });

      const remainingAmount = Math.max(price - categorizedTotal, 0);
      if (remainingAmount > 0) {
        const fallbackName = receipt.category?.name || 'Unkategorisiert';
        const fallbackColor = receipt.category?.color || '#cccccc';

        addCategoryAmount(byCategory, fallbackName, remainingAmount);
        addDateCategoryAmount(dateStr, fallbackName, remainingAmount, fallbackColor);

        if (!categoryColors[fallbackName]) {
          categoryColors[fallbackName] = fallbackColor;
        }
      }
    } else {
      const catName = receipt.category?.name || 'Unkategorisiert';
      const catColor = receipt.category?.color || '#cccccc';

      addCategoryAmount(byCategory, catName, price);
      addDateCategoryAmount(dateStr, catName, price, catColor);

      if (!categoryColors[catName]) {
        categoryColors[catName] = catColor;
      }
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
