import { ImageResponse } from 'next/og';

// ==========================================================================
// Default Open Graph Image
// Generated dynamically for the homepage
// ==========================================================================

export const runtime = 'edge';

export const alt = 'FlickPick - Discover Your Next Favorite Watch';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0b',
          backgroundImage:
            'radial-gradient(circle at 25% 25%, #0070f3 0%, transparent 50%), radial-gradient(circle at 75% 75%, #ec4899 0%, transparent 50%)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              color: '#ffffff',
              letterSpacing: '-2px',
            }}
          >
            Flick
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #0070f3, #ec4899)',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '-2px',
            }}
          >
            Pick
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: '#a1a1aa',
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Discover Your Next Favorite Watch
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
            marginTop: 50,
          }}
        >
          {['AI Discovery', 'Mood-Based', 'Similar Titles', 'Where to Watch'].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 100,
                  fontSize: 20,
                  color: '#ffffff',
                }}
              >
                {feature}
              </div>
            )
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
