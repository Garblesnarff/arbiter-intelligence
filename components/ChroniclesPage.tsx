
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchClaimsFromRSS } from '../services/rssService';
import { MOCK_CLAIMS } from '../constants';
import { FEEDS } from '../constants/feeds';
import { Claim } from '../types';
import { 
  Filter, 
  Search, 
  Calendar, 
  ExternalLink, 
  Cpu, 
  DollarSign, 
  Zap, 
  Activity, 
  Globe, 
  RefreshCw, 
  Rocket, 
  Heart, 
  Shield, 
  LayoutList, 
  Maximize2, 
  Minimize2,
  ChevronDown,
  Hash,
  Database
} from 'lucide-react';

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'MODELS': return <Cpu className="w-4 h-4 text-blue-400" />;
    case 'CAPITAL': return <DollarSign className="w-4 h-4 text-emerald-400" />;
    case 'ENERGY': return <Zap className="w-4 h-4 text-yellow-400" />;
    case 'ROBOTICS': return <Activity className="w-4 h-4 text-orange-400" />;
    case 'SPACE': return <Rocket className="w-4 h-4 text-indigo-400" />;
    case 'BIOLOGY': return <Heart className="w-4 h-4 text-rose-400" />;
    case 'GOVERNANCE': return <Shield className="w-4 h-4 text-slate-300" />;
    case 'COMPUTE': return <Hash className="w-4 h-4 text-cyan-400" />;
    case 'INFRASTRUCTURE': return <Database className="w-4 h-4 text-zinc-400" />;
    default: return <Globe className="w-4 h-4 text-slate-400" />;
  }
};

const CATEGORY_COLORS: Record<string, string> = {
  MODELS: 'bg-blue-500',
  CAPITAL: 'bg-emerald-500',
  ENERGY: 'bg-yellow-500',
  ROBOTICS: 'bg-orange-500',
  SPACE: 'bg-indigo-500',
  BIOLOGY: 'bg-rose-500',
  GOVERNANCE: 'bg-slate-400',
  COMPUTE: 'bg-cyan-500',
  INFRASTRUCTURE: 'bg-zinc-500',
  CONSCIOUSNESS: 'bg-purple-500',
};

