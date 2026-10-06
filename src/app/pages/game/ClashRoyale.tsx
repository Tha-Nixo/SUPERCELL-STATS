import { motion } from 'motion/react';
import { CRProfile } from '../../components/CRProfile';
import { TrophyTrend } from '../../components/TrophyTrend';
import { MatchHistory } from '../../components/MatchHistory';
import type { GameModuleProps } from './types';

// Moved verbatim from GamePage.tsx (restyle phase 1, task 4). Tabs move to the URL in task 6.
export default function ClashRoyale({ game, playerStats }: GameModuleProps) {
  return (
    <>
      {playerStats.gameVisuals?.cr && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <CRProfile playerStats={playerStats} accentUrl={game.logo || ''} accentColor={game.accent} />
        </motion.div>
      )}

      {playerStats.performanceData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <TrophyTrend data={playerStats.performanceData} accentColor={game.chartPrimary} />
        </motion.div>
      )}

      {playerStats.recentMatches.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Recent Battles</h3>
          <MatchHistory matches={playerStats.recentMatches} accentColor={game.accent} />
        </motion.div>
      )}
    </>
  );
}
