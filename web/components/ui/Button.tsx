import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  icon?: string;
  loading?: boolean;
  loadingText?: string;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  icon,
  loading = false,
  loadingText,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  
  const baseStyles = 'font-medium rounded transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 relative';
  
  const variantStyles = {
    primary: 'bg-primary text-text-inverse hover:bg-primary-dark',
    secondary: 'bg-background-secondary dark:bg-surface-dark text-text-light dark:text-text-dark hover:bg-background-secondary/80 border border-border-light dark:border-border-dark',
    danger: 'bg-error text-text-inverse hover:bg-error-dark',
    outline: 'border border-primary text-primary hover:bg-primary hover:text-text-inverse',
  };

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs h-7',
    md: 'px-3 py-1.5 text-sm h-8',
    lg: 'px-4 py-2 text-base h-10',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {icon && !loading && (
        <span className="material-symbols-outlined text-sm" aria-hidden="true">{icon}</span>
      )}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

