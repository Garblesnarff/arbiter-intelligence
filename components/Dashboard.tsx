import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChronicleFeed } from './ChronicleFeed';
import { ModelOptimizer } from './ModelOptimizer';
import { HeroSignalBrief } from './HeroSignalBrief';
import { SignalRiver } from './semiotic/SignalRiver';
import { LinkedDashboard } from './semiotic/LinkedDashboard';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { useClaimStats, CategoryStat } from '../hooks/useClaimStats';
import { useClaimDetail } from '../contexts/ClaimDetailContext';
import { openExternalUrl } from '../utils/browser';

export const Dashboard = () => {
  const { topClaim, trendingEntities, categoryStats, loading } = useClaimStats();
  const { openClaim } = useClaimDetail();
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">

      {/* Top Signal - Hero with Pretext flowing text */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-[200px] animate-pulse flex flex-col justify-center">
          <div className="h-4 w-32 bg-slate-800 rounded mb-4"></div>
          <div className="h-8 w-3/4 bg-slate-800 rounded mb-2"></div>
          <div className="h-4 w-1/2 bg-slate-800 rounded"></div>
        </div>
      ) : topClaim ? (
        <HeroSignalBrief
          claim={topClaim}
          onViewAnalysis={() => openClaim(topClaim)}
          onViewOriginal={() => openExternalUrl(topClaim.source_url)}
        />
      ) : null}

      <LinkedDashboard>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-8">
              <ModelOptimizer />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Signal River — Semiotic streaming chart */}
                <SignalRiver />

                {/* Domain Distribution — Recharts pie (it works, keep it) */}
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
      </LinkedDashboard>
    </div>
  );
};
