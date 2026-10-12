import { describe, it, expect } from 'vitest';
import { hasPhrase, parseUserIntent } from '@/lib/ai/intent-parser';
import { toTVGenres } from '@/lib/tmdb/genres';
import { normalizePrompt, getPromptCacheKey } from '@/lib/redis';

describe('hasPhrase', () => {
  it('matches whole words only', () => {
    expect(hasPhrase('a heartwarming story', 'war')).toBe(false);
    expect(hasPhrase('a beloved classic', 'love')).toBe(false);
    expect(hasPhrase('an intense ride', 'tense')).toBe(false);
    expect(hasPhrase('a war movie', 'war')).toBe(true);
    expect(hasPhrase('edge of seat thrillers', 'edge of seat')).toBe(true);
    expect(hasPhrase('something mind-bending', 'mind-bending')).toBe(true);
  });
});

describe('parseUserIntent', () => {
  it('does not turn feel-good wording into war or romance', () => {
    const intent = parseUserIntent('heartwarming feel-good movies everyone beloved');
    expect(intent.genres).not.toContain(10752);
    expect(intent.genres).not.toContain(10749);
  });
});

describe('toTVGenres', () => {
  it('maps movie genres to TV genres and drops ones TV lacks', () => {
    expect(toTVGenres([28, 878, 10752])).toEqual([10759, 10765, 10768]);
    expect(toTVGenres([18, 35])).toEqual([18, 35]);
    expect(toTVGenres([27, 10749])).toEqual([]);
  });
});

describe('prompt cache key', () => {
  it('keeps letters from any script', () => {
    expect(normalizePrompt('進撃の巨人みたいなアニメ')).not.toBe('');
    expect(normalizePrompt('фильмы как Начало')).toContain('фильмы');
  });

  it('includes the content type filter', () => {
    expect(getPromptCacheKey('dark thriller', ['anime'])).not.toBe(getPromptCacheKey('dark thriller'));
    expect(getPromptCacheKey('dark thriller', ['tv', 'movie'])).toBe(getPromptCacheKey('dark thriller', ['movie', 'tv']));
  });
});

describe('pickBestMatch', () => {
  it('rejects a popular hit with a different title', async () => {
    const { pickBestMatch } = await import('@/lib/ai');
    const cands = [
      { title: 'Captain Underpants: The First Epic Movie', original: '', year: 2017, votes: 1500 },
      { title: 'The Captain', original: 'Der Hauptmann', year: 2017, votes: 300 },
    ];
    expect(pickBestMatch(cands, 'The Captain', 2017, 0)).toBe(1);
    expect(pickBestMatch([cands[0]!], 'The Load', 2018, 1)).toBe(-1);
  });

  it('accepts an AI year that is one off and prefers the more-voted same title', async () => {
    const { pickBestMatch } = await import('@/lib/ai');
    expect(pickBestMatch([{ title: 'Arrival', original: '', year: 2016, votes: 18000 }], 'Arrival', 2017, 1)).toBe(0);
    const twins = [
      { title: 'Under the Skin', original: '', year: 2013, votes: 3 },
      { title: 'Under the Skin', original: '', year: 2013, votes: 4200 },
    ];
    expect(pickBestMatch(twins, 'Under the Skin', 2013, 0)).toBe(1);
    expect(pickBestMatch([{ title: 'The Bureau', original: 'Le Bureau des Légendes', year: 2015, votes: 600 }], 'Le Bureau des Légendes', undefined, 0)).toBe(0);
  });
});

describe('withoutNamedTitles', () => {
  it('drops titles the user named, as whole words only', async () => {
    const { withoutNamedTitles } = await import('@/lib/ai');
    const results = [{ title: 'The Martian' }, { title: 'Gravity' }, { title: 'All Is Lost' }, { title: 'Up' }, { title: 'Primer' }];
    const kept = withoutNamedTitles(results, 'tense survival thrillers like The Martian and Gravity, something to pick me up');
    expect(kept.map((r) => r.title)).toEqual(['All Is Lost', 'Up', 'Primer']);
    expect(withoutNamedTitles([{ title: 'Primer' }], 'movies like Coherence and Primer')).toEqual([]);
  });
});
