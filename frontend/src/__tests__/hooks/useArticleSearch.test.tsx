import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useArticleSearch } from '../../hooks/useArticleSearch';
import * as api from '../../services/api';

vi.mock('../../services/api');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useArticleSearch', () => {
  beforeEach(() => {
    vi.spyOn(api, 'searchArticles').mockResolvedValue({
      articles: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useArticleSearch(), {
      wrapper: createWrapper(),
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedCategory).toBe('');
    expect(result.current.currentPage).toBe(1);
  });

  it('updates search query', () => {
    const { result } = renderHook(() => useArticleSearch(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setSearchQuery('AI news');
    });

    expect(result.current.searchQuery).toBe('AI news');
  });

  it('updates selected category', () => {
    const { result } = renderHook(() => useArticleSearch(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setSelectedCategory('CYBERSECURITY');
    });

    expect(result.current.selectedCategory).toBe('CYBERSECURITY');
  });

  it('calculates current page correctly', () => {
    const { result } = renderHook(() => useArticleSearch(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handlePageChange(3);
    });

    expect(result.current.currentPage).toBe(3);
  });

  it('handles page change correctly', async () => {
    const { result } = renderHook(() => useArticleSearch(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handlePageChange(2);
    });

    await waitFor(() => {
      expect(result.current.currentPage).toBe(2);
    });
  });

  it('fetches search results when search is triggered', async () => {
    const mockSearchResults = {
      articles: [],
      total: 0,
      limit: 20,
      offset: 0,
    };

    vi.spyOn(api, 'searchArticles').mockResolvedValue(mockSearchResults);

    const { result } = renderHook(() => useArticleSearch(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setSearchQuery('test');
    });
    
    act(() => {
      result.current.handleSearch({ preventDefault: vi.fn() } as any);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(api.searchArticles).toHaveBeenCalled();
  });
});
