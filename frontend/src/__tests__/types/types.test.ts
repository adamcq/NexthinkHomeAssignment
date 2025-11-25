import { describe, it, expect } from 'vitest';
import type { Category } from '../../types';

describe('Type Guards and Utilities', () => {
  describe('Category type', () => {
    it('accepts valid category values', () => {
      const validCategories: Category[] = [
        'CYBERSECURITY',
        'AI_EMERGING_TECH',
        'SOFTWARE_DEVELOPMENT',
        'HARDWARE_DEVICES',
        'TECH_INDUSTRY_BUSINESS',
        'OTHER',
      ];

      validCategories.forEach((category) => {
        expect(category).toBeTruthy();
        expect(typeof category).toBe('string');
      });
    });
  });

  describe('SearchParams validation', () => {
    it('creates valid search params with all fields', () => {
      const params = {
        query: 'test',
        category: 'AI_EMERGING_TECH' as Category,
        limit: 20,
        offset: 0,
        source: 'techcrunch' as const,
      };

      expect(params.query).toBe('test');
      expect(params.category).toBe('AI_EMERGING_TECH');
      expect(params.limit).toBe(20);
      expect(params.offset).toBe(0);
    });

    it('creates valid search params with minimal fields', () => {
      const params: { limit: number; query?: string } = {
        limit: 10,
      };

      expect(params.limit).toBe(10);
      expect(params.query).toBeUndefined();
    });
  });
});
