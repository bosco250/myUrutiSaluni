'use client';

import React, { InputHTMLAttributes, forwardRef, useId } from 'react';

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  label?: string;
  error?: string;
  helperText?: string;
  orientation?: 'horizontal' | 'vertical';
  required?: boolean;
  disabled?: boolean;
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ 
    label, 
    description,
    className = '', 
    id,
    children,
    ...props 
  }, ref) => {
    const generatedId = useId();
    const radioId = id || generatedId;
    const descriptionId = `${radioId}-description`;

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            type="radio"
            id={radioId}
            aria-describedby={description ? descriptionId : undefined}
            className={`
              sr-only peer
              ${className}
            `}
            {...props}
          />
          <div className={`
            w-5 h-5 border-2 rounded-full transition-all duration-200 flex items-center justify-center
            peer-focus:ring-2 peer-focus:ring-primary/50 peer-focus:ring-offset-2 peer-focus:ring-offset-background-light dark:peer-focus:ring-offset-background-dark
            peer-disabled:opacity-60 peer-disabled:cursor-not-allowed
            border-border-light dark:border-border-dark peer-checked:border-primary hover:border-primary/50
            ${props.checked 
              ? 'border-primary' 
              : 'bg-background-light dark:bg-background-dark'
            }
          `}>
            {props.checked && (
              <div className="w-2.5 h-2.5 bg-primary rounded-full" aria-hidden="true" />
            )}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          {(label || children) && (
            <label 
              htmlFor={radioId}
              className="block text-sm font-medium text-text-light dark:text-text-dark cursor-pointer select-none"
            >
              {label || children}
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
        </div>
      </div>
    );
  }
);

Radio.displayName = 'Radio';

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  label,
  error,
  helperText,
  orientation = 'vertical',
  required = false,
  disabled = false,
}: RadioGroupProps) {
  const groupId = useId();
  const errorId = `${groupId}-error`;
  const helperId = `${groupId}-helper`;

  const describedByIds = [
    error ? errorId : null,
    helperText ? helperId : null
  ].filter(Boolean).join(' ');

  return (
    <fieldset className="w-full">
      {label && (
        <legend className="block text-sm font-medium text-text-light dark:text-text-dark mb-3">
          {label}
          {required && (
            <span className="text-error ml-1" aria-label="required">
              *
            </span>
          )}
        </legend>
      )}
      
      <div 
        className={`
          ${orientation === 'horizontal' 
            ? 'flex flex-wrap gap-6' 
            : 'space-y-3'
          }
        `}
        role="radiogroup"
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedByIds || undefined}
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            disabled={disabled || option.disabled}
            label={option.label}
            description={option.description}
          />
        ))}
      </div>
      
      {error && (
        <div 
          id={errorId}
          className="mt-2 text-sm text-error"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
      
      {helperText && !error && (
        <p 
          id={helperId}
          className="mt-2 text-sm text-text-secondary"
        >
          {helperText}
        </p>
      )}
    </fieldset>
  );
}

export default Radio;