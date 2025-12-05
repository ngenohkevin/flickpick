// ==========================================================================
// Error Handling Utilities
// Centralized error logging and handling
// ==========================================================================

// ==========================================================================
// Error Types
// ==========================================================================

export type ErrorCode =
  | 'NOT_FOUND'
  | 'TMDB_ERROR'
  | 'AI_ERROR'
  | 'RATE_LIMITED'
  | 'INVALID_INPUT'
  | 'NETWORK_ERROR'
  | 'OFFLINE'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface ApiError {
  error: string;
  code: ErrorCode;
  details?: string;
  statusCode?: number;
}

export class AppError extends Error {
  code: ErrorCode;
  details?: string;
  statusCode?: number;
  originalError?: Error;

  constructor(
    message: string,
    code: ErrorCode = 'UNKNOWN',
    options?: {
      details?: string;
      statusCode?: number;
      originalError?: Error;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = options?.details;
    this.statusCode = options?.statusCode;
    this.originalError = options?.originalError;
  }

  toJSON(): ApiError {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
      statusCode: this.statusCode,
    };
  }
}

// ==========================================================================
// Error Classification
// ==========================================================================

export function classifyError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Fetch errors
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return new AppError(
      'Unable to connect to the server',
      'NETWORK_ERROR',
      { originalError: error as Error }
    );
  }

  // Timeout errors
  if (error instanceof Error && error.name === 'AbortError') {
    return new AppError(
      'Request timed out',
      'TIMEOUT',
      { originalError: error }
    );
  }

  // Generic errors
  if (error instanceof Error) {
    // Check for common patterns
    if (error.message.includes('404') || error.message.includes('not found')) {
      return new AppError('Content not found', 'NOT_FOUND', { originalError: error });
    }
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return new AppError('Too many requests', 'RATE_LIMITED', { originalError: error });
    }
    if (error.message.includes('TMDB') || error.message.includes('tmdb')) {
      return new AppError('Failed to fetch content data', 'TMDB_ERROR', { originalError: error });
    }

    return new AppError(error.message, 'UNKNOWN', { originalError: error });
  }

  // Unknown error type
  return new AppError(
    typeof error === 'string' ? error : 'An unexpected error occurred',
    'UNKNOWN'
  );
}

// ==========================================================================
// Error Logging
// ==========================================================================

interface ErrorLogContext {
  component?: string;
  action?: string;
  userId?: string;
  url?: string;
  additionalData?: Record<string, unknown>;
}

export function logError(error: unknown, context?: ErrorLogContext): void {
  const appError = classifyError(error);
  const timestamp = new Date().toISOString();

  const logEntry = {
    timestamp,
    error: {
      message: appError.message,
      code: appError.code,
      details: appError.details,
      stack: appError.stack,
    },
    context: {
      ...context,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    },
  };

  // Console logging in development
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error [${appError.code}]`);
    console.error('Message:', appError.message);
    if (appError.details) console.error('Details:', appError.details);
    if (context) console.error('Context:', context);
    if (appError.originalError) console.error('Original:', appError.originalError);
    console.groupEnd();
  } else {
    // Production: structured logging
    console.error(JSON.stringify(logEntry));
  }

  // TODO: Send to error reporting service (e.g., Sentry, LogRocket)
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  //   Sentry.captureException(appError, { extra: context });
  // }
}

// ==========================================================================
// User-Friendly Error Messages
// ==========================================================================

export function getErrorMessage(error: unknown): string {
  const appError = classifyError(error);

  const messages: Record<ErrorCode, string> = {
    NOT_FOUND: 'The content you\'re looking for doesn\'t exist or has been removed.',
    TMDB_ERROR: 'We\'re having trouble loading content data. Please try again.',
    AI_ERROR: 'Our recommendation engine is temporarily unavailable. Please try again.',
    RATE_LIMITED: 'You\'re making requests too quickly. Please wait a moment.',
    INVALID_INPUT: 'Please check your input and try again.',
    NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
    OFFLINE: 'You appear to be offline. Please check your connection.',
    TIMEOUT: 'The request took too long. Please try again.',
    UNKNOWN: 'Something went wrong. Please try again.',
  };

  return messages[appError.code] || messages.UNKNOWN;
}

export function getErrorTitle(error: unknown): string {
  const appError = classifyError(error);

  const titles: Record<ErrorCode, string> = {
    NOT_FOUND: 'Not Found',
    TMDB_ERROR: 'Content Error',
    AI_ERROR: 'AI Unavailable',
    RATE_LIMITED: 'Slow Down',
    INVALID_INPUT: 'Invalid Input',
    NETWORK_ERROR: 'Connection Error',
    OFFLINE: 'You\'re Offline',
    TIMEOUT: 'Request Timeout',
    UNKNOWN: 'Error',
  };

  return titles[appError.code] || titles.UNKNOWN;
}

// ==========================================================================
// Error Recovery Suggestions
// ==========================================================================

export function getRecoverySuggestions(error: unknown): string[] {
  const appError = classifyError(error);

  const suggestions: Record<ErrorCode, string[]> = {
    NOT_FOUND: [
      'Check if the URL is correct',
      'The content may have been removed',
      'Try searching for the content instead',
    ],
    TMDB_ERROR: [
      'Try refreshing the page',
      'Wait a few moments and try again',
      'Check back later if the problem persists',
    ],
    AI_ERROR: [
      'Try a simpler search query',
      'Browse by genre or category instead',
      'Try again in a few moments',
    ],
    RATE_LIMITED: [
      'Wait 30 seconds before trying again',
      'Reduce the number of requests',
    ],
    INVALID_INPUT: [
      'Check your search terms',
      'Remove special characters',
      'Try a shorter query',
    ],
    NETWORK_ERROR: [
      'Check your internet connection',
      'Try disabling your VPN',
      'Refresh the page',
    ],
    OFFLINE: [
      'Connect to the internet',
      'Check your WiFi or mobile data',
      'Try again when online',
    ],
    TIMEOUT: [
      'Check your internet connection',
      'Try again with a simpler request',
      'The server may be busy, try later',
    ],
    UNKNOWN: [
      'Try refreshing the page',
      'Clear your browser cache',
      'Try again later',
    ],
  };

  return suggestions[appError.code] || suggestions.UNKNOWN;
}

// ==========================================================================
// Async Error Wrapper
// ==========================================================================

export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: ErrorLogContext
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logError(error, context);
    throw classifyError(error);
  }
}

// ==========================================================================
// Retry Logic
// ==========================================================================

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoff?: boolean;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoff = true,
    shouldRetry = (error) => {
      const appError = classifyError(error);
      // Don't retry client errors or not found
      return !['NOT_FOUND', 'INVALID_INPUT', 'RATE_LIMITED'].includes(appError.code);
    },
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries && shouldRetry(error, attempt)) {
        const delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
