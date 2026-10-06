import { motion } from 'motion/react';
import { Trophy, Target, Sword } from 'lucide-react';
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
          transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
          className="bg-[#111827] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all duration-300 group"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
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
            <div className="flex-1 min-w-[120px] text-white/75 font-medium">
              {match.mode}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              {match.kills !== undefined && (
                <div className="text-center">
                  <div className="text-white/55 text-xs mb-1">Crowns</div>
                  <div className="text-white font-semibold tabular-nums">
                    <span style={{ color: accentColor }}>{match.kills}</span>
                    <span className="text-white/45 mx-1">–</span>
                    <span className="text-red-400">{match.deaths}</span>
                  </div>
                </div>
              )}

              {match.score !== undefined && (
                <div className="text-center">
                  <div className="text-white/55 text-xs mb-1">Trophies</div>
                  <div className={`font-semibold tabular-nums ${match.score > 0 ? 'text-green-400' : match.score < 0 ? 'text-red-400' : 'text-white'}`}>
                    {match.score > 0 ? `+${match.score}` : match.score}
                  </div>
                </div>
              )}

              {match.duration && (
                <div className="text-center">
                  <div className="text-white/55 text-xs mb-1">Duration</div>
                  <div className="text-white font-semibold tabular-nums">
                    {match.duration}
                  </div>
                </div>
              )}

              <div className="text-center min-w-[60px]">
                <div className="text-white/55 text-xs mb-1">Date</div>
                <div className="text-white/70 font-medium text-xs">
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
