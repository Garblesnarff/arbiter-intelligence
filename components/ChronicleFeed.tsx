import React from 'react';
import { MOCK_CLAIMS } from '../constants';
import { TrendingUp, DollarSign, Activity, Zap, Cpu, Globe } from 'lucide-react';

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'MODELS': return <Cpu className="w-4 h-4 text-blue-400" />;
    case 'CAPITAL': return <DollarSign className="w-4 h-4 text-emerald-400" />;
    case 'ENERGY': return <Zap className="w-4 h-4 text-yellow-400" />;
    case 'ROBOTICS': return <Activity className="w-4 h-4 text-orange-400" />;
    default: return <Globe className="w-4 h-4 text-slate-400" />;
  }
};

export const ChronicleFeed = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          Today's Chronicle
        </h2>
        <span className="text-xs text-slate-500 font-mono">LIVE FEED</span>
      </div>
      <div className="divide-y divide-slate-800/50">
        {MOCK_CLAIMS.map((claim) => (
          <div key={claim.id} className="p-4 hover:bg-slate-800/30 transition-colors group cursor-pointer">
            <div className="flex items-start gap-3">
              <div className={`mt-1 p-1.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0`}>
                <CategoryIcon category={claim.category} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{claim.category}</span>
                  <span className="text-[10px] text-slate-600">•</span>
                  <span className="text-[10px] text-slate-500">{claim.date}</span>
                </div>
                <p className="text-sm text-slate-200 leading-snug group-hover:text-white transition-colors">
                  {claim.claim_text}
                </p>
                {claim.entities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {claim.entities.map((entity) => (
                      <span key={entity} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {entity}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {claim.metric_value && (
                <div className="flex flex-col items-end">
                   <span className="text-lg font-bold text-emerald-400">{claim.metric_value}</span>
                   <span className="text-[10px] text-slate-500">Signal</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 bg-slate-950/50 border-t border-slate-800 text-center">
        <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          View Full Archive →
        </button>
      </div>
    </div>
  );
};
