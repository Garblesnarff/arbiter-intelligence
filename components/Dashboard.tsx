
import React from 'react';
import { ChronicleFeed } from './ChronicleFeed';
import { ModelOptimizer } from './ModelOptimizer';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, ArrowUpRight, ArrowDownRight, Zap, Cpu, Calendar, Activity } from 'lucide-react';
import { useClaimStats } from '../hooks/useClaimStats';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg shadow-xl text-xs">
        <p className="text-slate-400 mb-1 font-mono uppercase">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="font-bold">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const Dashboard = () => {
  const { topClaim, trendingEntities, chartData, categoryStats, feedStatuses, loading, totalClaims } = useClaimStats();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      
      {/* Top Signal - The "Front-row seat" */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-[200px] animate-pulse flex flex-col justify-center">
          <div className="h-4 w-32 bg-slate-800 rounded mb-4"></div>
          <div className="h-8 w-3/4 bg-slate-800 rounded mb-2"></div>
          <div className="h-4 w-1/2 bg-slate-800 rounded"></div>
        </div>
      ) : topClaim ? (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap className="w-32 h-32 text-indigo-500" />
          </div>
          <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                  <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20 animate-pulse uppercase tracking-wider">
                      PRIMARY SIGNAL
                  </span>
                  <span className="text-slate-500 text-xs font-mono">
                    {new Date(topClaim.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                  </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 max-w-2xl leading-tight">
                  {topClaim.claim_text}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <Cpu className="w-4 h-4" />
                  <span className="text-sm font-medium">{topClaim.source_feed_name}</span>
                </div>
                {topClaim.entities.slice(0, 3).map(entity => (
                  <span key={entity} className="text-xs px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">
                    {entity}
                  </span>
                ))}
              </div>
              <div className="flex gap-3">
                  <a 
                    href={topClaim.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                      View Source Details
                  </a>
                  <button className="text-slate-400 hover:text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-800 hover:bg-slate-800">
                      Share Analysis
                  </button>
              </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Model Optimizer */}
        <div className="lg:col-span-7 space-y-8">
            <ModelOptimizer />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Velocity Chart */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    Signal Velocity (7d)
                  </h3>
                  <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                              <XAxis dataKey="day" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                              <Tooltip content={<CustomTooltip />} />
                              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="All Claims" />
                              <Line type="monotone" dataKey="models" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Model Specific" />
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 mt-4 justify-center">
                      <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Total</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Models</span>
                      </div>
                  </div>
              </div>

              {/* Category Pie Chart */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  Domain Distribution
                </h3>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryStats}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-950 border border-slate-800 p-2 rounded text-[10px]">
                                <span className="font-bold text-slate-100">{payload[0].name}</span>: {payload[0].value}
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                  {categoryStats.slice(0, 4).map(stat => (
                    <div key={stat.name} className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }}></div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">{stat.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
        </div>

        {/* Right Column: Feed & Stats */}
        <div className="lg:col-span-5 space-y-6">
            <ChronicleFeed />

            {/* Trending Entities */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                    Acceleration Trends (7d)
                </h3>
                <div className="flex flex-wrap gap-2">
                    {trendingEntities.length > 0 ? trendingEntities.map((entity) => (
                        <div key={entity.name} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-full text-xs text-slate-300 hover:border-indigo-500/50 cursor-pointer transition-colors group">
                            <span className="group-hover:text-indigo-400 transition-colors">{entity.name}</span>
                            <span className="text-[10px] text-slate-600 font-mono">{entity.count}</span>
                            {entity.trend === 'up' ? (
                              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                            ) : entity.trend === 'down' ? (
                              <ArrowDownRight className="w-3 h-3 text-rose-500" />
                            ) : (
                              <div className="w-3 h-0.5 bg-slate-700 rounded-full" />
                            )}
                        </div>
                    )) : (
                      <div className="text-xs text-slate-600 italic">Calculating trends...</div>
                    )}
                </div>
            </div>
        </div>

      </div>

      {/* Feed Health Summary Row */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <Calendar className="w-4 h-4 text-slate-500" />
             <div>
               <div className="text-xs font-bold text-slate-300">SYSTEM HEALTH</div>
               <div className="text-[10px] text-slate-500 uppercase tracking-widest">{feedStatuses.filter(f => f.status === 'success').length}/21 FEEDS ACTIVE</div>
             </div>
          </div>
          <div className="flex items-center gap-1.5">
             {feedStatuses.map((feed) => (
               <div 
                 key={feed.id} 
                 title={`${feed.name}: ${feed.status}`}
                 className={`w-2.5 h-2.5 rounded-full transition-all hover:scale-125 cursor-help ${
                   feed.status === 'success' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.3)]' :
                   feed.status === 'error' ? 'bg-rose-500' :
                   'bg-slate-700'
                 }`}
               />
             ))}
             {feedStatuses.length === 0 && Array.from({length: 21}).map((_, i) => (
               <div key={i} className="w-2.5 h-2.5 rounded-full bg-slate-800 animate-pulse" />
             ))}
          </div>
          <div className="text-right">
             <div className="text-xs font-mono text-indigo-400 font-bold">{totalClaims}</div>
             <div className="text-[9px] text-slate-600 uppercase font-bold tracking-tighter">TOTAL EXTRACTED SIGNALS</div>
          </div>
        </div>
      </div>

    </div>
  );
};
