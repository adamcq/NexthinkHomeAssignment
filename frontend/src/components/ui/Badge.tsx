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
  CYBERSECURITY: 'bg-red-100 text-red-800',
  AI_EMERGING_TECH: 'bg-purple-100 text-purple-800',
  SOFTWARE_DEVELOPMENT: 'bg-blue-100 text-blue-800',
  HARDWARE_DEVICES: 'bg-green-100 text-green-800',
  TECH_INDUSTRY_BUSINESS: 'bg-yellow-100 text-yellow-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

export function Badge({ children, variant = 'default', category, className = '' }: BadgeProps) {
  const colorStyles = category ? categoryStyles[category] : variantStyles[variant];

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${colorStyles} ${className}`}>
      {children}
    </span>
  );
}
