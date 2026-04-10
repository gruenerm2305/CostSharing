import { describe, it, expect, jest } from '@jest/globals';
import { CategoriesService } from '../src/categories/categories.service';

jest.mock('xml2js', () => ({
  parseStringPromise: jest.fn(),
}));

import { parseStringPromise } from 'xml2js';

describe('CategoriesService.parseCategoryMapping', () => {
  it('parses mapping xml and returns fields', async () => {
    const parseStringPromiseMock =
      parseStringPromise as unknown as jest.MockedFunction<typeof parseStringPromise>;
    parseStringPromiseMock.mockResolvedValue({
      mapping: {
        categoryId: ['abc'],
        confidence: ['0.7'],
        reasoning: ['ok'],
      },
    });

    const service = new CategoriesService({} as any, {} as any, { get: jest.fn() } as any);
    (service as any).logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };
    const result = await (service as any).parseCategoryMapping('<mapping></mapping>');

    expect(result).toEqual({
      categoryId: 'abc',
      confidence: 0.7,
      reasoning: 'ok',
    });
  });

  it('returns fallback on parse error', async () => {
    const parseStringPromiseMock =
      parseStringPromise as unknown as jest.MockedFunction<typeof parseStringPromise>;
    parseStringPromiseMock.mockRejectedValue(new Error('bad'));

    const service = new CategoriesService({} as any, {} as any, { get: jest.fn() } as any);
    (service as any).logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };
    const result = await (service as any).parseCategoryMapping('<mapping></mapping>');

    expect(result).toEqual({
      confidence: 0,
      reasoning: 'Failed to parse AI response',
    });
  });

  it('uses the last mapping block if multiple exist', async () => {
    const parseStringPromiseMock =
      parseStringPromise as unknown as jest.MockedFunction<typeof parseStringPromise>;
    parseStringPromiseMock.mockResolvedValue({
      mapping: {
        categoryId: ['last'],
        confidence: ['0.9'],
        reasoning: ['last one'],
      },
    });

    const service = new CategoriesService({} as any, {} as any, { get: jest.fn() } as any);
    (service as any).logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };
    const result = await (service as any).parseCategoryMapping(
      '<mapping><categoryId>first</categoryId></mapping><mapping><categoryId>last</categoryId></mapping>',
    );

    expect(result).toEqual({
      categoryId: 'last',
      confidence: 0.9,
      reasoning: 'last one',
    });
  });
});
