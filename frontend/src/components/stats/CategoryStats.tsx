import type { CategoryStats as CategoryStatsType } from '../../types';
import { CATEGORY_LABELS } from '../../config/constants';
import { Card } from '../ui';

interface CategoryStatsProps {
  stats: CategoryStatsType[];
}

export function CategoryStats({ stats }: CategoryStatsProps) {
  return (
    <Card>
      <h2 className="text-xl font-semibold mb-4">Category Distribution</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div key={stat.category} className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600">{stat.count}</div>
            <div className="text-xs text-gray-600 mt-1">
              {CATEGORY_LABELS[stat.category]}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
