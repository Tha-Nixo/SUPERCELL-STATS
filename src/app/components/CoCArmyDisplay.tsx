import type { ReactNode } from 'react';
import { FlaskConical, Hammer, PawPrint, Rocket, Sparkles, Swords } from 'lucide-react';
import type { CoCTroopData } from '../data/mockStats';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { GameImage } from '../ui/GameImage';
import { Pill } from '../ui/Pill';
import { cocItemArt } from './cocArt';
import { ARMY_SECTIONS, sectionFacts, type ArmyKind, type CoCVisuals } from './cocFacts';
import { LevelItem } from './CoCItem';

const ICONS: Record<ArmyKind, ReactNode> = {
  troops: <Swords />,
  superTroops: <Sparkles />,
  spells: <FlaskConical />,
  siegeMachines: <Rocket />,
  pets: <PawPrint />,
  builderBaseTroops: <Hammer />,
};

/** Clash of Clans "Army" tab: every troop, spell, siege machine and pet with its level. */
export function CoCArmyDisplay({ coc }: { coc: CoCVisuals }) {
  const sections = ARMY_SECTIONS.map((s) => ({ ...s, items: (coc[s.kind] ?? []) as CoCTroopData[] })).filter((s) => s.items.length > 0);
  if (!sections.some((s) => sectionFacts(s.items).unlocked > 0)) {
    return (
      <EmptyState icon={<Swords />} title="No army in this answer">
        The API listed no unlocked troop, spell, siege machine or pet for this player.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map(({ kind, title, category, items }) => {
        const facts = sectionFacts(items);
        const superTroops = kind === 'superTroops';
        const summary = superTroops
          ? facts.boosted > 0 ? `${facts.boosted} boosted now` : undefined
          : `${facts.maxed} of ${facts.total} at max level`;
        return (
          <Card
            as="section"
            key={kind}
            title={title}
            action={summary && <span className="text-xs text-fg-subtle tabular-nums">{summary}</span>}
            className="min-w-0"
          >
            {facts.unlocked === 0 ? (
              <p className="text-sm text-fg-subtle">None unlocked yet.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {items.map((t, i) => (
                  <LevelItem
                    key={`${t.name}-${i}`}
                    name={t.name}
                    item={superTroops ? undefined : t}
                    art={
                      <GameImage
                        sources={[cocItemArt(t.name, category)]}
                        alt=""
                        width={40}
                        height={40}
                        fallback={ICONS[kind]}
                        className="size-9 shrink-0 object-contain sm:size-10 [&_svg]:size-5"
                      />
                    }
                    extra={superTroops && t.active ? <Pill tone="accent">Boosted now</Pill> : undefined}
                  />
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
