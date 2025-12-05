# FlickPick Analytics

FlickPick uses [Umami](https://umami.is/) for privacy-friendly analytics. This document covers the analytics setup, tracked events, and dashboard configuration.

## Setup

### Environment Variables

Add these to your `.env.local`:

```env
NEXT_PUBLIC_UMAMI_WEBSITE_ID=your_website_id
NEXT_PUBLIC_UMAMI_URL=https://your-umami-instance.com
```

### Self-Hosted Umami

1. **Deploy Umami** using Docker or your preferred method:
   ```bash
   # Using Docker Compose
   docker-compose up -d
   ```

   See [Umami docs](https://umami.is/docs/install) for full installation guide.

2. **Create a website** in the Umami dashboard and copy the Website ID.

3. **Configure environment** with your Website ID and Umami URL.

### Cloud Umami

Alternatively, use [Umami Cloud](https://cloud.umami.is/) for a managed solution.

## Tracked Events

### Search Events

| Event | Description | Data |
|-------|-------------|------|
| `search` | User performs a search | `query`, `type`, `results_count` |
| `search_result_click` | User clicks a search result | `query`, `content_id`, `content_type`, `position` |

### AI Discovery Events

| Event | Description | Data |
|-------|-------------|------|
| `discover_search` | User uses AI discovery | `prompt`, `content_type`, `provider`, `results_count` |
| `mood_select` | User selects a mood filter | `mood`, `results_count` |
| `blend_search` | User blends multiple titles | `titles`, `results_count` |

### Watchlist Events

| Event | Description | Data |
|-------|-------------|------|
| `watchlist_add` | User adds item to watchlist | `content_id`, `content_type`, `title` |
| `watchlist_remove` | User removes item from watchlist | `content_id`, `content_type`, `title` |
| `watchlist_pick_random` | User uses "Pick for me" | `filter`, `picked_id`, `picked_title` |

### Provider Events

| Event | Description | Data |
|-------|-------------|------|
| `provider_click` | User clicks streaming provider | `provider_name`, `provider_id`, `content_id`, `content_type`, `watch_type` |

### Content Events

| Event | Description | Data |
|-------|-------------|------|
| `content_view` | User views content details | `content_id`, `content_type`, `title` |
| `trailer_play` | User plays a trailer | `content_id`, `content_type`, `title`, `video_key` |
| `share` | User shares content | `content_id`, `content_type`, `title`, `method` |

### Browse Events

| Event | Description | Data |
|-------|-------------|------|
| `filter_change` | User changes browse filters | `page`, `filter_type`, `filter_value` |
| `category_view` | User views category page | `category`, `content_type` |

## Dashboard Setup

### Recommended Reports

Create these custom reports in Umami:

1. **Search Analytics**
   - Top search queries
   - Search → Click conversion rate
   - Zero-result searches

2. **AI Discovery Usage**
   - Discovery prompts by provider (Gemini vs fallback)
   - Popular moods
   - Blend feature usage

3. **Engagement Metrics**
   - Watchlist additions per day
   - "Pick for me" usage
   - Provider click-through rate

4. **Content Performance**
   - Most viewed content
   - Trailer play rate
   - Share rate by content

### Example Umami Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  FlickPick Analytics Dashboard                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Page Views  │  │ Unique Users│  │ Bounce Rate │              │
│  │   12,345    │  │    4,567    │  │    32%      │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│  ┌────────────────────────────────────────┐                     │
│  │ Top Events                             │                     │
│  │ 1. search (3,456)                      │                     │
│  │ 2. watchlist_add (1,234)               │                     │
│  │ 3. discover_search (987)               │                     │
│  │ 4. provider_click (654)                │                     │
│  └────────────────────────────────────────┘                     │
│                                                                 │
│  ┌────────────────────────────────────────┐                     │
│  │ AI Provider Distribution               │                     │
│  │ ■■■■■■■■■■░░░░ Gemini (72%)           │                     │
│  │ ■■■░░░░░░░░░░░ TasteDive (18%)        │                     │
│  │ ■░░░░░░░░░░░░░ TMDB (10%)             │                     │
│  └────────────────────────────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Development Mode

In development (`NODE_ENV=development`), analytics events are logged to the console instead of being sent to Umami:

```
[Analytics] search { query: "inception", type: "all", results_count: 8 }
[Analytics] search_result_click { query: "inception", content_id: 27205, content_type: "movie", position: 0 }
```

This allows you to verify events are firing correctly without polluting production data.

## Adding New Events

1. **Define the event type** in `src/lib/analytics/types.ts`:
   ```typescript
   export interface MyNewEvent extends AnalyticsEvent {
     name: 'my_new_event';
     data: {
       some_field: string;
       another_field: number;
     };
   }
   ```

2. **Add to union type**:
   ```typescript
   export type TrackableEvent =
     | SearchEvent
     | MyNewEvent  // Add here
     | ...
   ```

3. **Create convenience function** in `src/lib/analytics/umami.ts`:
   ```typescript
   export function trackMyNewEvent(someField: string, anotherField: number): void {
     trackEvent('my_new_event', {
       some_field: someField,
       another_field: anotherField,
     });
   }
   ```

4. **Export from index**:
   ```typescript
   export { trackMyNewEvent } from './umami';
   ```

5. **Use in components**:
   ```typescript
   import { trackMyNewEvent } from '@/lib/analytics';

   trackMyNewEvent('value', 123);
   ```

## Privacy Considerations

Umami is privacy-focused by design:
- No cookies required
- No personal data collected
- GDPR compliant
- Data stays on your server (self-hosted)

All tracked events contain only anonymized, aggregate data about feature usage - no user identifiers or personal information.
