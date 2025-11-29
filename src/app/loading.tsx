// ==========================================================================
// Global Loading State
// Displayed during route transitions and data fetching
// ==========================================================================

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="mb-6 inline-flex items-center justify-center">
          <div className="relative h-12 w-12">
            {/* Spinning ring */}
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-border-default border-t-accent-primary" />
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 animate-pulse rounded-full bg-accent-primary" />
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <p className="text-text-secondary">Loading...</p>
      </div>
    </div>
  );
}
