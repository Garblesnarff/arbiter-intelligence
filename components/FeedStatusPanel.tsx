
import React, { useEffect, useState } from 'react';
import { fetchFeedStatus, FeedStatus } from '../services/rssService';
import { CheckCircle2, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const FeedStatusPanel = () => {
  const [statuses, setStatuses] = useState<FeedStatus[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setStatuses(fetchFeedStatus());
    const interval = setInterval(() => {
      setStatuses(fetchFeedStatus());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFeedClick = (feedName: string) => {
    navigate(`/chronicles?source=${encodeURIComponent(feedName)}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {statuses.map((feed) => (
          <div 
            key={feed.id} 
            onClick={() => handleFeedClick(feed.name)}
            className="p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-indigo-500/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-100 truncate pr-2 group-hover:text-indigo-400 transition-colors">
                {feed.name}
              </h3>
              <div className="shrink-0">
                {feed.status === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : feed.status === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-slate-600 animate-spin" />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3 h-3" />
                <span>
                  {feed.lastFetch 
                    ? new Date(feed.lastFetch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    : 'Never'}
                </span>
              </div>
              <div className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                {feed.claimCount} signals
              </div>
            </div>
            {feed.error && (
              <div className="mt-1 text-[9px] text-red-400/70 truncate italic">
                {feed.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
