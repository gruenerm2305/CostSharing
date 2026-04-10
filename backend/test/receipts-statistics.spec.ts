import { buildReceiptStatistics } from '../src/receipts/receipts-statistics';

describe('buildReceiptStatistics', () => {
  it('aggregiert Kategorien, Farben und byDate aus Receipt-Items', () => {
    const receipts: any[] = [
      {
        date: '2026-04-08',
        totalAmount: 100,
        category: { name: 'Lebensmittel', color: '#ffffff' },
        items: [
          { totalPrice: 60, category: { name: 'Lebensmittel', color: '#ffffff' } },
          { totalPrice: 40, category: { name: 'Elektronik', color: '#00aaff' } },
        ],
      },
      {
        date: '2026-04-07',
        totalAmount: 500,
        category: null,
        items: [
          { totalPrice: 340, category: { name: 'Lebensmittel', color: '#ffffff' } },
          { totalPrice: 160, category: { name: 'Elektronik', color: '#00aaff' } },
        ],
      },
    ];

    const result = buildReceiptStatistics(receipts);

    expect(result.totalAmount).toBe(600);
    expect(result.receiptCount).toBe(2);
    expect(result.byCategory).toEqual({
      Lebensmittel: 400,
      Elektronik: 200,
    });
    expect(result.categoryColors).toEqual({
      Lebensmittel: '#ffffff',
      Elektronik: '#00aaff',
    });
    expect(result.byDate['2026-04-07'].categories).toEqual([
      { name: 'Lebensmittel', amount: 340, color: '#ffffff' },
      { name: 'Elektronik', amount: 160, color: '#00aaff' },
    ]);
    expect(result.byDate['2026-04-08'].categories).toEqual([
      { name: 'Lebensmittel', amount: 60, color: '#ffffff' },
      { name: 'Elektronik', amount: 40, color: '#00aaff' },
    ]);
  });
});