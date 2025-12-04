import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export default function Card({ title, children, className = '', actions }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      {(title || actions) && (
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

