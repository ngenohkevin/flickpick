'use client';

// ==========================================================================
// useErrorToast Hook
// Convenient hook for showing error notifications via toast
// ==========================================================================

import { useCallback } from 'react';
import { useToast } from '@/components/ui';
import { classifyError, getErrorTitle, getErrorMessage, logError, type ErrorCode } from '@/lib/error';

interface ErrorToastOptions {
  /** Custom title override */
  title?: string;
  /** Custom message override */
  message?: string;
  /** Toast duration in ms (default: 5000) */
  duration?: number;
  /** Whether to log the error (default: true) */
  log?: boolean;
  /** Additional context for logging */
  context?: {
    component?: string;
    action?: string;
  };
}

export function useErrorToast() {
  const { addToast } = useToast();

  /**
   * Show an error toast notification
   */
  const showError = useCallback(
    (error: unknown, options: ErrorToastOptions = {}) => {
      const {
        title,
        message,
        duration = 5000,
        log = true,
        context,
      } = options;

      // Log the error
      if (log) {
        logError(error, context);
      }

      // Get error details
      const errorTitle = title || getErrorTitle(error);
      const errorMessage = message || getErrorMessage(error);

      // Show toast
      addToast({
        type: 'error',
        title: errorTitle,
        message: errorMessage,
        duration,
      });
    },
    [addToast]
  );

  /**
   * Show a network error toast
   */
  const showNetworkError = useCallback(
    (options: Omit<ErrorToastOptions, 'title' | 'message'> = {}) => {
      addToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Please check your internet connection and try again.',
        duration: options.duration || 5000,
      });
    },
    [addToast]
  );

  /**
   * Show a rate limit error toast
   */
  const showRateLimitError = useCallback(
    (options: Omit<ErrorToastOptions, 'title' | 'message'> = {}) => {
      addToast({
        type: 'warning',
        title: 'Slow Down',
        message: 'You\'re making requests too quickly. Please wait a moment.',
        duration: options.duration || 7000,
      });
    },
    [addToast]
  );

  /**
   * Show a validation error toast
   */
  const showValidationError = useCallback(
    (message: string, options: Omit<ErrorToastOptions, 'title' | 'message'> = {}) => {
      addToast({
        type: 'warning',
        title: 'Invalid Input',
        message,
        duration: options.duration || 5000,
      });
    },
    [addToast]
  );

  /**
   * Show a generic warning toast
   */
  const showWarning = useCallback(
    (title: string, message?: string, duration = 5000) => {
      addToast({
        type: 'warning',
        title,
        message,
        duration,
      });
    },
    [addToast]
  );

  /**
   * Show a success toast
   */
  const showSuccess = useCallback(
    (title: string, message?: string, duration = 3000) => {
      addToast({
        type: 'success',
        title,
        message,
        duration,
      });
    },
    [addToast]
  );

  /**
   * Show an info toast
   */
  const showInfo = useCallback(
    (title: string, message?: string, duration = 4000) => {
      addToast({
        type: 'info',
        title,
        message,
        duration,
      });
    },
    [addToast]
  );

  return {
    showError,
    showNetworkError,
    showRateLimitError,
    showValidationError,
    showWarning,
    showSuccess,
    showInfo,
  };
}

// ==========================================================================
// Helper function to show error based on error code
// ==========================================================================

export function getToastTypeForError(code: ErrorCode): 'error' | 'warning' | 'info' {
  switch (code) {
    case 'RATE_LIMITED':
    case 'INVALID_INPUT':
      return 'warning';
    case 'OFFLINE':
      return 'info';
    default:
      return 'error';
  }
}
