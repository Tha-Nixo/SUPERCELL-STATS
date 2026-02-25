import { motion } from 'motion/react';
import { Link } from 'react-router';
import { games } from '../data/games';

const SUPERCELL_FEATURES = [
  { icon: '⚡', label: 'Live Data', desc: 'Real-time stats from official Supercell APIs' },
  { icon: '🔍', label: 'Player Search', desc: 'Find any player instantly by tag' },
  { icon: '📊', label: 'Deep Analytics', desc: 'Trophies, heroes, decks & battle history' },
];

// Official Supercell Fan Kit character images for each game card
const GAME_CHARACTERS: Record<string, string> = {
  'clash-royale': 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9kbmQ2VmhFUXhkQmZqclBYRHBRZC5wbmcifQ:supercell:Ptfr075q06EczWsn8SQ25LkhQomxHtJzW_dp7erRm-g?width=600',
  'brawl-stars': 'https://media.brawltime.ninja/brawlers/shelly/model.png',
  'clash-of-clans': 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC8xTXljUG5nUzZyWkcySndXbVVZUC5wbmcifQ:supercell:lo30eJacosJhqFSlJ9jUUXwm-M3aDPEJ2StgNdoD4aU?width=600',
};

// Official game logo images from Supercell Fan Kit
const GAME_LOGOS: Record<string, string> = {
  'clash-royale': 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9hSldOVloyZ3JNQkhQQzVUM000Ui5wbmcifQ:supercell:m6w5ekixWdEpSr3rhHNOJfh9DXxnYCf-BSSfLIUNKZs?width=300',
  'brawl-stars': 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9wS0JNWXdhOW51aEFnRG5wSnkzdi5wbmcifQ:supercell:QirzHVs-XdUZ6nYY3QARLhNRZ5ImTEhgF_lY0ehWTmE?width=300',
  'clash-of-clans': 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9Ic1RFOHBEWVk5V2dMNFNwMjZzRS5wbmcifQ:supercell:JN0MDt6Q-ERTDgC6Abgxhu9tgvzwQpOwlqNaC0QM3Jc?width=300',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B0F1A]">

      {/* ─── Hero ─── */}
      <section className="relative py-28 px-6 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-[#4D7FFF]/10 rounded-full blur-[120px]" />
          <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-[#FFC800]/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#8BC34A]/5 rounded-full blur-[140px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Powered by official Supercell APIs
            </div>

            <h1 className="flex flex-wrap items-center justify-center gap-4 text-6xl md:text-8xl font-bold text-white mb-6 leading-tight">
              <img src="https://cdn.supercell.com/supercell.com/221213073743/supercell.com/files/media_logo_supercell_white2x.png" alt="Supercell" className="h-[60px] md:h-[80px] object-contain" />
              <span className="bg-gradient-to-r from-[#4D7FFF] via-[#FFC800] to-[#8BC34A] bg-clip-text text-transparent">
                Stats
              </span>
            </h1>

            <p className="text-xl text-white/50 max-w-xl mx-auto mb-12">
              Track player statistics for all Supercell games.<br />
              Search by player tag — get live data instantly.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-4">
              {SUPERCELL_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-left">
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <div className="text-white text-sm font-semibold">{f.label}</div>
                    <div className="text-white/40 text-xs">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Games Grid ─── */}
      <section className="px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xs font-semibold text-white/30 uppercase tracking-widest text-center mb-8"
          >
            Select a Game
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {games.map((game, index) => {
              const characterImg = GAME_CHARACTERS[game.id];
              const logoImg = GAME_LOGOS[game.id];
              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + index * 0.09 }}
                >
                  <Link to={`/game/${game.id}`} className="block group">
                    <div
                      className="relative overflow-hidden rounded-3xl border border-white/8 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl min-h-[200px]"
                      style={{
                        background: `linear-gradient(135deg, ${game.gradientFrom} 0%, ${game.gradientTo} 100%)`,
                        boxShadow: `0 0 0 1px ${game.accent}10`,
                      }}
                    >
                      {/* Character image — right side, anchored to bottom, semi-transparent */}
                      {characterImg && (
                        <div className="absolute bottom-0 right-0 w-1/2 h-full pointer-events-none overflow-hidden rounded-br-3xl">
                          <img
                            src={characterImg}
                            alt={game.name}
                            className="absolute -bottom-4 right-0 h-[120%] w-auto object-contain object-bottom opacity-30 group-hover:opacity-45 group-hover:scale-105 transition-all duration-500 select-none origin-bottom-right"
                            style={{ filter: `drop-shadow(0 0 30px ${game.accent}60)` }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      )}

                      {/* Hover glow overlay */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                        style={{ background: `radial-gradient(circle at 70% 50%, ${game.accent}20, transparent 60%)` }}
                      />

                      {/* Content */}
                      <div className="relative p-8">
                        {/* Logo image or emoji fallback */}
                        <div className="mb-5 flex items-start gap-4">
                          <div className="shrink-0">
                            {logoImg ? (
                              <img
                                src={logoImg}
                                alt={`${game.name} logo`}
                                className="h-14 w-auto object-contain drop-shadow-lg"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  img.style.display = 'none';
                                  const fallback = img.nextSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'block';
                                }}
                              />
                            ) : null}
                            <span className="text-5xl" style={{ display: logoImg ? 'none' : 'block' }}>{game.logo}</span>
                          </div>
                          <div className="pt-1">
                            <h3 className={`text-2xl font-bold text-white ${game.fontClass}`}>{game.name}</h3>
                            <p className="text-white/50 text-sm mt-0.5">{game.tagline}</p>
                          </div>
                        </div>

                        {/* Tag hint + CTA */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border border-white/10">
                            <span className="text-white/40 text-xs font-mono">Search by</span>
                            <span className="text-white/80 text-xs font-bold font-mono">#PLAYER TAG</span>
                          </div>
                          <div
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all group-hover:scale-105"
                            style={{ backgroundColor: `${game.accent}22`, color: game.accent, border: `1px solid ${game.accent}40` }}
                          >
                            Search Stats →
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-white/30 text-sm">
          <p>
            Supercell Stats Hub — not affiliated with Supercell.<br />
            All game data is provided by the official{' '}
            <span className="text-white/50">Supercell Developer API</span>.
          </p>
        </div>
      </footer>
    </div>
  );
}
