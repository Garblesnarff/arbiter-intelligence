
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FEEDS } from '../constants/feeds';
import { Claim } from '../types';
import {
  Filter,
  Search,
  Calendar,
  ExternalLink,
  Globe,
  RefreshCw,
  Maximize2,
  Minimize2,
  Download,
  Share2,
  ChevronDown,
  Copy,
  FileJson,
  FileSpreadsheet
} from 'lucide-react';
import { CategoryIcon, CATEGORY_SOLID_COLORS } from './shared/CategoryIcon';
import { useClaimDetail } from '../contexts/ClaimDetailContext';
import { useToast } from '../contexts/ToastContext';
import { useClaimsData } from '../contexts/ClaimsContext';
import { copyTextToClipboard, downloadTextFile, openExternalUrl } from '../utils/browser';

export const ChroniclesPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set(['ALL']));
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>(() => {
    return (localStorage.getItem('arbiter_view_mode') as 'compact' | 'expanded') ||
           (window.innerWidth < 768 ? 'compact' : 'expanded');
  });

  const { openClaim } = useClaimDetail();
  const { showToast } = useToast();
  const { claims, loading, refreshClaims, usingMockData } = useClaimsData();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    const entityParam = params.get('entity');

    if (sourceParam) {
      setSelectedSources(new Set([sourceParam]));
    }
    if (entityParam) {
      setSearchTerm(entityParam);
    }
  }, [location.search]);

  useEffect(() => {
    localStorage.setItem('arbiter_view_mode', viewMode);
  }, [viewMode]);

  const handleRefresh = async () => {
    const result = await refreshClaims({ forceRefresh: true });
    if (result.error) {
      showToast('Refresh failed', 'error');
      return;
    }

    if (result.usingMockData) {
      showToast('Live feeds unavailable, showing fallback data', 'info');
      return;
    }

    showToast('Feed refresh complete');
  };

  const categories = ['ALL', 'MODELS', 'COMPUTE', 'CAPITAL', 'ROBOTICS', 'BIOLOGY', 'ENERGY', 'SPACE', 'GOVERNANCE', 'INFRASTRUCTURE', 'CONSCIOUSNESS'];

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
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === 'Recently Discovered') return -1;
      if (b[0] === 'Recently Discovered') return 1;
      return new Date(b[1][0].date).getTime() - new Date(a[1][0].date).getTime();
    });
  }, [filteredClaims]);

  const handleShare = async (e: React.MouseEvent, claim: Claim) => {
    e.stopPropagation();
    const formattedDate = new Date(claim.date).toLocaleDateString();
    const shareText = `[${claim.category}] ${claim.claim_text} — ${claim.source_feed_name || claim.source_name} (${formattedDate})`;
    const copied = await copyTextToClipboard(shareText);
    showToast(copied ? 'Copied to clipboard' : 'Clipboard unavailable', copied ? 'success' : 'error');
  };

  const exportAsJSON = () => {
    downloadTextFile(
      `arbiter_claims_${new Date().toISOString().split('T')[0]}.json`,
      JSON.stringify(filteredClaims, null, 2),
      'application/json;charset=utf-8'
    );
    setIsExportOpen(false);
    showToast('Export complete');
  };

  const exportAsCSV = () => {
    const headers = ["date", "category", "claim_text", "entities", "metric_value", "confidence", "source_url", "source_feed"];
    const rows = filteredClaims.map(c => [
      new Date(c.date).toISOString().split('T')[0],
      c.category,
      `"${c.claim_text.replace(/"/g, '""')}"`,
      `"${c.entities.join('; ')}"`,
      c.metric_value || "",
      c.confidence,
      c.source_url || "",
      c.source_feed_name || ""
    ]);
    const csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    downloadTextFile(
      `arbiter_claims_${new Date().toISOString().split('T')[0]}.csv`,
      csvContent,
      'text/csv;charset=utf-8'
    );
    setIsExportOpen(false);
    showToast('Export complete');
  };

  const copyAllToClipboard = async () => {
    const text = filteredClaims.map(c => {
      const date = new Date(c.date).toLocaleDateString();
      return `[${c.category}] ${c.claim_text} (${date})`;
    }).join('\n');
    const copied = await copyTextToClipboard(text);
    setIsExportOpen(false);
    showToast(copied ? 'Copied filtered list to clipboard' : 'Clipboard unavailable', copied ? 'success' : 'error');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Chronicle Archive</h1>
          <p className="text-slate-400 text-sm">
            Aggregating {claims.length} signals from {FEEDS.length} sources.{usingMockData ? ' Showing fallback data.' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
           {/* Export Dropdown */}
           <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 border border-slate-700 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                  <button onClick={exportAsJSON} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                    <FileJson className="w-4 h-4 text-amber-500" />
                    <span>Export as JSON</span>
                  </button>
                  <button onClick={exportAsCSV} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>Export as CSV</span>
                  </button>
                  <button onClick={copyAllToClipboard} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                    <Copy className="w-4 h-4 text-indigo-500" />
                    <span>Copy to Clipboard</span>
                  </button>
                </div>
              )}
           </div>

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
             onClick={() => void handleRefresh()}
             disabled={loading}
             className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 border border-slate-700 shadow-sm"
           >
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             <span className="hidden sm:inline">Refresh Feeds</span>
           </button>
        </div>
      </div>

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
          </div>
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-fade-r">
            <div className="p-1.5 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
            </div>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase whitespace-nowrap transition-all border ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/30'
                    : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {loading ? (
           Array.from({length: 3}).map((_, i) => (
             <div key={i} className="space-y-4">
                <div className="h-6 w-48 bg-slate-800 rounded animate-pulse" />
                <div className="bg-slate-900/50 border border-slate-800 h-24 rounded-xl animate-pulse" />
             </div>
           ))
        ) : filteredClaims.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
            <Globe className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-slate-300 font-medium text-lg">No matching signals found</h3>
            <button
              onClick={() => {setSelectedSources(new Set(['ALL'])); setSelectedCategory('ALL'); setSearchTerm('')}}
              className="mt-4 text-indigo-400 text-sm font-semibold hover:text-indigo-300 px-4 py-2 bg-indigo-500/10 rounded-lg transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          groupedClaims.map(([date, dateClaims]) => (
            <div key={date} className="relative">
              <div className="sticky top-16 z-20 flex items-center justify-between py-2 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800/50 mb-4">
                 <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <h2 className="text-sm font-bold text-slate-100 tracking-tight">{date}</h2>
                 </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {dateClaims.map((claim) => (
                  <div
                    key={claim.id}
                    onClick={() => openClaim(claim, filteredClaims)}
                    className={`bg-slate-900 border border-slate-800 rounded-xl transition-all group relative overflow-hidden cursor-pointer
                      ${viewMode === 'compact' ? 'p-3 hover:bg-slate-800/30' : 'p-5 hover:border-slate-600 hover:shadow-xl hover:shadow-indigo-500/5'}
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`shrink-0 flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950 transition-colors
                        ${viewMode === 'compact' ? 'w-8 h-8' : 'w-10 h-10'}
                      `}>
                        <CategoryIcon category={claim.category} size={viewMode === 'compact' ? 'sm' : 'md'} />
                      </div>
                      <div className="flex-1 pr-14 min-w-0">
                        {viewMode === 'compact' ? (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1">
                             <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[11px] font-bold tracking-wider text-white uppercase px-1.5 py-0.5 rounded ${CATEGORY_SOLID_COLORS[claim.category] || 'bg-slate-800'}`}>
                                  {claim.category}
                                </span>
                                <span className="text-[11px] text-indigo-400 font-bold truncate max-w-[150px]">
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
                              <span className={`text-[11px] font-bold tracking-wider text-white uppercase px-2 py-0.5 rounded border border-transparent ${CATEGORY_SOLID_COLORS[claim.category] || 'bg-slate-800'}`}>
                                {claim.category}
                              </span>
                              <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                <span className="text-[11px] text-indigo-400 font-bold">
                                  {claim.source_feed_name || claim.source_name}
                                </span>
                              </div>
                            </div>
                            <h3 className="text-slate-200 text-base leading-snug mb-3 group-hover:text-white transition-colors font-medium">
                              {claim.claim_text}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                              {claim.entities.slice(0, 5).map((entity) => (
                                <span key={entity} className="text-[11px] px-2 py-1 rounded bg-slate-800/50 text-slate-400 border border-slate-800/80">
                                  {entity}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className={`absolute flex items-center gap-1 transition-all
                        ${viewMode === 'compact' ? 'right-3 top-2.5' : 'right-4 top-4'}
                      `}>
                          <button
                              onClick={(e) => handleShare(e, claim)}
                              className="text-slate-500 hover:text-indigo-400 md:text-slate-600 transition-all p-1.5 hover:bg-slate-950 rounded-lg"
                              title="Copy shareable snippet"
                          >
                              <Share2 className="w-4 h-4" />
                          </button>
                          {claim.source_url && (
                              <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const opened = openExternalUrl(claim.source_url);
                                    if (!opened) {
                                      showToast('Unable to open source link', 'error');
                                    }
                                  }}
                                  className="text-slate-500 hover:text-indigo-400 md:text-slate-600 transition-all p-1.5 hover:bg-slate-950 rounded-lg"
                                  title="Visit original source"
                              >
                                  <ExternalLink className="w-4 h-4" />
                              </button>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
