import { Flame } from 'lucide-react';
import type { PlayerStats } from '../data/mockStats';
import { Card } from '../ui/Card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/EmptyState';
import { GameImage } from '../ui/GameImage';
import { Pill } from '../ui/Pill';
import { sentenceCase } from '../ui/text';

interface CRTowerTroopsProps {
  playerStats: PlayerStats;
}

/** Clash Royale "Tower troops" tab: every unlocked tower troop, the equipped one marked. */
export function CRTowerTroops({ playerStats }: CRTowerTroopsProps) {
  const cr = playerStats.gameVisuals?.cr;
  const troops = cr?.supportCards ?? [];
  if (troops.length === 0) {
    return (
      <EmptyState icon={<Flame />} title="No tower troops to show">
        Tower troops unlock as the player climbs. They appear here once the API lists them for this player.
      </EmptyState>
    );
  }
  const equippedId = cr?.currentDeckSupportCards?.[0]?.id;

  return (
    <Card as="section" title={`Tower troops (${troops.length})`}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {troops.map((troop) => {
          const equipped = troop.id === equippedId;
          return (
            <li
              key={troop.id}
              data-testid="tower-troop"
              className={cx('flex min-w-0 flex-col items-center gap-3 rounded-card border p-4 text-center', equipped ? 'border-accent' : 'border-line')}
            >
              <GameImage sources={[troop.iconUrl]} alt="" width={76} height={112} fallback={<Flame />} className="h-28 w-auto object-contain" />
              <div className="w-full min-w-0">
                <h4 className="truncate text-sm font-semibold text-fg">{troop.name}</h4>
                <p className="mt-1 text-xs text-fg-subtle">
                  {sentenceCase(troop.rarity)} · Level {troop.level}
                  {troop.level >= troop.maxLevel && ' (max)'}
                </p>
              </div>
              {equipped && <Pill tone="solid">Equipped</Pill>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
