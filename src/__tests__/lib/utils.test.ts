import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
  getContentType,
  isMovie,
  isTVShow,
  getContentTitle,
  getContentReleaseDate,
  createSlug,
  extractYear,
  formatRuntime,
  formatDate,
  formatCompactNumber,
  formatRating,
  formatCurrency,
  isWithinDays,
  isWithinHours,
  formatRelativeTime,
  cn,
  debounce,
  truncate,
  sleep,
  randomItem,
} from '@/lib/utils';
import type { Movie, TVShow, Content } from '@/types';

// ==========================================================================
// Image URL Helpers
// ==========================================================================

describe('getPosterUrl', () => {
  it('returns placeholder for null path', () => {
    expect(getPosterUrl(null)).toBe('/placeholder-poster.svg');
  });

  it('returns correct URL with default medium size', () => {
    expect(getPosterUrl('/abc123.jpg')).toBe(
      'https://image.tmdb.org/t/p/w342/abc123.jpg'
    );
  });

  it('returns correct URL with specified size', () => {
    expect(getPosterUrl('/abc123.jpg', 'large')).toBe(
      'https://image.tmdb.org/t/p/w500/abc123.jpg'
    );
    expect(getPosterUrl('/abc123.jpg', 'small')).toBe(
      'https://image.tmdb.org/t/p/w185/abc123.jpg'
    );
    expect(getPosterUrl('/abc123.jpg', 'original')).toBe(
      'https://image.tmdb.org/t/p/original/abc123.jpg'
    );
  });
});

describe('getBackdropUrl', () => {
  it('returns null for null path', () => {
    expect(getBackdropUrl(null)).toBeNull();
  });

  it('returns correct URL with default large size', () => {
    expect(getBackdropUrl('/backdrop.jpg')).toBe(
      'https://image.tmdb.org/t/p/w1280/backdrop.jpg'
    );
  });

  it('returns correct URL with specified size', () => {
    expect(getBackdropUrl('/backdrop.jpg', 'original')).toBe(
      'https://image.tmdb.org/t/p/original/backdrop.jpg'
    );
  });
});

describe('getProfileUrl', () => {
  it('returns placeholder for null path', () => {
    expect(getProfileUrl(null)).toBe('/placeholder-profile.svg');
  });

  it('returns correct URL with default medium size', () => {
    expect(getProfileUrl('/profile.jpg')).toBe(
      'https://image.tmdb.org/t/p/w185/profile.jpg'
    );
  });
});

// ==========================================================================
// Content Type Detection
// ==========================================================================

describe('getContentType', () => {
  const baseMovie: Movie = {
    id: 1,
    media_type: 'movie',
    title: 'Test Movie',
    original_title: 'Test Movie',
    overview: 'A test movie',
    poster_path: null,
    backdrop_path: null,
    vote_average: 7.5,
    vote_count: 1000,
    popularity: 100,
    original_language: 'en',
    release_date: '2024-01-01',
    genre_ids: [28, 12],
  };

  const baseTVShow: TVShow = {
    id: 2,
    media_type: 'tv',
    name: 'Test Show',
    original_name: 'Test Show',
    overview: 'A test show',
    poster_path: null,
    backdrop_path: null,
    vote_average: 8.0,
    vote_count: 500,
    popularity: 80,
    original_language: 'en',
    first_air_date: '2024-01-01',
    number_of_seasons: 3,
    number_of_episodes: 30,
    episode_run_time: [45],
    status: 'Returning Series',
    genre_ids: [18, 80],
  };

  it('returns "movie" for regular movies', () => {
    expect(getContentType(baseMovie)).toBe('movie');
  });

  it('returns "tv" for regular TV shows', () => {
    expect(getContentType(baseTVShow)).toBe('tv');
  });

  it('returns "animation" for animated content (non-Japanese)', () => {
    const animatedMovie: Movie = {
      ...baseMovie,
      genre_ids: [16, 35],
      original_language: 'en',
    };
    expect(getContentType(animatedMovie)).toBe('animation');
  });

  it('returns "anime" for Japanese animation', () => {
    const anime: TVShow = {
      ...baseTVShow,
      genre_ids: [16, 18],
      original_language: 'ja',
      origin_country: ['JP'],
    };
    expect(getContentType(anime)).toBe('anime');
  });

  it('returns "anime" for content with Japanese origin country', () => {
    const anime: Movie = {
      ...baseMovie,
      genre_ids: [16],
      original_language: 'en',
      origin_country: ['JP'],
    };
    expect(getContentType(anime)).toBe('anime');
  });

  it('handles content with genres array instead of genre_ids', () => {
    const movieWithGenres: Movie = {
      ...baseMovie,
      genre_ids: undefined,
      genres: [{ id: 16, name: 'Animation' }],
      original_language: 'en',
    };
    expect(getContentType(movieWithGenres)).toBe('animation');
  });
});

