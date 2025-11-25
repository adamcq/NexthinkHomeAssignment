import { format } from 'date-fns';
import type { Article } from '../../types';
import { CATEGORY_LABELS } from '../../config/constants';
import { Badge } from '../ui';

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-600 transition-colors"
            >
              {article.title}
            </a>
          </h3>

          {article.summary && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{article.summary}</p>
          )}

          <div className="flex flex-wrap gap-2 items-center text-sm text-gray-500">
            <span className="font-medium capitalize">{article.source}</span>
            {article.author && (
              <>
                <span>•</span>
                <span>{article.author}</span>
              </>
            )}
            <span>•</span>
            <span>{format(new Date(article.publishedAt), 'MMM d, yyyy')}</span>
          </div>
        </div>

        {article.category && (
          <Badge category={article.category}>
            {CATEGORY_LABELS[article.category]}
          </Badge>
        )}
      </div>
    </div>
  );
}
