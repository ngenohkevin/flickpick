import { forwardRef } from 'react';

// ==========================================================================
// Input Component
// Text input with optional icon support
// ==========================================================================

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const baseInputStyles =
      'w-full rounded-md border bg-bg-tertiary text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed';

    const stateStyles = error
      ? 'border-error focus:ring-error'
      : 'border-border-default';

    const paddingStyles = leftIcon
      ? 'pl-11 pr-4 py-3'
      : rightIcon
        ? 'pl-4 pr-11 py-3'
        : 'px-4 py-3';

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`${baseInputStyles} ${stateStyles} ${paddingStyles} ${className}`}
            {...props}
          />

          {rightIcon && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary">
              {rightIcon}
            </span>
          )}
        </div>

        {(error || hint) && (
          <p
            className={`mt-2 text-sm ${error ? 'text-error' : 'text-text-tertiary'}`}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
