import { ArrowRight, Percent, Swords, Trophy, UserRound, Users } from 'lucide-react';
import type { PlayerStats } from '../data/mockStats';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cx } from '../ui/cx';
import { GameImage } from '../ui/GameImage';
import { Row } from '../ui/Row';
import { StatTile } from '../ui/StatTile';
import { ordinal, titleCase } from '../ui/text';
import { battleSummary, bsOverviewFacts, formatDuration, winRateNote } from './bsFacts';
import type { BattleRow } from './MatchHistory';

interface BSOverviewProps {
  playerStats: PlayerStats;
  /** The same rows the Battles tab lists (win/loss counts under the win rate). */
  battles: readonly BattleRow[];
  /** Opens the Brawlers tab ("All brawlers"). */
  onOpenBrawlers: () => void;
}

const n = (value: number | undefined) => (value === undefined ? '–' : value.toLocaleString('en-US'));

/**
 * Brawl Stars overview. Name, tag, level and trophies are in the summary bar;
 * this starts with the numbers the bar does not show.
 */
export function BSOverview({ playerStats, battles, onOpenBrawlers }: BSOverviewProps) {
  const bs = playerStats.gameVisuals?.bs;
  if (!bs) return null;

  const facts = bsOverviewFacts(playerStats);
  const recent = battleSummary(battles);
  const top = bs.allBrawlers.slice(0, 3);
  const split = [
    { label: '3v3', value: bs.victories3v3 ?? 0 },
    { label: 'Solo Showdown', value: bs.victoriesSolo ?? 0 },
    { label: 'Duo Showdown', value: bs.victoriesDuo ?? 0 },
  ];
  const victories = split.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Win rate"
          value={recent.wins + recent.losses > 0 ? `${playerStats.winRate}%` : '–'}
          sub={winRateNote(battles, 'recent')}
          icon={<Percent />}
        />
        <StatTile label="Victories" value={n(victories)} sub="3v3, solo and duo" icon={<Swords />} />
        <StatTile label="Best trophies" value={n(facts.bestTrophies)} icon={<Trophy />} />
        <StatTile
          label="Brawlers"
          value={n(bs.allBrawlers.length)}
          sub={facts.brawlersInGame ? `of ${n(facts.brawlersInGame)} in the game` : 'unlocked'}
          icon={<Users />}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <Card as="section" title="Account" className="min-w-0">
          <div className="divide-y divide-line">
            <Row label="Total prestige" value={n(bs.prestigeLevel)} />
            <Row label="Experience points" value={n(bs.expPoints)} />
            {facts.ranked && <Row label="Ranked" value={facts.ranked.elo ? `${facts.ranked.rank} · ${facts.ranked.elo}` : facts.ranked.rank} />}
            {facts.bestRanked && <Row label="Best Ranked" value={facts.bestRanked} />}
            {(bs.bestRoboRumbleTime ?? 0) > 0 && <Row label="Best Robo Rumble" value={formatDuration(bs.bestRoboRumbleTime!)} />}
          </div>
        </Card>

        <div className="min-w-0 space-y-4 lg:col-span-2">
          {top.length > 0 && (
            <Card
              as="section"
              title="Top brawlers"
              action={
                <Button variant="ghost" onClick={onOpenBrawlers}>
                  All brawlers
                  <ArrowRight aria-hidden="true" />
                </Button>
              }
            >
              <ol className="grid grid-cols-3 gap-3">
                {top.map((b, i) => (
                  <li
                    key={b.id}
                    data-testid="top-brawler"
                    className={cx('flex min-w-0 flex-col items-center gap-2 rounded-card border p-3 text-center', i === 0 ? 'border-accent' : 'border-line')}
                  >
                    <span className="text-xs font-medium text-fg-subtle">{ordinal(i + 1)}</span>
                    <GameImage sources={[b.imageUrl]} alt="" width={64} height={64} fallback={<UserRound />} className="size-16 rounded-lg object-cover" />
                    <span className="w-full truncate text-sm font-semibold text-fg">{titleCase(b.name)}</span>
                    <span className="inline-flex items-center gap-1 text-sm tabular-nums text-fg-muted">
                      <Trophy aria-hidden="true" className="size-4 shrink-0 text-accent" />
                      {n(b.trophies)}
                      <span className="sr-only"> trophies</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <Card as="section" title="Victories by mode">
            <ul className="space-y-3">
              {split.map((s) => {
                const pct = victories > 0 ? Math.round((s.value / victories) * 100) : 0;
                return (
                  <li key={s.label}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-fg-muted">{s.label}</span>
                      <span className="tabular-nums text-fg">
                        {n(s.value)} <span className="text-fg-subtle">· {pct}%</span>
                      </span>
                    </div>
                    <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface-2">
                      <div className="h-full rounded-pill bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
