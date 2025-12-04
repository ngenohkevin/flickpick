# FlickPick - Movie & TV Recommendation Platform

## Overview

FlickPick is a recommendation platform that helps users discover their next favorite watch through:

1. **Similar Content** - Find movies/shows like one you already love
2. **AI-Powered Discovery** - Describe what you're in the mood for in natural language
3. **Multi-Title Blend** - Combine 2-3 titles to find something in between
4. **Mood-Based Browse** - Quick filters for common moods (cozy night in, edge-of-seat thriller, etc.)
5. **Category Browse** - Explore by genre, year, rating, and more
6. **Streaming Availability** - See exactly where to watch each recommendation

---

## Content Types

FlickPick supports four distinct content types:

| Type | Description | TMDB Mapping |
|------|-------------|--------------|
| **Movies** | Feature films | `/movie/*` endpoints |
| **TV Shows** | Series with seasons/episodes | `/tv/*` endpoints |
| **Animation** | Animated movies & series (Western) | Genre filter: Animation (16) |
| **Anime** | Japanese animation (movies & series) | Genre: Animation + origin_country: JP |

### Content Type Detection
```typescript
// Determine content type from TMDB data
function getContentType(item: Movie | TVShow): ContentType {
  const isTV = 'first_air_date' in item;
  const isAnimation = item.genre_ids?.includes(16) || item.genres?.some(g => g.id === 16);
  const isJapanese = item.origin_country?.includes('JP') || item.original_language === 'ja';

  if (isAnimation && isJapanese) return 'anime';
  if (isAnimation) return 'animation';
  if (isTV) return 'tv';
  return 'movie';
}
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | Framework (App Router, Server Components, ISR) |
| Tailwind CSS | Styling + dark mode |
| TypeScript | Type safety |
| TMDB API | Movie/TV data, search, similar content, streaming providers |
| Stream Providers | Content availability via Torrentio, Comet, MediaFusion, TorrentsDB |
| Gemini 1.5 Flash | AI-powered natural language recommendations |
| Zustand | Lightweight client state (watchlist, preferences) |
| Docker | Containerization |
| Dokploy | Deployment & orchestration on VPS |
| Redis | Caching, rate limiting |

> **Note:** For detailed documentation on the stream provider integration, see [docs/STREAM_PROVIDERS.md](docs/STREAM_PROVIDERS.md)

---

## Design System

### Design Philosophy
Inspired by PayPal's clean, professional aesthetic:
- **Minimal & Clean** - Generous whitespace, uncluttered layouts
- **Accessible** - Clear contrast, readable typography, intuitive navigation
- **Consistent** - Unified component library, predictable interactions
- **Professional** - Trustworthy feel without being corporate or cold
- **Dark-first** - Dark mode as default, with polished light mode option

### Color Palette

#### Dark Mode (Default)
```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0b;        /* Main background - near black */
  --bg-secondary: #141417;      /* Cards, elevated surfaces */
  --bg-tertiary: #1c1c21;       /* Hover states, inputs */
  --bg-elevated: #232329;       /* Modals, dropdowns */

  /* Text */
  --text-primary: #ffffff;       /* Headings, important text */
  --text-secondary: #a1a1aa;     /* Body text, descriptions */
  --text-tertiary: #71717a;      /* Muted text, placeholders */
  --text-inverse: #0a0a0b;       /* Text on accent buttons */

  /* Accent - Blue (PayPal-inspired) */
  --accent-primary: #0070f3;     /* Primary buttons, links */
  --accent-hover: #0060df;       /* Hover state */
  --accent-light: #0070f31a;     /* Subtle backgrounds */

  /* Semantic Colors */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  /* Borders */
  --border-subtle: #27272a;
  --border-default: #3f3f46;
  --border-strong: #52525b;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.3);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.25);
}
```

#### Light Mode
```css
[data-theme="light"] {
  /* Backgrounds */
  --bg-primary: #ffffff;
  --bg-secondary: #f4f4f5;
  --bg-tertiary: #e4e4e7;
  --bg-elevated: #ffffff;

  /* Text */
  --text-primary: #09090b;
  --text-secondary: #52525b;
  --text-tertiary: #a1a1aa;
  --text-inverse: #ffffff;

  /* Accent */
  --accent-primary: #0070f3;
  --accent-hover: #005ed4;
  --accent-light: #0070f30f;

  /* Borders */
  --border-subtle: #e4e4e7;
  --border-default: #d4d4d8;
  --border-strong: #a1a1aa;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
}
```

#### Content Type Colors (Badges)
```css
--badge-movie: #8b5cf6;       /* Purple */
--badge-tv: #06b6d4;          /* Cyan */
--badge-animation: #f97316;   /* Orange */
--badge-anime: #ec4899;       /* Pink */
```

### Typography

```css
/* Font Stack */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Font Sizes - Fluid scaling */
--text-xs: 0.75rem;     /* 12px - Badges, captions */
--text-sm: 0.875rem;    /* 14px - Secondary text */
--text-base: 1rem;      /* 16px - Body text */
--text-lg: 1.125rem;    /* 18px - Large body */
--text-xl: 1.25rem;     /* 20px - Card titles */
--text-2xl: 1.5rem;     /* 24px - Section headers */
--text-3xl: 1.875rem;   /* 30px - Page titles */
--text-4xl: 2.25rem;    /* 36px - Hero titles */
--text-5xl: 3rem;       /* 48px - Large hero */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;

