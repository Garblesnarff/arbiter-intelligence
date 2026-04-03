import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChronicleFeed } from './ChronicleFeed';
import { ModelOptimizer } from './ModelOptimizer';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, ArrowUpRight, ArrowDownRight, Zap, Cpu, Activity } from 'lucide-react';
import { useClaimStats, CategoryStat } from '../hooks/useClaimStats';
import { useClaimDetail } from '../contexts/ClaimDetailContext';
import { openExternalUrl } from '../utils/browser';

type ChartTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{
    color?: string;
    name?: string;
    value?: number | string;
  }>;
};

const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg shadow-xl text-xs">
        <p className="text-slate-400 mb-1 font-mono uppercase">{label}</p>
        {payload.map((entry, index) => (
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
  const { topClaim, trendingEntities, chartData, categoryStats, loading } = useClaimStats();
  const { openClaim } = useClaimDetail();
  const navigate = useNavigate();

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
                  <span className="bg-indigo-500/15 text-indigo-400 text-[11px] font-bold px-2 py-0.5 rounded border border-indigo-500/25 uppercase tracking-wider">
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
                {topClaim.entities
                  .filter(entity => entity !== topClaim.source_feed_name && entity !== topClaim.source_name)
                  .slice(0, 3)
                  .map(entity => (
                    <span key={entity} className="text-xs px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">
                      {entity}
                    </span>
                  ))
                }
              </div>
              <div className="flex gap-3">
                  <button
                    onClick={() => openClaim(topClaim)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                      View Signal Analysis
                  </button>
                  <button
                    className="text-slate-400 hover:text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-800 hover:bg-slate-800"
                    onClick={() => openExternalUrl(topClaim.source_url)}
                  >
                      View Original
                  </button>
              </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
            <ModelOptimizer />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  Domain Distribution
                </h3>
                <div className="flex items-center gap-4 h-[200px]">
                  <div className="w-[140px] h-[140px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryStats}
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                        >
                          {categoryStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload as CategoryStat;
                              return (
                                <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg shadow-xl text-xs">
                                  <span className="font-bold text-slate-200">{data.name}</span>
                                  <span className="text-slate-400 ml-2">{data.value}</span>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    {categoryStats.map((stat) => (
                      <div key={stat.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: stat.color }} />
                        <span className="text-slate-400 truncate">{stat.name}</span>
                        <span className="text-slate-500 font-mono ml-auto">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
            <ChronicleFeed />

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                    Acceleration Trends (7d)
                </h3>
                <div className="flex flex-wrap gap-2">
                    {trendingEntities.length > 0 ? trendingEntities.map((entity) => (
                        <div
                          key={entity.name}
                          onClick={() => navigate(`/chronicles?entity=${encodeURIComponent(entity.name)}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-full text-xs text-slate-300 hover:border-indigo-500/50 cursor-pointer transition-colors group"
                        >
                            <span className="group-hover:text-indigo-400 transition-colors">{entity.name}</span>
                            <span className="text-[11px] text-slate-600 font-mono">{entity.count}</span>
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
    </div>
  );
};
