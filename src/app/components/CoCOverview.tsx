import { Crown, Shield, Star, Swords, Trophy } from 'lucide-react';
import type { PlayerStats } from '../data/mockStats';
import { Card } from '../ui/Card';
import { GameImage } from '../ui/GameImage';
import { Row } from '../ui/Row';
import { StatTile } from '../ui/StatTile';
import { roleLabel } from './cocFacts';

/** Legend lines have long values (`2023-09 · #3,207 · 5,514 trophies`): below sm the value drops under its label instead of truncating it. */
function LegendLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-11 flex-col justify-center gap-0.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="text-sm text-fg-muted">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-fg sm:text-right">{value}</span>
    </div>
  );
}

const n = (value: number | undefined) => (value ?? 0).toLocaleString('en-US');

/** Clash of Clans "Overview" tab: headline numbers, trophies, clan and Legend League. */
export function CoCOverview({ playerStats }: { playerStats: PlayerStats }) {
  const coc = playerStats.gameVisuals?.coc;
  if (!coc) return null;
  const legend = coc.legendStatistics;
  const bestTrophies = coc.bestTrophies ?? playerStats.trophies;
  const role = roleLabel(coc.clanRole);
  const season = (s: { rank?: number; trophies: number }) => `${s.rank ? `#${n(s.rank)} · ` : ''}${n(s.trophies)} trophies`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="War stars" value={n(coc.warStars)} sub="Clan war total" icon={<Star />} />
        <StatTile label="Attack wins" value={n(coc.lifetimeAttackWins)} sub="Lifetime" icon={<Swords />} />
        <StatTile label="Defense wins" value={n(coc.lifetimeDefenseWins)} sub="Lifetime" icon={<Shield />} />
        <StatTile label="Best trophies" value={n(bestTrophies)} sub="Home village" icon={<Trophy />} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card as="section" title="Trophies" className="min-w-0">
          <div className="mb-1 flex items-center gap-3">
            <GameImage sources={[coc.leagueBadgeUrl]} alt="" width={40} height={40} fallback={<Trophy />} className="size-10 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="text-xs text-fg-subtle">League</p>
              <p className="text-sm font-semibold text-fg break-words">{coc.leagueName}</p>
            </div>
          </div>
          <div className="divide-y divide-line">
            <Row label="Home village" value={n(playerStats.trophies)} />
            <Row label="Best home village" value={n(bestTrophies)} />
            <Row label="Builder base" value={n(coc.builderBaseTrophies)} />
            <Row label="Best builder base" value={n(coc.bestBuilderBaseTrophies)} />
            <Row label="Builder Hall" value={coc.builderHallLevel > 0 ? `Level ${coc.builderHallLevel}` : 'Not built'} />
          </div>
        </Card>

        <Card as="section" title="Clan" className="min-w-0">
          {coc.clanTag ? (
            <div className="mb-1 flex items-center gap-3">
              <GameImage sources={[coc.clanBadgeUrl]} alt="" width={48} height={48} fallback={<Shield />} className="size-12 shrink-0 object-contain" />
              <div className="min-w-0">
                <p dir="auto" className="text-base font-semibold text-fg break-words">{coc.clanName}</p>
                <p className="text-sm text-fg-muted">
                  {[role, coc.clanLevel ? `Level ${coc.clanLevel}` : undefined].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          ) : (
            <p className="mb-1 flex min-h-11 items-center text-sm text-fg-muted">Not in a clan</p>
          )}
          <div className="divide-y divide-line">
            <Row label="Troops donated this season" value={n(coc.donations)} />
            <Row label="Troops received this season" value={n(coc.donationsReceived)} />
            <Row label="Capital gold contributed" value={n(coc.clanCapitalContributions)} />
          </div>
        </Card>

        {legend && legend.legendTrophies > 0 && (
          <Card as="section" title="Legend League" action={<Crown aria-hidden="true" className="size-4 text-accent" />} className="min-w-0 lg:col-span-2">
            <div className="grid grid-cols-1 divide-y divide-line lg:grid-cols-2 lg:gap-x-8 lg:divide-y-0">
              <LegendLine label="Legend trophies, all time" value={n(legend.legendTrophies)} />
              {legend.currentSeason && <LegendLine label="This season" value={season(legend.currentSeason)} />}
              {legend.bestSeason && <LegendLine label="Best season" value={`${legend.bestSeason.id} · ${season(legend.bestSeason)}`} />}
              {legend.bestBuilderBaseSeason && (
                <LegendLine label="Best builder base season" value={`${legend.bestBuilderBaseSeason.id} · ${season(legend.bestBuilderBaseSeason)}`} />
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
