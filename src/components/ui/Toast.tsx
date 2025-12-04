'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

// ==========================================================================
// Types
// ==========================================================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// ==========================================================================
// Context
// ==========================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ==========================================================================
// Toast Provider
// ==========================================================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ==========================================================================
// Toast Container
// ==========================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (typeof window === 'undefined' || toasts.length === 0) return null;

  return createPortal(
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>,
    document.body
  );
}

// ==========================================================================
// Toast Item
// ==========================================================================

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: 'bg-success text-white',
    error: 'bg-error text-white',
    warning: 'bg-warning text-black',
    info: 'bg-info text-white',
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={`flex min-w-[300px] max-w-md items-start gap-3 rounded-lg p-4 shadow-lg animate-fade-in ${colors[toast.type]}`}
      role="alert"
    >
      <Icon className="h-5 w-5 flex-shrink-0" />

      <div className="flex-1">
        <p className="font-medium">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-sm opacity-90">{toast.message}</p>
        )}
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ==========================================================================
// Convenience Functions
// ==========================================================================

export function toast(_options: Omit<Toast, 'id'>) {
  // This is a placeholder - in real usage, you'd need access to the context
  // For a simpler API, you might want to use a global state solution
  console.warn('Toast called outside of provider. Use useToast() hook instead.');
}

toast.success = (title: string, message?: string) => {
  toast({ type: 'success', title, message });
};

toast.error = (title: string, message?: string) => {
  toast({ type: 'error', title, message });
};

toast.warning = (title: string, message?: string) => {
  toast({ type: 'warning', title, message });
};

toast.info = (title: string, message?: string) => {
  toast({ type: 'info', title, message });
};
