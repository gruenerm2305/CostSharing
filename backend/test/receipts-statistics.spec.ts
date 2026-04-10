import { buildReceiptStatistics } from '../src/receipts/receipts-statistics';

describe('buildReceiptStatistics', () => {
  it('aggregiert Kategorien, Farben und byDate', () => {
    const receipts: any[] = [
      {
        date: '2026-04-08',
        totalAmount: 100,
        items: [
          { totalPrice: 60, category: { name: 'Lebensmittel', color: '#ffffff' } },
          { totalPrice: 40, category: null },
        ],
      },
      {
        date: '2026-04-07',
        totalAmount: 500,
        items: [
          { totalPrice: 340, category: { name: 'Lebensmittel', color: '#ffffff' } },
          { totalPrice: 160, category: null },
        ],
      },
    ];

    const result = buildReceiptStatistics(receipts);

    expect(result.totalAmount).toBe(600);
    expect(result.receiptCount).toBe(2);
    expect(result.byCategory).toEqual({
      Lebensmittel: 400,
      Unkategorisiert: 200,
    });
    expect(result.categoryColors).toEqual({
      Lebensmittel: '#ffffff',
      Unkategorisiert: '#cccccc',
    });
    expect(result.byDate['2026-04-07'].categories).toEqual([
      { name: 'Lebensmittel', amount: 340, color: '#ffffff' },
      { name: 'Unkategorisiert', amount: 160, color: '#cccccc' },
    ]);
    expect(result.byDate['2026-04-08'].categories).toEqual([
      { name: 'Lebensmittel', amount: 60, color: '#ffffff' },
      { name: 'Unkategorisiert', amount: 40, color: '#cccccc' },
    ]);
  });
});