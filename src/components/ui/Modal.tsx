'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// ==========================================================================
// Modal Component
// Accessible modal dialog with portal rendering
// ==========================================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = '',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Focus trap and scroll lock
  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Lock body scroll
      document.body.style.overflow = 'hidden';

      // Focus the modal
      modalRef.current?.focus();

      // Add escape listener
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);

      // Restore focus
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative w-full ${sizeStyles[size]} rounded-xl bg-bg-secondary shadow-xl ring-1 ring-border-subtle animate-fade-in ${className}`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between border-b border-border-subtle p-6">
            <div>
              {title && (
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-text-primary"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="modal-description"
                  className="mt-1 text-sm text-text-secondary"
                >
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                onClick={onClose}
                className="rounded-full p-1 text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={title || showCloseButton ? 'p-6' : 'p-6'}>{children}</div>
      </div>
    </div>
  );

  // Render in portal
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}

// ==========================================================================
// Modal Footer
// Helper component for modal action buttons
// ==========================================================================

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div
      className={`mt-6 flex items-center justify-end gap-3 border-t border-border-subtle pt-6 ${className}`}
    >
      {children}
    </div>
  );
}

// ==========================================================================
// Confirm Modal
// Pre-built confirmation dialog
// ==========================================================================

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-text-secondary">{message}</p>

      <ModalFooter>
        <button
          onClick={onClose}
          disabled={isLoading}
          className="rounded-md border border-border-default bg-bg-tertiary px-4 py-2 font-medium text-text-primary transition-colors hover:bg-border-default disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`rounded-md px-4 py-2 font-medium text-white transition-colors disabled:opacity-50 ${
            variant === 'danger'
              ? 'bg-error hover:bg-error/90'
              : 'bg-accent-primary hover:bg-accent-hover'
          }`}
        >
          {isLoading ? 'Loading...' : confirmLabel}
        </button>
      </ModalFooter>
    </Modal>
  );
}
