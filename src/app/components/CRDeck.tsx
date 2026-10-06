import { Droplet, Flame, Heart, Layers, Sparkles, Star } from 'lucide-react';
import type { CRCardData, PlayerStats } from '../data/mockStats';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { GameImage } from '../ui/GameImage';
import { Pill } from '../ui/Pill';
import { StatTile } from '../ui/StatTile';
import { sentenceCase } from '../ui/text';

interface CRDeckProps {
    playerStats: PlayerStats;
}

const isEvolved = (card: CRCardData) => (card.evolutionLevel ?? 0) > 0;

/** Clash Royale "Deck" tab: the current battle deck, its numbers, tower troop and favourite card. */
export function CRDeck({ playerStats }: CRDeckProps) {
    const cr = playerStats.gameVisuals?.cr;
    const deck = cr?.currentDeck ?? [];
    if (deck.length === 0) {
        return (
            <EmptyState icon={<Layers />} title="No battle deck to show">
                The API sent no current deck for this player. It appears here after their next battle.
            </EmptyState>
        );
    }

    const avgElixir = deck.reduce((sum, c) => sum + (c.elixirCost ?? 0), 0) / deck.length;
    const evolutions = deck.filter(isEvolved).length;
    const maxed = deck.filter((c) => c.level >= c.maxLevel).length;
    const towerTroop = cr?.currentDeckSupportCards?.[0];
    const favorite = cr?.favoriteCard;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatTile label="Average elixir" value={avgElixir.toFixed(1)} icon={<Droplet />} />
                <StatTile label="Evolutions" value={evolutions} icon={<Sparkles />} />
                <StatTile label="Cards at max level" value={`${maxed} of ${deck.length}`} icon={<Star />} />
            </div>

            <Card as="section" title="Current deck">
                <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {deck.map((card) => (
                        <li key={card.id} data-testid="deck-card" className="flex min-w-0 flex-col items-center gap-3 rounded-card border border-line p-4 text-center">
                            <GameImage
                                sources={isEvolved(card) ? [card.evolutionIconUrl, card.iconUrl] : [card.iconUrl]}
                                alt=""
                                width={93}
                                height={112}
                                fallback={<Layers />}
                                className="h-28 w-auto object-contain"
                            />
                            <div className="w-full min-w-0">
                                <h4 className="truncate text-sm font-semibold text-fg">{card.name}</h4>
                                <p className="mt-1 text-xs text-fg-subtle">
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
                                {isEvolved(card) && <Pill tone="accent">Evolved</Pill>}
                                {(card.starLevel ?? 0) > 0 && <Pill icon={<Star />}>Star {card.starLevel}</Pill>}
                            </div>
                        </li>
                    ))}
                </ul>
            </Card>

            {(towerTroop || favorite) && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {towerTroop && (
                        <Card as="section" title="Tower troop">
                            <div className="flex items-center gap-4">
                                <GameImage sources={[towerTroop.iconUrl]} alt="" width={64} height={77} fallback={<Flame />} className="h-20 w-auto shrink-0 object-contain" />
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-fg">{towerTroop.name}</p>
                                    <p className="mt-1 text-sm text-fg-subtle">{sentenceCase(towerTroop.rarity)} · Level {towerTroop.level}</p>
                                </div>
                            </div>
                        </Card>
                    )}
                    {favorite && (
                        <Card as="section" title="Favourite card">
                            <div className="flex items-center gap-4">
                                <GameImage sources={[favorite.iconUrl]} alt="" width={64} height={77} fallback={<Heart />} className="h-20 w-auto shrink-0 object-contain" />
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-fg">{favorite.name}</p>
                                    {favorite.rarity && <p className="mt-1 text-sm text-fg-subtle">{sentenceCase(favorite.rarity)}</p>}
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
