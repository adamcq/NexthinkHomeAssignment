import { useQuery } from '@tanstack/react-query';
import { getCategoryStats, getFilteredCategoryStats } from '../services/api';
import type { SearchParams } from '../types';

export function useCategoryStats(filters?: Omit<SearchParams, 'limit' | 'offset'>) {
  const { data: categoryStats, isLoading, error } = useQuery({
    queryKey: ['categoryStats', filters],
    queryFn: () => {
      // If there are any filters, use the filtered endpoint
      if (filters && (filters.query || filters.category || filters.source || filters.startDate || filters.endDate)) {
        return getFilteredCategoryStats(filters);
      }
      // Otherwise use the regular endpoint
      return getCategoryStats();
    },
  });

  return { categoryStats, isLoading, error };
}

