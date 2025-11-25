import type { CategoryStats as CategoryStatsType, Category } from '../../types';
import { CATEGORY_LABELS } from '../../config/constants';

interface CategoryStatsProps {
  stats: CategoryStatsType[];
  selectedCategory: Category | '';
  onCategorySelect: (category: Category | '') => void;
}

export function CategoryStats({ stats, selectedCategory, onCategorySelect }: CategoryStatsProps) {
  const totalCount = stats.reduce((sum, stat) => sum + stat.count, 0);
  
  return (
    <div className="flex items-stretch justify-between gap-3 px-6 py-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-100">
      <button
        onClick={() => onCategorySelect('')}
        className={`flex flex-col items-center justify-between gap-1 px-6 py-3 h-24 rounded-lg border transition-all ${
          selectedCategory === ''
            ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
            : 'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100'
        }`}
      >
        <span className="text-sm font-medium">All</span>
        <span className={`text-lg font-semibold ${
          selectedCategory === '' ? 'text-white' : 'text-blue-600'
        }`}>{totalCount}</span>
      </button>
      {stats.map((stat) => (
        <button
          key={stat.category}
          onClick={() => onCategorySelect(stat.category)}
          className={`flex flex-col items-center justify-between gap-1 px-6 py-3 h-24 rounded-lg border transition-all ${
            selectedCategory === stat.category
              ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
              : 'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100'
          }`}
        >
          <span className="text-sm font-medium text-center">
            {CATEGORY_LABELS[stat.category]}
          </span>
          <span className={`text-lg font-semibold ${
            selectedCategory === stat.category ? 'text-white' : 'text-blue-600'
          }`}>{stat.count}</span>
        </button>
      ))}
    </div>
  );
}
