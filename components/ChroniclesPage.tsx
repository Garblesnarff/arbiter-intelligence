
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchClaimsFromRSS } from '../services/rssService';
import { MOCK_CLAIMS } from '../constants';
import { FEEDS } from '../constants/feeds';
import { Claim } from '../types';
import { Filter, Search, Calendar, ExternalLink, Cpu, DollarSign, Zap, Activity, Globe, RefreshCw, Rocket, Heart, Shield } from 'lucide-react';

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

export const ChroniclesPage = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sourceParam = params.get('source');
    if (sourceParam) {
      setSelectedSource(sourceParam);
    }
  }, [location]);

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

  const categories = ['ALL', 'MODELS', 'COMPUTE', 'CAPITAL', 'ROBOTICS', 'BIOLOGY', 'ENERGY', 'SPACE', 'GOVERNANCE'];
  const sources = ['ALL', ...FEEDS.map(s => s.name)];

  const filteredClaims = claims.filter(claim => {
    const matchesCategory = selectedCategory === 'ALL' || claim.category === selectedCategory;
    const matchesSource = selectedSource === 'ALL' || claim.source_name === selectedSource || claim.source_feed_name === selectedSource;
    const matchesSearch = claim.claim_text.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          claim.entities.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSource && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Chronicle Archive</h1>
          <p className="text-slate-400 text-sm">Real-time intelligence from 21 specialized acceleration feeds.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={fetchData}
             disabled={loading}
             className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 border border-slate-700 shadow-sm"
           >
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             Refresh All Feeds
           </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
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
            <div className="w-full md:w-72">
                <select 
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none"
                >
                    {sources.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Sources' : `Source: ${s}`}</option>)}
                </select>
            </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase whitespace-nowrap transition-colors ${
                selectedCategory === cat 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
           Array.from({length: 5}).map((_, i) => (
             <div key={i} className="bg-slate-900/50 border border-slate-800 h-32 rounded-xl animate-pulse" />
           ))
        ) : filteredClaims.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
            <div className="text-slate-500 mb-2">No signals found matching your filters.</div>
            <button onClick={() => {setSelectedSource('ALL'); setSelectedCategory('ALL'); setSearchTerm('')}} className="text-indigo-400 text-sm font-medium hover:underline">Clear all filters</button>
          </div>
        ) : (
          filteredClaims.map((claim) => (
            <div key={claim.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all group relative shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
                  <CategoryIcon category={claim.category} />
                </div>
                <div className="flex-1 pr-8">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {claim.category}
                    </span>
                    <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
                       <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                       <span className="text-[10px] text-indigo-400 font-bold">
                        {claim.source_feed_name || claim.source_name}
                       </span>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 border-l border-slate-800 pl-3">
                      <Calendar className="w-3 h-3" />
                      {claim.date}
                    </span>
                  </div>
                  
                  <h3 className="text-slate-200 text-base leading-snug mb-3 group-hover:text-white transition-colors font-medium">
                    {claim.claim_text}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2">
                    {claim.entities.map((entity) => (
                      <span key={entity} className="text-[10px] px-2 py-1 rounded bg-slate-800/50 text-slate-400 border border-slate-800/80 hover:text-slate-200 transition-colors">
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
