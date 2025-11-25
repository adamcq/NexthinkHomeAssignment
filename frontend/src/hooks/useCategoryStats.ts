import { useQuery } from '@tanstack/react-query';
import { getCategoryStats } from '../services/api';

export function useCategoryStats() {
  const { data: categoryStats, isLoading, error } = useQuery({
    queryKey: ['categoryStats'],
    queryFn: getCategoryStats,
  });

  return { categoryStats, isLoading, error };
}
