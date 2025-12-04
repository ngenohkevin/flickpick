# Stream Provider Integration

> **Main Reference:** [../CLAUDE.md](../CLAUDE.md) - Contains overview, design system, architecture, project structure, and roadmap.

FlickPick integrates with multiple Stremio addon APIs to verify content availability. This ensures that only movies and TV shows with actual digital releases (WEB-DL, BluRay, etc.) are displayed to users - not theatrical-only releases or low-quality CAM/TS copies.

## Overview

The stream provider system checks if content is available on torrent networks by querying Stremio addon APIs. These addons index torrent sites and return available streams for a given IMDB ID.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   FlickPick │────▶│  Stream Provider │────▶│  Torrent Index  │
│   (TMDB ID) │     │  (Torrentio, etc)│     │  (1337x, RARBG) │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │                     │
       │                     ▼
       │              ┌──────────────┐
       │              │ Stream Data  │
       │              │ (quality,    │
       │              │  source,     │
       │              │  seeders)    │
       │              └──────────────┘
       │                     │
       ▼                     ▼
┌─────────────────────────────────────┐
│         Availability Status         │
│  - available: true/false            │
│  - bestQuality: "1080p" | "4K"      │
│  - sources: ["WEB-DL", "BluRay"]    │
│  - streamCount: 45                  │
└─────────────────────────────────────┘
```

## Supported Providers

FlickPick uses a multi-provider fallback system. If one provider is down, the next one is automatically used.

| Provider | Priority | Base URL | Description |
|----------|----------|----------|-------------|
| **Torrentio** | 1 | `torrentio.strem.fun` | Most popular, comprehensive index |
| **Comet** | 2 | `comet.elfhosted.com` | Fast alternative with debrid support |
| **MediaFusion** | 3 | `mediafusion.elfhosted.com` | Universal addon, multi-language |
| **TorrentsDB** | 4 | `torrentsdb.com` | Torrentio fork with more providers |
| **Knightcrawler** | 5 | `knightcrawler.elfhosted.com` | Another reliable alternative |

### Provider API Format

All providers follow the Stremio addon specification:

```
# Movie streams
GET /stream/movie/{imdb_id}.json

# TV show streams
GET /stream/series/{imdb_id}:{season}:{episode}.json
```

**Example Response:**
```json
{
  "streams": [
    {
      "name": "Torrentio\n1080p",
      "title": "[YTS] Movie.Name.2024.1080p.WEB-DL.x264-GROUP\n👤 1520 💾 2.1 GB",
      "infoHash": "abc123...",
      "fileIdx": 0
    },
    {
      "name": "Torrentio\n4K",
      "title": "[RARBG] Movie.Name.2024.2160p.BluRay.x265-GROUP\n👤 890 💾 15.2 GB",
      "infoHash": "def456...",
      "fileIdx": 0
    }
  ]
}
```

## Architecture

### File Structure

```
src/lib/torrentio/
├── index.ts           # Main exports
├── types.ts           # TypeScript interfaces
├── providers.ts       # Provider definitions & fallback logic
├── client.ts          # High-level availability checking
└── availability.ts    # TMDB + stream provider integration
```

### Key Components

#### 1. Stream Providers (`providers.ts`)

Defines each provider and implements the fallback chain:

```typescript
interface StreamProvider {
  name: string;
  baseUrl: string;
  priority: number;
  isAvailable: () => Promise<boolean>;
  getMovieStreams: (imdbId: string) => Promise<TorrentioResponse>;
  getTVStreams: (imdbId: string, season: number, episode: number) => Promise<TorrentioResponse>;
}
```

#### 2. Client Functions (`client.ts`)

High-level functions that parse streams and determine availability:

```typescript
// Check if a movie is available
const status = await checkMovieAvailability("tt1234567");
// Returns: { available: true, bestQuality: "1080p", sources: ["WEB-DL"], streamCount: 45 }

// Check if a TV episode is available
const status = await checkTVAvailability("tt1234567", 1, 1);
```

#### 3. Availability Integration (`availability.ts`)

Combines TMDB data with stream availability:

```typescript
// Get movie with availability info
const movie = await getMovieWithAvailability(tmdbMovie);
// Returns: { ...movie, imdb_id: "tt1234567", availability: { ... } }

