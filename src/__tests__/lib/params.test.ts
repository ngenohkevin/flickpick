import { describe, it, expect } from 'vitest';
import { parseEnum, parseIdList, parsePage } from '@/lib/params';
import { parseFilters, writeFilters, countActiveFilters } from '@/components/browse/filter-params';
import { defaultFilters } from '@/components/browse/FilterSidebar';

describe('parsePage', () => {
  it('defaults bad input to page 1', () => {
    expect(parsePage(null)).toBe(1);
    expect(parsePage('abc')).toBe(1);
    expect(parsePage('0')).toBe(1);
    expect(parsePage('-3')).toBe(1);
  });

  it('caps at TMDB\'s 500-page limit', () => {
    expect(parsePage('7')).toBe(7);
    expect(parsePage('9999')).toBe(500);
  });
});

describe('parseIdList', () => {
  it('keeps positive integer IDs, deduplicated', () => {
    expect(parseIdList('28,35,28')).toEqual([28, 35]);
  });

  it('drops malformed parts instead of sending NaN to TMDB', () => {
    expect(parseIdList('28,abc,,-1,3.5,0')).toEqual([28]);
    expect(parseIdList(null)).toEqual([]);
  });
});

describe('parseEnum', () => {
  it('accepts only allowed values', () => {
    expect(parseEnum('tv', ['all', 'movie', 'tv'] as const, 'all')).toBe('tv');
    expect(parseEnum('podcast', ['all', 'movie', 'tv'] as const, 'all')).toBe('all');
    expect(parseEnum(null, ['all', 'movie', 'tv'] as const, 'all')).toBe('all');
  });
});

describe('filter URL round trip', () => {
  it('parses what it writes', () => {
    const filters = {
      ...defaultFilters,
      genres: [28, 35],
      excludedGenres: [27],
      yearFrom: 1990,
      yearTo: 1999,
      ratingMin: 7.5,
      language: 'ja',
      provider: '8',
      runtime: 'long' as const,
    };
    const params = writeFilters(new URLSearchParams(), filters);
    expect(parseFilters(params)).toEqual(filters);
  });

  it('honours a custom rating param name', () => {
    const params = writeFilters(new URLSearchParams(), { ...defaultFilters, ratingMin: 6 }, { ratingParam: 'rating' });
    expect(params.get('rating')).toBe('6');
    expect(params.has('rating_min')).toBe(false);
    expect(parseFilters(params, { ratingParam: 'rating' }).ratingMin).toBe(6);
  });

  it('sanitises hand-edited URLs', () => {
    const filters = parseFilters(
      new URLSearchParams('genre=28,x&year_from=19&rating_min=42&language=English&provider=netflix&runtime=epic')
    );
    expect(filters).toEqual({ ...defaultFilters, genres: [28] });
  });

  it('writes nothing for default filters', () => {
    expect(writeFilters(new URLSearchParams(), defaultFilters).toString()).toBe('');
    expect(countActiveFilters(defaultFilters)).toBe(0);
  });
});
