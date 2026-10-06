import { useState } from 'react';
import { ArrowUpDown, Droplet, Layers, ListFilter, Search, SearchX, Star } from 'lucide-react';
import type { CRCardData } from '../data/mockStats';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { GameImage } from '../ui/GameImage';
import { Pill } from '../ui/Pill';
import { sentenceCase } from '../ui/text';

interface CRCardsListProps {
    cards: CRCardData[];
}

type SortKey = 'level' | 'count' | 'elixir';
const SORTS: ReadonlyArray<[SortKey, string]> = [['level', 'Level'], ['count', 'Copies'], ['elixir', 'Elixir']];
const RARITIES = ['all', 'common', 'rare', 'epic', 'legendary', 'champion'] as const;

const isOwned = (c: CRCardData) => c.count > 0 || c.level > 1;
const FIELD = 'min-h-11 w-full rounded-card border border-line-input bg-canvas text-sm text-fg';

/** Clash Royale "Cards" tab: the whole collection with search, rarity filter and sort. */
export function CRCardsList({ cards }: CRCardsListProps) {
    const [query, setQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortKey>('level');
    const [rarity, setRarity] = useState<string>('all');

    if (cards.length === 0) {
        return (
            <EmptyState icon={<Layers />} title="No cards to show">
                The API sent no card collection for this player.
            </EmptyState>
        );
    }

    const q = query.trim().toLowerCase();
    const shown = cards
        .filter((c) => c.name.toLowerCase().includes(q) && (rarity === 'all' || c.rarity?.toLowerCase() === rarity))
        .sort((a, b) =>
            sortBy === 'level' ? b.level - a.level : sortBy === 'count' ? b.count - a.count : (b.elixirCost ?? 0) - (a.elixirCost ?? 0),
        );
    const owned = shown.filter(isOwned);
    const missing = shown.filter((c) => !isOwned(c));

    return (
        <div className="space-y-4">
            <Card className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <label className="relative block">
                    <span className="sr-only">Search cards</span>
                    <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
                    <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search cards" className={`${FIELD} pr-3 pl-9`} />
                </label>
                <label className="relative block">
                    <span className="sr-only">Filter cards by rarity</span>
                    <ListFilter aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
                    <select value={rarity} onChange={(e) => setRarity(e.target.value)} className={`${FIELD} pr-3 pl-9`}>
                        {RARITIES.map((r) => <option key={r} value={r}>{r === 'all' ? 'All rarities' : sentenceCase(r)}</option>)}
                    </select>
                </label>
                <label className="relative block">
                    <span className="sr-only">Sort cards</span>
                    <ArrowUpDown aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className={`${FIELD} pr-3 pl-9`}>
                        {SORTS.map(([key, label]) => <option key={key} value={key}>Sort by {label.toLowerCase()}</option>)}
                    </select>
                </label>
            </Card>

            {shown.length === 0 && (
                <EmptyState
                    icon={<SearchX />}
                    title="No cards match"
                    action={<Button onClick={() => { setQuery(''); setRarity('all'); }}>Clear search and filter</Button>}
                >
                    Try another name or rarity.
                </EmptyState>
            )}
            {owned.length > 0 && <CardGrid title={`Collection (${owned.length})`} cards={owned} owned />}
            {missing.length > 0 && <CardGrid title={`Not found yet (${missing.length})`} cards={missing} owned={false} />}
        </div>
    );
}

function CardGrid({ title, cards, owned }: { title: string; cards: CRCardData[]; owned: boolean }) {
    return (
        <Card as="section" title={title}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {cards.map((card) => {
                    const evolved = (card.evolutionLevel ?? 0) > 0;
                    const maxed = card.level >= card.maxLevel;
                    const pct = card.maxCount > 0 ? Math.min(100, (card.count / card.maxCount) * 100) : 0;
                    return (
                        <li key={card.id} data-testid="collection-card" className="flex min-w-0 flex-col items-center gap-2 rounded-card border border-line p-3 text-center">
                            <GameImage
                                sources={evolved ? [card.evolutionIconUrl, card.iconUrl] : [card.iconUrl]}
                                alt=""
                                width={65}
                                height={96}
                                fallback={<Layers />}
                                className={owned ? 'h-24 w-auto object-contain' : 'h-24 w-auto object-contain opacity-60 grayscale'}
                            />
                            <div className="w-full min-w-0">
                                <h4 className="truncate text-sm font-semibold text-fg">{card.name}</h4>
                                <p className="mt-0.5 text-xs text-fg-subtle">
                                    {card.rarity ? `${sentenceCase(card.rarity)} · ` : ''}Level {card.level}
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-1.5">
                                {card.elixirCost !== undefined && (
                                    <Pill icon={<Droplet />}>
                                        <span className="sr-only">Elixir </span>
                                        {card.elixirCost}
                                    </Pill>
                                )}
                                {evolved && <Pill tone="accent">Evolved</Pill>}
                                {(card.starLevel ?? 0) > 0 && <Pill icon={<Star />}>Star {card.starLevel}</Pill>}
                            </div>
                            {owned && !maxed && (
                                <div className="w-full">
                                    <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-2">
                                        <div className="h-full rounded-pill bg-accent" style={{ width: `${pct}%` }} />
                                    </div>
                                    <p className="mt-1 text-xs tabular-nums text-fg-subtle">
                                        {pct >= 100 ? 'Ready to upgrade' : `${card.count.toLocaleString('en-US')} / ${card.maxCount.toLocaleString('en-US')} copies`}
                                    </p>
                                </div>
                            )}
                            {owned && maxed && <p className="text-xs font-medium text-fg-muted">Max level</p>}
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}