// Filter to only available movies
const available = await filterAvailableMovies(movies, 12);
```

## Quality Filtering

The system uses **ULTRA-STRICT filtering** to ensure users only see content with premium quality releases. A movie is only marked as "available" if it passes ALL checks.

### Filtering Process

1. **Exclude Low-Quality Sources** - Filter out streams with CAM/TS indicators
2. **Require 4K/2160p Resolution** - Only 4K content is accepted
3. **Require Valid Source Confirmation** - At least one stream must have an identifiable high-quality source (WEB-DL, BluRay, Remux)
4. **Prefer High-Quality Audio** - Prioritizes streams with premium audio (Atmos, DTS-HD, TrueHD)

### Video Quality Requirements

| Quality | Accepted | Notes |
|---------|----------|-------|
| 2160p / 4K / UHD | ✓ Required | Only 4K content is shown |
| 1080p | ✗ Rejected | Not premium enough |
| 720p | ✗ Rejected | Not premium enough |
| 480p | ✗ Rejected | Not premium enough |
| CAM/TS | ✗ Rejected | Low quality |

### Audio Codec Priority

The system prioritizes streams with the best audio codecs:

| Codec | Priority | Type |
|-------|----------|------|
| Dolby Atmos | 10 (highest) | Object-based |
| TrueHD + Atmos | 10 | Lossless + Object |
| DTS:X | 9 | Object-based |
| DTS-HD MA | 9 | Lossless |
| TrueHD | 9 | Lossless |
| LPCM | 8 | Lossless |
| FLAC | 8 | Lossless |
| DTS-HD | 8 | High-res lossy |
| DD+ / EAC3 | 6 | High-quality lossy |
| DTS | 6 | Standard DTS |
| DD 7.1 | 6 | Dolby 7.1 |
| AC3 / DD 5.1 | 5 | Standard Dolby |
| AAC | 4 | Low quality |

### Video Codec Detection

The system identifies video codecs and HDR:

**Preferred Video Codecs:**
- `HEVC` / `H.265` / `x265` - Modern efficient codec
- `H.264` / `x264` / `AVC` - Standard HD codec

**HDR Formats Detected:**
- `HDR` / `HDR10` / `HDR10+`
- `Dolby Vision` / `DV`

### Accepted Sources (High Quality)
- `WEB-DL` / `WEBDL` / `WEB` - Direct web download
- `WEBRip` - Web rip
- `BluRay` / `BDRip` / `BRRip` - Blu-ray source
- `Remux` - Lossless Blu-ray remux (preferred)
- `HDRip` - HD source
- `HDTV` - HD television
- `DVDRip` - DVD source

### Rejected Sources (Low Quality)
- `CAM` / `HDCAM` / `CAMRip` - Camera recording in theater
- `TS` / `HDTS` / `TELESYNC` - Telesync
- `TC` / `HDTC` / `TELECINE` - Telecine
- `SCR` / `DVDSCR` / `SCREENER` - Screener copies
- `R5` / `R6` - Region 5/6 DVDs (often poor quality)
- `PDVD` / `PreDVD` - Pre-DVD releases
- `PPVRip` - Pay-per-view rips
- `KORSUB` - Korean subs (often indicates CAM)
- `HC` / `HCHDRip` - Hardcoded subs (usually CAM)

### Additional Low-Quality Patterns
The system also detects these patterns that often indicate CAM releases:
- `V1-CAM`, `V2-CAM`, `NEWCAM`, `CLEAN.CAM`
- `HC-`, `-HC`, `.HC.` (hardcoded indicators)
- `HARDCODED`, `HDRIP-HC`

### UI Display

The availability status now includes:

```typescript
interface AvailabilityStatus {
  available: boolean;
  streamCount: number;
  bestQuality: string | null;    // "2160p" or "4K"
  sources: string[];             // ["Remux", "WEB-DL", "BluRay"]
  audioCodec: string | null;     // "ATMOS", "DTS-HD", "TrueHD"
  videoCodec: string | null;     // "HEVC", "x265"
  hasHDR: boolean;               // true if HDR/DV detected
}
```

**Card badges show:**
- Quality + HDR (e.g., "4K HDR")
- Audio codec (e.g., "ATMOS")
- Source type (e.g., "Remux")

### Why Ultra-Strict Filtering?

1. **Premium Experience** - Users expect the best quality available
2. **No CAM/TS Content** - Only digital releases with proper quality
3. **Audio Matters** - Atmos/DTS-HD significantly improves viewing experience
4. **4K Standard** - Most modern content has 4K releases; if only 1080p exists, it's likely not a premium release yet

The ultra-strict filtering ensures only movies with **confirmed 4K releases and high-quality audio** appear in the "Just Released" section.

## Fallback System

### How It Works

1. **Try Primary Provider** - Torrentio is attempted first
2. **On Failure, Try Next** - If Torrentio fails/times out, try Comet
3. **Continue Chain** - Keep trying until success or all providers exhausted
4. **Health Tracking** - Failed providers are temporarily skipped

### Health Management

```typescript
// Provider health tracking (in-memory)
const providerHealth = {
  torrentio: { failures: 0, lastCheck: timestamp },
  comet: { failures: 2, lastCheck: timestamp },
  // ...
};

