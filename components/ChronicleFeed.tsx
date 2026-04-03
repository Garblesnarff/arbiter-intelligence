
import React, { useMemo } from 'react';
import { Claim } from '../types';
import { Link } from 'react-router-dom';
import { TrendingUp, ExternalLink, Share2 } from 'lucide-react';
import { CategoryIcon } from './shared/CategoryIcon';
import { useClaimDetail } from '../contexts/ClaimDetailContext';
import { useToast } from '../contexts/ToastContext';
import { useClaimsData } from '../contexts/ClaimsContext';
import { copyTextToClipboard, openExternalUrl } from '../utils/browser';

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
  const { claims, loading } = useClaimsData();
  const { openClaim } = useClaimDetail();
  const { showToast } = useToast();

  const displayedClaims = useMemo(() => {
    return [...claims]
      .sort((a, b) => {
        if (a.model_relevance && !b.model_relevance) return -1;
        if (!a.model_relevance && b.model_relevance) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      })
      .slice(0, 10);
  }, [claims]);

  const handleShare = async (e: React.MouseEvent, claim: Claim) => {
    e.stopPropagation();
    const formattedDate = new Date(claim.date).toLocaleDateString();
    const shareText = `[${claim.category}] ${claim.claim_text} — ${claim.source_feed_name || claim.source_name} (${formattedDate})`;
    const copied = await copyTextToClipboard(shareText);
    showToast(copied ? 'Copied to clipboard' : 'Clipboard unavailable', copied ? 'success' : 'error');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          Live Intelligence Stream
        </h2>
        <div className="flex items-center gap-2">
          {loading && <div className="w-3 h-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>}
          <span className="text-xs text-slate-500 font-mono">21 SOURCES ACTIVE</span>
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
          displayedClaims.map((claim) => (
            <div
              key={claim.id}
              onClick={() => openClaim(claim, displayedClaims)}
              className="p-4 hover:bg-slate-800/30 transition-colors group relative cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                  <CategoryIcon category={claim.category} />
                </div>
                <div className="flex-1 pr-14">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">{claim.category}</span>
                    <span className="text-[11px] text-slate-600">·</span>
                    <div className="flex items-center gap-1.5">
                       <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.5)]"></div>
                       <span className="text-[11px] text-indigo-400 font-semibold truncate max-w-[120px]">
                         {claim.source_feed_name || claim.source_name}
                       </span>
                    </div>
                    <span className="text-[11px] text-slate-600">·</span>
                    <span className="text-[11px] text-slate-500">{new Date(claim.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-snug group-hover:text-white transition-colors">
                    {claim.claim_text}
                  </p>
                </div>
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <button
                    onClick={(e) => handleShare(e, claim)}
                    className="text-slate-500 hover:text-indigo-400 md:text-slate-600 transition-colors p-1"
                    title="Share snippet"
                  >
                    <Share2 className="w-3.5 h-3.5" />
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
                      className="text-slate-500 hover:text-indigo-400 md:text-slate-600 transition-colors p-1"
                      title="View Source"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-3 bg-slate-950/50 border-t border-slate-800 text-center shrink-0">
        <Link to="/chronicles" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors block w-full h-full">
          Analyze Full Signal Archive →
        </Link>
      </div>
    </div>
  );
};
