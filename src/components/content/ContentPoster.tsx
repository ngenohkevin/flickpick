'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Film } from 'lucide-react';
import { getPosterUrl } from '@/lib/utils';

// ==========================================================================
// Content Poster Component
// Optimized poster image with lazy loading and placeholder
// ==========================================================================

interface ContentPosterProps {
  path: string | null;
  alt: string;
  size?: 'small' | 'medium' | 'large';
  priority?: boolean;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}

const POSTER_DIMENSIONS = {
  small: { width: 185, height: 278 },
  medium: { width: 342, height: 513 },
  large: { width: 500, height: 750 },
};

const BLUR_DATA_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkMjU1LC0yMi4xODY6NT04Mj4+QUlBR0pHPklKWlpYXlpgYGBg/2wBDAVUXFx4aHh4gIB4kJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJD/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWERM0teleL/xAAVAQEBAAAAAAAAAAAAAAAAAAAAAf/EABkRAAIDAQAAAAAAAAAAAAAAAAABAhExQf/aAAwDAQACEQMRAD8AoZ9EYm0klsLGzkJkUMzPlFJPABsemIopYogACigK0Kf/2Q==";

// Placeholder component shown when image fails to load
function PosterPlaceholder({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`flex items-center justify-center bg-bg-tertiary ${className}`}
      style={style}
    >
      <Film className="h-12 w-12 text-text-tertiary" />
    </div>
  );
}

export function ContentPoster({
  path,
  alt,
  size = 'medium',
  priority = false,
  className = '',
  fill = false,
  width,
  height,
}: ContentPosterProps) {
  const [hasError, setHasError] = useState(false);
  const url = getPosterUrl(path, size);
  const dimensions = POSTER_DIMENSIONS[size];

  // Show placeholder if no path or if image failed to load
  if (!path || hasError) {
    if (fill) {
      return <PosterPlaceholder className={`absolute inset-0 ${className}`} />;
    }
    return (
      <PosterPlaceholder
        className={`${className}`}
        style={{ width: width ?? dimensions.width, height: height ?? dimensions.height }}
      />
    );
  }

  // Use fill mode for responsive containers
  if (fill) {
    return (
      <Image
        src={url}
        alt={alt}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        priority={priority}
        className={`object-cover ${className}`}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        onError={() => setHasError(true)}
      />
    );
  }

  // Fixed dimensions mode
  return (
    <Image
      src={url}
      alt={alt}
      width={width ?? dimensions.width}
      height={height ?? dimensions.height}
      priority={priority}
      className={`object-cover ${className}`}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      onError={() => setHasError(true)}
    />
  );
}