/* Letter Spacing */
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
```

**Typography Scale:**
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Hero title | text-5xl | bold | text-primary |
| Page title | text-3xl | semibold | text-primary |
| Section header | text-2xl | semibold | text-primary |
| Card title | text-lg | semibold | text-primary |
| Body | text-base | normal | text-secondary |
| Caption | text-sm | normal | text-tertiary |
| Badge | text-xs | medium | varies |

### Spacing System

```css
/* Based on 4px grid */
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

**Spacing Usage:**
| Use Case | Spacing |
|----------|---------|
| Between icon and text | space-2 |
| Between form elements | space-4 |
| Card padding | space-5 to space-6 |
| Between sections | space-12 to space-16 |
| Page padding (mobile) | space-4 |
| Page padding (desktop) | space-8 |

### Border Radius

```css
--radius-sm: 0.375rem;   /* 6px - Badges, small elements */
--radius-md: 0.5rem;     /* 8px - Buttons, inputs */
--radius-lg: 0.75rem;    /* 12px - Cards */
--radius-xl: 1rem;       /* 16px - Large cards, modals */
--radius-2xl: 1.5rem;    /* 24px - Hero elements */
--radius-full: 9999px;   /* Pills, avatars */
```

### Component Styles

#### Buttons
```tsx
// Primary Button - Main CTAs
<button className="
  bg-accent-primary hover:bg-accent-hover
  text-text-inverse font-medium
  px-6 py-3 rounded-md
  transition-colors duration-200
  shadow-sm hover:shadow-md
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Find Movies
</button>

// Secondary Button - Less prominent actions
<button className="
  bg-bg-tertiary hover:bg-border-default
  text-text-primary font-medium
  px-6 py-3 rounded-md
  border border-border-default
  transition-colors duration-200
">
  Cancel
</button>

// Ghost Button - Subtle actions
<button className="
  bg-transparent hover:bg-bg-tertiary
  text-text-secondary hover:text-text-primary
  px-4 py-2 rounded-md
  transition-colors duration-200
">
  Learn more
</button>

// Icon Button
<button className="
  p-2 rounded-full
  bg-transparent hover:bg-bg-tertiary
  text-text-secondary hover:text-text-primary
  transition-colors duration-200
">
  <Icon />
</button>
```

**Button Sizes:**
| Size | Padding | Font Size |
|------|---------|-----------|
| sm | px-4 py-2 | text-sm |
| md | px-6 py-3 | text-base |
| lg | px-8 py-4 | text-lg |

#### Cards
```tsx
// Content Card (Movie/TV)
<div className="
  bg-bg-secondary rounded-lg overflow-hidden
  border border-border-subtle
  hover:border-border-default
  transition-all duration-200
  hover:shadow-lg hover:-translate-y-1
  group cursor-pointer
">
  {/* Poster */}
  <div className="aspect-[2/3] relative overflow-hidden">
    <Image ... className="group-hover:scale-105 transition-transform duration-300" />
    {/* Overlay on hover */}
    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Quick actions */}
    </div>
  </div>
  {/* Info */}
  <div className="p-4">
    <h3 className="font-semibold text-text-primary truncate">Title</h3>
    <p className="text-sm text-text-tertiary">2024 • 8.5★</p>
  </div>
</div>

// Info Card (Categories, Stats)
<div className="
  bg-bg-secondary rounded-xl p-6
  border border-border-subtle
  hover:border-accent-primary/50
  transition-colors duration-200
">
  <Icon className="text-accent-primary mb-4" />
  <h3 className="font-semibold text-text-primary">Title</h3>
  <p className="text-text-secondary mt-2">Description</p>
</div>
```

