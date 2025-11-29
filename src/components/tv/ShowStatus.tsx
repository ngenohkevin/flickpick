'use client';

// ==========================================================================
// Show Status Component
// Displays the current status of a TV show (Returning, Ended, etc.)
// ==========================================================================

import { Circle, CheckCircle2, XCircle, Clock, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================================================
// Types
// ==========================================================================

interface ShowStatusProps {
  status: string;
  inProduction?: boolean;
  className?: string;
}

type StatusConfig = {
  label: string;
  icon: typeof Circle;
  className: string;
};

// ==========================================================================
// Status Configuration
// ==========================================================================

const statusConfig: Record<string, StatusConfig> = {
  'Returning Series': {
    label: 'Returning',
    icon: PlayCircle,
    className: 'bg-success/20 text-success',
  },
  'Ended': {
    label: 'Ended',
    icon: CheckCircle2,
    className: 'bg-text-tertiary/20 text-text-tertiary',
  },
  'Canceled': {
    label: 'Canceled',
    icon: XCircle,
    className: 'bg-error/20 text-error',
  },
  'In Production': {
    label: 'In Production',
    icon: Clock,
    className: 'bg-info/20 text-info',
  },
  'Pilot': {
    label: 'Pilot',
    icon: Circle,
    className: 'bg-warning/20 text-warning',
  },
  'Planned': {
    label: 'Planned',
    icon: Clock,
    className: 'bg-warning/20 text-warning',
  },
};

const defaultConfig: StatusConfig = {
  label: 'Unknown',
  icon: Circle,
  className: 'bg-text-tertiary/20 text-text-tertiary',
};

// ==========================================================================
// Show Status Component
// ==========================================================================

export function ShowStatus({ status, inProduction, className }: ShowStatusProps) {
  // Determine the config based on status, with override for in_production
  let config: StatusConfig = statusConfig[status] ?? defaultConfig;

  // If in production but status says "Ended", show as "Returning"
  if (inProduction && status === 'Ended') {
    config = statusConfig['Returning Series'] ?? defaultConfig;
  }

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
