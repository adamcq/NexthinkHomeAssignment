import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchForm } from '../../components/search/SearchForm';

describe('SearchForm', () => {
  const mockProps = {
    query: '',
    category: '' as const,
    onQueryChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  it('renders search input and submit button', () => {
    render(<SearchForm {...mockProps} />);

    expect(screen.getByLabelText(/search articles/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('calls onQueryChange when typing in search input', async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();

    render(<SearchForm {...mockProps} onQueryChange={onQueryChange} />);

    const input = screen.getByLabelText(/search articles/i);
    await user.type(input, 'AI news');

    // userEvent.type calls onChange for each character, check last call
    expect(onQueryChange).toHaveBeenLastCalledWith('s');
    expect(onQueryChange).toHaveBeenCalledTimes(7);
  });

  it('calls onSubmit when form is submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e) => e.preventDefault());

    render(<SearchForm {...mockProps} onSubmit={onSubmit} />);

    const button = screen.getByRole('button', { name: /search/i });
    await user.click(button);

    expect(onSubmit).toHaveBeenCalled();
  });

  it('displays current query value', () => {
    render(<SearchForm {...mockProps} query="test query" />);

    const input = screen.getByLabelText(/search articles/i) as HTMLInputElement;
    expect(input.value).toBe('test query');
  });

  it('submits form on Enter key', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e) => e.preventDefault());

    render(<SearchForm {...mockProps} onSubmit={onSubmit} />);

    const input = screen.getByLabelText(/search articles/i);
    await user.type(input, 'test{Enter}');

    expect(onSubmit).toHaveBeenCalled();
  });

  it('clears input when query prop changes', () => {
    const { rerender } = render(<SearchForm {...mockProps} query="initial" />);

    const input = screen.getByLabelText(/search articles/i) as HTMLInputElement;
    expect(input.value).toBe('initial');

    rerender(<SearchForm {...mockProps} query="" />);
    expect(input.value).toBe('');
  });

  it('allows typing special characters', async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();

    render(<SearchForm {...mockProps} onQueryChange={onQueryChange} />);

    const input = screen.getByLabelText(/search articles/i);
    await user.type(input, 'AI & ML');

    expect(onQueryChange).toHaveBeenCalled();
  });
});
