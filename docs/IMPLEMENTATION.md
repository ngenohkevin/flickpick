# FlickPick Implementation Guide

> **Main Reference:** [../CLAUDE.md](../CLAUDE.md) - Contains overview, design system, architecture, project structure, and roadmap.
>
> This document covers technical implementation details: API endpoints, TypeScript interfaces, page implementations, deployment, and testing.

---

## Table of Contents
- [External APIs (Detailed)](#external-apis-detailed)
- [Pages & Features](#pages--features)
- [API Routes](#api-routes)
- [TypeScript Interfaces](#typescript-interfaces)
- [TMDB API Wrapper](#tmdb-api-wrapper)
- [SEO Strategy](#seo-strategy)
- [Performance](#performance)
- [Deployment](#deployment)
- [Testing](#testing)
- [Security](#security)
- [Analytics](#analytics)
- [Monetization](#monetization)
- [Dependencies](#dependencies)
- [Roadmap](#roadmap)

---

## External APIs (Detailed)

### TMDB Endpoints

**Movie Endpoints:**
| Endpoint | Purpose |
|----------|---------|
| `GET /search/movie` | Search movies |
| `GET /movie/{id}` | Movie details |
| `GET /movie/{id}/similar` | Similar movies |
| `GET /movie/{id}/recommendations` | TMDB recommendations |
| `GET /movie/{id}/watch/providers` | Streaming availability |
| `GET /movie/{id}/credits` | Cast & crew |
| `GET /movie/{id}/keywords` | Keywords |
| `GET /movie/{id}/videos` | Trailers, teasers, clips (YouTube) |
| `GET /trending/movie/{time_window}` | Trending movies |
| `GET /movie/popular` | Popular movies |
| `GET /movie/top_rated` | Top rated movies |
| `GET /movie/now_playing` | Now in theaters |
| `GET /movie/upcoming` | Upcoming releases |
| `GET /discover/movie` | Advanced filtering |
| `GET /genre/movie/list` | Movie genres |

**TV Show Endpoints:**
| Endpoint | Purpose |
|----------|---------|
| `GET /search/tv` | Search TV shows |
| `GET /tv/{id}` | TV show details |
| `GET /tv/{id}/similar` | Similar shows |
| `GET /tv/{id}/recommendations` | TMDB recommendations |
| `GET /tv/{id}/watch/providers` | Streaming availability |
| `GET /tv/{id}/credits` | Cast & crew |
| `GET /tv/{id}/keywords` | Keywords |
| `GET /tv/{id}/videos` | Trailers, teasers, clips (YouTube) |
| `GET /trending/tv/{time_window}` | Trending TV |
| `GET /tv/popular` | Popular TV shows |
| `GET /tv/top_rated` | Top rated TV |
| `GET /tv/on_the_air` | Currently airing |
| `GET /tv/airing_today` | Airing today |
| `GET /tv/{id}/season/{season}` | Season details with episodes |
| `GET /tv/{id}/season/{season}/episode/{ep}` | Episode details |
| `GET /discover/tv` | Advanced filtering |
| `GET /genre/tv/list` | TV genres |

**Multi-Search:**
| Endpoint | Purpose |
|----------|---------|
| `GET /search/multi` | Search movies, TV, and people |

---

### TasteDive API Details

**Base Endpoint:**
```
GET https://tastedive.com/api/similar
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `q` | Yes | Query - comma-separated titles with optional type prefix |
| `type` | Yes | Result type: `movie`, `show`, `music`, `book`, `game`, `podcast` |
| `info` | No | Set to `1` for descriptions + YouTube links |
| `limit` | No | Max results (default: 20) |
| `k` | Yes* | API key |

**Response Format:**
```typescript
interface TasteDiveResponse {
  similar: {
    info: Array<{ name: string; type: string }>;
    results: TasteDiveResult[];
  };
}

interface TasteDiveResult {
  name: string;
  type: 'movie' | 'show' | 'music' | 'book' | 'game';
  wTeaser?: string;       // Wikipedia description
  wUrl?: string;          // Wikipedia URL
  yUrl?: string;          // YouTube trailer URL
  yID?: string;           // YouTube video ID
}
```

**Example Requests:**
```bash
# Single movie
GET /api/similar?q=movie:inception&type=movie&info=1&limit=10&k=API_KEY

# Blend (multiple titles)
GET /api/similar?q=movie:breaking+bad,movie:death+note&type=movie&info=1&k=API_KEY
```

---

### AI Provider Implementation

```typescript
// lib/ai/index.ts
interface AIProvider {
  name: string;
  isAvailable: () => Promise<boolean>;
  getRecommendations: (prompt: string) => Promise<Recommendation[]>;
}

// Fallback chain for natural language discovery
const AI_PROVIDERS: AIProvider[] = [
  GeminiProvider,      // Primary - AI-powered natural language
  TasteDiveProvider,   // Secondary - title extraction + TasteDive lookup
  TMDBProvider,        // Ultimate fallback - always works, free
];

// For similar/blend features, TasteDive is primary
const SIMILAR_PROVIDERS: SimilarProvider[] = [
  TasteDiveProvider,   // Primary - excellent similar content
  TMDBProvider,        // Fallback - TMDB similar endpoint
];
```

**Gemini Provider:**
```typescript
export const GeminiProvider: AIProvider = {
  name: 'gemini',
  isAvailable: async () => {
    const rateLimitKey = 'gemini:rate_limit';
    const isLimited = await redis.get(rateLimitKey);
    return !isLimited && !!process.env.GEMINI_API_KEY;
  },
  getRecommendations: async (prompt) => {
    try {
      const result = await gemini.generateContent(buildPrompt(prompt));
      return parseGeminiResponse(result);
    } catch (error) {
      if (error.status === 429) {
        await redis.setex('gemini:rate_limit', 60, '1');
      }
      throw error;
    }
  },
};
```

**TasteDive Provider:**
```typescript
export const TasteDiveProvider: AIProvider = {
  name: 'tastedive',
  isAvailable: async () => {
    const rateLimitKey = 'tastedive:rate_limit';
    const isLimited = await redis.get(rateLimitKey);
    return !isLimited && !!process.env.TASTEDIVE_API_KEY;
  },
  getRecommendations: async (prompt) => {
    const titles = extractTitleMentions(prompt);
    if (titles.length === 0) {
      throw new Error('No titles found in prompt');
    }
    const query = titles.map(t => `movie:${t}`).join(',');
    const response = await fetch(
      `https://tastedive.com/api/similar?q=${encodeURIComponent(query)}&type=movie&info=1&limit=15&k=${process.env.TASTEDIVE_API_KEY}`
    );
    if (!response.ok) {
      if (response.status === 429) {
        await redis.setex('tastedive:rate_limit', 3600, '1');
      }
      throw new Error(`TasteDive API error: ${response.status}`);
    }
    const data = await response.json();
    return enrichTasteDiveResults(data.similar.results);
  },
};
```

**TasteDive Client:**
```typescript
export async function getSimilarFromTasteDive(
  titles: string[],
  type: 'movie' | 'show' = 'movie',
  limit: number = 20
): Promise<TasteDiveResult[]> {
  const query = titles.map(t => `${type}:${t}`).join(',');
  const params = new URLSearchParams({
    q: query, type, info: '1', limit: String(limit),
    k: process.env.TASTEDIVE_API_KEY || '',
  });
  const response = await fetch(`https://tastedive.com/api/similar?${params}`);
  if (!response.ok) throw new Error(`TasteDive error: ${response.status}`);
  const data = await response.json();
  return data.similar.results;
}
```

**TMDB Fallback Provider:**
```typescript
export const TMDBProvider: AIProvider = {
  name: 'tmdb',
  isAvailable: async () => true,
  getRecommendations: async (prompt) => {
    const intent = parseUserIntent(prompt);
    const params = buildDiscoverParams(intent);
    const results = await tmdbDiscover(params);
    return results.map(movie => ({
      ...movie,
      reason: generateBasicReason(movie, intent),
    }));
  },
};
```

**Keyword → Genre Mapping:**
```typescript
const GENRE_KEYWORDS: Record<string, number[]> = {
  'scary': [27], 'horror': [27],
  'funny': [35], 'comedy': [35],
  'romantic': [10749], 'love': [10749],
  'action': [28], 'exciting': [28, 53],
  'thriller': [53], 'suspense': [53],
  'sad': [18], 'emotional': [18], 'drama': [18],
  'animated': [16], 'kids': [16, 10751], 'family': [10751],
  'documentary': [99], 'sci-fi': [878], 'science fiction': [878],
  'fantasy': [14], 'mystery': [9648], 'crime': [80],
  'war': [10752], 'western': [37], 'musical': [10402], 'history': [36],
};
```

**Gemini Prompt Template:**
```typescript
const systemPrompt = `You are FlickPick, an expert movie and TV recommendation engine.

TASK: Given the user's description, recommend exactly 10 titles (movies or TV shows).

CONTENT TYPES:
- movie: Feature films
- tv: TV series
- animation: Western animated content
- anime: Japanese animation

RULES:
1. Only recommend real, existing titles
2. Mix content types unless user specifies
3. Prioritize content from 1990-present unless user asks for classics
4. Diversify recommendations (different directors, studios, countries)
5. Match the MOOD and TONE, not just plot keywords
6. For anime requests, prefer highly-rated series (MAL 8+)

OUTPUT FORMAT (strict JSON, no markdown):
[
  {
    "title": "Exact Title",
    "year": 2020,
    "type": "movie" | "tv" | "anime",
    "reason": "One compelling sentence explaining why this matches"
  }
]

USER WANTS: {prompt}`;
```

---

## Pages & Features

### 1. Homepage (`/`)

**Purpose:** Immediately show users what's new and popular - no friction to discovery.

**Sections (in order):**
1. **Hero** - Mixed content: 8 just released movies + 4 trending TV shows
2. **AI Discovery** - Quick prompt input + mood pills
3. **Just Released Movies** - 20 movies verified via Torrentio (4K)
4. **Just Released TV Shows** - 25 shows with recent episodes
5. **New Movies This Week** - Latest released movies
6. **Trending Movies** - What's popular right now
7. **Trending TV Shows** - Popular TV series
8. **Popular Anime** - Top anime
9. **Popular on [Streaming]** - Tabbed view by streaming service
10. **Browse by Category** - Category cards grid
11. **Browse by Genre** - Genre pills
12. **Browse by Type** - Content type pills

**Content Sources:**
| Section | Data Source | Verification | Limit |
|---------|-------------|--------------|-------|
| Hero | Just Released + Trending TV | Movies: Torrentio 4K, TV: TMDB | 12 items |
| Just Released Movies | TMDB Discover (90 days) | Torrentio 4K | 20 movies |
| Just Released TV Shows | TMDB On The Air + Trending | TMDB only | 25 shows |
| New Movies This Week | TMDB Discover (7 days) | None | 12 movies |
| Trending | TMDB Trending API | None | 12 each |

**Hero Component:**
```tsx
function HeroSpotlight({ items }: { items: Content[] }) {
  const [current, setCurrent] = useState(0);
  const item = items[current];

  return (
    <div className="relative h-[70vh] min-h-[500px]">
      <div className="absolute inset-0">
        <Image src={getBackdropUrl(item.backdrop_path)} alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent" />
      </div>
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-8 flex items-center">
        <div className="max-w-xl">
          <span className="text-accent-primary font-medium">New Release</span>
          <h1 className="text-4xl sm:text-5xl font-bold mt-2">{item.title}</h1>
          <p className="text-text-secondary mt-4 line-clamp-3">{item.overview}</p>
          <div className="flex items-center gap-4 mt-6">
            <Button size="lg" onClick={() => openTrailer(item)}><PlayIcon /> Play Trailer</Button>
            <Button variant="secondary" size="lg" asChild><Link href={`/movie/${item.id}`}>More Info</Link></Button>
            <WatchlistButton movie={item} size="lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 2. Browse Pages (`/movies`, `/tv`, `/animation`, `/anime`)

**Features:**
- Infinite scroll grid
- Filter sidebar: Genres, Year range, Rating, Streaming services, Sort
- Quick filter pills at top

**URL Examples:**
- `/movies?genre=action,thriller`
- `/movies?year=2020-2024&rating=7`
- `/tv?provider=netflix`
- `/anime?sort=rating`

---

### 3. Genre Pages (`/genre/[type]/[slug]`)

**URL Format:**
- `/genre/movie/action`
- `/genre/tv/drama`
- `/genre/anime/fantasy`

**Content:** Genre hero, Trending in genre, Top rated, New releases, Full grid

---

### 4. Category Pages (`/category/[slug]`)

| Slug | Content |
|------|---------|
| `trending` | Trending movies + TV combined |
| `new-releases` | Released in last 30 days |
| `top-rated` | Rating 8+ with 1000+ votes |
| `hidden-gems` | Rating 7.5+, under 1000 votes |
| `classics` | Pre-1990, highly rated |
| `international` | Non-English language |

---

### 5. New Releases (`/new/movies`, `/new/shows`)

**Movies:** This Week, This Month, Full List with filters
**TV Shows:** Card View with episode progress, List View, Calendar View

**Filters:** Time Period, Genre, Rating, Language, Streaming, Sort

---

### 6. AI Discovery (`/discover`)

**Features:**
- Large textarea for natural language input
- Content type selector (All/Movies/TV/Animation/Anime)
- Example prompts as clickable pills
- Results with AI-generated explanations
- "Not quite right? Refine your search" follow-up

**Example Prompts:**
- "A cozy anime series to watch on a rainy day"
- "Mind-bending thriller like Dark"
- "90s sitcom vibes with a modern twist"

---

### 7. Content Blend (`/blend`)

User selects 2-3 titles, TasteDive finds content that combines their essences.

**Example:**
- Input: "Breaking Bad" + "Death Note"
- Output: "Ozark" - "Cat-and-mouse tension with a protagonist's moral descent"

---

### 8. Similar Content (`/similar/[type]/[slug]`)

**Primary Provider:** TasteDive (with TMDB fallback)

**URL Format:** `/similar/movie/inception-2010`

**Content:**
- Original content hero
- "Why people love [Title]" - 3 key traits
- Similar content grid (TasteDive results enriched with TMDB data)

---

### 9. Movie Details (`/movie/[id]`)

**Sections:**
1. Hero - Backdrop, poster, title, year, runtime, rating
2. Quick Actions - Watchlist, share, similar, **play trailer**
3. Where to Watch - Streaming providers
4. Overview - Plot summary, tagline
5. Trailers & Videos - YouTube embeds
6. Cast & Crew - Horizontal scroll
7. Details - Genres, keywords, language
8. Similar Movies - Grid

---

### 10. TV Details (`/tv/[id]`)

**Sections:**
1. Hero - Backdrop, poster, title, years, episode count
2. Quick Actions
3. Where to Watch
4. Overview - Status (Ended/Returning)
5. Trailers & Videos
6. Seasons - Expandable season list
7. Cast & Crew
8. Details - Genres, network, creators
9. Similar Shows

---

### 11. Watchlist (`/watchlist`)

- Stored in localStorage (no account required)
- Filter tabs: All / Movies / TV / Animation / Anime
- Sort by: Date added, Rating, Release year, Title
- "Pick for me" - Random selection

---

## API Routes

### `GET /api/search`
```typescript
// Query: q (required), type (optional), limit (optional)
interface SearchResponse {
  results: Array<{
    id: number;
    title: string;
    media_type: 'movie' | 'tv';
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
    content_type: 'movie' | 'tv' | 'animation' | 'anime';
  }>;
}
```

### `GET /api/movie/[id]`
```typescript
interface MovieResponse {
  id: number;
  title: string;
  overview: string;
  tagline: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number;
  vote_average: number;
  genres: Genre[];
  credits: Credits;
  videos: Video[];
  providers: ProvidersByCountry;
  content_type: 'movie' | 'animation' | 'anime';
}
```

### `GET /api/tv/[id]`
```typescript
interface TVResponse {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  last_air_date: string;
  status: string;
  number_of_seasons: number;
  number_of_episodes: number;
  vote_average: number;
  genres: Genre[];
  seasons: Season[];
  credits: Credits;
  videos: Video[];
  providers: ProvidersByCountry;
  content_type: 'tv' | 'animation' | 'anime';
}
```

### `GET /api/similar/[type]/[id]`
Primary: TasteDive, Fallback: TMDB Similar

### `POST /api/discover`
```typescript
interface DiscoverRequest {
  prompt: string;
  content_types?: ('movie' | 'tv' | 'animation' | 'anime')[];
  filters?: { yearRange?: [number, number]; providers?: string[]; };
}
interface DiscoverResponse {
  results: Array<{
    id: number;
    title: string;
    year: number;
    media_type: 'movie' | 'tv';
    content_type: string;
    poster_path: string | null;
    vote_average: number;
    reason: string;
  }>;
  provider: 'gemini' | 'tastedive' | 'tmdb';
  isFallback: boolean;
}
```

### `POST /api/blend`
```typescript
interface BlendRequest {
  items: Array<{ id: number; type: 'movie' | 'tv' }>;  // 2-3 items
}
interface BlendResponse {
  source_items: Array<{ id: number; title: string; type: string }>;
  results: Array<{
    id: number;
    title: string;
    media_type: 'movie' | 'tv';
    poster_path: string | null;
    vote_average: number;
    blend_reason: string;
  }>;
}
```

---

## TypeScript Interfaces

```typescript
export interface BaseContent {
  id: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: Genre[];
  original_language: string;
  origin_country?: string[];
}

export interface Movie extends BaseContent {
  media_type: 'movie';
  title: string;
  original_title: string;
  release_date: string;
  runtime?: number;
  tagline?: string;
}

export interface TVShow extends BaseContent {
  media_type: 'tv';
  name: string;
  original_name: string;
  first_air_date: string;
  last_air_date?: string;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  status: 'Returning Series' | 'Ended' | 'Canceled' | 'In Production';
  networks?: Network[];
  seasons?: Season[];
}

export type Content = Movie | TVShow;
export type ContentType = 'movie' | 'tv' | 'animation' | 'anime';

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string;
  poster_path: string | null;
  episodes?: Episode[];
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
}

export interface Video {
  id: string;
  key: string;           // YouTube video ID
  name: string;
  site: 'YouTube';
  type: 'Trailer' | 'Teaser' | 'Clip' | 'Featurette';
  official: boolean;
}

export interface WatchlistItem {
  id: number;
  title: string;
  media_type: 'movie' | 'tv';
  content_type: ContentType;
  poster_path: string | null;
  added_at: string;
}
```

---

## TMDB API Wrapper

```typescript
// lib/tmdb/client.ts
const BASE_URL = 'https://api.themoviedb.org/3';

export async function tmdbFetch<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`TMDB Error: ${response.status}`);
  return response.json();
}

export function getPosterUrl(path: string | null, size = 'w500') {
  if (!path) return '/placeholder-poster.png';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getBackdropUrl(path: string | null, size = 'original') {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getContentType(item: Content): ContentType {
  const isTV = item.media_type === 'tv' || 'first_air_date' in item;
  const isAnimation = item.genre_ids?.includes(16) || item.genres?.some(g => g.id === 16);
  const isJapanese = item.origin_country?.includes('JP') || item.original_language === 'ja';
  if (isAnimation && isJapanese) return 'anime';
  if (isAnimation) return 'animation';
  if (isTV) return 'tv';
  return 'movie';
}
```

---

## SEO Strategy

### URL Structure
| Pattern | Example |
|---------|---------|
| `/` | Homepage |
| `/movies` | Browse all movies |
| `/genre/[type]/[slug]` | `/genre/movie/action` |
| `/similar/[type]/[slug]` | `/similar/movie/inception-2010` |
| `/movie/[id]` | `/movie/27205` |
| `/tv/[id]` | `/tv/1396` |
| `/discover` | AI discovery |
| `/blend` | Content blender |

### Structured Data
Movie: `@type: "Movie"`, TV: `@type: "TVSeries"`

---

## Performance

### Core Web Vitals Targets
| Metric | Target | Strategy |
|--------|--------|----------|
| LCP | < 2.5s | Preload hero images, ISR, Redis caching |
| FID | < 100ms | Minimal JS, code splitting |
| CLS | < 0.1 | Reserved image dimensions |

### Redis Caching
```typescript
export async function getCached<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}
```

---

## Deployment (Dokploy on VPS)

### Dockerfile
```dockerfile
FROM node:20-alpine AS base
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on: [redis]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

---

## Testing

### Unit Tests (Vitest)
- API route handlers
- Utility functions
- Custom hooks

### E2E Tests (Playwright)
- Search flow
- Browse & filter
- AI discovery
- Watchlist operations

---

## Security

- Environment variables for all secrets
- Rate limiting via Redis
- Input validation with Zod
- Security headers in next.config.js

---

## Analytics (Umami)

```typescript
umami.track('search', { query: searchTerm, type: 'multi' });
umami.track('discover', { prompt: userPrompt, provider: result.provider });
umami.track('watchlist_add', { id: content.id, type: content.media_type });
```

---

## Monetization

### Ad Placements
| Location | Ad Type |
|----------|---------|
| Homepage below hero | Responsive Leaderboard |
| Content grid (every 12 cards) | In-feed Native |
| Details page sidebar | Rectangle |
| Trailer pre-roll | Video ad (5s skip) |

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "@google/generative-ai": "^0.14.0",
    "zustand": "^4.5.0",
    "zod": "^3.23.0",
    "ioredis": "^5.4.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "vitest": "^1.5.0",
    "@playwright/test": "^1.43.0"
  }
}
```

---

## Roadmap

> **Full roadmap with phases 1.1-5.6:** See [../CLAUDE.md](../CLAUDE.md#roadmap)
