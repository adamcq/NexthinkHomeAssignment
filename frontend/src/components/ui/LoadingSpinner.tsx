interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const sizeStyles = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  return (
    <div className="text-center py-12">
      <div className={`inline-block animate-spin rounded-full border-b-2 border-primary-600 ${sizeStyles[size]}`}></div>
      {message && <p className="mt-2 text-gray-600">{message}</p>}
    </div>
  );
}
