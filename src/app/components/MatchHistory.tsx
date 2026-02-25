import { motion } from 'motion/react';
import { Trophy, TrendingUp, Target, Sword } from 'lucide-react';
import { Match } from '../data/mockStats';

interface MatchHistoryProps {
  matches: Match[];
  accentColor: string;
}

export function MatchHistory({ matches, accentColor }: MatchHistoryProps) {
  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return '#10B981';
      case 'loss': return '#EF4444';
      case 'draw': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'win': return <Trophy className="w-4 h-4" />;
      case 'loss': return <Target className="w-4 h-4" />;
      default: return <Sword className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-3">
      {matches.map((match, index) => (
        <motion.div
          key={match.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="bg-[#111827] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between gap-4">
            {/* Result Badge */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm min-w-[100px]"
              style={{
                backgroundColor: `${getResultColor(match.result)}20`,
                color: getResultColor(match.result)
              }}
            >
              {getResultIcon(match.result)}
              <span className="capitalize">{match.result}</span>
            </div>

            {/* Mode */}
            <div className="flex-1 text-white/70 font-medium">
              {match.mode}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              {match.kills !== undefined && (
                <div className="text-center">
                  <div className="text-white/40 text-xs mb-1">K/D/A</div>
                  <div className="text-white font-semibold">
                    <span style={{ color: accentColor }}>{match.kills}</span>
                    <span className="text-white/40 mx-1">/</span>
                    <span className="text-red-400">{match.deaths}</span>
                    <span className="text-white/40 mx-1">/</span>
                    <span className="text-blue-400">{match.assists}</span>
                  </div>
                </div>
              )}

              {match.score !== undefined && (
                <div className="text-center">
                  <div className="text-white/40 text-xs mb-1">Trophies</div>
                  <div className="text-white font-semibold">
                    {match.score > 0 ? `+${match.score}` : match.score}
                  </div>
                </div>
              )}

              <div className="text-center">
                <div className="text-white/40 text-xs mb-1">Duration</div>
                <div className="text-white font-semibold">
                  {match.duration}
                </div>
              </div>

              <div className="text-center min-w-[60px]">
                <div className="text-white/40 text-xs mb-1">Date</div>
                <div className="text-white/60 font-medium text-xs">
                  {match.date}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
