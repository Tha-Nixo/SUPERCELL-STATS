import { useState } from 'react';
import { motion } from 'motion/react';
import { CoCHeroesDisplay } from '../../components/CoCHeroesDisplay';
import { CoCArmyDisplay } from '../../components/CoCArmyDisplay';
import { CoCAchievements } from '../../components/CoCAchievements';
import { CoCOverview } from '../../components/CoCOverview';
import type { GameModuleProps } from './types';

type CocTab = 'overview' | 'army' | 'heroes' | 'achievements';

// Moved verbatim from GamePage.tsx (restyle phase 1, task 4). Tabs move to the URL in task 6.
export default function ClashOfClans({ game, playerStats }: GameModuleProps) {
  const [cocActiveTab, setCocActiveTab] = useState<CocTab>('overview');
  const coc = playerStats.gameVisuals?.coc;

  return (
    <>
      <div className="flex justify-center mt-6">
        <div className="flex bg-black/40 backdrop-blur-md rounded-2xl p-1 border border-white/10 shadow-xl overflow-x-auto max-w-full no-scrollbar">
          {(['overview', 'army', 'heroes', 'achievements'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setCocActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all capitalize whitespace-nowrap ${cocActiveTab === tab ? 'bg-white/15 text-white shadow-md' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
            >
              {tab === 'heroes' ? 'Heroes & Equip' : tab}
            </button>
          ))}
        </div>
      </div>

      {coc && cocActiveTab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <CoCOverview playerStats={playerStats} accent={game.accent} />
        </motion.div>
      )}

      {coc && cocActiveTab === 'heroes' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <CoCHeroesDisplay
            heroes={coc.heroes}
            heroEquipment={coc.heroEquipment}
            leagueName={coc.leagueName}
            leagueBadgeUrl={coc.leagueBadgeUrl}
            clanBadgeUrl={coc.clanBadgeUrl}
            accent={game.accent}
          />
        </motion.div>
      )}

      {coc && cocActiveTab === 'army' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <CoCArmyDisplay
            troops={coc.troops}
            superTroops={coc.superTroops}
            builderBaseTroops={coc.builderBaseTroops}
            spells={coc.spells}
            siegeMachines={coc.siegeMachines}
            pets={coc.pets}
            accent={game.accent}
          />
        </motion.div>
      )}

      {coc && cocActiveTab === 'achievements' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <CoCAchievements achievements={coc.achievements ?? []} accent={game.accent} />
        </motion.div>
      )}
    </>
  );
}