export const ChroniclesPage = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set(['ALL']));
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>(() => {
    return (localStorage.getItem('arbiter_view_mode') as 'compact' | 'expanded') || 
           (window.innerWidth < 768 ? 'compact' : 'expanded');
  });
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  // Keyboard shortcut for Cmd+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sourceParam = params.get('source');
    if (sourceParam) {
      setSelectedSources(new Set([sourceParam]));
    }
  }, [location]);

  useEffect(() => {
    localStorage.setItem('arbiter_view_mode', viewMode);
  }, [viewMode]);

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

  const categories = ['ALL', 'MODELS', 'COMPUTE', 'CAPITAL', 'ROBOTICS', 'BIOLOGY', 'ENERGY', 'SPACE', 'GOVERNANCE', 'INFRASTRUCTURE', 'CONSCIOUSNESS'];
  const feedNames = useMemo(() => FEEDS.map(f => f.name), []);

  const toggleSource = (sourceName: string) => {
    setSelectedSources(prev => {
      const next = new Set(prev);
      if (sourceName === 'ALL') {
        return new Set(['ALL']);
      }
      next.delete('ALL');
      if (next.has(sourceName)) {
        next.delete(sourceName);
        if (next.size === 0) next.add('ALL');
      } else {
        next.add(sourceName);
      }
      return next;
    });
  };

  const filteredClaims = useMemo(() => {
    return claims.filter(claim => {
      const matchesCategory = selectedCategory === 'ALL' || claim.category === selectedCategory;
      const matchesSource = selectedSources.has('ALL') || 
                            selectedSources.has(claim.source_name || '') || 
                            selectedSources.has(claim.source_feed_name || '');
      const matchesSearch = claim.claim_text.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            claim.entities.some(e => e.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (claim.source_feed_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSource && matchesSearch;
    });
  }, [claims, selectedCategory, selectedSources, searchTerm]);

  const categoryBreakdown = useMemo(() => {
    if (filteredClaims.length === 0) return [];
    const counts: Record<string, number> = {};
    filteredClaims.forEach(c => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return Object.entries(counts).map(([cat, count]) => ({
      cat,
      count,
      percent: (count / filteredClaims.length) * 100
    })).sort((a, b) => b.count - a.count);
  }, [filteredClaims]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    claims.forEach(c => {
      const name = c.source_feed_name || c.source_name || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [claims]);

  const groupedClaims = useMemo(() => {
    const groups: Record<string, Claim[]> = {};
    
    filteredClaims.forEach(claim => {
      const date = new Date(claim.date);
      const key = isNaN(date.getTime()) 
        ? 'Recently Discovered' 
        : date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(claim);
    });

    // Sort keys by date descending
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === 'Recently Discovered') return -1;
      if (b[0] === 'Recently Discovered') return 1;
      return new Date(b[1][0].date).getTime() - new Date(a[1][0].date).getTime();
    });
  }, [filteredClaims]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Chronicle Archive</h1>
          <p className="text-slate-400 text-sm">Aggregating {claims.length} signals from {FEEDS.length} sources.</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded transition-all ${viewMode === 'compact' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Compact View"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('expanded')}
                className={`p-1.5 rounded transition-all ${viewMode === 'expanded' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Expanded View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
           </div>
           <button 
             onClick={fetchData}
             disabled={loading}
             className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 border border-slate-700 shadow-sm"
           >
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             <span className="hidden sm:inline">Refresh Feeds</span>
           </button>
        </div>
      </div>

      {/* Category Breakdown Bar */}
      {filteredClaims.length > 0 && (
        <div className="space-y-2">
          <div className="h-1.5 w-full bg-slate-800 rounded-full flex overflow-hidden">
            {categoryBreakdown.map((item) => (
              <div 
                key={item.cat}
                style={{ width: `${item.percent}%` }}
                className={`${CATEGORY_COLORS[item.cat] || 'bg-slate-500'} transition-all`}
                title={`${item.cat}: ${item.count} claims (${Math.round(item.percent)}%)`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
             {categoryBreakdown.slice(0, 6).map(item => (
                <div key={item.cat} className="flex items-center gap-1.5">
                   <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[item.cat] || 'bg-slate-500'}`} />
                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                      {item.cat} <span className="text-slate-600 ml-0.5">{Math.round(item.percent)}%</span>
                   </span>
                </div>
             ))}
             {categoryBreakdown.length > 6 && <span className="text-[10px] text-slate-600 font-bold">...</span>}
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search claims, entities, or sources (Cmd+F)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchTerm && (
               <div className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-mono">
                 {filteredClaims.length} RESULTS
               </div>
            )}
          </div>
        </div>
        
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
          </div>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase whitespace-nowrap transition-all border ${
                selectedCategory === cat 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/30' 
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Source Pills Multi-select */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-t border-slate-800 pt-3">
          <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <button
            onClick={() => toggleSource('ALL')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase whitespace-nowrap transition-all border ${
              selectedSources.has('ALL')
                ? 'bg-indigo-600 text-white border-indigo-500' 
                : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border-slate-800'
            }`}
          >
            All Sources
          </button>
          {feedNames.map(name => (
            <button
              key={name}
              onClick={() => toggleSource(name)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase whitespace-nowrap transition-all border flex items-center gap-2 ${
                selectedSources.has(name)
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50' 
                  : 'bg-slate-950 text-slate-500 hover:bg-slate-800 border-slate-800'
              }`}
            >
              {name}
              <span className={`px-1 rounded text-[8px] font-mono ${selectedSources.has(name) ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {sourceCounts[name] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Signal List with Date Grouping */}
      <div className="space-y-8">
        {loading ? (
           Array.from({length: 3}).map((_, i) => (
             <div key={i} className="space-y-4">
                <div className="h-6 w-48 bg-slate-800 rounded animate-pulse" />
                <div className="bg-slate-900/50 border border-slate-800 h-24 rounded-xl animate-pulse" />
                <div className="bg-slate-900/50 border border-slate-800 h-24 rounded-xl animate-pulse" />
             </div>
           ))
        ) : filteredClaims.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
            <Globe className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-slate-300 font-medium text-lg">No matching signals found</h3>
            <p className="text-slate-500 text-sm mb-6">Try adjusting your filters or search keywords.</p>
            <button 
              onClick={() => {setSelectedSources(new Set(['ALL'])); setSelectedCategory('ALL'); setSearchTerm('')}} 
              className="text-indigo-400 text-sm font-semibold hover:text-indigo-300 px-4 py-2 bg-indigo-500/10 rounded-lg transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          groupedClaims.map(([date, dateClaims]) => (
            <div key={date} className="relative">
              {/* Sticky Date Header */}
              <div className="sticky top-16 z-20 flex items-center justify-between py-2 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800/50 mb-4">
                 <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                      {date}
                    </h2>
                 </div>
                 <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {dateClaims.length} {dateClaims.length === 1 ? 'Signal' : 'Signals'}
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {dateClaims.map((claim) => (
                  <div 
                    key={claim.id} 
                    className={`bg-slate-900 border border-slate-800 rounded-xl transition-all group relative overflow-hidden
                      ${viewMode === 'compact' ? 'p-3 hover:bg-slate-800/30' : 'p-5 hover:border-slate-600 hover:shadow-xl hover:shadow-indigo-500/5'}
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`shrink-0 flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950 transition-colors
                        ${viewMode === 'compact' ? 'w-8 h-8' : 'w-10 h-10'}
                      `}>
                        <CategoryIcon category={claim.category} />
                      </div>

                      <div className="flex-1 pr-8 min-w-0">
                        {viewMode === 'compact' ? (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1">
                             <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[9px] font-bold tracking-wider text-white uppercase px-1.5 py-0.5 rounded ${CATEGORY_COLORS[claim.category] || 'bg-slate-800'}`}>
                                  {claim.category}
                                </span>
                                <span className="text-[10px] text-indigo-400 font-bold truncate max-w-[150px]">
                                  {claim.source_feed_name || claim.source_name}
                                </span>
                             </div>
                             <p className="text-sm text-slate-200 leading-none truncate group-hover:text-white transition-colors">
                               {claim.claim_text}
                             </p>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
                              <span className={`text-[10px] font-bold tracking-wider text-white uppercase px-2 py-0.5 rounded border border-transparent ${CATEGORY_COLORS[claim.category] || 'bg-slate-800'}`}>
                                {claim.category}
                              </span>
                              <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                <span className="text-[10px] text-indigo-400 font-bold">
                                  {claim.source_feed_name || claim.source_name}
                                </span>
                              </div>
                              {claim.confidence && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                                  claim.confidence === 'high' ? 'text-emerald-400 border-emerald-900/30 bg-emerald-900/10' :
                                  claim.confidence === 'medium' ? 'text-yellow-400 border-yellow-900/30 bg-yellow-900/10' :
                                  'text-slate-400 border-slate-800 bg-slate-800/20'
                                }`}>
                                  {claim.confidence} Confidence
                                </span>
                              )}
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
                              {claim.metric_value && (
                                <span className="text-[10px] px-2 py-1 rounded bg-indigo-950/30 text-indigo-300 border border-indigo-900/50 font-mono">
                                  {claim.metric_context ? `${claim.metric_context}: ` : ''}{claim.metric_value}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      
                      {claim.source_url && (
                          <a 
                              href={claim.source_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`absolute text-slate-600 hover:text-indigo-400 transition-all p-1.5 bg-slate-950/0 hover:bg-slate-950 rounded-lg
                                ${viewMode === 'compact' ? 'right-3 top-2.5' : 'right-4 top-4'}
                              `}
                              title="View full chronicle entry"
                          >
                              <ExternalLink className="w-4 h-4" />
                          </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="py-12 border-t border-slate-800 text-center space-y-4">
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            Arbiter monitors 21 specialized acceleration signals to identify early trends in model capability, compute availability, and energy infrastructure.
          </p>
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{claims.length}</div>
              <div className="text-[10px] text-slate-600 uppercase font-bold">Signals Captured</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">{FEEDS.length}</div>
              <div className="text-[10px] text-slate-600 uppercase font-bold">Monitored Feeds</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">
                {new Set(claims.flatMap(c => c.entities)).size}
              </div>
              <div className="text-[10px] text-slate-600 uppercase font-bold">Tracked Entities</div>
            </div>
          </div>
      </div>
    </div>
  );
};
