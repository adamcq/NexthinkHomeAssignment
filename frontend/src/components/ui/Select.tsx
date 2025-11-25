import type { SelectHTMLAttributes, ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Select({ label, error, fullWidth = true, className = '', id, children, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <div className={widthStyles}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-semibold text-gray-700 mb-3">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`input-field ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
