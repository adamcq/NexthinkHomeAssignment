import type { FormEvent } from 'react';
import type { Category } from '../../types';
import { Card, Input, Button } from '../ui';

interface SearchFormProps {
  query: string;
  category: Category | '';
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: Category | '') => void;
  onSubmit: (e: FormEvent) => void;
}

export function SearchForm({ query, category, onQueryChange, onCategoryChange, onSubmit }: SearchFormProps) {
  return (
    <Card padding="lg">
      <form onSubmit={onSubmit}>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              label="Search Articles"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Enter keywords to search..."
            />
          </div>
          <div className="flex items-end">
            <Button type="submit">Search</Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
