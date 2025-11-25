export type Category = 
  | 'CYBERSECURITY'
  | 'AI_EMERGING_TECH'
  | 'SOFTWARE_DEVELOPMENT'
  | 'HARDWARE_DEVICES'
  | 'TECH_INDUSTRY_BUSINESS'
  | 'OTHER';

export type Source = 'reddit' | 'arstechnica' | 'techcrunch';

export interface Article {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  url: string;
  source: Source;
  sourceId: string;
  author: string | null;
  publishedAt: string;
  fetchedAt: string;
  category: Category | null;
  categoryScore: number | null;
  metadata?: Record<string, any>;
}

export interface SearchParams {
  query?: string;
  category?: Category;
  startDate?: string;
  endDate?: string;
  source?: Source;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  articles: Article[];
  total: number;
  limit: number;
  offset: number;
}

export interface CategoryStats {
  category: Category;
  count: number;
}
