'use client';

// ==========================================================================
// Offline Banner Component
// Shows when user loses internet connection
// ==========================================================================

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, X } from 'lucide-react';
import { useOnlineStatus } from '@/lib/hooks';
import { cn } from '@/lib/utils';

interface OfflineBannerProps {
  className?: string;
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const { isOnline, wasOffline, isMounted } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show "reconnected" message briefly when coming back online
  useEffect(() => {
    if (isMounted && isOnline && wasOffline) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      const frameId = requestAnimationFrame(() => {
        setShowReconnected(true);
        setDismissed(false);
      });
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [isOnline, wasOffline, isMounted]);

  // Reset dismissed state when going offline
  useEffect(() => {
    if (isMounted && !isOnline) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      const frameId = requestAnimationFrame(() => {
        setDismissed(false);
      });
      return () => cancelAnimationFrame(frameId);
    }
    return undefined;
  }, [isOnline, isMounted]);

  // Don't show anything until mounted (prevents hydration mismatch)
  if (!isMounted) {
    return null;
  }

  // Don't show anything if online and not showing reconnected message
  if (isOnline && !showReconnected) {
    return null;
  }

  // Don't show if dismissed (only for offline banner)
  if (!isOnline && dismissed) {
    return null;
  }

  const handleRefresh = () => {
    window.location.reload();
  };

  // Reconnected message
  if (isOnline && showReconnected) {
    return (
      <div
        className={cn(
          'fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm',
          'animate-fade-in',
          className
        )}
      >
        <div className="flex items-center gap-3 rounded-lg bg-success p-4 text-white shadow-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <WifiOff className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Back Online</p>
            <p className="text-sm opacity-90">Your connection has been restored.</p>
          </div>
        </div>
      </div>
    );
  }

  // Offline banner
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'animate-fade-in',
        className
      )}
    >
      <div className="bg-error px-4 py-3 text-white shadow-lg">
        <div className="container flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <WifiOff className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">You&apos;re Offline</p>
              <p className="text-sm opacity-90">
                Check your internet connection and try again.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/30"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-lg p-2 transition-colors hover:bg-white/20"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// OfflineIndicator Component
// Small indicator in the corner when offline
// ==========================================================================

export function OfflineIndicator() {
  const { isOnline, isMounted } = useOnlineStatus();

  // Don't show until mounted (prevents hydration mismatch)
  if (!isMounted || isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-error/90 px-3 py-1.5 text-sm text-white shadow-lg backdrop-blur-sm">
      <WifiOff className="h-3.5 w-3.5" />
      <span>Offline</span>
    </div>
  );
}
