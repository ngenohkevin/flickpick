'use client';

// ==========================================================================
// Ad Player Component
// Displays pre-roll video ads with skip functionality
// ==========================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, VolumeX, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adProvider } from '@/lib/ads';
import type { Ad, AdPlayerState } from '@/lib/ads/types';

// ==========================================================================
// Types
// ==========================================================================

interface AdPlayerProps {
  /** The ad to display */
  ad: Ad;
  /** Called when the ad finishes (completed or skipped) */
  onAdComplete: () => void;
  /** Called if there's an error */
  onAdError?: (error: string) => void;
  /** Additional class names */
  className?: string;
}

// ==========================================================================
// Ad Player Component
// ==========================================================================

export function AdPlayer({ ad, onAdComplete, onAdError, className }: AdPlayerProps) {
  // State
  const [state, setState] = useState<AdPlayerState>({
    status: 'loading',
    currentAd: ad,
    skipCountdown: ad.skipAfter ?? 5,
    watchedSeconds: 0,
  });
  const [isMuted, setIsMuted] = useState(true);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // ==========================================================================
  // Timer Logic
  // ==========================================================================

  useEffect(() => {
    // Start playing immediately (use requestAnimationFrame to avoid sync setState)
    const frameId = requestAnimationFrame(() => {
      setState((prev) => ({ ...prev, status: 'playing' }));
      startTimeRef.current = Date.now();
    });

    // Track impression
    adProvider.trackImpression(ad);

    // Start countdown timer
    timerRef.current = setInterval(() => {
      setState((prev) => {
        const newWatchedSeconds = prev.watchedSeconds + 1;
        const newSkipCountdown = Math.max(0, prev.skipCountdown - 1);

        // Check if ad completed naturally
        if (ad.duration && newWatchedSeconds >= ad.duration) {
          return {
            ...prev,
            status: 'completed',
            watchedSeconds: newWatchedSeconds,
            skipCountdown: 0,
          };
        }

        // Check if skip is now available
        if (ad.skippable && newSkipCountdown === 0 && prev.status === 'playing') {
          return {
            ...prev,
            status: 'skippable',
            watchedSeconds: newWatchedSeconds,
            skipCountdown: 0,
          };
        }

        return {
          ...prev,
          watchedSeconds: newWatchedSeconds,
          skipCountdown: newSkipCountdown,
        };
      });
    }, 1000);

    return () => {
      cancelAnimationFrame(frameId);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [ad]);

  // Handle ad completion
  useEffect(() => {
    if (state.status === 'completed') {
      adProvider.trackComplete(ad);
      onAdComplete();
    }
  }, [state.status, ad, onAdComplete]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleSkip = useCallback(() => {
    if (state.status !== 'skippable') return;

    setState((prev) => ({ ...prev, status: 'skipped' }));
    adProvider.trackSkip(ad, state.watchedSeconds);
    onAdComplete();
  }, [state.status, state.watchedSeconds, ad, onAdComplete]);

  const handleClick = useCallback(() => {
    if (ad.clickUrl) {
      adProvider.trackClick(ad);
      window.open(ad.clickUrl, '_blank', 'noopener,noreferrer');
    }
  }, [ad]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div
      className={cn(
        'relative aspect-video w-full overflow-hidden bg-black',
        className
      )}
    >
      {/* Ad Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {ad.videoUrl ? (
          // Real video ad
          <video
            src={ad.videoUrl}
            autoPlay
            muted={isMuted}
            playsInline
            className="h-full w-full object-contain"
            onEnded={() => setState((prev) => ({ ...prev, status: 'completed' }))}
            onError={() => {
              setState((prev) => ({ ...prev, status: 'error', error: 'Failed to load ad' }));
              onAdError?.('Failed to load ad');
              onAdComplete();
            }}
          />
        ) : (
          // Placeholder ad (no video URL)
          <PlaceholderAdContent ad={ad} onClick={handleClick} />
        )}
      </div>

      {/* Top Bar - Ad Label & Timer */}
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-yellow-500 px-2 py-0.5 text-xs font-bold text-black">
            AD
          </span>
          {ad.advertiser && (
            <span className="text-xs text-white/80">{ad.advertiser}</span>
          )}
        </div>

        {/* Duration indicator */}
        {ad.duration && (
          <span className="text-xs text-white/60">
            {Math.max(0, ad.duration - state.watchedSeconds)}s
          </span>
        )}
      </div>

      {/* Bottom Bar - Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex items-center justify-between">
          {/* Left side - Mute button & Learn More */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>

            {ad.clickUrl && (
              <button
                onClick={handleClick}
                className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/30"
              >
                <span>Learn More</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Right side - Skip button */}
          <SkipButton
            status={state.status}
            countdown={state.skipCountdown}
            onSkip={handleSkip}
            skippable={ad.skippable}
          />
        </div>
      </div>

      {/* Progress Bar */}
      {ad.duration && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-yellow-500 transition-all duration-1000"
            style={{
              width: `${(state.watchedSeconds / ad.duration) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// Skip Button Component
// ==========================================================================

interface SkipButtonProps {
  status: AdPlayerState['status'];
  countdown: number;
  onSkip: () => void;
  skippable: boolean;
}

function SkipButton({ status, countdown, onSkip, skippable }: SkipButtonProps) {
  if (!skippable) {
    return null;
  }

  if (status === 'playing' && countdown > 0) {
    return (
      <div className="flex items-center gap-2 rounded bg-black/60 px-3 py-1.5 text-sm text-white">
        <span>Skip in</span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
          {countdown}
        </span>
      </div>
    );
  }

  if (status === 'skippable') {
    return (
      <button
        onClick={onSkip}
        className="flex items-center gap-2 rounded bg-white px-4 py-1.5 text-sm font-medium text-black transition-transform hover:scale-105"
      >
        Skip Ad
        <span className="text-lg">→</span>
      </button>
    );
  }

  return null;
}

// ==========================================================================
// Placeholder Ad Content
// ==========================================================================

interface PlaceholderAdContentProps {
  ad: Ad;
  onClick: () => void;
}

function PlaceholderAdContent({ ad, onClick }: PlaceholderAdContentProps) {
  return (
    <button
      onClick={onClick}
      className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 text-center"
    >
      {/* Placeholder branding */}
      <div className="mb-4 rounded-lg bg-yellow-500/20 p-4">
        <span className="text-4xl">📺</span>
      </div>

      <h3 className="text-xl font-bold text-white">{ad.title || 'Advertisement'}</h3>

      {ad.advertiser && (
        <p className="mt-2 text-sm text-white/60">
          Sponsored by {ad.advertiser}
        </p>
      )}

      <p className="mt-4 text-xs text-white/40">
        Click to learn more
      </p>

      {/* Dev mode indicator */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded bg-purple-500/20 px-2 py-1 text-xs text-purple-300">
        Placeholder Ad (Dev Mode)
      </div>
    </button>
  );
}

export default AdPlayer;
