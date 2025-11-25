import { jest } from '@jest/globals';

const rawMock = jest.fn();

const mockDb: any = {
  $queryRaw: rawMock,
  $queryRawUnsafe: rawMock,
  $transaction: jest.fn(async (operations: Array<() => Promise<unknown>>) => {
    const results = [] as unknown[];
    for (const operation of operations) {
      results.push(await operation());
    }
    return results;
  }),
  article: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
};

export const db = mockDb;
export default mockDb;
