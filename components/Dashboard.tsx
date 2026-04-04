import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChronicleFeed } from './ChronicleFeed';
import { HeroSignalBrief } from './HeroSignalBrief';
import { ClusterStrip } from './ClusterStrip';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { useClaimStats, CategoryStat } from '../hooks/useClaimStats';
import { useClaimDetail } from '../contexts/ClaimDetailContext';
import { openExternalUrl } from '../utils/browser';

// Lazy-load Semiotic to avoid 1.2MB upfront
const SignalRiver = lazy(() =>
  import('./semiotic/SignalRiver').then(m => ({ default: m.SignalRiver }))
);

export const Dashboard = () => {
  const { topClaim, trendingEntities, categoryStats, loading, totalClaims } = useClaimStats();
  const { openClaim } = useClaimDetail();
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Hero Signal Brief */}
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

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Signals</div>
          <div className="text-2xl font-bold text-white font-mono">{totalClaims}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Sources Active</div>
          <div className="text-2xl font-bold text-white font-mono">21</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Categories</div>
          <div className="text-2xl font-bold text-white font-mono">{categoryStats.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Trending Entities</div>
          <div className="text-2xl font-bold text-white font-mono">{trendingEntities.length}</div>
        </div>
      </div>

      {/* Emerging Narratives — topic clusters */}
      <ClusterStrip />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main feed column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Signal River + Domain Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Suspense fallback={
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-[280px] animate-pulse" />
            }>
              <SignalRiver />
            </Suspense>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" />
                Domain Distribution
              </h3>
              <div className="flex items-center gap-4 h-[200px]">
                <div className="w-[140px] h-[140px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryStats} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" cx="50%" cy="50%">
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

          {/* Dense feed — the product IS the feed */}
          <ChronicleFeed />
        </div>

        {/* Sidebar column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Acceleration Trends */}
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

          {/* Quick category breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-400 mb-4">Browse by Category</h3>
            <div className="space-y-2">
              {categoryStats.slice(0, 6).map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => navigate(`/chronicles?category=${cat.name}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors text-left group"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm text-slate-300 group-hover:text-white flex-1">{cat.name}</span>
                  <span className="text-xs text-slate-600 font-mono">{cat.value}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
