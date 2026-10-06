import { motion } from 'motion/react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  accentColor: string;
}

export function StatCard({ title, value, subtitle, icon, accentColor }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="relative bg-[#111827] rounded-2xl p-6 border border-white/5 overflow-hidden group hover:border-white/10 transition-all duration-300"
    >
      {/* Glow Effect */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-3xl"
        style={{ backgroundColor: accentColor }}
      />

      {/* Content */}
      <div className="relative">
        {icon && (
          <div className="mb-3 text-white/40" aria-hidden="true">
            {icon}
          </div>
        )}
        
        <div className="text-sm text-white/50 mb-2 uppercase tracking-wider">
          {title}
        </div>
        
        <div 
          className="text-4xl font-bold mb-1"
          style={{ color: accentColor }}
        >
          {value}
        </div>
        
        {subtitle && (
          <div className="text-sm text-white/70">
            {subtitle}
          </div>
        )}
      </div>

      {/* Bottom Border Accent */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1 opacity-50"
        style={{ backgroundColor: accentColor }}
      />
    </motion.div>
  );
}
