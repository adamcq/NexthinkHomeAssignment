import { FormEvent } from 'react';
import type { Category } from '../../types';
import { CATEGORY_LABELS } from '../../config/constants';
import { Card, Input, Select, Button } from '../ui';

interface SearchFormProps {
  query: string;
  category: Category | '';
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: Category | '') => void;
  onSubmit: (e: FormEvent) => void;
}

export function SearchForm({ query, category, onQueryChange, onCategoryChange, onSubmit }: SearchFormProps) {
  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Search Articles"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Enter keywords to search..."
        />

        <div className="flex gap-4">
          <div className="flex-1">
            <Select
              label="Category"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value as Category | '')}
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-end">
            <Button type="submit">Search</Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