#### Inputs
```tsx
// Text Input
<input className="
  w-full px-4 py-3 rounded-md
  bg-bg-tertiary border border-border-default
  text-text-primary placeholder:text-text-tertiary
  focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent
  transition-all duration-200
" />

// Search Input with Icon
<div className="relative">
  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
  <input className="
    w-full pl-12 pr-4 py-3 rounded-full
    bg-bg-tertiary border border-border-default
    text-text-primary placeholder:text-text-tertiary
    focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent
  " />
</div>

// Textarea (AI Prompt)
<textarea className="
  w-full px-4 py-4 rounded-xl
  bg-bg-tertiary border border-border-default
  text-text-primary placeholder:text-text-tertiary
  focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent
  resize-none min-h-[120px]
" />
```

#### Navigation
```tsx
// Header
<header className="
  sticky top-0 z-50
  bg-bg-primary/80 backdrop-blur-lg
  border-b border-border-subtle
">
  <nav className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
    {/* Logo */}
    {/* Nav Links - Desktop */}
    {/* Search + Theme Toggle + Mobile Menu */}
  </nav>
</header>

// Nav Link
<a className="
  text-text-secondary hover:text-text-primary
  font-medium px-4 py-2 rounded-md
  hover:bg-bg-tertiary
  transition-colors duration-200
">
  Movies
</a>

// Active Nav Link
<a className="
  text-accent-primary font-medium
  px-4 py-2 rounded-md
  bg-accent-light
">
  Movies
</a>
```

#### Badges
```tsx
// Content Type Badge
<span className="
  inline-flex items-center
  px-2.5 py-0.5 rounded-full
  text-xs font-medium
  bg-badge-movie/20 text-badge-movie  /* Movie - Purple */
  bg-badge-tv/20 text-badge-tv        /* TV - Cyan */
  bg-badge-anime/20 text-badge-anime  /* Anime - Pink */
">
  Movie
</span>

// Rating Badge
<span className="
  inline-flex items-center gap-1
  px-2 py-1 rounded-md
  bg-warning/20 text-warning
  text-sm font-medium
">
  <StarIcon className="w-4 h-4" />
  8.5
</span>

// Genre Pill
<span className="
  px-3 py-1.5 rounded-full
  bg-bg-tertiary text-text-secondary
  text-sm font-medium
  hover:bg-border-default hover:text-text-primary
  cursor-pointer transition-colors
">
  Action
</span>
```

### Layout Patterns

#### Page Container
```tsx
<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {children}
</main>
```

#### Section
```tsx
<section className="py-12 sm:py-16">
  <div className="flex items-center justify-between mb-6 sm:mb-8">
    <h2 className="text-2xl font-semibold text-text-primary">Section Title</h2>
    <a className="text-accent-primary hover:underline">View all</a>
  </div>
  {content}
</section>
```

#### Content Grid (Responsive)
```tsx
// Movie/TV Grid
<div className="
  grid gap-4 sm:gap-6
  grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6
">
  {items}
</div>

// Category/Genre Grid
<div className="
  grid gap-4
  grid-cols-2 sm:grid-cols-3 md:grid-cols-4
">
  {items}
</div>
```

#### Horizontal Scroll Row
```tsx
<div className="
  flex gap-4 overflow-x-auto
  scrollbar-hide snap-x snap-mandatory
  -mx-4 px-4 sm:-mx-8 sm:px-8
">
  {items.map(item => (
    <div key={item.id} className="snap-start flex-shrink-0 w-40 sm:w-48">
      <ContentCard />
    </div>
  ))}
</div>
```

### Responsive Breakpoints

```css
/* Tailwind defaults */
sm: 640px   /* Large phones, small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large desktops */
```

**Responsive Behavior:**
| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Nav | Hamburger menu | Hamburger | Full nav |
| Grid columns | 2 | 3-4 | 5-6 |
| Card size | Compact | Medium | Full |
| Sidebar filters | Bottom sheet | Slide-over | Sticky sidebar |
| Search | Full-screen overlay | Expanded bar | Inline |

### Theme Toggle Implementation

