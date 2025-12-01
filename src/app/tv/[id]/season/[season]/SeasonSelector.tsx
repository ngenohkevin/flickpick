'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Season {
  id: number;
  season_number: number;
}

interface SeasonSelectorProps {
  showId: number;
  currentSeason: number;
  allSeasons: Season[];
}

export function SeasonSelector({
  showId,
  currentSeason,
  allSeasons,
}: SeasonSelectorProps) {
  const router = useRouter();

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/tv/${showId}/season/${e.target.value}`);
  };

  return (
    <div className="relative">
      <select
        value={currentSeason}
        onChange={handleSeasonChange}
        className="appearance-none rounded-md border border-border-default bg-bg-secondary py-2 pl-4 pr-10 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
      >
        {allSeasons.map((s) => (
          <option key={s.id} value={s.season_number}>
            Season {s.season_number}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
    </div>
  );
}

interface SeasonQuickNavProps {
  showId: number;
  currentSeason: number;
  allSeasons: Season[];
}

export function SeasonQuickNav({
  showId,
  currentSeason,
  allSeasons,
}: SeasonQuickNavProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {allSeasons.map((s) => (
        <Link
          key={s.id}
          href={`/tv/${showId}/season/${s.season_number}`}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            s.season_number === currentSeason
              ? 'bg-accent-primary text-white'
              : 'bg-bg-tertiary text-text-secondary hover:bg-border-default hover:text-text-primary'
          )}
        >
          S{s.season_number}
        </Link>
      ))}
    </div>
  );
}
