import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ArrowLeft, Trophy, TrendingUp, Clock } from 'lucide-react';
import { generateProfileData } from '../data/mockStats';
import { getGameById } from '../data/games';

export default function Profile() {
  const profileGames = generateProfileData();

  // Calculate aggregate stats
  const totalHours = profileGames.reduce((sum, game) => sum + game.hoursPlayed, 0);
  const avgWinRate = Math.round(
    profileGames.reduce((sum, game) => sum + game.winRate, 0) / profileGames.length
  );
  const bestRank = profileGames[0]; // First one has best rank

  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      {/* Header */}
      <header className="border-b border-white/5 py-6 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-lg rounded-xl text-white hover:bg-white/10 transition-all border border-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Games</span>
            </motion.button>
          </Link>

          <h1 className="text-2xl font-bold text-white">My Gaming Profile</h1>

          <div className="w-[120px]" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Profile Hero */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-3xl p-8 border border-white/10 mb-12"
          >
            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-4xl">
                🎮
              </div>
              <div>
                <h2 className="text-4xl font-bold text-white mb-2">ProGamer Profile</h2>
                <p className="text-white/60">Tracking {profileGames.length} games</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-blue-400" />
                  <span className="text-white/60 text-sm">Total Hours</span>
                </div>
                <div className="text-4xl font-bold text-white">{totalHours}</div>
              </div>

              <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                  <span className="text-white/60 text-sm">Avg Win Rate</span>
                </div>
                <div className="text-4xl font-bold text-white">{avgWinRate}%</div>
              </div>

              <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  <span className="text-white/60 text-sm">Best Rank</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{bestRank.rankIcon}</span>
                  <span className="text-2xl font-bold text-white">{bestRank.rank}</span>
                </div>
                <div className="text-sm text-white/40 mt-1">{bestRank.gameName}</div>
              </div>
            </div>
          </motion.div>

          {/* Games List */}
          <h3 className="text-2xl font-bold text-white mb-6">Your Games</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {profileGames.map((profileGame, index) => {
              const game = getGameById(profileGame.gameId);
              if (!game) return null;

              return (
                <motion.div
                  key={profileGame.gameId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Link to={`/game/${game.id}`}>
                    <div className="group relative bg-[#111827] rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-all duration-300">
                      {/* Color Strip */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ backgroundColor: game.accent }}
                      />

                      {/* Glow Effect */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl"
                        style={{ backgroundColor: game.accent }}
                      />

                      {/* Content */}
                      <div className="relative p-6">
                        <div className="flex items-start gap-4 mb-6">
                          {/* Game Icon */}
                          <div
                            className="text-5xl p-3 rounded-xl"
                            style={{ backgroundColor: `${game.accent}20` }}
                          >
                            {game.logo}
                          </div>

                          {/* Game Info */}
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-white mb-1">
                              {game.name}
                            </h4>
                            <p className="text-white/60 mb-2">{profileGame.username}</p>
                            <div
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold"
                              style={{
                                backgroundColor: `${game.accent}30`,
                                color: game.accent
                              }}
                            >
                              <span className="text-lg">{profileGame.rankIcon}</span>
                              {profileGame.rank}
                            </div>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-white/40 text-xs mb-1">Win Rate</div>
                            <div
                              className="text-2xl font-bold"
                              style={{ color: game.accent }}
                            >
                              {profileGame.winRate}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-white/40 text-xs mb-1">Hours</div>
                            <div
                              className="text-2xl font-bold"
                              style={{ color: game.accent }}
                            >
                              {profileGame.hoursPlayed}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-white/40 text-xs mb-1">Last Played</div>
                            <div className="text-sm font-semibold text-white/70">
                              {profileGame.lastPlayed.split(',')[0]}
                            </div>
                          </div>
                        </div>

                        {/* View Details */}
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <div
                            className="text-sm font-semibold group-hover:translate-x-1 transition-transform"
                            style={{ color: game.accent }}
                          >
                            View Full Stats →
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Add More Games CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-12"
          >
            <Link to="/">
              <div className="bg-white/5 border-2 border-dashed border-white/10 rounded-2xl p-12 text-center hover:bg-white/10 hover:border-white/20 transition-all group cursor-pointer">
                <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                  ➕
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Add More Games</h4>
                <p className="text-white/60">
                  Track your stats across even more games
                </p>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center text-white/40 text-sm">
          <p>Gaming Profile Dashboard • All your stats in one place</p>
        </div>
      </footer>
    </div>
  );
}
