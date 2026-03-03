import { useState } from 'react';
import { PlayerStats } from '../data/mockStats';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Layers, Shield, Flame } from 'lucide-react';

import { CROverview } from './CROverview';
import { CRCardsList } from './CRCardsList';
import { CRDeck } from './CRDeck';
import { CRTowerTroops } from './CRTowerTroops';

interface CRProfileProps {
    playerStats: PlayerStats;
    accentUrl: string; // The URL to use for the blur background
    accentColor: string;
}

type TabType = 'overview' | 'cards' | 'deck' | 'tower';

export function CRProfile({ playerStats, accentUrl, accentColor }: CRProfileProps) {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const cr = playerStats.gameVisuals?.cr;

    if (!cr) return null;

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
        { id: 'cards', label: `Cards Collection (${cr.cards.filter(c => c.count > 0 || c.level > 1).length}/${cr.cards.length})`, icon: <Layers className="w-4 h-4" /> },
        { id: 'deck', label: 'Battle Deck', icon: <Shield className="w-4 h-4" /> },
        { id: 'tower', label: 'Tower Troops', icon: <Flame className="w-4 h-4" /> },
    ] as const;

    return (
        <div className="relative mt-8">
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-96 -z-10 overflow-hidden rounded-[3rem] opacity-20 pointer-events-none">
                <div
                    className="absolute inset-0 bg-cover bg-center blur-3xl"
                    style={{ backgroundImage: `url(${accentUrl})`, opacity: 0.5 }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f111a]" />
            </div>

            {/* Custom Tab Navigation */}
            <div className="flex justify-center mb-8 px-4">
                <div className="inline-flex flex-wrap justify-center gap-2 p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all relative ${activeTab === tab.id
                                    ? 'text-white'
                                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                                }`}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="cr-active-tab"
                                    className="absolute inset-0 rounded-xl"
                                    style={{ backgroundColor: accentColor, opacity: 0.2 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">{tab.icon}</span>
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="relative min-h-[500px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                    >
                        {activeTab === 'overview' && <CROverview playerStats={playerStats} accent={accentColor} />}
                        {activeTab === 'cards' && <CRCardsList cards={cr.cards} accent={accentColor} />}
                        {activeTab === 'deck' && <CRDeck playerStats={playerStats} accent={accentColor} />}
                        {activeTab === 'tower' && <CRTowerTroops playerStats={playerStats} accent={accentColor} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
