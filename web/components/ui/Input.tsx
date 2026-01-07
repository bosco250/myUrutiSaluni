import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showPasswordToggle?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    helperText,
    showPasswordToggle = false,
    leftIcon,
    rightIcon,
    className = '', 
    type = 'text',
    id,
    'aria-describedby': ariaDescribedBy,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    
    const isPasswordType = type === 'password' && showPasswordToggle;
    const inputType = isPasswordType && showPassword ? 'text' : type;
    
    const describedByIds = [
      error ? errorId : null,
      helperText ? helperId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ');

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
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
          {leftIcon && (
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedByIds || undefined}
            className={`w-full px-3 py-2 border rounded transition-all duration-200 bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-error focus:ring-error/50' : 'border-border-light dark:border-border-dark hover:border-primary/50'} ${leftIcon ? 'pl-8' : ''} ${(rightIcon || isPasswordType) ? 'pr-8' : ''} ${className}`}
            {...props}
          />
          
          {isPasswordType && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-light focus:outline-none focus:text-primary transition-colors rounded"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={0}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Eye className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          )}
          
          {rightIcon && !isPasswordType && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true">
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';

export default Input;