describe('isMovie', () => {
  it('returns true for movies', () => {
    const movie: Movie = {
      id: 1,
      media_type: 'movie',
      title: 'Test',
      original_title: 'Test',
      overview: '',
      poster_path: null,
      backdrop_path: null,
      vote_average: 0,
      vote_count: 0,
      popularity: 0,
      original_language: 'en',
      release_date: '2024-01-01',
    };
    expect(isMovie(movie)).toBe(true);
  });

  it('returns false for TV shows', () => {
    const tvShow: TVShow = {
      id: 2,
      media_type: 'tv',
      name: 'Test',
      original_name: 'Test',
      overview: '',
      poster_path: null,
      backdrop_path: null,
      vote_average: 0,
      vote_count: 0,
      popularity: 0,
      original_language: 'en',
      first_air_date: '2024-01-01',
      number_of_seasons: 1,
      number_of_episodes: 10,
      episode_run_time: [30],
      status: 'Ended',
    };
    expect(isMovie(tvShow)).toBe(false);
  });
});

describe('isTVShow', () => {
  it('returns true for TV shows', () => {
    const tvShow: TVShow = {
      id: 2,
      media_type: 'tv',
      name: 'Test',
      original_name: 'Test',
      overview: '',
      poster_path: null,
      backdrop_path: null,
      vote_average: 0,
      vote_count: 0,
      popularity: 0,
      original_language: 'en',
      first_air_date: '2024-01-01',
      number_of_seasons: 1,
      number_of_episodes: 10,
      episode_run_time: [30],
      status: 'Ended',
    };
    expect(isTVShow(tvShow)).toBe(true);
  });
});

describe('getContentTitle', () => {
  it('returns title for movies', () => {
    const movie: Content = {
      id: 1,
      media_type: 'movie',
      title: 'Inception',
      original_title: 'Inception',
      overview: '',
      poster_path: null,
      backdrop_path: null,
      vote_average: 0,
      vote_count: 0,
      popularity: 0,
      original_language: 'en',
      release_date: '2010-07-16',
    };
    expect(getContentTitle(movie)).toBe('Inception');
  });

  it('returns name for TV shows', () => {
    const tvShow: Content = {
      id: 2,
      media_type: 'tv',
      name: 'Breaking Bad',
      original_name: 'Breaking Bad',
      overview: '',
      poster_path: null,
      backdrop_path: null,
      vote_average: 0,
      vote_count: 0,
      popularity: 0,
      original_language: 'en',
      first_air_date: '2008-01-20',
      number_of_seasons: 5,
      number_of_episodes: 62,
      episode_run_time: [45],
      status: 'Ended',
    };
    expect(getContentTitle(tvShow)).toBe('Breaking Bad');
  });
});

describe('getContentReleaseDate', () => {
  it('returns release_date for movies', () => {
    const movie: Content = {
      id: 1,
      media_type: 'movie',
      title: 'Test',
      original_title: 'Test',
      overview: '',
      poster_path: null,
      backdrop_path: null,
      vote_average: 0,
      vote_count: 0,
      popularity: 0,
      original_language: 'en',
      release_date: '2024-06-15',
    };
    expect(getContentReleaseDate(movie)).toBe('2024-06-15');
  });

  it('returns first_air_date for TV shows', () => {
    const tvShow: Content = {
      id: 2,
      media_type: 'tv',
      name: 'Test',
      original_name: 'Test',
      overview: '',
      poster_path: null,
      backdrop_path: null,
      vote_average: 0,
      vote_count: 0,
      popularity: 0,
      original_language: 'en',
      first_air_date: '2024-03-20',
      number_of_seasons: 1,
      number_of_episodes: 8,
      episode_run_time: [50],
      status: 'Returning Series',
    };
    expect(getContentReleaseDate(tvShow)).toBe('2024-03-20');
  });
});

// ==========================================================================
// URL Helpers
// ==========================================================================

describe('createSlug', () => {
  it('creates a slug from title', () => {
    expect(createSlug('The Dark Knight')).toBe('the-dark-knight');
  });

  it('creates a slug with year', () => {
    expect(createSlug('The Dark Knight', 2008)).toBe('the-dark-knight-2008');
  });

  it('handles special characters', () => {
    expect(createSlug("Spider-Man: No Way Home")).toBe('spider-man-no-way-home');
  });

  it('handles multiple spaces and hyphens', () => {
    expect(createSlug('Test   Movie--Title')).toBe('test-movie-title');
  });

  it('handles string year', () => {
    expect(createSlug('Avatar', '2009')).toBe('avatar-2009');
  });
});

describe('extractYear', () => {
  it('extracts year from date string', () => {
    expect(extractYear('2024-06-15')).toBe(2024);
  });

  it('returns undefined for undefined input', () => {
    expect(extractYear(undefined)).toBeUndefined();
  });

  it('returns undefined for invalid date string', () => {
    expect(extractYear('invalid-date')).toBeUndefined();
  });
});

