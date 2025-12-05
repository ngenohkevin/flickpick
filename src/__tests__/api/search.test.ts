import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/search/route';

// Mock the TMDB search functions
vi.mock('@/lib/tmdb/search', () => ({
  searchContent: vi.fn(),
  searchMovies: vi.fn(),
  searchTVShows: vi.fn(),
}));

vi.mock('@/lib/tmdb/movies', () => ({
  toMovie: vi.fn((movie) => ({
    ...movie,
    media_type: 'movie',
  })),
}));

vi.mock('@/lib/tmdb/tv', () => ({
  toTVShow: vi.fn((show) => ({
    ...show,
    media_type: 'tv',
  })),
}));

import { searchContent, searchMovies, searchTVShows } from '@/lib/tmdb/search';

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(url: string): NextRequest {
    return new NextRequest(new URL(url, 'http://localhost:3000'));
  }

  describe('validation', () => {
    it('returns 400 when query is missing', async () => {
      const request = createRequest('/api/search');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Search query is required');
      expect(data.code).toBe('INVALID_INPUT');
    });

    it('returns 400 when query is empty', async () => {
      const request = createRequest('/api/search?q=');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_INPUT');
    });

    it('returns 400 when query is whitespace only', async () => {
      const request = createRequest('/api/search?q=%20%20%20');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_INPUT');
    });

    it('returns 400 when limit is below 1', async () => {
      const request = createRequest('/api/search?q=test&limit=0');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Limit must be between 1 and 50');
    });

    it('returns 400 when limit is above 50', async () => {
      const request = createRequest('/api/search?q=test&limit=100');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Limit must be between 1 and 50');
    });

    it('returns 400 when limit is not a number', async () => {
      const request = createRequest('/api/search?q=test&limit=abc');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Limit must be between 1 and 50');
    });
  });

  describe('multi search (default)', () => {
    it('performs multi search by default', async () => {
      const mockResults = [
        {
          id: 1,
          title: 'Test Movie',
          media_type: 'movie',
          poster_path: '/poster.jpg',
          vote_average: 8.0,
          content_type: 'movie',
        },
      ];

      vi.mocked(searchContent).mockResolvedValue(mockResults);

      const request = createRequest('/api/search?q=test');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.type).toBe('multi');
      expect(data.query).toBe('test');
      expect(searchContent).toHaveBeenCalledWith('test', 1, 10);
    });

    it('trims the search query', async () => {
      vi.mocked(searchContent).mockResolvedValue([]);

      const request = createRequest('/api/search?q=%20test%20%20');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.query).toBe('test');
      expect(searchContent).toHaveBeenCalledWith('test', 1, 10);
    });

    it('respects custom limit', async () => {
      vi.mocked(searchContent).mockResolvedValue([]);

      const request = createRequest('/api/search?q=test&limit=20');
      await GET(request);

      expect(searchContent).toHaveBeenCalledWith('test', 1, 20);
    });
  });

  describe('movie search', () => {
    it('performs movie-only search when type=movie', async () => {
      const mockMovieResponse = {
        results: [
          {
            id: 1,
            title: 'Test Movie',
            original_title: 'Test Movie',
            overview: 'Test overview',
            poster_path: '/poster.jpg',
            backdrop_path: null,
            release_date: '2024-01-01',
            vote_average: 8.0,
            vote_count: 100,
            popularity: 50,
            original_language: 'en',
            genre_ids: [28, 12],
          },
        ],
        page: 1,
        total_pages: 1,
        total_results: 1,
      };

      vi.mocked(searchMovies).mockResolvedValue(mockMovieResponse);

      const request = createRequest('/api/search?q=test&type=movie');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.type).toBe('movie');
      expect(searchMovies).toHaveBeenCalledWith({ query: 'test' });
      expect(searchContent).not.toHaveBeenCalled();
    });

    it('limits movie results', async () => {
      const mockMovies = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Movie ${i + 1}`,
        original_title: `Movie ${i + 1}`,
        overview: '',
        poster_path: null,
        backdrop_path: null,
        release_date: '2024-01-01',
        vote_average: 7.0,
        vote_count: 50,
        popularity: 30,
        original_language: 'en',
        genre_ids: [],
      }));

      vi.mocked(searchMovies).mockResolvedValue({
        results: mockMovies,
        page: 1,
        total_pages: 1,
        total_results: 20,
      });

      const request = createRequest('/api/search?q=test&type=movie&limit=5');
      const response = await GET(request);

      const data = await response.json();
      expect(data.results).toHaveLength(5);
    });
  });

  describe('tv search', () => {
    it('performs TV-only search when type=tv', async () => {
      const mockTVResponse = {
        results: [
          {
            id: 1,
            name: 'Test Show',
            original_name: 'Test Show',
            overview: 'Test overview',
            poster_path: '/poster.jpg',
            backdrop_path: null,
            first_air_date: '2024-01-01',
            vote_average: 8.5,
            vote_count: 200,
            popularity: 60,
            original_language: 'en',
            origin_country: ['US'],
            genre_ids: [18, 80],
          },
        ],
        page: 1,
        total_pages: 1,
        total_results: 1,
      };

      vi.mocked(searchTVShows).mockResolvedValue(mockTVResponse);

      const request = createRequest('/api/search?q=test&type=tv');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.type).toBe('tv');
      expect(searchTVShows).toHaveBeenCalledWith({ query: 'test' });
      expect(searchContent).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('returns 500 when search throws an error', async () => {
      vi.mocked(searchContent).mockRejectedValue(new Error('TMDB API error'));

      const request = createRequest('/api/search?q=test');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe('TMDB_ERROR');
      expect(data.error).toBe('Failed to search content');
      expect(data.details).toBe('TMDB API error');
    });

    it('handles non-Error objects', async () => {
      vi.mocked(searchContent).mockRejectedValue('String error');

      const request = createRequest('/api/search?q=test');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.details).toBe('Unknown error');
    });
  });

  describe('response format', () => {
    it('returns correct response structure', async () => {
      const mockResults = [
        {
          id: 1,
          title: 'Inception',
          media_type: 'movie',
          poster_path: '/poster.jpg',
          release_date: '2010-07-16',
          vote_average: 8.8,
          content_type: 'movie',
        },
      ];

      vi.mocked(searchContent).mockResolvedValue(mockResults);

      const request = createRequest('/api/search?q=inception');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('query');
      expect(data).toHaveProperty('type');
      expect(data.query).toBe('inception');
      expect(data.type).toBe('multi');
      expect(Array.isArray(data.results)).toBe(true);
    });
  });
});
