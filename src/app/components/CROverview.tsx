import { useId, useState } from 'react';
import { ArrowRight, Award, Check, ChevronDown, Crown, Layers, Percent, Shield, Sparkles, Star, Swords, Trophy } from 'lucide-react';
import type { PlayerStats } from '../data/mockStats';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cx } from '../ui/cx';
import { GameImage } from '../ui/GameImage';
import { Pill } from '../ui/Pill';
import { Row } from '../ui/Row';
import { StatTile } from '../ui/StatTile';
import { sentenceCase } from '../ui/text';
import { crFacts } from './crFacts';

interface CROverviewProps {
    playerStats: PlayerStats;
    /** Opens the Deck tab (the deck preview's "View deck"). */
    onOpenDeck: () => void;
}

const n = (value: number | undefined) => (value === undefined ? '–' : value.toLocaleString('en-US'));

/**
 * Clash Royale overview. Name, tag, league, level and trophies are already in
 * the page's summary bar, so this starts with the numbers the bar does not show.
 */
export function CROverview({ playerStats, onOpenDeck }: CROverviewProps) {
    const cr = playerStats.gameVisuals?.cr;
    const badgesId = useId();
    const [badgesOpen, setBadgesOpen] = useState(false);
    if (!cr) return null;

    const facts = crFacts(playerStats);
    const deck = cr.currentDeck?.slice(0, 8) ?? [];
    const pol = cr.pathOfLegend;
    const league = cr.leagueStatistics;
    const legacyBest = cr.legacyTrophyRoadHighScore ?? 0;
    const hasPol = Boolean(pol?.currentSeason || pol?.bestSeason);
    const hasLeague = Boolean(league?.currentSeason || league?.bestSeason) || legacyBest > 0;
    const achievements = (cr.achievements ?? []).filter((a) => a.value > 0);
    const badges = cr.badges ?? [];
    const xp = cr.expPoints ?? 0;

    return (
        <div className="space-y-4">
            <div className={cx('grid grid-cols-2 gap-3', xp > 0 ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
                <StatTile
                    label="Win rate"
                    value={`${playerStats.winRate}%`}
                    sub={facts.wins !== undefined ? `${n(facts.wins)} W / ${n(facts.losses)} L` : undefined}
                    icon={<Percent />}
                />
                <StatTile label="Battles" value={n(playerStats.totalMatches)} icon={<Swords />} />
                <StatTile label="Three-crown wins" value={n(facts.threeCrownWins)} icon={<Crown />} />
                <StatTile label="Best trophies" value={n(facts.bestTrophies)} sub={cr.arenaName} icon={<Trophy />} />
                {xp > 0 && (
                    <div className="col-span-2 lg:col-span-1">
                        <StatTile label="Experience" value={n(xp)} sub="XP" icon={<Sparkles />} />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
                <div className="min-w-0 space-y-4">
                    <Card as="section" title="Clan">
                        {facts.clan ? (
                            <>
                                <div className="mb-2 flex items-center gap-3">
                                    <GameImage sources={[cr.clanBadgeUrl]} alt="" width={40} height={40} fallback={<Shield />} className="size-10 shrink-0 object-contain" />
                                    <div className="min-w-0">
                                        <p dir="auto" className="truncate font-semibold text-fg">{facts.clan.name}</p>
                                        <p className="text-xs text-fg-subtle">{facts.clan.tag}</p>
                                    </div>
                                </div>
                                <div className="divide-y divide-line">
                                    <Row label="Role" value={sentenceCase(facts.clan.role)} />
                                    <Row label="Donations" value={n(facts.donations)} />
                                    <Row label="War day wins" value={n(facts.warDayWins)} />
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-fg-muted">Not in a clan right now.</p>
                        )}
                    </Card>

                    {deck.length > 0 && (
                        <Card
                            as="section"
                            title="Battle deck"
                            action={
                                <Button variant="ghost" onClick={onOpenDeck}>
                                    View deck
                                    <ArrowRight aria-hidden="true" />
                                </Button>
                            }
                        >
                            <ul className="grid grid-cols-4 gap-2">
                                {deck.map((card) => (
                                    <li key={card.id} className="flex justify-center rounded-lg bg-surface-2 p-1">
                                        <GameImage sources={[card.iconUrl]} alt={card.name} width={60} height={72} fallback={<Layers />} className="h-16 w-auto object-contain" />
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>

                <div className="min-w-0 space-y-4 lg:col-span-2">
                    {(hasPol || hasLeague) && (
                        <Card as="section" title="Ranked seasons">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                {hasPol && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-fg-muted">Path of Legend</h4>
                                        <div className="divide-y divide-line">
                                            {pol?.currentSeason && <Row label="This season" value={pol.currentSeason.rank ? `#${n(pol.currentSeason.rank)}` : 'Unranked'} />}
                                            {pol?.bestSeason?.rank !== undefined && <Row label="Best season" value={`#${n(pol.bestSeason.rank)}`} />}
                                        </div>
                                    </div>
                                )}
                                {hasLeague && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-fg-muted">Trophy Road</h4>
                                        <div className="divide-y divide-line">
                                            {league?.currentSeason && <Row label="This season" value={n(league.currentSeason.trophies)} />}
                                            {league?.bestSeason && (
                                                <Row label={league.bestSeason.id ? `Best season (${league.bestSeason.id})` : 'Best season'} value={n(league.bestSeason.trophies)} />
                                            )}
                                            {legacyBest > 0 && <Row label="Legacy best" value={n(legacyBest)} />}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {badges.length > 0 && (
                        <Card as="section" padding="none">
                            <h3>
                                <button
                                    type="button"
                                    aria-expanded={badgesOpen}
                                    aria-controls={badgesId}
                                    onClick={() => setBadgesOpen((open) => !open)}
                                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-card px-4 py-3 text-left text-sm font-semibold text-fg hover:bg-surface-2 sm:px-5"
                                >
                                    <span>
                                        Badges <span className="font-normal text-fg-subtle tabular-nums">({badges.length})</span>
                                    </span>
                                    <ChevronDown aria-hidden="true" className={cx('size-4 text-fg-muted transition-transform duration-200', badgesOpen && 'rotate-180')} />
                                </button>
                            </h3>
                            {badgesOpen && (
                                <ul
                                    id={badgesId}
                                    data-testid="badge-list"
                                    className="grid grid-cols-3 gap-3 px-4 pb-4 transition duration-200 ease-out-quick starting:-translate-y-1 starting:opacity-0 sm:grid-cols-5 sm:px-5 sm:pb-5 lg:grid-cols-6"
                                >
                                    {badges.map((badge, i) => (
                                        <li key={`${badge.name}-${i}`} className="flex min-w-0 flex-col items-center gap-1 text-center">
                                            <GameImage sources={[badge.iconUrl]} alt="" width={48} height={48} fallback={<Award />} className="size-12 object-contain" />
                                            <span className="w-full truncate text-xs text-fg-muted">{badge.name}</span>
                                            {badge.level > 0 && (
                                                <span className="text-xs text-fg-subtle tabular-nums">
                                                    Level {badge.level}{badge.maxLevel ? ` of ${badge.maxLevel}` : ''}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    )}
                </div>
            </div>

            {achievements.length > 0 && (
                <Card as="section" title="Achievements">
                    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {achievements.map((a) => {
                            const pct = a.target ? Math.min(100, (a.value / a.target) * 100) : 100;
                            const done = a.target > 0 && a.value >= a.target;
                            return (
                                <li key={a.name} className="rounded-card border border-line p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-sm font-semibold text-fg">{a.name}</span>
                                        <span className="flex shrink-0 gap-0.5" role="img" aria-label={`${a.stars} of 3 stars`}>
                                            {[0, 1, 2].map((i) => (
                                                <Star key={i} aria-hidden="true" className={cx('size-3.5', i < a.stars ? 'fill-accent text-accent' : 'text-fg-subtle')} />
                                            ))}
                                        </span>
                                    </div>
                                    {a.info && <p className="mt-1 text-xs text-fg-subtle">{a.info}</p>}
                                    <div className="mt-3 flex items-center gap-3">
                                        <div aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-2">
                                            <div className="h-full rounded-pill bg-accent" style={{ width: `${pct}%` }} />
                                        </div>
                                        {done ? (
                                            <Pill tone="solid" icon={<Check />}>Done</Pill>
                                        ) : (
                                            <span className="text-xs whitespace-nowrap text-fg-subtle tabular-nums">
                                                {n(a.value)} / {n(a.target)}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </Card>
            )}
        </div>
    );
}
