import type { ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ message, icon, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && <div className="mb-4">{icon}</div>}
      <p className="text-gray-600 mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
