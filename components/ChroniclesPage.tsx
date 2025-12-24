import React, { useState, useEffect } from 'react';
import { fetchClaimsFromRSS } from '../services/rssService';
import { MOCK_CLAIMS } from '../constants';
import { Claim } from '../types';
import { Filter, Search, Calendar, ExternalLink, Cpu, DollarSign, Zap, Activity, Globe, RefreshCw } from 'lucide-react';

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'MODELS': return <Cpu className="w-4 h-4 text-blue-400" />;
    case 'CAPITAL': return <DollarSign className="w-4 h-4 text-emerald-400" />;
    case 'ENERGY': return <Zap className="w-4 h-4 text-yellow-400" />;
    case 'ROBOTICS': return <Activity className="w-4 h-4 text-orange-400" />;
    default: return <Globe className="w-4 h-4 text-slate-400" />;
  }
};

export const ChroniclesPage = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
        const rssClaims = await fetchClaimsFromRSS();
        if (rssClaims.length > 0) {
            setClaims(rssClaims);
        } else {
            setClaims(MOCK_CLAIMS);
        }
    } catch (e) {
        console.error(e);
        setClaims(MOCK_CLAIMS);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const categories = ['ALL', ...Array.from(new Set(claims.map(c => c.category)))];

  const filteredClaims = claims.filter(claim => {
    const matchesCategory = selectedCategory === 'ALL' || claim.category === selectedCategory;
    const matchesSearch = claim.claim_text.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          claim.entities.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Chronicle Archive</h1>
          <p className="text-slate-400 text-sm">Real-time intelligence extracted from the Innermost Loop.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={fetchData}
             disabled={loading}
             className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
           >
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             Refresh
           </button>
           <a 
             href="https://theinnermostloop.substack.com/" 
             target="_blank" 
             rel="noreferrer"
             className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
           >
             <ExternalLink className="w-4 h-4" />
             Source Feed
           </a>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search claims, entities, or metrics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredClaims.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
            <div className="text-slate-500">No claims found matching your criteria.</div>
          </div>
        ) : (
          filteredClaims.map((claim) => (
            <div key={claim.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all group relative">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
                  <CategoryIcon category={claim.category} />
                </div>
                <div className="flex-1 pr-8">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {claim.category}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {claim.date}
                    </span>
                    {claim.confidence === 'high' && (
                      <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 bg-emerald-500/10 rounded">
                        High Confidence
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-slate-200 text-base leading-snug mb-3 group-hover:text-white transition-colors">
                    {claim.claim_text}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2">
                    {claim.entities.map((entity) => (
                      <span key={entity} className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 transition-colors cursor-default">
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
                
                {claim.source_url && (
                    <a 
                        href={claim.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute top-5 right-5 text-slate-600 hover:text-indigo-400 transition-colors p-1"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                )}

                {claim.metric_value && (
                  <div className="hidden sm:flex flex-col items-end pl-4 border-l border-slate-800">
                    <span className="text-sm text-slate-500 uppercase tracking-wider font-bold mb-1">Impact</span>
                    <span className="text-2xl font-bold text-emerald-400 font-mono">{claim.metric_value}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};