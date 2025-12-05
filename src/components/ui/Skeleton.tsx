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

// ==========================================================================
// Detail Page Hero Skeleton
// Full hero section for movie/TV detail pages
// ==========================================================================

export function SkeletonDetailHero() {
  return (
    <section className="relative">
      {/* Backdrop placeholder */}
      <div className="absolute inset-0 z-0 h-full">
        <Skeleton variant="rectangular" className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/80 to-bg-primary/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="container relative z-10 pb-6 pt-20 sm:pb-8 sm:pt-24 md:pb-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:gap-10">
          {/* Mobile Poster + Info Row */}
          <div className="flex gap-4 md:hidden">
            <Skeleton variant="rounded" className="aspect-[2/3] w-28 flex-shrink-0 sm:w-36" />
            <div className="flex flex-col justify-end space-y-2">
              <Skeleton variant="rounded" width={60} height={24} />
              <Skeleton width={50} height={16} />
              <Skeleton width={40} height={12} />
              <Skeleton width={60} height={12} />
            </div>
          </div>

          {/* Desktop Poster */}
          <div className="hidden flex-shrink-0 md:block">
            <Skeleton variant="rounded" className="aspect-[2/3] w-64 lg:w-80" />
          </div>

          {/* Info */}
          <div className="max-w-2xl flex-1">
            {/* Badge + Genres */}
            <div className="mb-4 hidden flex-wrap items-center gap-2 md:flex">
              <Skeleton variant="rounded" width={70} height={28} />
              <Skeleton variant="rounded" width={60} height={28} />
              <Skeleton variant="rounded" width={80} height={28} />
            </div>

            {/* Mobile Genres */}
            <div className="mb-3 flex flex-wrap gap-1.5 md:hidden">
              <Skeleton variant="rounded" width={50} height={20} />
              <Skeleton variant="rounded" width={60} height={20} />
              <Skeleton variant="rounded" width={45} height={20} />
            </div>

            {/* Title */}
            <Skeleton className="h-8 w-3/4 sm:h-10 md:h-12" />

            {/* Tagline */}
            <Skeleton className="mt-2 h-5 w-2/3 sm:mt-3" />

            {/* Stats - Hidden on mobile */}
            <div className="mt-6 hidden flex-wrap items-center gap-6 md:flex">
              <Skeleton variant="rounded" width={100} height={36} />
              <Skeleton width={80} height={20} />
              <Skeleton width={70} height={20} />
            </div>

            {/* Director & Writer */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 sm:mt-4 sm:gap-x-6">
              <Skeleton width={150} height={16} />
              <Skeleton width={130} height={16} />
            </div>

            {/* Overview */}
            <div className="mt-4 space-y-2 sm:mt-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
              <SkeletonButton />
              <SkeletonButton />
              <SkeletonButton />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==========================================================================
// Mini Hero Skeleton
// For similar/category/genre pages
// ==========================================================================

export function SkeletonMiniHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Skeleton variant="rectangular" className="h-full w-full opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-bg-primary/60" />
      </div>

      <div className="container relative py-12 sm:py-16 lg:py-20">
        <Skeleton className="h-10 w-1/2 sm:h-12 lg:h-14" />
        <Skeleton className="mt-3 h-5 w-2/3 max-w-2xl" />
      </div>
    </section>
  );
}

// ==========================================================================
// Cast Section Skeleton
// Horizontal row of cast member cards
// ==========================================================================

export function SkeletonCastCard() {
  return (
    <div className="w-32 flex-shrink-0 sm:w-36">
      {/* Photo */}
      <Skeleton variant="rounded" className="aspect-[2/3] w-full" />
      {/* Info */}
      <div className="mt-2 space-y-1">
        <Skeleton width="85%" height={14} />
        <Skeleton width="65%" height={12} />
      </div>
    </div>
  );
}

export function SkeletonCastRow({ count = 12 }: { count?: number }) {
  return (
    <section>
      <Skeleton width={60} height={28} className="mb-4 sm:mb-6" />
      <div className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCastCard key={i} />
        ))}
      </div>
    </section>
  );
}

// ==========================================================================
// Search Results Skeleton
// Skeleton for search dropdown results
// ==========================================================================

export function SkeletonSearchResult() {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {/* Poster */}
      <Skeleton variant="rounded" className="h-14 w-10 flex-shrink-0" />
      {/* Info */}
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={14} />
      </div>
      {/* Badge */}
      <Skeleton variant="rounded" width={50} height={20} className="flex-shrink-0" />
    </div>
  );
}

export function SkeletonSearchResults({ count = 6 }: { count?: number }) {
  return (
    <div className="py-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonSearchResult key={i} />
      ))}
    </div>
  );
}

