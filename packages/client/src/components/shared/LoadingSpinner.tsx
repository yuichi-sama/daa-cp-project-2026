import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  subMessage?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  subMessage,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center p-4 text-center ${className}`}>
      <Loader2 className={`${sizeClasses} text-amber-500 animate-spin mb-2`} />
      {message && <p className="text-sm font-medium text-navy-800">{message}</p>}
      {subMessage && <p className="text-xs text-navy-400 mt-0.5">{subMessage}</p>}
    </div>
  );
};
