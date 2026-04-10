import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { OcrService } from '../src/ocr/ocr.service';

jest.mock('xml2js', () => ({
  parseStringPromise: jest.fn(),
}));

import { parseStringPromise } from 'xml2js';

describe('OcrService.parseXmlResponse', () => {
  const fixedDate = new Date('2026-04-10T00:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('parses receipt xml and returns items', async () => {
    const parseStringPromiseMock =
      parseStringPromise as unknown as jest.MockedFunction<typeof parseStringPromise>;
    parseStringPromiseMock.mockResolvedValue({
      receipt: {
        date: ['2026-04-07'],
        merchant: ['Shop'],
        items: [
          {
            item: [
              {
                name: ['Item'],
                quantity: ['1'],
                unitPrice: ['2.50'],
                totalPrice: ['2.50'],
                confidence: ['0.9'],
              },
            ],
          },
        ],
        totalAmount: ['2.50'],
        taxAmount: ['0.40'],
        confidence: ['0.8'],
      },
    });

    const service = new OcrService({ get: jest.fn() } as any);
    const result = await (service as any).parseXmlResponse('<receipt></receipt>');

    expect(result.date).toBe('2026-04-07');
    expect(result.merchant).toBe('Shop');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Item');
    expect(result.totalAmount).toBe(2.5);
    expect(result.taxAmount).toBe(0.4);
  });

  it('uses today when date is invalid', async () => {
    const parseStringPromiseMock =
      parseStringPromise as unknown as jest.MockedFunction<typeof parseStringPromise>;
    parseStringPromiseMock.mockResolvedValue({
      receipt: {
        date: ['bad-date'],
        merchant: ['Shop'],
        items: [{ item: [] }],
        totalAmount: ['0'],
        confidence: ['0.5'],
      },
    });

    const service = new OcrService({ get: jest.fn() } as any);
    const result = await (service as any).parseXmlResponse('<receipt></receipt>');

    expect(result.date).toBe('2026-04-10');
  });

  it('uses the last receipt block if multiple exist', async () => {
    const parseStringPromiseMock =
      parseStringPromise as unknown as jest.MockedFunction<typeof parseStringPromise>;
    parseStringPromiseMock.mockResolvedValue({
      receipt: {
        date: ['2026-04-08'],
        merchant: ['Last'],
        items: [{ item: [] }],
        totalAmount: ['0'],
        confidence: ['0.5'],
      },
    });

    const service = new OcrService({ get: jest.fn() } as any);
    const result = await (service as any).parseXmlResponse(
      '<receipt><date>2026-04-07</date></receipt><receipt><date>2026-04-08</date></receipt>',
    );

    expect(result.date).toBe('2026-04-08');
    expect(result.merchant).toBe('Last');
  });
});
