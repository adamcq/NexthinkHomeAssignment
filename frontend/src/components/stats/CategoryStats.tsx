import type { CategoryStats as CategoryStatsType, Category } from '../../types';
import { CATEGORY_LABELS } from '../../config/constants';

interface CategoryStatsProps {
  total: number;
  stats: CategoryStatsType[];
  selectedCategory: Category | '';
  onCategorySelect: (category: Category | '') => void;
}

export function CategoryStats({ total, stats, selectedCategory, onCategorySelect }: CategoryStatsProps) {
  // const totalCount = stats.reduce((sum, stat) => sum + stat.count, 0);
  const totalCount = total;

  return (
    <div className="flex items-stretch justify-between gap-3 px-6 py-4 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200 shadow-sm">
      <button
        onClick={() => onCategorySelect('')}
        className={`flex flex-col items-center justify-between gap-1 px-6 py-3 h-24 rounded-lg border-2 transition-all ${selectedCategory === ''
            ? 'bg-blue-500 text-white border-blue-500 shadow-md'
            : 'bg-white text-gray-700 border-gray-50 hover:bg-gray-50 hover:border-gray-300'
          }`}
      >
        <span className="text-sm font-medium">All</span>
        <span className={`text-lg font-semibold ${selectedCategory === '' ? 'text-white' : 'text-blue-600'
          }`}>{totalCount}</span>
      </button>
      {stats.map((stat) => (
        <button
          key={stat.category}
          onClick={() => onCategorySelect(stat.category)}
          className={`flex flex-col items-center justify-between gap-1 px-6 py-3 h-24 rounded-lg border-2 transition-all ${selectedCategory === stat.category
              ? 'bg-blue-500 text-white border-blue-500 shadow-md'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
        >
          <span className="text-sm font-medium text-center">
            {CATEGORY_LABELS[stat.category]}
          </span>
          <span className={`text-lg font-semibold ${selectedCategory === stat.category ? 'text-white' : 'text-blue-600'
            }`}>{stat.count}</span>
        </button>
      ))}
    </div>
  );
}

