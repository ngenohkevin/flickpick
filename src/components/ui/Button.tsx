import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

// ==========================================================================
// Button Component
// Flexible button with multiple variants and sizes
// ==========================================================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles with press feedback animation
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed btn-press';

    // Variant styles
    const variantStyles = {
      primary:
        'bg-accent-primary text-white hover:bg-accent-hover shadow-sm hover:shadow-md',
      secondary:
        'bg-bg-tertiary text-text-primary border border-border-default hover:bg-border-default',
      ghost:
        'bg-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
      danger:
        'bg-error text-white hover:bg-error/90 shadow-sm hover:shadow-md',
    };

    // Size styles
    const sizeStyles = {
      sm: 'px-4 py-2 text-sm rounded-md gap-1.5',
      md: 'px-6 py-3 text-base rounded-md gap-2',
      lg: 'px-8 py-4 text-lg rounded-lg gap-2',
      icon: 'p-2 rounded-full',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {size !== 'icon' && <span>Loading...</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
