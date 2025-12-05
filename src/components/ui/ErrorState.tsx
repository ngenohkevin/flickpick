'use client';

// ==========================================================================
// Error State Components
// Reusable error display components with retry functionality
// ==========================================================================

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Home,
  WifiOff,
  Clock,
  Search,
  Film,
  Tv,
  ServerCrash,
  Ban,
} from 'lucide-react';
import { Button } from './Button';
import {
  classifyError,
  getErrorMessage,
  getErrorTitle,
  getRecoverySuggestions,
  type ErrorCode,
} from '@/lib/error';
import { cn } from '@/lib/utils';

// ==========================================================================
// Types
// ==========================================================================

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  message?: string;
  code?: ErrorCode;
  onRetry?: () => void | Promise<void>;
  showSuggestions?: boolean;
  showHomeLink?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'inline' | 'card';
}

// ==========================================================================
// Icon Mapping
// ==========================================================================

const errorIcons: Record<ErrorCode, typeof AlertCircle> = {
  NOT_FOUND: Search,
  TMDB_ERROR: ServerCrash,
  AI_ERROR: AlertTriangle,
  RATE_LIMITED: Ban,
  INVALID_INPUT: AlertCircle,
  NETWORK_ERROR: WifiOff,
  OFFLINE: WifiOff,
  TIMEOUT: Clock,
  UNKNOWN: AlertCircle,
};

// ==========================================================================
// ErrorState Component
// ==========================================================================

export function ErrorState({
  error,
  title,
  message,
  code,
  onRetry,
  showSuggestions = true,
  showHomeLink = true,
  className = '',
  size = 'md',
  variant = 'default',
}: ErrorStateProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  // Classify error to get code and messages
  const appError = error ? classifyError(error) : null;
  const errorCode = code || appError?.code || 'UNKNOWN';
  const errorTitle = title || (error ? getErrorTitle(error) : 'Error');
  const errorMessage = message || (error ? getErrorMessage(error) : 'Something went wrong');
  const suggestions = showSuggestions ? getRecoverySuggestions({ message: '', code: errorCode } as unknown as Error) : [];

  const Icon = errorIcons[errorCode];

  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, isRetrying]);

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'py-6',
      icon: 'h-8 w-8',
      iconWrapper: 'p-2 mb-3',
      title: 'text-lg',
      message: 'text-sm',
      suggestions: 'text-xs',
    },
    md: {
      container: 'py-8',
      icon: 'h-10 w-10',
      iconWrapper: 'p-3 mb-4',
      title: 'text-xl',
      message: 'text-base',
      suggestions: 'text-sm',
    },
    lg: {
      container: 'min-h-[40vh] py-12',
      icon: 'h-12 w-12',
      iconWrapper: 'p-4 mb-6',
      title: 'text-2xl',
      message: 'text-lg',
      suggestions: 'text-sm',
    },
  };

  const sizes = sizeClasses[size];

  // Variant classes
  const variantClasses = {
    default: 'flex flex-col items-center justify-center text-center',
    inline: 'flex items-start gap-4 text-left',
    card: 'flex flex-col items-center justify-center text-center rounded-xl border border-border-subtle bg-bg-secondary p-6',
  };

  if (variant === 'inline') {
    return (
      <div className={cn(variantClasses.inline, className)}>
        <div className={cn('rounded-full bg-error/10 flex-shrink-0', sizes.iconWrapper)}>
          <Icon className={cn(sizes.icon, 'text-error')} />
        </div>
        <div className="flex-1">
          <h3 className={cn('font-semibold text-text-primary', sizes.title)}>
            {errorTitle}
          </h3>
          <p className={cn('text-text-secondary mt-1', sizes.message)}>
            {errorMessage}
          </p>
          {onRetry && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
              className="mt-3"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(variantClasses[variant], sizes.container, className)}>
      {/* Error Icon */}
      <div className={cn('inline-flex items-center justify-center rounded-full bg-error/10', sizes.iconWrapper)}>
        <Icon className={cn(sizes.icon, 'text-error')} />
      </div>

      {/* Error Title */}
      <h2 className={cn('font-bold text-text-primary', sizes.title)}>
        {errorTitle}
      </h2>

      {/* Error Message */}
      <p className={cn('text-text-secondary mt-2 max-w-md', sizes.message)}>
        {errorMessage}
      </p>

      {/* Recovery Suggestions */}
      {suggestions.length > 0 && (
        <ul className={cn('mt-4 text-text-tertiary list-disc text-left pl-4', sizes.suggestions)}>
          {suggestions.slice(0, 3).map((suggestion, i) => (
            <li key={i}>{suggestion}</li>
          ))}
        </ul>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
        {onRetry && (
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            leftIcon={<RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />}
          >
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Button>
        )}
        {showHomeLink && (
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-bg-tertiary px-6 py-3 font-medium text-text-primary border border-border-default transition-colors hover:bg-border-default"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        )}
      </div>
    </div>
  );
}

// ==========================================================================
// ContentNotFound Component
// Specific error for content not found
// ==========================================================================

interface ContentNotFoundProps {
  type?: 'movie' | 'tv' | 'content';
  className?: string;
}

export function ContentNotFound({ type = 'content', className }: ContentNotFoundProps) {
  const Icon = type === 'movie' ? Film : type === 'tv' ? Tv : Search;
  const typeLabel = type === 'movie' ? 'movie' : type === 'tv' ? 'TV show' : 'content';

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="mb-4 inline-flex items-center justify-center rounded-full bg-bg-tertiary p-4">
        <Icon className="h-10 w-10 text-text-tertiary" />
      </div>
      <h2 className="text-xl font-bold text-text-primary">
        {type === 'content' ? 'Content' : type === 'movie' ? 'Movie' : 'TV Show'} Not Found
      </h2>
      <p className="mt-2 max-w-md text-text-secondary">
        The {typeLabel} you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-bg-tertiary px-6 py-3 font-medium text-text-primary border border-border-default transition-colors hover:bg-border-default"
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
        <Link
          href={type === 'tv' ? '/tv' : '/movies'}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-accent-primary px-6 py-3 font-medium text-text-inverse transition-colors hover:bg-accent-hover"
        >
          <Search className="h-4 w-4" />
          Browse {type === 'tv' ? 'TV Shows' : 'Movies'}
        </Link>
      </div>
    </div>
  );
}

// ==========================================================================
// EmptyState Component
// For when there are no results
// ==========================================================================

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = 'No Results',
  message = 'No content found matching your criteria.',
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="mb-4 inline-flex items-center justify-center rounded-full bg-bg-tertiary p-4">
        {icon || <Search className="h-10 w-10 text-text-tertiary" />}
      </div>
      <h2 className="text-xl font-bold text-text-primary">{title}</h2>
      <p className="mt-2 max-w-md text-text-secondary">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ==========================================================================
// FetchErrorBoundary Component
// Wrapper component that catches fetch errors
// ==========================================================================

interface FetchErrorBoundaryProps {
  error: unknown | null;
  isLoading?: boolean;
  onRetry?: () => void;
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  className?: string;
}

export function FetchErrorBoundary({
  error,
  isLoading = false,
  onRetry,
  children,
  loadingFallback,
  className,
}: FetchErrorBoundaryProps) {
  if (isLoading && loadingFallback) {
    return <>{loadingFallback}</>;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={onRetry}
        showHomeLink={false}
        size="sm"
        variant="card"
        className={className}
      />
    );
  }

  return <>{children}</>;
}
