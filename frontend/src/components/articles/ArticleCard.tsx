import { format } from 'date-fns';
import type { Article } from '../../types';
import { CATEGORY_LABELS } from '../../config/constants';
import { Badge } from '../ui';

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <div className="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-2xl p-8 hover:bg-white hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
      <div className="flex justify-between items-start gap-6">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-gray-900 mb-3 leading-snug">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors"
            >
              {article.title}
            </a>
          </h3>

          {article.summary && (
            <p className="text-gray-600 text-base mb-4 line-clamp-2 leading-relaxed">{article.summary}</p>
          )}

          <div className="flex flex-wrap gap-3 items-center text-sm text-gray-500">
            <span className="font-medium capitalize text-gray-700">{article.source}</span>
            {article.author && (
              <>
                <span className="text-gray-300">•</span>
                <span>{article.author}</span>
              </>
            )}
            <span className="text-gray-300">•</span>
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
