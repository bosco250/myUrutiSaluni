'use client';

import React, { InputHTMLAttributes, forwardRef, useId } from 'react';
import { Check, Minus } from 'lucide-react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
  indeterminate?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ 
    label, 
    description,
    error,
    indeterminate = false,
    className = '', 
    id,
    children,
    ...props 
  }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;
    const errorId = `${checkboxId}-error`;
    const descriptionId = `${checkboxId}-description`;

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              [
                error ? errorId : null,
                description ? descriptionId : null
              ].filter(Boolean).join(' ') || undefined
            }
            className={`
              sr-only peer
              ${className}
            `}
            {...props}
          />
          <div className={`
            w-5 h-5 border-2 rounded transition-all duration-200 flex items-center justify-center
            peer-focus:ring-2 peer-focus:ring-primary/50 peer-focus:ring-offset-2 peer-focus:ring-offset-background-light dark:peer-focus:ring-offset-background-dark
            peer-disabled:opacity-60 peer-disabled:cursor-not-allowed
            ${error 
              ? 'border-error peer-checked:bg-error peer-checked:border-error' 
              : 'border-border-light dark:border-border-dark peer-checked:bg-primary peer-checked:border-primary hover:border-primary/50'
            }
            ${props.checked || indeterminate 
              ? 'bg-primary border-primary text-text-inverse' 
              : 'bg-background-light dark:bg-background-dark'
            }
          `}>
            {indeterminate ? (
              <Minus className="w-3 h-3" aria-hidden="true" />
            ) : props.checked ? (
              <Check className="w-3 h-3" aria-hidden="true" />
            ) : null}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          {(label || children) && (
            <label 
              htmlFor={checkboxId}
              className="block text-sm font-medium text-text-light dark:text-text-dark cursor-pointer select-none"
            >
              {label || children}
              {props.required && (
                <span className="text-error ml-1" aria-label="required">
                  *
                </span>
              )}
            </label>
          )}
          
          {description && (
            <p 
              id={descriptionId}
              className="mt-1 text-sm text-text-secondary"
            >
              {description}
            </p>
          )}
          
          {error && (
            <p 
              id={errorId}
              className="mt-1 text-sm text-error"
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;