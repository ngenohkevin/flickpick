import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Content Blend | FlickPick',
  description:
    'Blend 2-3 of your favorite movies or TV shows to discover content that combines their best elements. Find your perfect hybrid recommendation.',
  openGraph: {
    title: 'Content Blend | FlickPick',
    description:
      'Blend your favorite titles to discover content that combines their best elements.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Content Blend | FlickPick',
    description:
      'Blend your favorite titles to discover content that combines their best elements.',
  },
};

export default function BlendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
