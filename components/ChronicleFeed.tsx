
import React, { useEffect, useState } from 'react';
import { MOCK_CLAIMS } from '../constants';
import { fetchClaimsFromRSS } from '../services/rssService';
import { Claim } from '../types';
import { Link } from 'react-router-dom';
import { TrendingUp, DollarSign, Activity, Zap, Cpu, Globe, ExternalLink, Rocket, Heart, Shield } from 'lucide-react';

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'MODELS': return <Cpu className="w-4 h-4 text-blue-400" />;
    case 'CAPITAL': return <DollarSign className="w-4 h-4 text-emerald-400" />;
    case 'ENERGY': return <Zap className="w-4 h-4 text-yellow-400" />;
    case 'ROBOTICS': return <Activity className="w-4 h-4 text-orange-400" />;
    case 'SPACE': return <Rocket className="w-4 h-4 text-indigo-400" />;
    case 'BIOLOGY': return <Heart className="w-4 h-4 text-rose-400" />;
    case 'GOVERNANCE': return <Shield className="w-4 h-4 text-slate-300" />;
    default: return <Globe className="w-4 h-4 text-slate-400" />;
  }
};

const SkeletonItem = () => (
  <div className="p-4 border-b border-slate-800/50 animate-pulse">
    <div className="flex items-start gap-3">
       <div className="w-8 h-8 bg-slate-800 rounded-lg shrink-0" />
       <div className="flex-1 space-y-2">
         <div className="flex gap-2">
           <div className="h-3 bg-slate-800 rounded w-16" />
           <div className="h-3 bg-slate-800 rounded w-12" />
         </div>
         <div className="h-4 bg-slate-800 rounded w-3/4" />
         <div className="h-3 bg-slate-800 rounded w-1/2" />
       </div>
    </div>
  </div>
);

export const ChronicleFeed = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const rssClaims = await fetchClaimsFromRSS();
        if (rssClaims.length > 0) {
          // Sort by model relevance then date for dashboard
          const sorted = [...rssClaims].sort((a, b) => (b.model_relevance ? 1 : 0) - (a.model_relevance ? 1 : 0));
          setClaims(sorted.slice(0, 8)); 
        } else {
          setClaims(MOCK_CLAIMS); 
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
          Multi-Source Signal Feed
        </h2>
        <div className="flex items-center gap-2">
          {loading && <div className="w-3 h-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>}
          <span className="text-xs text-slate-500 font-mono">TRACKING {loading ? '...' : claims.length} SIGNALS</span>
        </div>
      </div>
      <div className="divide-y divide-slate-800/50 flex-1 overflow-auto">
        {loading ? (
          <>
            <SkeletonItem />
            <SkeletonItem />
            <SkeletonItem />
            <SkeletonItem />
          </>
        ) : (
          claims.map((claim) => (
            <div key={claim.id} className="p-4 hover:bg-slate-800/30 transition-colors group relative">
              <div className="flex items-start gap-3">
                <div className={`mt-1 p-1.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0`}>
                  <CategoryIcon category={claim.category} />
                </div>
                <div className="flex-1 pr-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">{claim.category}</span>
                    <span className="text-[9px] text-slate-600">•</span>
                    <span className="text-[9px] text-indigo-400 font-semibold">{claim.source_name}</span>
                    <span className="text-[9px] text-slate-600">•</span>
                    <span className="text-[9px] text-slate-500">{claim.date}</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-snug group-hover:text-white transition-colors">
                    {claim.claim_text}
                  </p>
                  {claim.entities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {claim.entities.slice(0, 3).map((entity) => (
                        <span key={entity} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
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
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-3 bg-slate-950/50 border-t border-slate-800 text-center shrink-0">
        <Link to="/chronicles" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors block w-full h-full">
          Analyze Full Signal History →
        </Link>
      </div>
    </div>
  );
};