// Skip provider after 3 consecutive failures
const MAX_FAILURES_BEFORE_SKIP = 3;

// Reset after 5 minutes
const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000;
```

### Timeout Configuration

Each provider request has an 8-second timeout to prevent slow responses from blocking the chain:

```typescript
const REQUEST_TIMEOUT = 8000; // 8 seconds
```

## Usage Examples

### Basic Availability Check

```typescript
import { checkMovieAvailability } from '@/lib/torrentio';

const availability = await checkMovieAvailability('tt1234567');

if (availability.available) {
  console.log(`Available in ${availability.bestQuality}`);
  console.log(`Sources: ${availability.sources.join(', ')}`);
  console.log(`${availability.streamCount} streams found`);
}
```

### Filter Available Movies

```typescript
import { filterAvailableMovies } from '@/lib/torrentio';
import { discoverMovies, toMovie } from '@/lib/tmdb';

// Get recent movies from TMDB
const response = await discoverMovies({
  sort_by: 'popularity.desc',
  'primary_release_date.gte': '2024-09-01',
});

const movies = response.results.map(toMovie);

// Filter to only those with streams available
const availableMovies = await filterAvailableMovies(movies, 12);

// Each movie now has availability info attached
availableMovies.forEach(movie => {
  console.log(`${movie.title}: ${movie.availability.bestQuality}`);
});
```

### Check Provider Health

```typescript
import { checkProvidersHealth } from '@/lib/torrentio';

const health = await checkProvidersHealth();

health.forEach(({ name, available }) => {
  console.log(`${name}: ${available ? '✓' : '✗'}`);
});

// Output:
// torrentio: ✓
// comet: ✓
// mediafusion: ✗
// torrentsdb: ✓
// knightcrawler: ✓
```

### Direct Provider Access

```typescript
import {
  TorrentioProvider,
  CometProvider,
  getMovieStreamsWithFallback
} from '@/lib/torrentio';

// Use specific provider
const streams = await TorrentioProvider.getMovieStreams('tt1234567');

// Or use fallback chain (recommended)
const { streams, provider } = await getMovieStreamsWithFallback('tt1234567');
console.log(`Streams from: ${provider}`); // "torrentio" | "comet" | etc.
```

## Homepage Integration

The "Just Released" section on the homepage uses this system:

```typescript
// src/app/page.tsx

async function getJustReleasedMovies(): Promise<MovieWithAvailability[]> {
  // Get recent popular movies from TMDB
  const response = await discoverMovies({
    sort_by: 'popularity.desc',
    'primary_release_date.gte': ninetyDaysAgo,
    'vote_count.gte': 50,
  });

  const candidates = response.results.map(toMovie);

  // Filter to only those with verified availability
  return filterAvailableMovies(candidates, 12);
}
```

The hero section also prioritizes available movies:

```typescript
// For hero: prioritize Torrentio-verified movies
if (justReleasedMovies.length >= 3) {
  heroItems = justReleasedMovies.slice(0, 5);
} else {
  heroItems = trendingMovies; // Fallback
}
```

## UI Components

### JustReleasedRow

Displays movies with availability badges:

```tsx
<JustReleasedRow movies={justReleasedMovies} />
```

Features:
- Green "Available Now" section badge
- Quality badge per movie (4K, 1080p, HD)
- Source type badge (WEB-DL, BluRay)
- Stream count indicator
- Green hover accent

### Availability Badge Colors

| Quality | Color |
|---------|-------|
| 4K / 2160p | Pink (badge-anime) |
| 1080p | Blue (accent-primary) |
| 720p / HD | Green (success) |

## Performance Considerations

### Caching

The homepage revalidates every hour:

```typescript
export const revalidate = 3600; // 1 hour
```

Availability checks are performed at build time and during revalidation.

### Batch Processing

When checking multiple movies, requests are batched with concurrency limits:

```typescript
const BATCH_SIZE = 5; // Check 5 movies concurrently

