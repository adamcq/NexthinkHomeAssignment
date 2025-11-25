import type { Article } from '../../types';
import { ArticleCard } from './ArticleCard';
import { Card, LoadingSpinner, EmptyState, ErrorMessage } from '../ui';

interface ArticleListProps {
  articles?: Article[];
  total?: number;
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function ArticleList({ articles, total, isLoading, error, onRetry }: ArticleListProps) {
  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          Articles {total !== undefined && `(${total} results)`}
        </h2>
      </div>

      {isLoading && <LoadingSpinner message="Loading articles..." />}

      {error && (
        <ErrorMessage 
          message="Error loading articles. Please try again." 
          onRetry={onRetry}
        />
      )}

      {!isLoading && !error && articles && articles.length === 0 && (
        <EmptyState message="No articles found. Try a different search." />
      )}

      {!isLoading && !error && articles && articles.length > 0 && (
        <div className="space-y-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </Card>
  );
}
