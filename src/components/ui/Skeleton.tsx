// ==========================================================================
// Skeleton Component
// Loading placeholder with pulse animation
// ==========================================================================

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const baseStyles = 'skeleton';

  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

// ==========================================================================
// Skeleton Presets
// Common skeleton patterns for content
// ==========================================================================

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-secondary">
      {/* Poster */}
      <Skeleton variant="rectangular" className="aspect-[2/3] w-full" />
      {/* Content */}
      <div className="space-y-2 p-4">
        <Skeleton width="75%" />
        <Skeleton width="50%" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '66%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton variant="circular" width={size} height={size} />;
}

export function SkeletonButton() {
  return <Skeleton variant="rounded" width={120} height={44} />;
}

export function SkeletonHero() {
  return (
    <div className="relative h-[70vh] min-h-[500px] w-full">
      <Skeleton variant="rectangular" className="absolute inset-0" />
      <div className="absolute bottom-0 left-0 max-w-xl p-8">
        <Skeleton width="60%" height={48} className="mb-4" />
        <Skeleton width="80%" className="mb-2" />
        <Skeleton width="60%" className="mb-6" />
        <div className="flex gap-4">
          <SkeletonButton />
          <SkeletonButton />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRow({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-40 flex-shrink-0 sm:w-48">
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 12, columns = 6 }: { count?: number; columns?: number }) {
  const gridClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  };

  return (
    <div className={`grid gap-4 sm:gap-6 ${gridClasses[columns as keyof typeof gridClasses] || gridClasses[6]}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
