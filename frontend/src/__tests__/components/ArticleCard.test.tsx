import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticleCard } from '../../components/articles/ArticleCard';
import type { Article } from '../../types';

describe('ArticleCard', () => {
  const mockArticle: Article = {
    id: '1',
    title: 'Test Article Title',
    content: 'Test content',
    summary: 'This is a test article summary',
    url: 'https://example.com/article',
    source: 'techcrunch',
    sourceId: 'test-123',
    author: 'John Doe',
    publishedAt: '2025-11-25T10:00:00Z',
    fetchedAt: '2025-11-25T11:00:00Z',
    category: 'AI_EMERGING_TECH',
    categoryScore: 0.95,
  };

  it('renders article title as a link', () => {
    render(<ArticleCard article={mockArticle} />);
    
    const link = screen.getByRole('link', { name: mockArticle.title });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', mockArticle.url);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders article summary', () => {
    render(<ArticleCard article={mockArticle} />);
    
    expect(screen.getByText(mockArticle.summary!)).toBeInTheDocument();
  });

  it('renders source information', () => {
    render(<ArticleCard article={mockArticle} />);
    
    expect(screen.getByText('techcrunch')).toBeInTheDocument();
  });

  it('renders author when available', () => {
    render(<ArticleCard article={mockArticle} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders publish date', () => {
    render(<ArticleCard article={mockArticle} />);
    
    expect(screen.getByText(/Nov 25, 2025/i)).toBeInTheDocument();
  });

  it('renders category badge when category is available', () => {
    render(<ArticleCard article={mockArticle} />);
    
    expect(screen.getByText(/AI & Emerging Tech/i)).toBeInTheDocument();
  });

  it('does not render summary when not provided', () => {
    const articleWithoutSummary = { ...mockArticle, summary: null };
    render(<ArticleCard article={articleWithoutSummary} />);
    
    expect(screen.queryByText(mockArticle.summary!)).not.toBeInTheDocument();
  });

  it('does not render author when not provided', () => {
    const articleWithoutAuthor = { ...mockArticle, author: null };
    render(<ArticleCard article={articleWithoutAuthor} />);
    
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('does not render category badge when category is null', () => {
    const articleWithoutCategory = { ...mockArticle, category: null };
    const { container } = render(<ArticleCard article={articleWithoutCategory} />);
    
    // Badge component should not be in the document
    expect(container.querySelector('.badge')).not.toBeInTheDocument();
  });
});
