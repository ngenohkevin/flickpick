import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Header, Footer, ThemeProvider, ClientProviders } from '@/components/layout';
import { Analytics } from '@/components/analytics';
import { MonetAgScripts } from '@/components/ads';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://flickpick.site'),
  title: {
    default: 'FlickPick - Discover Your Next Favorite Watch',
    template: '%s | FlickPick',
  },
  description:
    'Find your next favorite movie or TV show with AI-powered recommendations, mood-based discovery, and streaming availability.',
  keywords: [
    'movies',
    'tv shows',
    'recommendations',
    'streaming',
    'anime',
    'where to watch',
  ],
  authors: [{ name: 'FlickPick' }],
  creator: 'FlickPick',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'FlickPick',
    title: 'FlickPick - Discover Your Next Favorite Watch',
    description:
      'Find your next favorite movie or TV show with AI-powered recommendations.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlickPick - Discover Your Next Favorite Watch',
    description:
      'Find your next favorite movie or TV show with AI-powered recommendations.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to critical external domains for faster loading */}
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://img.youtube.com" />
        <link rel="dns-prefetch" href="https://img.youtube.com" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <Analytics />
        <ThemeProvider>
          <ClientProviders>
            {/* Skip to main content link for accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent-primary focus:px-4 focus:py-2 focus:text-white"
            >
              Skip to main content
            </a>

            <div className="flex min-h-screen flex-col">
              <Header />
              <main id="main-content" className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </ClientProviders>
        </ThemeProvider>
        {/* Monetag Ad Scripts - only loads if ads are enabled via env vars */}
        <MonetAgScripts />
      </body>
    </html>
  );
}
