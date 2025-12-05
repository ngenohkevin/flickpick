// ==========================================================================
// useOnlineStatus Hook
// Detects online/offline status changes
// ==========================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnline: Date | null;
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

  const handleOnline = useCallback(() => {
    setStatus((prev) => ({
      isOnline: true,
      wasOffline: !prev.isOnline, // Was offline before this event
      lastOnline: new Date(),
    }));
  }, []);

  const handleOffline = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      isOnline: false,
    }));
  }, []);

  useEffect(() => {
    // Mark as mounted and set actual online status
    setIsMounted(true);
    setStatus({
      isOnline: navigator.onLine,
      wasOffline: false,
      lastOnline: navigator.onLine ? new Date() : null,
    });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

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
