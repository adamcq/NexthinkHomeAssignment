import { Button } from '../ui';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-4">
      <Button
        variant="secondary"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevious}
      >
        Previous
      </Button>
      
      <span className="px-6 py-3 text-gray-600 font-medium">
        Page {currentPage} of {totalPages}
      </span>
      
      <Button
        variant="secondary"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNext}
      >
        Next
      </Button>
    </div>
  );
}