// ==========================================================================
// Filter Sidebar Skeleton
// Skeleton for browse page filters
// ==========================================================================

function SkeletonFilterSection() {
  return (
    <div className="border-b border-border-subtle pb-4">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <Skeleton width={80} height={18} />
        <Skeleton variant="rounded" width={16} height={16} />
      </div>
      {/* Content */}
      <div className="pt-3">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={60 + Math.random() * 30} height={32} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonFilterSidebar() {
  return (
    <aside className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton width={60} height={24} />
      </div>

      {/* Genre Filter */}
      <SkeletonFilterSection />

      {/* Year Filter */}
      <div className="border-b border-border-subtle pb-4">
        <div className="flex items-center justify-between py-2">
          <Skeleton width={40} height={18} />
          <Skeleton variant="rounded" width={16} height={16} />
        </div>
        <div className="flex items-center gap-2 pt-3">
          <Skeleton variant="rounded" className="h-10 flex-1" />
          <Skeleton width={10} height={16} />
          <Skeleton variant="rounded" className="h-10 flex-1" />
        </div>
      </div>

      {/* Rating Filter */}
      <div className="border-b border-border-subtle pb-4">
        <div className="flex items-center justify-between py-2">
          <Skeleton width={100} height={18} />
          <Skeleton variant="rounded" width={16} height={16} />
        </div>
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <Skeleton width={70} height={14} />
          </div>
          <Skeleton variant="rounded" className="h-2 w-full" />
          <div className="flex justify-between">
            <Skeleton width={25} height={12} />
            <Skeleton width={15} height={12} />
            <Skeleton width={20} height={12} />
          </div>
        </div>
      </div>

      {/* Language Filter */}
      <div className="border-b border-border-subtle pb-4">
        <div className="flex items-center justify-between py-2">
          <Skeleton width={70} height={18} />
          <Skeleton variant="rounded" width={16} height={16} />
        </div>
        <Skeleton variant="rounded" className="mt-3 h-10 w-full" />
      </div>

      {/* Provider Filter */}
      <div className="border-b border-border-subtle pb-4">
        <div className="flex items-center justify-between py-2">
          <Skeleton width={120} height={18} />
          <Skeleton variant="rounded" width={16} height={16} />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" className="h-10" />
          ))}
        </div>
      </div>
    </aside>
  );
}

// ==========================================================================
// Streaming Providers Skeleton
// Skeleton for where to watch section
// ==========================================================================

export function SkeletonStreamingProviders() {
  return (
    <section>
      <Skeleton width={140} height={28} className="mb-4 sm:mb-6" />
      <div className="rounded-xl border border-border-subtle bg-bg-secondary p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton variant="rounded" width={24} height={24} />
          <Skeleton width={120} height={20} />
        </div>
        <div className="space-y-4">
          <div>
            <Skeleton width={80} height={14} className="mb-2" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" width={48} height={48} />
              ))}
            </div>
          </div>
          <div>
            <Skeleton width={60} height={14} className="mb-2" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" width={48} height={48} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==========================================================================
// Browse Page Skeleton
// Full browse page with sidebar and grid
// ==========================================================================

export function SkeletonBrowsePage() {
  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-10 w-48 sm:h-12" />
        <Skeleton className="mt-2 h-5 w-96 max-w-full" />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar */}
        <div className="w-full lg:w-64 lg:flex-shrink-0">
          <SkeletonFilterSidebar />
        </div>

        {/* Content Grid */}
        <div className="flex-1">
          <SkeletonGrid count={12} columns={4} />
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// Detail Page Skeleton
// Full detail page with hero, trailer, info, cast
// ==========================================================================

export function SkeletonDetailPage() {
  return (
    <>
      <SkeletonDetailHero />

      <main className="container py-12 md:py-16">
        {/* Trailer & About Section */}
        <section className="grid gap-8 lg:grid-cols-2">
          {/* Trailer */}
          <Skeleton variant="rounded" className="aspect-video w-full" />

          {/* About */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border-subtle bg-bg-secondary p-4 sm:p-6">
              <Skeleton width={140} height={24} className="mb-4" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton variant="rounded" width={32} height={32} />
                    <div className="space-y-1">
                      <Skeleton width={60} height={12} />
                      <Skeleton width={100} height={16} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg-secondary p-4 sm:p-6">
              <Skeleton width={100} height={14} className="mb-4" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" width={80} height={40} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Similar Content */}
        <div className="mt-16">
          <Skeleton width={140} height={28} className="mb-4" />
          <SkeletonRow count={6} />
        </div>

        {/* Streaming Providers */}
        <div className="mt-16">
          <SkeletonStreamingProviders />
        </div>

        {/* Cast Section */}
        <div className="mt-16">
          <SkeletonCastRow />
        </div>
      </main>
    </>
  );
}
