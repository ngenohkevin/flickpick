import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Watchlist | FlickPick',
  description:
    'Your personal watchlist of movies and TV shows to watch. Keep track of what you want to see next.',
  openGraph: {
    title: 'My Watchlist | FlickPick',
    description: 'Your personal watchlist of movies and TV shows to watch.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'My Watchlist | FlickPick',
    description: 'Your personal watchlist of movies and TV shows to watch.',
  },
  robots: {
    index: false, // Don't index personal watchlist pages
    follow: true,
  },
};

export default function WatchlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