// ==========================================================================
// Formatting Helpers
// ==========================================================================

describe('formatRuntime', () => {
  it('formats hours and minutes', () => {
    expect(formatRuntime(150)).toBe('2h 30m');
  });

  it('formats hours only', () => {
    expect(formatRuntime(120)).toBe('2h');
  });

  it('formats minutes only', () => {
    expect(formatRuntime(45)).toBe('45m');
  });

  it('returns empty string for undefined', () => {
    expect(formatRuntime(undefined)).toBe('');
  });

  it('returns empty string for 0', () => {
    expect(formatRuntime(0)).toBe('');
  });
});

describe('formatDate', () => {
  it('formats date with default options', () => {
    const result = formatDate('2024-06-15');
    expect(result).toBe('Jun 15, 2024');
  });

  it('formats date with custom options', () => {
    const result = formatDate('2024-06-15', { year: 'numeric' });
    expect(result).toBe('2024');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns "Invalid Date" for invalid date string', () => {
    // Note: new Date('not-a-date') doesn't throw, it returns Invalid Date
    // The implementation doesn't catch this case, which may be intentional
    expect(formatDate('not-a-date')).toBe('Invalid Date');
  });
});

describe('formatCompactNumber', () => {
  it('formats thousands', () => {
    expect(formatCompactNumber(1500)).toBe('1.5K');
  });

  it('formats millions', () => {
    expect(formatCompactNumber(2300000)).toBe('2.3M');
  });

  it('formats small numbers', () => {
    expect(formatCompactNumber(500)).toBe('500');
  });
});

describe('formatRating', () => {
  it('formats rating to one decimal place', () => {
    expect(formatRating(7.567)).toBe('7.6');
    expect(formatRating(8.0)).toBe('8.0');
    expect(formatRating(10)).toBe('10.0');
  });
});

describe('formatCurrency', () => {
  it('formats currency with compact notation', () => {
    expect(formatCurrency(1500000)).toBe('$2M');
  });
});

// ==========================================================================
// Date Helpers
// ==========================================================================

describe('isWithinDays', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for date within range', () => {
    vi.setSystemTime(new Date('2024-06-15'));
    expect(isWithinDays('2024-06-10', 7)).toBe(true);
  });

  it('returns false for date outside range', () => {
    vi.setSystemTime(new Date('2024-06-15'));
    expect(isWithinDays('2024-06-01', 7)).toBe(false);
  });

  it('returns false for future dates', () => {
    vi.setSystemTime(new Date('2024-06-15'));
    expect(isWithinDays('2024-06-20', 7)).toBe(false);
  });

  it('returns false for undefined input', () => {
    expect(isWithinDays(undefined, 7)).toBe(false);
  });
});

describe('isWithinHours', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for date within range', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    expect(isWithinHours('2024-06-15T10:00:00', 24)).toBe(true);
  });

  it('returns false for date outside range', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    expect(isWithinHours('2024-06-13T12:00:00', 24)).toBe(false);
  });

  it('returns false for undefined input', () => {
    expect(isWithinHours(undefined, 24)).toBe(false);
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string for undefined', () => {
    expect(formatRelativeTime(undefined)).toBe('');
  });

  it('formats past days', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const result = formatRelativeTime('2024-06-13T12:00:00');
    expect(result).toBe('2 days ago');
  });

  it('formats future days', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const result = formatRelativeTime('2024-06-18T12:00:00');
    expect(result).toBe('in 3 days');
  });

  it('formats weeks', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    const result = formatRelativeTime('2024-06-01T12:00:00');
    expect(result).toBe('2 weeks ago');
  });
});

// ==========================================================================
// CSS Class Helpers
// ==========================================================================

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', false, 'bar', null, undefined, 'baz')).toBe('foo bar baz');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });
});

// ==========================================================================
// Misc Helpers
// ==========================================================================

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces function calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to debounced function', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn('arg1', 'arg2');

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('truncate', () => {
  it('truncates long text', () => {
    expect(truncate('This is a long text', 10)).toBe('This is...');
  });

  it('returns original text if shorter than max length', () => {
    expect(truncate('Short', 10)).toBe('Short');
  });

  it('returns original text if equal to max length', () => {
    expect(truncate('0123456789', 10)).toBe('0123456789');
  });
});

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after specified time', async () => {
    const promise = sleep(100);
    vi.advanceTimersByTime(100);
    await expect(promise).resolves.toBeUndefined();
  });
});

describe('randomItem', () => {
  it('returns item from array', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = randomItem(arr);
    expect(arr).toContain(result);
  });

  it('returns undefined for empty array', () => {
    expect(randomItem([])).toBeUndefined();
  });
});
