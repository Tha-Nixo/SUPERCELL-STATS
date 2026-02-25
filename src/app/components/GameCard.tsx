import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { GameTheme } from '../data/games';

interface GameCardProps {
  game: GameTheme;
  index: number;
}

export function GameCard({ game, index }: GameCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.03 }}
      whileHover={{ y: -4 }}
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
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl"
            style={{ backgroundColor: game.accent }}
          />

          {/* Content */}
          <div className="relative p-6 flex flex-col items-center justify-center min-h-[200px]">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
              {game.logo}
            </div>
            
            <h3 className="text-lg font-semibold text-white text-center mb-2">
              {game.name}
            </h3>
            
            <div className="flex items-center gap-2 text-sm text-white/50 group-hover:text-white/70 transition-colors">
              <span className="capitalize">{game.inputType.replace('-', ' ')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Gradient Overlay on Hover */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500"
              style={{
                background: `linear-gradient(135deg, ${game.gradientFrom}, ${game.gradientTo})`
              }}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
