import { buildReceiptStatistics } from '../src/receipts/receipts-statistics';

describe('buildReceiptStatistics', () => {
  it('aggregiert Kategorien, Farben und byDate aus Receipt-Kategorien', () => {
    const receipts: any[] = [
      {
        date: '2026-04-08',
        totalAmount: 100,
        category: { name: 'Lebensmittel', color: '#ffffff' },
        items: [
          { totalPrice: 60 },
          { totalPrice: 40 },
        ],
      },
      {
        date: '2026-04-07',
        totalAmount: 500,
        category: { name: 'Elektronik', color: '#00aaff' },
        items: [
          { totalPrice: 340 },
          { totalPrice: 160 },
        ],
      },
    ];

    const result = buildReceiptStatistics(receipts);

    expect(result.totalAmount).toBe(600);
    expect(result.receiptCount).toBe(2);
    expect(result.byCategory).toEqual({
      Lebensmittel: 100,
      Elektronik: 500,
    });
    expect(result.categoryColors).toEqual({
      Lebensmittel: '#ffffff',
      Elektronik: '#00aaff',
    });
    expect(result.byDate['2026-04-07'].categories).toEqual([
      { name: 'Elektronik', amount: 500, color: '#00aaff' },
    ]);
    expect(result.byDate['2026-04-08'].categories).toEqual([
      { name: 'Lebensmittel', amount: 100, color: '#ffffff' },
    ]);
  });
});