```tsx
// stores/preferences.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';

interface PreferencesStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const usePreferences = create<PreferencesStore>()(
  persist(
    (set) => ({
      theme: 'dark', // Default to dark
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'flickpick-preferences' }
  )
);

// components/ThemeToggle.tsx
export function ThemeToggle() {
  const { theme, setTheme } = usePreferences();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-full hover:bg-bg-tertiary transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

// app/layout.tsx - Apply theme class
<html lang="en" data-theme={theme} className={theme}>
```

### Animations & Transitions

```css
/* Transition durations */
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;

/* Easing */
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

**Common Animations:**
```tsx
// Fade in on page load
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>

// Stagger children (grid items)
<motion.div
  variants={{
    show: { transition: { staggerChildren: 0.05 } }
  }}
>

// Card hover lift
hover:-translate-y-1 hover:shadow-lg transition-all duration-200

// Image zoom on hover
group-hover:scale-105 transition-transform duration-300

// Skeleton pulse
animate-pulse bg-bg-tertiary
```

### Skeleton Loading States

```tsx
// Card Skeleton
<div className="bg-bg-secondary rounded-lg overflow-hidden border border-border-subtle">
  <div className="aspect-[2/3] bg-bg-tertiary animate-pulse" />
  <div className="p-4 space-y-2">
    <div className="h-4 bg-bg-tertiary rounded animate-pulse w-3/4" />
    <div className="h-3 bg-bg-tertiary rounded animate-pulse w-1/2" />
  </div>
</div>

// Text Skeleton
<div className="space-y-2">
  <div className="h-6 bg-bg-tertiary rounded animate-pulse w-48" />
  <div className="h-4 bg-bg-tertiary rounded animate-pulse w-full" />
  <div className="h-4 bg-bg-tertiary rounded animate-pulse w-2/3" />
</div>
```

### Icons

Use **Lucide React** for consistent iconography:
```bash
npm install lucide-react
```

**Common Icons:**
| Icon | Use Case |
|------|----------|
| Search | Search bar |
| Menu | Mobile nav |
| X | Close/dismiss |
| ChevronRight | Navigation, links |
| Star | Ratings |
| Heart | Watchlist |
| Play | Watch/trailer |
| Filter | Filter toggle |
| Sun/Moon | Theme toggle |
| Tv, Film, Sparkles | Content types |

### Accessibility Checklist

- [ ] Color contrast ratio ≥ 4.5:1 (AA)
- [ ] Focus visible on all interactive elements
- [ ] Skip to main content link
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Alt text on all images
- [ ] ARIA labels on icon buttons
- [ ] Reduced motion support (`prefers-reduced-motion`)
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Screen reader announcements for dynamic content

```tsx
// Focus ring utility
focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Architecture

### Data Flow
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  Next.js API │────▶│  TMDB API   │
│  (React)    │     │   Routes     │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
       │                   │
       │                   ▼
       │            ┌──────────────┐
       │            │   Gemini AI  │
       │            │   (discover) │
       │            └──────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌──────────────┐
│ localStorage│     │    Redis     │
│ (watchlist) │     │   (cache)    │
└─────────────┘     └──────────────┘
```

### Caching Strategy

| Data Type | Strategy | TTL | Implementation |
|-----------|----------|-----|----------------|
| Movie/TV details | Redis + ISR | 24 hours | `revalidate: 86400` |
| Similar content | Redis + ISR | 24 hours | `revalidate: 86400` |
| Search results | Redis | 5 minutes | TTL in Redis |
| Trending/Popular | Redis + ISR | 1 hour | `revalidate: 3600` |
| Streaming providers | Redis + ISR | 6 hours | `revalidate: 21600` |
| Genre/Category lists | Redis | 7 days | Static data |
| AI recommendations | No cache | - | Fresh per request |

### Error Handling Pattern
```typescript
// Consistent error response format across all API routes
interface ApiError {
  error: string;
  code: 'NOT_FOUND' | 'TMDB_ERROR' | 'AI_ERROR' | 'RATE_LIMITED' | 'INVALID_INPUT';
  details?: string;
}

// Client-side: graceful degradation
// - TMDB down → show cached/static fallback content
// - AI down → fall back to TMDB similar content
// - Network error → offline indicator + retry button
```

### Rate Limiting
```typescript
// API route protection using Redis
const rateLimit = {
  '/api/discover': { requests: 10, window: '1m', per: 'ip' },
  '/api/search': { requests: 30, window: '1m', per: 'ip' },
  '/api/*': { requests: 100, window: '1m', per: 'ip' },
};
```

---

