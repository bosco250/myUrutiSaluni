import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  icon?: string;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  icon,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
  
  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary disabled:bg-slate-600 disabled:text-slate-400',
    secondary: 'bg-slate-200 dark:bg-slate-700 text-text-light dark:text-text-dark hover:bg-slate-300 dark:hover:bg-slate-600',
    danger: 'bg-danger text-white hover:bg-danger/90 focus:ring-danger',
    outline: 'border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-surface-accent-light dark:hover:bg-surface-accent-dark',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm h-9',
    md: 'px-5 py-2 text-base h-12',
    lg: 'px-5 py-3 text-base h-14',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {icon && <span className="material-symbols-outlined" style={{ fontSize: size === 'sm' ? '20px' : '24px' }}>{icon}</span>}
      {children}
    </button>
  );
}

