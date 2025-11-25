import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchArticles } from '../services/api';
import type { SearchParams, Category } from '../types';

export function useArticleSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('');
  const [searchParams, setSearchParams] = useState<SearchParams>({
    limit: 20,
    offset: 0,
  });

  useEffect(() => {
    setSearchParams({
      query: searchQuery || undefined,
      category: selectedCategory || undefined,
      limit: 20,
      offset: 0,
    });
  }, [selectedCategory]);

  const { data: searchResults, isLoading, error, refetch } = useQuery({
    queryKey: ['articles', searchParams],
    queryFn: () => searchArticles(searchParams),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({
      query: searchQuery || undefined,
      category: selectedCategory || undefined,
      limit: 20,
      offset: 0,
    });
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => ({
      ...prev,
      offset: (page - 1) * (prev.limit || 20),
    }));
  };

  const currentPage = Math.floor((searchParams.offset || 0) / (searchParams.limit || 20)) + 1;

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    searchResults,
    isLoading,
    error,
    handleSearch,
    handlePageChange,
    currentPage,
    refetch,
  };
}
