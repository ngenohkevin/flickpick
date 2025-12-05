import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/trending/route';

// Mock the TMDB functions
vi.mock('@/lib/tmdb', () => ({
  getTrendingMovies: vi.fn(),
  getTrendingTVShows: vi.fn(),
  toMovie: vi.fn((movie) => ({
    ...movie,
    media_type: 'movie',
  })),
  toTVShow: vi.fn((show) => ({
    ...show,
    media_type: 'tv',
  })),
}));

import { getTrendingMovies, getTrendingTVShows } from '@/lib/tmdb';

describe('GET /api/trending', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(url: string): Request {
    return new Request(new URL(url, 'http://localhost:3000'));
  }

  const mockMovieResponse = {
    results: [
      {
        id: 1,
        title: 'Trending Movie 1',
        original_title: 'Trending Movie 1',
        overview: 'Overview',
        poster_path: '/poster1.jpg',
        backdrop_path: '/backdrop1.jpg',
        release_date: '2024-01-01',
        vote_average: 8.0,
        vote_count: 1000,
        popularity: 100,
        original_language: 'en',
        genre_ids: [28, 12],
      },
      {
        id: 2,
        title: 'Trending Movie 2',
        original_title: 'Trending Movie 2',
        overview: 'Overview',
        poster_path: '/poster2.jpg',
        backdrop_path: '/backdrop2.jpg',
        release_date: '2024-02-01',
        vote_average: 7.5,
        vote_count: 800,
        popularity: 90,
        original_language: 'en',
        genre_ids: [35],
      },
    ],
    page: 1,
    total_pages: 5,
    total_results: 100,
  };

  const mockTVResponse = {
    results: [
      {
        id: 101,
        name: 'Trending Show 1',
        original_name: 'Trending Show 1',
        overview: 'Overview',
        poster_path: '/poster101.jpg',
        backdrop_path: '/backdrop101.jpg',
        first_air_date: '2024-01-15',
        vote_average: 8.5,
        vote_count: 500,
        popularity: 95,
        original_language: 'en',
        origin_country: ['US'],
        genre_ids: [18],
      },
      {
        id: 102,
        name: 'Trending Show 2',
        original_name: 'Trending Show 2',
        overview: 'Overview',
        poster_path: '/poster102.jpg',
        backdrop_path: '/backdrop102.jpg',
        first_air_date: '2024-02-15',
        vote_average: 7.8,
        vote_count: 300,
        popularity: 85,
        original_language: 'en',
        origin_country: ['US'],
        genre_ids: [35, 10751],
      },
    ],
    page: 1,
    total_pages: 3,
    total_results: 60,
  };

  describe('default behavior', () => {
    it('returns both movies and TV shows by default', async () => {
      vi.mocked(getTrendingMovies).mockResolvedValue(mockMovieResponse);
      vi.mocked(getTrendingTVShows).mockResolvedValue(mockTVResponse);

      const request = createRequest('/api/trending');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.type).toBe('all');
      expect(data.timeWindow).toBe('day');
      expect(Array.isArray(data.results)).toBe(true);
      expect(getTrendingMovies).toHaveBeenCalledWith('day', 1);
      expect(getTrendingTVShows).toHaveBeenCalledWith('day', 1);
    });

    it('sorts results by popularity when type is all', async () => {
      vi.mocked(getTrendingMovies).mockResolvedValue(mockMovieResponse);
      vi.mocked(getTrendingTVShows).mockResolvedValue(mockTVResponse);

      const request = createRequest('/api/trending?type=all');
      const response = await GET(request);

      const data = await response.json();

      // Results should be sorted by popularity
      for (let i = 0; i < data.results.length - 1; i++) {
        expect(data.results[i].popularity).toBeGreaterThanOrEqual(
          data.results[i + 1].popularity
        );
      }
    });
  });

  describe('type parameter', () => {
    it('returns only movies when type=movie', async () => {
      vi.mocked(getTrendingMovies).mockResolvedValue(mockMovieResponse);

      const request = createRequest('/api/trending?type=movie');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.type).toBe('movie');
      expect(getTrendingMovies).toHaveBeenCalled();
      expect(getTrendingTVShows).not.toHaveBeenCalled();
    });

    it('returns only TV shows when type=tv', async () => {
      vi.mocked(getTrendingTVShows).mockResolvedValue(mockTVResponse);

      const request = createRequest('/api/trending?type=tv');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.type).toBe('tv');
      expect(getTrendingTVShows).toHaveBeenCalled();
      expect(getTrendingMovies).not.toHaveBeenCalled();
    });
  });

  describe('time_window parameter', () => {
    it('uses day time window by default', async () => {
      vi.mocked(getTrendingMovies).mockResolvedValue(mockMovieResponse);
      vi.mocked(getTrendingTVShows).mockResolvedValue(mockTVResponse);

      const request = createRequest('/api/trending');
      await GET(request);

      expect(getTrendingMovies).toHaveBeenCalledWith('day', 1);
      expect(getTrendingTVShows).toHaveBeenCalledWith('day', 1);
    });

    it('uses week time window when specified', async () => {
      vi.mocked(getTrendingMovies).mockResolvedValue(mockMovieResponse);
      vi.mocked(getTrendingTVShows).mockResolvedValue(mockTVResponse);

      const request = createRequest('/api/trending?time_window=week');
      const response = await GET(request);

      const data = await response.json();
      expect(data.timeWindow).toBe('week');
      expect(getTrendingMovies).toHaveBeenCalledWith('week', 1);
      expect(getTrendingTVShows).toHaveBeenCalledWith('week', 1);
    });
  });

  describe('limit parameter', () => {
    it('uses default limit of 20', async () => {
      const manyMovies = {
        results: Array.from({ length: 25 }, (_, i) => ({
          id: i + 1,
          title: `Movie ${i + 1}`,
          original_title: `Movie ${i + 1}`,
          overview: '',
          poster_path: null,
          backdrop_path: null,
          release_date: '2024-01-01',
          vote_average: 7.0,
          vote_count: 100,
          popularity: 100 - i,
          original_language: 'en',
          genre_ids: [],
        })),
        page: 1,
        total_pages: 2,
        total_results: 25,
      };

      vi.mocked(getTrendingMovies).mockResolvedValue(manyMovies);
      vi.mocked(getTrendingTVShows).mockResolvedValue({ ...mockTVResponse, results: [] });

      const request = createRequest('/api/trending?type=movie');
      const response = await GET(request);

      const data = await response.json();
      expect(data.results.length).toBeLessThanOrEqual(20);
    });

    it('respects custom limit', async () => {
      vi.mocked(getTrendingMovies).mockResolvedValue(mockMovieResponse);
      vi.mocked(getTrendingTVShows).mockResolvedValue(mockTVResponse);

      const request = createRequest('/api/trending?limit=5');
      const response = await GET(request);

      const data = await response.json();
      expect(data.results.length).toBeLessThanOrEqual(5);
    });

    it('caps limit at 40', async () => {
      const manyMovies = {
        results: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          title: `Movie ${i + 1}`,
          original_title: `Movie ${i + 1}`,
          overview: '',
          poster_path: null,
          backdrop_path: null,
          release_date: '2024-01-01',
          vote_average: 7.0,
          vote_count: 100,
          popularity: 100,
          original_language: 'en',
          genre_ids: [],
        })),
        page: 1,
        total_pages: 3,
        total_results: 50,
      };

      vi.mocked(getTrendingMovies).mockResolvedValue(manyMovies);
      vi.mocked(getTrendingTVShows).mockResolvedValue({ ...mockTVResponse, results: [] });

      const request = createRequest('/api/trending?type=movie&limit=100');
      const response = await GET(request);

      const data = await response.json();
      expect(data.results.length).toBeLessThanOrEqual(40);
    });
  });

  describe('error handling', () => {
    it('returns 500 when TMDB request fails', async () => {
      vi.mocked(getTrendingMovies).mockRejectedValue(new Error('TMDB API error'));
      vi.mocked(getTrendingTVShows).mockResolvedValue(mockTVResponse);

      const request = createRequest('/api/trending');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch trending content');
      expect(data.code).toBe('TMDB_ERROR');
    });
  });

  describe('response format', () => {
    it('returns correct response structure', async () => {
      vi.mocked(getTrendingMovies).mockResolvedValue(mockMovieResponse);
      vi.mocked(getTrendingTVShows).mockResolvedValue(mockTVResponse);

      const request = createRequest('/api/trending');
      const response = await GET(request);

      const data = await response.json();

      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('type');
      expect(data).toHaveProperty('timeWindow');
      expect(Array.isArray(data.results)).toBe(true);
    });
  });
});
