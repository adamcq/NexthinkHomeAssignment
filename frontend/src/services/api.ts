import axios from 'axios';
import { API_BASE_URL } from '../config/constants';
import type { SearchParams, SearchResult, Article, CategoryStats } from '../types';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const searchArticles = async (params: SearchParams): Promise<SearchResult> => {
  const response = await api.post('/articles/search', params);
  return response.data;
};

export const getArticleById = async (id: string): Promise<Article> => {
  const response = await api.get(`/articles/${id}`);
  return response.data;
};

export const listArticles = async (params?: SearchParams): Promise<SearchResult> => {
  const response = await api.get('/articles', { params });
  return response.data;
};

export const getCategoryStats = async (): Promise<CategoryStats[]> => {
  const response = await api.get('/articles/stats/categories');
  return response.data;
};

export const getFilteredCategoryStats = async (params: Omit<SearchParams, 'limit' | 'offset'>): Promise<CategoryStats[]> => {
  const response = await api.post('/articles/stats/categories', params);
  return response.data;
};

