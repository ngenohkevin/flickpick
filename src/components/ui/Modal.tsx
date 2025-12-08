'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// ==========================================================================
// Modal Component
// Accessible modal dialog with portal rendering and animations
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle close with animation (defined first so it can be referenced)
  const handleClose = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    // Wait for animation to complete before closing
    setTimeout(() => {
      setIsAnimating(false);
      onClose();
    }, 150); // Match animation duration
  }, [onClose, isAnimating]);

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape && !isAnimating) {
        handleClose();
      }
    },
    [closeOnEscape, isAnimating, handleClose]
  );

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget && !isAnimating) {
      handleClose();
    }
  };

  // Handle open/close state
  useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      const frameId = requestAnimationFrame(() => {
        setShouldRender(true);
        setIsAnimating(false);
      });
      return () => cancelAnimationFrame(frameId);
    }
    return undefined;
  }, [isOpen]);

  // Focus trap and scroll lock
  useEffect(() => {
    if (isOpen && shouldRender) {
      // Store previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Lock body scroll
      document.body.style.overflow = 'hidden';

      // Focus the modal after a brief delay for animation
      setTimeout(() => modalRef.current?.focus(), 50);

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
  }, [isOpen, shouldRender, handleEscape]);

  // Reset render state when fully closed
  useEffect(() => {
    if (!isOpen && !isAnimating) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      const frameId = requestAnimationFrame(() => {
        setShouldRender(false);
      });
      return () => cancelAnimationFrame(frameId);
    }
    return undefined;
  }, [isOpen, isAnimating]);

  if (!shouldRender) return null;

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
      {/* Backdrop with fade animation */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm ${
          isAnimating ? 'animate-backdrop-out' : 'animate-backdrop-in'
        }`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Panel with scale animation */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative w-full ${sizeStyles[size]} rounded-xl bg-bg-secondary shadow-xl ring-1 ring-border-subtle ${
          isAnimating ? 'animate-scale-out' : 'animate-scale-in'
        } ${className}`}
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
                onClick={handleClose}
                className="rounded-full p-1 text-text-tertiary transition-all hover:bg-bg-tertiary hover:text-text-primary hover:scale-110 btn-press"
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
          className="rounded-md border border-border-default bg-bg-tertiary px-4 py-2 font-medium text-text-primary transition-all hover:bg-border-default disabled:opacity-50 btn-press"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`rounded-md px-4 py-2 font-medium text-white transition-all disabled:opacity-50 btn-press ${
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
