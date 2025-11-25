import type { ReactNode } from 'react';
import type { Category } from '../../types';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  category?: Category;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-primary-100 text-primary-800',
  secondary: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
};

const categoryStyles: Record<Category, string> = {
  CYBERSECURITY: 'bg-red-50 text-red-700 border border-red-100',
  AI_EMERGING_TECH: 'bg-purple-50 text-purple-700 border border-purple-100',
  SOFTWARE_DEVELOPMENT: 'bg-blue-50 text-blue-700 border border-blue-100',
  HARDWARE_DEVICES: 'bg-green-50 text-green-700 border border-green-100',
  TECH_INDUSTRY_BUSINESS: 'bg-amber-50 text-amber-700 border border-amber-100',
  OTHER: 'bg-gray-50 text-gray-700 border border-gray-100',
};

export function Badge({ children, variant = 'default', category, className = '' }: BadgeProps) {
  const colorStyles = category ? categoryStyles[category] : variantStyles[variant];

  return (
    <span className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${colorStyles} ${className}`}>
      {children}
    </span>
  );
}
