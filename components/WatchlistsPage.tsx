import React, { useState } from 'react';
import { Eye, Plus, Trash2, Pause, Play, Search, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Watchlist, Claim } from '../types';

const INITIAL_WATCHLISTS: Watchlist[] = [
  {
    id: 'w1',
    name: 'Frontier Models',
    query: '',
    entities: ['GPT-5', 'Claude', 'Gemini', 'Llama'],
    categories: ['MODELS'],
    is_active: true,
    created_at: '2025-12-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'w2',
    name: 'Compute & Energy',
    query: '',
    entities: ['NVIDIA', 'Blackwell', 'H200'],
    categories: ['COMPUTE', 'ENERGY', 'INFRASTRUCTURE'],
    is_active: true,
    created_at: '2025-12-15T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'w3',
    name: 'Bio x AI',
    query: '',
    entities: ['AlphaFold', 'protein', 'longevity'],
    categories: ['BIOLOGY'],
    is_active: false,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
  },
];

export const WatchlistsPage = () => {
  const [watchlists, setWatchlists] = useState<Watchlist[]>(() => {
    const stored = localStorage.getItem('arbiter_watchlists');
    return stored ? JSON.parse(stored) : INITIAL_WATCHLISTS;
  });
  const navigate = useNavigate();

  const save = (updated: Watchlist[]) => {
    setWatchlists(updated);
    localStorage.setItem('arbiter_watchlists', JSON.stringify(updated));
  };

  const toggleActive = (id: string) => {
    save(watchlists.map(w => w.id === id ? { ...w, is_active: !w.is_active, updated_at: new Date().toISOString() } : w));
  };

  const deleteWatchlist = (id: string) => {
    save(watchlists.filter(w => w.id !== id));
  };

  const jumpToFeed = (watchlist: Watchlist) => {
    const entityParam = watchlist.entities[0];
    if (entityParam) {
      navigate(`/chronicles?entity=${encodeURIComponent(entityParam)}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Watchlists</h1>
          <p className="text-slate-400 text-sm">Track entities and topics. Matching signals surface first in your feed.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          New Watchlist
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-200">Your Watchlists ({watchlists.length})</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {watchlists.map((watchlist) => (
            <div key={watchlist.id} className={`p-5 flex items-start gap-4 hover:bg-slate-800/20 transition-colors ${!watchlist.is_active ? 'opacity-60' : ''}`}>
              <div className={`p-2 rounded-lg ${watchlist.is_active ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-slate-800 border border-slate-700'}`}>
                <Eye className={`w-5 h-5 ${watchlist.is_active ? 'text-indigo-400' : 'text-slate-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-slate-200">{watchlist.name}</h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                    watchlist.is_active
                      ? 'text-emerald-400 bg-emerald-950 border-emerald-900'
                      : 'text-slate-500 bg-slate-900 border-slate-800'
                  }`}>
                    {watchlist.is_active ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>

                {/* Entity chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {watchlist.entities.map(entity => (
                    <span key={entity} className="text-xs px-2 py-0.5 bg-slate-800/50 border border-slate-700/50 rounded text-slate-400">
                      {entity}
                    </span>
                  ))}
                  {watchlist.categories.map(cat => (
                    <span key={cat} className="text-[11px] px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-400 font-medium">
                      {cat}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => jumpToFeed(watchlist)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    View matching signals <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleActive(watchlist.id)}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-2 rounded-lg hover:bg-slate-800"
                  title={watchlist.is_active ? 'Pause' : 'Resume'}
                >
                  {watchlist.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => deleteWatchlist(watchlist.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-slate-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-center">
        <p className="text-sm text-slate-400">
          Watchlist matches automatically boost to the top of your Dashboard and Chronicles feeds.
        </p>
      </div>
    </div>
  );
};
