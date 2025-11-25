import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from '../../components/articles/Pagination';

describe('Pagination', () => {
  const mockOnPageChange = vi.fn();

  it('does not render when there is only one page', () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalItems={10}
        itemsPerPage={20}
        onPageChange={mockOnPageChange}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders pagination controls when there are multiple pages', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />
    );
    
    expect(screen.getByText(/previous/i)).toBeInTheDocument();
    expect(screen.getByText(/next/i)).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(
      <Pagination
        currentPage={1}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />
    );
    
    const previousButton = screen.getByText(/previous/i);
    expect(previousButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <Pagination
        currentPage={5}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />
    );
    
    const nextButton = screen.getByText(/next/i);
    expect(nextButton).toBeDisabled();
  });

  it('enables both buttons on middle page', () => {
    render(
      <Pagination
        currentPage={3}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />
    );
    
    const previousButton = screen.getByText(/previous/i);
    const nextButton = screen.getByText(/next/i);
    
    expect(previousButton).not.toBeDisabled();
    expect(nextButton).not.toBeDisabled();
  });

  it('calls onPageChange with previous page when previous button is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    
    render(
      <Pagination
        currentPage={3}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={onPageChange}
      />
    );
    
    const previousButton = screen.getByText(/previous/i);
    await user.click(previousButton);
    
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with next page when next button is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    
    render(
      <Pagination
        currentPage={2}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={onPageChange}
      />
    );
    
    const nextButton = screen.getByText(/next/i);
    await user.click(nextButton);
    
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('displays correct page information', () => {
    render(
      <Pagination
        currentPage={2}
        totalItems={47}
        itemsPerPage={10}
        onPageChange={mockOnPageChange}
      />
    );
    
    expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
  });
});
