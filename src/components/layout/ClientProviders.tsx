'use client';

// ==========================================================================
// Client Providers
// Wraps all client-side providers and global components
// ==========================================================================

import { ToastProvider } from '@/components/ui';
import { OfflineBanner } from '@/components/ui';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ToastProvider>
      {children}
      <OfflineBanner />
    </ToastProvider>
  );
}
