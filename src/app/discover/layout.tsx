import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Discovery | FlickPick',
  description:
    'Discover your next favorite movie or TV show with AI-powered recommendations. Describe what you want to watch and get personalized suggestions.',
  openGraph: {
    title: 'AI Discovery | FlickPick',
    description:
      'Discover your next favorite movie or TV show with AI-powered recommendations.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Discovery | FlickPick',
    description:
      'Discover your next favorite movie or TV show with AI-powered recommendations.',
  },
};

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
