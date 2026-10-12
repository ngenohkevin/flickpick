// ==========================================================================
// Movie ↔ TV genre mapping
// TMDB uses different genre IDs for TV (e.g. Action is 28 for movies but
// 10759 "Action & Adventure" for TV), so a movie genre ID sent to /discover/tv
// silently matches nothing.
// ==========================================================================

/** Movie genre IDs mapped to TMDB's TV genres (null: no TV equivalent). */
const MOVIE_TO_TV_GENRE: Record<number, number | null> = {
  28: 10759, // Action -> Action & Adventure
  12: 10759, // Adventure -> Action & Adventure
  878: 10765, // Science Fiction -> Sci-Fi & Fantasy
  14: 10765, // Fantasy -> Sci-Fi & Fantasy
  10752: 10768, // War -> War & Politics
  53: 9648, // Thriller -> Mystery
  27: null, // Horror
  10749: null, // Romance
  36: null, // History
  10402: null, // Music
  10770: null, // TV Movie
};

/** The TV genre for a movie genre ID, or null when TV has no equivalent. */
export function toTVGenre(movieGenre: number): number | null {
  // Shared IDs (16, 18, 35, 80, 99, 9648, 10751, 37) pass through.
  return movieGenre in MOVIE_TO_TV_GENRE ? (MOVIE_TO_TV_GENRE[movieGenre] ?? null) : movieGenre;
}

/** Maps movie genre IDs to TV genre IDs, dropping those with no TV equivalent. */
export function toTVGenres(movieGenres: number[]): number[] {
  const out = new Set<number>();
  for (const id of movieGenres) {
    const tv = toTVGenre(id);
    if (tv != null) out.add(tv);
  }
  return [...out];
}

/** TMDB rejects page numbers above 500 on list and discover endpoints. */
export const TMDB_MAX_PAGE = 500;
