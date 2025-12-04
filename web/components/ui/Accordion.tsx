import { ReactNode, useState } from 'react';

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  status?: 'success' | 'warning' | 'error' | 'pending';
  statusIcon?: string;
  className?: string;
}

export default function Accordion({
  title,
  children,
  defaultOpen = false,
  status,
  statusIcon,
  className = '',
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const statusStyles = {
    success: 'bg-success/10 text-success border-border-light dark:border-border-dark',
    warning: 'bg-warning/10 text-warning border-border-light dark:border-border-dark',
    error: 'bg-danger/10 text-danger border-danger',
    pending: 'bg-slate-700 dark:bg-slate-700 text-text-dark dark:text-text-dark border-border-light dark:border-border-dark',
  };

  const statusIcons = {
    success: 'check_circle',
    warning: 'schedule',
    error: 'error',
    pending: 'file_upload',
  };

  const icon = statusIcon || (status ? statusIcons[status] : 'file_upload');

  return (
    <details
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
      className={`flex flex-col rounded-lg border bg-surface-light dark:bg-surface-dark group ${status ? statusStyles[status] : 'border-border-light dark:border-border-dark'} ${className}`}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 list-none">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center size-8 rounded-full ${status ? statusStyles[status] : 'bg-slate-100 dark:bg-slate-700 text-text-light dark:text-text-dark'}`}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {icon}
            </span>
          </div>
          <p className="text-text-light dark:text-text-dark text-base font-medium leading-normal">
            {title}
          </p>
        </div>
        <span
          className={`material-symbols-outlined text-text-light dark:text-text-dark transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

