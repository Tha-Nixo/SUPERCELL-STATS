import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { PerformancePoint } from '../data/mockStats';

interface PerformanceChartProps {
  data: PerformancePoint[];
  accentColor: string;
  secondaryColor: string;
}

export function PerformanceChart({ data, accentColor, secondaryColor }: PerformanceChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-[#111827] rounded-2xl p-6 border border-white/5"
    >
      <h3 className="text-xl font-bold text-white mb-6">Performance Trend</h3>
      
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorWinRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accentColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorKD" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={secondaryColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255,255,255,0.3)"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px'
              }}
              labelStyle={{ color: '#fff', marginBottom: '8px' }}
            />
            <Area
              type="monotone"
              dataKey="winRate"
              stroke={accentColor}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorWinRate)"
              name="Win Rate (%)"
            />
            <Area
              type="monotone"
              dataKey="kd"
              stroke={secondaryColor}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorKD)"
              name="K/D Ratio"
              yAxisId="right"
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              stroke="rgba(255,255,255,0.3)"
              style={{ fontSize: '12px' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-8 mt-6">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span className="text-sm text-white/70">Win Rate</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: secondaryColor }}
          />
          <span className="text-sm text-white/70">K/D Ratio</span>
        </div>
      </div>
    </motion.div>
  );
}
