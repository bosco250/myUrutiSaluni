'use client';

import React, { SelectHTMLAttributes, forwardRef, useId } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    label, 
    error, 
    helperText,
    options,
    placeholder,
    className = '', 
    id,
    'aria-describedby': ariaDescribedBy,
    ...props 
  }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;
    
    const describedByIds = [
      error ? errorId : null,
      helperText ? helperId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ');

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={selectId}
            className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
          >
            {label}
            {props.required && (
              <span className="text-error ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedByIds || undefined}
            className={`
              w-full px-3 py-2 pr-8 border rounded transition-all duration-200 appearance-none
              bg-background-light dark:bg-background-dark 
              text-text-light dark:text-text-dark
              focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error 
                ? 'border-error focus:ring-error/50' 
                : 'border-border-light dark:border-border-dark hover:border-primary/50'
              }
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown className="w-5 h-5 text-text-secondary" aria-hidden="true" />
          </div>
        </div>
        
        {error && (
          <div 
            id={errorId}
            className="mt-1.5 flex items-start gap-1.5 text-sm text-error"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        
        {helperText && !error && (
          <p 
            id={helperId}
            className="mt-1.5 text-sm text-text-secondary"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;