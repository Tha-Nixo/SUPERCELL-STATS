import { Gamepad2, Percent, Swords, Trophy } from 'lucide-react';
import { StatTile } from '../ui/StatTile';
import { battleSummary, placementBased } from './bsFacts';
import type { BattleRow } from './MatchHistory';

const signed = (n: number) => (n > 0 ? `+${n.toLocaleString('en-US')}` : n.toLocaleString('en-US'));

/** Brawl Stars Battles tab: four tiles over the battles of the selected mode. Every tile always has a sub-line, so the row never changes height. */
export function BSBattleSummary({ battles }: { battles: readonly BattleRow[] }) {
  const s = battleSummary(battles);
  // Showdown has no victories: the mapper counts a trophy gain, or a top-half finish when no trophies moved. The sub-line stays short so it fits on one line.
  const showdown = placementBased(battles);
  const noun = battles.length === 1 ? 'battle' : 'battles';
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="Win rate"
        value={s.winRate === undefined ? '–' : `${s.winRate}%`}
        sub={showdown ? 'Gain or top half' : s.wins + s.losses > 0 ? `${s.wins} W / ${s.losses} L` : 'No wins or losses yet'}
        icon={<Percent />}
      />
      <StatTile label="Net trophies" value={signed(s.netTrophies)} sub={`Over ${battles.length} ${noun}`} icon={<Trophy />} />
      <StatTile label="Results" value={`${s.wins} / ${s.losses} / ${s.draws}`} sub="Wins / losses / draws" icon={<Swords />} />
      <StatTile
        label="Most played"
        value={<span className="text-base sm:text-xl">{s.topMode?.mode ?? '–'}</span>}
        sub={s.topMode ? `${s.topMode.count} of ${battles.length} ${noun}` : 'No battles'}
        icon={<Gamepad2 />}
      />
    </div>
  );
}
