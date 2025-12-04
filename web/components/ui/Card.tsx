import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export default function Card({ title, children, className = '', actions }: CardProps) {
  return (
    <div className={`bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark ${className}`}>
      {(title || actions) && (
        <div className="p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
          {title && <h2 className="text-lg font-bold text-text-light dark:text-text-dark">{title}</h2>}
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

