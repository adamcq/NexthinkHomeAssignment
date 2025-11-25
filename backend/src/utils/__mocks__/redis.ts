import { jest } from '@jest/globals';

const mockRedis: any = {
  get: jest.fn(),
  mget: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  quit: jest.fn(),
};

export const redis = mockRedis;
export default mockRedis;
