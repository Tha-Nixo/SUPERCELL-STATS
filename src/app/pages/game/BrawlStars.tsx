import { useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Target, Award, Clock } from 'lucide-react';
import { BSProfile } from '../../components/BSProfile';
import { StatCard } from '../../components/StatCard';
import { TrophyTrend } from '../../components/TrophyTrend';
import { MatchHistory } from '../../components/MatchHistory';
import type { GameModuleProps } from './types';

// Moved verbatim from GamePage.tsx (restyle phase 1, task 4). Tabs move to the URL in task 6.
export default function BrawlStars({ game, playerStats }: GameModuleProps) {
  const [bsActiveTab, setBsActiveTab] = useState<string>('home');
  const onHome = bsActiveTab === 'home';

  const L = playerStats.statLabels ?? {};
  const wins = Math.round(playerStats.totalMatches * playerStats.winRate / 100);
  const kdDisplay = typeof playerStats.kd === 'number'
    ? (Number.isInteger(playerStats.kd) ? String(playerStats.kd) : playerStats.kd.toFixed(2))
    : String(playerStats.kd);

  return (
    <>
      <BSProfile
        playerStats={playerStats}
        accentUrl={game.logo || ''}
        accentColor={playerStats.gameVisuals?.bs?.nameColor ? `#${playerStats.gameVisuals.bs.nameColor.replace('0xff', '')}` : game.accent}
        bsActiveTab={bsActiveTab}
        setBsActiveTab={setBsActiveTab}
      />

      {onHome && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title={L.stat1Title ?? 'Win Rate'} value={`${playerStats.winRate}%`}
            subtitle={L.stat1Sub ?? `${wins} wins`}
            icon={<Trophy className="w-6 h-6" />} accentColor={game.accent} />
          <StatCard title={L.stat2Title ?? 'K/D Ratio'} value={L.stat2Value ?? kdDisplay}
            subtitle={L.stat2Sub ?? 'Average per game'}
            icon={<Target className="w-6 h-6" />} accentColor={game.chartPrimary} />
          <StatCard title={L.stat3Title ?? 'Total Matches'} value={L.stat3Value ?? playerStats.totalMatches.toLocaleString()}
            subtitle={L.stat3Sub ?? `${playerStats.hoursPlayed} hours`}
            icon={<Award className="w-6 h-6" />} accentColor={game.chartSecondary} />
          <StatCard title={L.stat4Title ?? 'Trophies'} value={L.stat4Value ?? playerStats.hoursPlayed}
            subtitle={L.stat4Sub ?? ''}
            icon={<Clock className="w-6 h-6" />} accentColor={game.accent} />
        </motion.div>
      )}

      {onHome && playerStats.performanceData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <TrophyTrend data={playerStats.performanceData} accentColor={game.chartPrimary} />
        </motion.div>
      )}

      {onHome && playerStats.recentMatches.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Recent Battles</h3>
          <MatchHistory matches={playerStats.recentMatches} accentColor={game.accent} />
        </motion.div>
      )}
    </>
  );
}