for (let i = 0; i < movies.length; i += BATCH_SIZE) {
  const batch = movies.slice(i, i + BATCH_SIZE);
  const results = await Promise.all(
    batch.map(movie => getMovieWithAvailability(movie))
  );
  // ...
}
```

### Request Timeouts

Each provider request has an 8-second timeout:

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 8000);

const response = await fetch(url, { signal: controller.signal });
```

## Error Handling

### Provider Failures

When a provider fails:
1. Error is logged to console
2. Failure is recorded in health tracker
3. Next provider is attempted
4. After 3 failures, provider is skipped for 5 minutes

```typescript
try {
  const response = await provider.getMovieStreams(imdbId);
  recordSuccess(provider.name);
  return response;
} catch (error) {
  recordFailure(provider.name);
  // Try next provider...
}
```

### No Streams Found

If no providers return streams:

```typescript
return {
  available: false,
  streamCount: 0,
  bestQuality: null,
  sources: [],
};
```

### IMDB ID Not Found

If TMDB doesn't have an IMDB ID for a movie:

```typescript
if (!imdbId) {
  return {
    ...movie,
    imdb_id: null,
    availability: { available: false, ... },
  };
}
```

## Environment Variables

No environment variables are required for stream providers. All providers use public endpoints.

Optional debugging:

```typescript
// Set to see which provider succeeded
console.debug(`Movie ${imdbId} availability from: ${provider}`);
```

## Legal Considerations

FlickPick is a **discovery tool only**. It does not:
- Host any content
- Provide download links
- Facilitate streaming
- Store torrent files

The stream provider APIs are used solely to determine if content exists in a watchable format, similar to how JustWatch shows streaming availability.

## Adding New Providers

To add a new stream provider:

1. Add to `providers.ts`:

```typescript
export const NewProvider: StreamProvider = {
  name: 'newprovider',
  baseUrl: 'https://newprovider.com',
  priority: 6, // After existing providers

  isAvailable: async () => {
    const response = await fetchWithTimeout(
      'https://newprovider.com/manifest.json',
      5000
    );
    return response.ok;
  },

  getMovieStreams: async (imdbId: string) => {
    const response = await fetchWithTimeout(
      `https://newprovider.com/stream/movie/${imdbId}.json`
    );
    if (!response.ok) throw new Error(`NewProvider error: ${response.status}`);
    return response.json();
  },

  getTVStreams: async (imdbId: string, season: number, episode: number) => {
    const response = await fetchWithTimeout(
      `https://newprovider.com/stream/series/${imdbId}:${season}:${episode}.json`
    );
    if (!response.ok) throw new Error(`NewProvider error: ${response.status}`);
    return response.json();
  },
};
```

2. Add to `ALL_PROVIDERS` array:

```typescript
export const ALL_PROVIDERS: StreamProvider[] = [
  TorrentioProvider,
  CometProvider,
  MediaFusionProvider,
  TorrentsDBProvider,
  KnightcrawlerProvider,
  NewProvider, // Add here
].sort((a, b) => a.priority - b.priority);
```

3. Export from `index.ts`:

```typescript
export {
  // ...existing exports
  NewProvider,
} from './providers';
```

## Troubleshooting

### All Providers Failing

Check if providers are accessible:

```typescript
const health = await checkProvidersHealth();
console.log(health);
```

### Slow Response Times

Increase timeout if needed (not recommended):

```typescript
const REQUEST_TIMEOUT = 15000; // 15 seconds
```

### Movies Not Showing as Available

1. Check if movie has IMDB ID in TMDB
2. Verify movie has WEB-DL/BluRay release (not just CAM)
3. Check provider health
4. Look at console logs for errors

### Debug Logging

Enable debug logs to see provider responses:

```typescript
console.debug(`Movie ${imdbId} availability from: ${provider}`);
console.debug(`Streams found: ${streams.length}`);
```
