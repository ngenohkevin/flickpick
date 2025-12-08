import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

// ==========================================================================
// OG Image Generation API
// Generates dynamic Open Graph images for social sharing
// ==========================================================================

export const runtime = 'edge';

// Image dimensions for optimal social media display
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get parameters
    const title = searchParams.get('title') || 'FlickPick';
    const subtitle = searchParams.get('subtitle') || '';
    const type = searchParams.get('type') || 'movie'; // movie, tv, animation, anime
    const rating = searchParams.get('rating') || '';
    const year = searchParams.get('year') || '';
    const posterUrl = searchParams.get('poster') || '';
    const backdropUrl = searchParams.get('backdrop') || '';

    // Content type badge colors
    const badgeColors = {
      movie: { bg: '#8b5cf6', text: '#ffffff' },
      tv: { bg: '#06b6d4', text: '#ffffff' },
      animation: { bg: '#f97316', text: '#ffffff' },
      anime: { bg: '#ec4899', text: '#ffffff' },
    } as const;

    type BadgeType = keyof typeof badgeColors;
    const validType = (type in badgeColors ? type : 'movie') as BadgeType;
    const badge = badgeColors[validType];
    const badgeLabel =
      type === 'movie'
        ? 'Movie'
        : type === 'tv'
          ? 'TV Show'
          : type === 'animation'
            ? 'Animation'
            : 'Anime';

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            position: 'relative',
            backgroundColor: '#0a0a0b',
          }}
        >
          {/* Background Image (backdrop) */}
          {backdropUrl && (
            <img
              src={backdropUrl}
              alt=""
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}

          {/* Gradient Overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                'linear-gradient(to right, rgba(10,10,11,1) 0%, rgba(10,10,11,0.9) 30%, rgba(10,10,11,0.6) 60%, rgba(10,10,11,0.3) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                'linear-gradient(to top, rgba(10,10,11,1) 0%, rgba(10,10,11,0.8) 30%, transparent 100%)',
            }}
          />

          {/* Content Container */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              padding: '48px 60px',
              width: '100%',
              gap: '40px',
            }}
          >
            {/* Poster */}
            {posterUrl && (
              <div
                style={{
                  display: 'flex',
                  flexShrink: 0,
                  width: '200px',
                  height: '300px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  border: '2px solid rgba(255,255,255,0.1)',
                }}
              >
                <img
                  src={posterUrl}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            )}

            {/* Text Content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                flex: 1,
                paddingBottom: '8px',
              }}
            >
              {/* Badges Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                {/* Content Type Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: badge.bg,
                    color: badge.text,
                    fontSize: '16px',
                    fontWeight: 600,
                    padding: '6px 16px',
                    borderRadius: '20px',
                  }}
                >
                  {badgeLabel}
                </div>

                {/* Rating Badge */}
                {rating && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: 'rgba(245, 158, 11, 0.2)',
                      color: '#f59e0b',
                      fontSize: '16px',
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: '8px',
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="#f59e0b"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {rating}
                  </div>
                )}

                {/* Year */}
                {year && (
                  <div
                    style={{
                      display: 'flex',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '16px',
                      fontWeight: 500,
                    }}
                  >
                    {year}
                  </div>
                )}
              </div>

              {/* Title */}
              <h1
                style={{
                  fontSize: title.length > 30 ? '48px' : '56px',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: 0,
                  lineHeight: 1.1,
                  textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                  maxWidth: '700px',
                }}
              >
                {title.length > 50 ? title.substring(0, 47) + '...' : title}
              </h1>

              {/* Subtitle / Tagline */}
              {subtitle && (
                <p
                  style={{
                    fontSize: '22px',
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.8)',
                    margin: 0,
                    marginTop: '12px',
                    fontStyle: 'italic',
                    maxWidth: '600px',
                  }}
                >
                  &ldquo;{subtitle.length > 80 ? subtitle.substring(0, 77) + '...' : subtitle}&rdquo;
                </p>
              )}

              {/* FlickPick Branding */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '24px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '18px',
                    fontWeight: 500,
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                    <line x1="7" y1="2" x2="7" y2="22" />
                    <line x1="17" y1="2" x2="17" y2="22" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <line x1="2" y1="7" x2="7" y2="7" />
                    <line x1="2" y1="17" x2="7" y2="17" />
                    <line x1="17" y1="17" x2="22" y2="17" />
                    <line x1="17" y1="7" x2="22" y2="7" />
                  </svg>
                  flickpick.site
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: OG_WIDTH,
        height: OG_HEIGHT,
      }
    );
  } catch (error) {
    console.error('OG image generation error:', error);
    // Return a simple fallback image
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0b',
            color: '#ffffff',
            fontSize: '48px',
            fontWeight: 700,
          }}
        >
          FlickPick
        </div>
      ),
      {
        width: OG_WIDTH,
        height: OG_HEIGHT,
      }
    );
  }
}
