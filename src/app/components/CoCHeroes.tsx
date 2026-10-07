import { Crown, Shield } from 'lucide-react';
import type { CoCHeroData, CoCHeroEquipment } from '../data/mockStats';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { GameImage } from '../ui/GameImage';
import { Pill } from '../ui/Pill';
import { ProgressBar } from '../ui/ProgressBar';
import { heroArt } from './cocArt';
import { equipmentList, levelFacts, splitHeroes } from './cocFacts';
import { LevelItem, LevelText } from './CoCItem';

interface CoCHeroesProps {
  heroes: readonly CoCHeroData[];
  equipment: readonly CoCHeroEquipment[];
}

/** Clash of Clans "Heroes and equipment" tab. */
export function CoCHeroes({ heroes, equipment }: CoCHeroesProps) {
  if (heroes.length === 0 && equipment.length === 0) {
    return (
      <EmptyState icon={<Crown />} title="No heroes in this answer">
        The API listed no hero or equipment for this player.
      </EmptyState>
    );
  }
  const { home, builder } = splitHeroes(heroes);
  const pieces = equipmentList(heroes, equipment);
  const equipped = pieces.filter((e) => e.equipped).length;

  return (
    <div className="space-y-4">
      {home.length > 0 && (
        <Card as="section" title="Heroes" className="min-w-0">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {home.map((hero) => <HeroCard key={hero.name} hero={hero} showEquipment />)}
          </ul>
        </Card>
      )}
      {builder.length > 0 && (
        <Card as="section" title="Builder base heroes" className="min-w-0">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {builder.map((hero) => <HeroCard key={hero.name} hero={hero} showEquipment={false} />)}
          </ul>
        </Card>
      )}
      {pieces.length > 0 && (
        <Card
          as="section"
          title="Equipment"
          action={<span className="text-xs text-fg-subtle tabular-nums">{pieces.length} owned · {equipped} equipped</span>}
          className="min-w-0"
        >
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {pieces.map((piece, i) => (
              <LevelItem
                key={`${piece.name}-${i}`}
                name={piece.name}
                item={piece}
                extra={piece.equipped ? <Pill tone="accent">Equipped</Pill> : undefined}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function HeroCard({ hero, showEquipment }: { hero: CoCHeroData; showEquipment: boolean }) {
  const f = levelFacts(hero);
  const worn = hero.equipment ?? [];
  return (
    <li data-testid="hero-card" className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface-1 p-3 sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <GameImage
          sources={[heroArt(hero.name)]}
          alt=""
          width={64}
          height={64}
          fallback={<Crown />}
          className="size-14 shrink-0 rounded-lg bg-surface-2 object-cover sm:size-16"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-fg break-words">{hero.name}</h3>
          <LevelText item={hero} percent />
          {!f.locked && <ProgressBar pct={f.pct} className="mt-2" />}
        </div>
      </div>
      {showEquipment && !f.locked && (
        <div className="border-t border-line pt-3">
          <p className="text-xs text-fg-subtle">Equipped</p>
          {worn.length === 0 ? (
            <p className="mt-1 text-sm text-fg-subtle">Nothing equipped</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {worn.map((e, i) => (
                <li key={`${e.name}-${i}`} className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 text-fg-muted break-words">
                    <Shield aria-hidden="true" className="mr-1.5 inline size-3.5 align-[-2px] text-fg-subtle" />
                    {e.name}
                  </span>
                  <span className="shrink-0">
                    <LevelText item={e} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
