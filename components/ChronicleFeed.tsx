import React, { useEffect, useState } from 'react';
import { MOCK_CLAIMS } from '../constants';
import { fetchClaimsFromRSS } from '../services/rssService';
import { Claim } from '../types';
import { TrendingUp, DollarSign, Activity, Zap, Cpu, Globe, ExternalLink } from 'lucide-react';

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
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const rssClaims = await fetchClaimsFromRSS();
        if (rssClaims.length > 0) {
          setClaims(rssClaims.slice(0, 5)); // Top 5
        } else {
          setClaims(MOCK_CLAIMS); // Fallback
        }
      } catch (err) {
        console.error(err);
        setClaims(MOCK_CLAIMS);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          Today's Chronicle
        </h2>
        <div className="flex items-center gap-2">
          {loading && <div className="w-3 h-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>}
          <span className="text-xs text-slate-500 font-mono">LIVE FEED</span>
        </div>
      </div>
      <div className="divide-y divide-slate-800/50 flex-1 overflow-auto">
        {claims.map((claim) => (
          <div key={claim.id} className="p-4 hover:bg-slate-800/30 transition-colors group relative">
            <div className="flex items-start gap-3">
              <div className={`mt-1 p-1.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0`}>
                <CategoryIcon category={claim.category} />
              </div>
              <div className="flex-1 pr-6">
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
              {claim.source_url && (
                <a 
                  href={claim.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="absolute top-4 right-4 text-slate-600 hover:text-indigo-400 transition-colors"
                  title="View Source"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
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
      <div className="p-3 bg-slate-950/50 border-t border-slate-800 text-center shrink-0">
        <a href="/#/chronicles" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          View Full Archive →
        </a>
      </div>
    </div>
  );
};