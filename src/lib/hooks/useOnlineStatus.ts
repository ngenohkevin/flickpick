// ==========================================================================
// useOnlineStatus Hook
// Detects online/offline status changes with actual connectivity verification
// ==========================================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnline: Date | null;
}

// Verify actual connectivity by attempting a fetch
// Uses a lightweight endpoint that should always be available
async function checkActualConnectivity(): Promise<boolean> {
  try {
    // Try to fetch a tiny resource with a short timeout
    // Using the site's own favicon or a HEAD request to avoid CORS issues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    // If fetch fails, try one more check with navigator.onLine
    // Only report offline if both checks fail
    return navigator.onLine;
  }
}

export function useOnlineStatus(): OnlineStatus & { isMounted: boolean } {
  // Always start with isOnline: true to avoid hydration mismatch
  // and prevent false offline banner during SSR
  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: true,
    wasOffline: false,
    lastOnline: null,
  });
  const [isMounted, setIsMounted] = useState(false);
  const checkInProgress = useRef(false);

  const verifyAndSetOnlineStatus = useCallback(async (navigatorSaysOffline: boolean) => {
    // If navigator says we're online, trust it
    if (!navigatorSaysOffline) {
      setStatus((prev) => ({
        isOnline: true,
        wasOffline: !prev.isOnline,
        lastOnline: new Date(),
      }));
      return;
    }

    // If navigator says offline, verify with an actual request
    // This prevents false positives on mobile browsers
    if (checkInProgress.current) return;
    checkInProgress.current = true;

    const actuallyOnline = await checkActualConnectivity();
    checkInProgress.current = false;

    if (actuallyOnline) {
      // navigator.onLine was wrong, we're actually online
      setStatus((prev) => ({
        isOnline: true,
        wasOffline: prev.wasOffline,
        lastOnline: new Date(),
      }));
    } else {
      // Confirmed offline
      setStatus((prev) => ({
        ...prev,
        isOnline: false,
      }));
    }
  }, []);

  const handleOnline = useCallback(() => {
    setStatus((prev) => ({
      isOnline: true,
      wasOffline: !prev.isOnline,
      lastOnline: new Date(),
    }));
  }, []);

  const handleOffline = useCallback(() => {
    // Don't immediately trust the offline event - verify first
    verifyAndSetOnlineStatus(true);
  }, [verifyAndSetOnlineStatus]);

  useEffect(() => {
    // Use requestAnimationFrame to avoid synchronous setState in effect
    const frameId = requestAnimationFrame(() => {
      setIsMounted(true);
      // On mount, only check if navigator reports offline
      // If online, trust it. If offline, verify.
      if (navigator.onLine) {
        setStatus({
          isOnline: true,
          wasOffline: false,
          lastOnline: new Date(),
        });
      } else {
        // Verify the offline status
        verifyAndSetOnlineStatus(true);
      }
    });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline, verifyAndSetOnlineStatus]);

  return { ...status, isMounted };
}

// ==========================================================================
// useConnectionQuality Hook
// Detects connection quality using Network Information API
// ==========================================================================

interface ConnectionQuality {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
}

export function useConnectionQuality(): ConnectionQuality {
  const [quality, setQuality] = useState<ConnectionQuality>({
    effectiveType: 'unknown',
    downlink: null,
    rtt: null,
    saveData: false,
  });

  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: {
        effectiveType: string;
        downlink: number;
        rtt: number;
        saveData: boolean;
        addEventListener: (event: string, handler: () => void) => void;
        removeEventListener: (event: string, handler: () => void) => void;
      };
    }).connection;

    if (!connection) return;

    const updateQuality = () => {
      setQuality({
        effectiveType: connection.effectiveType as ConnectionQuality['effectiveType'],
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      });
    };

    updateQuality();
    connection.addEventListener('change', updateQuality);

    return () => {
      connection.removeEventListener('change', updateQuality);
    };
  }, []);

  return quality;
}
