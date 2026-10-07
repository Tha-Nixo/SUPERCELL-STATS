import { Star, Swords, UserRound } from 'lucide-react';
import type { GameTheme } from '../../data/games';
import type { PlayerStats } from '../../data/mockStats';
import type { PlayerSummary } from '../../ui/PlayerSummaryBar';
import { tagSlug } from '../../ui/tag';
import { stripEmoji } from '../../ui/text';

// Town Hall art stored locally under /images/coc/townhall/. Only levels with
// an asset on disk belong here: a missing level shows its number instead.
const TH_IMAGES: Record<number, string> = {
  1: '/images/coc/townhall/th_01.webp',
  7: '/images/coc/townhall/th_07.webp',
  8: '/images/coc/townhall/th_08.webp',
  9: '/images/coc/townhall/th_09.webp',
  10: '/images/coc/townhall/th_10.webp',
  11: '/images/coc/townhall/th_11.webp',
  12: '/images/coc/townhall/th_12.webp',
  13: '/images/coc/townhall/th_13.webp',
  14: '/images/coc/townhall/th_14.webp',
  15: '/images/coc/townhall/th_15.webp',
  16: '/images/coc/townhall/th_16.webp',
};

/** The rank text when it names a league; a bare number is only the trophy count again, so it is dropped. */
export function leagueLabel(rank: string | undefined): string | undefined {
  const text = stripEmoji(rank ?? '');
  return !text || /^[\d.,\s]+$/.test(text) ? undefined : text;
}

/** The shell's view of a player: identity, avatar chain and headline numbers. */
export function buildSummary(game: GameTheme, stats: PlayerStats, urlTag: string): PlayerSummary {
  const visuals = stats.gameVisuals;
  const base = {
    name: stats.username,
    tag: `#${tagSlug(urlTag)}`,
    trophies: stats.trophies,
    level: stats.level,
    league: leagueLabel(stats.rank),
  };

  if (game.id === 'clash-royale' && visuals?.cr) {
    const { arenaId, arenaIconUrl, arenaName } = visuals.cr;
    const sources = [
      arenaIconUrl,
      arenaId ? `https://api-assets.clashroyale.com/arenas/72/${arenaId}.png` : undefined,
      arenaId ? `https://royaleapi.github.io/cr-api-assets/arenas/${arenaId}.png` : undefined,
    ].filter((s): s is string => Boolean(s));
    return { ...base, avatar: { sources, alt: arenaName ? `${arenaName} arena` : 'Arena', fallback: <Swords /> } };
  }

  if (game.id === 'brawl-stars' && visuals?.bs) {
    const { iconId } = visuals.bs;
    const sources = iconId ? [`https://cdn.brawlify.com/profile-icons/regular/${iconId}.png`] : [];
    return { ...base, avatar: { sources, alt: 'Player icon', fallback: <Star /> } };
  }

  if (game.id === 'clash-of-clans' && visuals?.coc) {
    const th = visuals.coc.townHallLevel;
    return {
      ...base,
      league: visuals.coc.leagueName || base.league,
      extra: `Town Hall ${th}`,
      // No local art above Town Hall 16: a two-line "TH / 18" mark instead of a bare number.
      avatar: {
        sources: TH_IMAGES[th] ? [TH_IMAGES[th]] : [],
        alt: `Town Hall ${th}`,
        fallback: (
          <span className="flex flex-col items-center leading-none">
            <span className="text-xs font-medium text-fg-subtle">TH</span>
            {th}
          </span>
        ),
      },
    };
  }

  return { ...base, avatar: { sources: [], alt: '', fallback: <UserRound /> } };
}
