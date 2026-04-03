
import React, { useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Globe, Hash, Info, ChevronUp, ChevronDown, Share2, Zap, Link as LinkIcon } from 'lucide-react';
import { CategoryIcon, CATEGORY_BADGE_COLORS } from './shared/CategoryIcon';
import { useClaimDetail } from '../contexts/ClaimDetailContext';
import { useToast } from '../contexts/ToastContext';
import { useClaimsData } from '../contexts/ClaimsContext';
import { copyTextToClipboard } from '../utils/browser';

export const ClaimDetailModal = () => {
  const { selectedClaim, claimList, closeClaim, nextClaim, prevClaim, openClaim } = useClaimDetail();
  const { showToast } = useToast();
  const { claims: allClaims } = useClaimsData();
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedClaim) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedClaim]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedClaim) return;
      if (e.key === 'Escape') closeClaim();
      if (e.key === 'ArrowDown') { e.preventDefault(); nextClaim(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); prevClaim(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClaim, closeClaim, nextClaim, prevClaim]);

  const relatedClaims = useMemo(() => {
    if (!selectedClaim || allClaims.length === 0) return [];

    const currentEntities = new Set(selectedClaim.entities);
    return allClaims
      .filter(c => c.id !== selectedClaim.id)
      .map(c => {
        const intersection = c.entities.filter(e => currentEntities.has(e));
        return { claim: c, score: intersection.length };
      })
      .filter(item => item.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.claim);
  }, [selectedClaim, allClaims]);

  if (!selectedClaim) return null;

  const handleEntityClick = (entity: string) => {
    closeClaim();
    navigate(`/chronicles?entity=${encodeURIComponent(entity)}`);
  };

  const handleShare = async () => {
    const shareText = `[${selectedClaim.category}] ${selectedClaim.claim_text}\n\nSource: ${selectedClaim.source_url}`;
    const copied = await copyTextToClipboard(shareText);
    showToast(copied ? 'Claim details copied to clipboard' : 'Clipboard unavailable', copied ? 'success' : 'error');
  };

  const formattedDate = new Date(selectedClaim.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const currentIndex = claimList.findIndex(c => c.id === selectedClaim.id);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
        onClick={closeClaim}
      />

      {/* Slide-over Panel */}
      <div className="relative w-full sm:w-[500px] h-full bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/50">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg border ${CATEGORY_BADGE_COLORS[selectedClaim.category] || 'bg-slate-800'}`}>
                <CategoryIcon category={selectedClaim.category} size="md" />
             </div>
             <div>
               <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">SIGNAL DETAILS</div>
               <div className="text-xs font-semibold text-slate-200">{selectedClaim.source_feed_name || 'Chronicle Source'}</div>
             </div>
          </div>
          <div className="flex items-center gap-1">
            {claimList.length > 1 && (
              <div className="flex items-center gap-1 mr-2 px-2 py-1 bg-slate-800/50 rounded-lg border border-slate-800 text-[11px] text-slate-500 font-mono">
                <button onClick={prevClaim} disabled={currentIndex === 0} className="hover:text-white disabled:opacity-30 p-1"><ChevronUp className="w-3.5 h-3.5" /></button>
                <span>{currentIndex + 1} / {claimList.length}</span>
                <button onClick={nextClaim} disabled={currentIndex === claimList.length - 1} className="hover:text-white disabled:opacity-30 p-1"><ChevronDown className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <button
              onClick={closeClaim}
              className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Main Claim Text */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
               <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${CATEGORY_BADGE_COLORS[selectedClaim.category]}`}>
                  {selectedClaim.category}
               </span>
               <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                 selectedClaim.confidence === 'high' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                 selectedClaim.confidence === 'medium' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                 'text-slate-400 bg-slate-500/10 border-slate-500/20'
               }`}>
                  {selectedClaim.confidence} Confidence
               </span>
            </div>
            <h2 className="text-2xl font-bold text-white leading-tight">
              {selectedClaim.claim_text}
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-400">
               <Globe className="w-4 h-4" />
               <span>Published {formattedDate}</span>
            </div>
          </section>

          {/* Metric Spotlight */}
          {selectedClaim.metric_value && (
            <section className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5 shadow-inner">
               <div className="flex items-center gap-2 mb-3 text-indigo-400">
                  <Zap className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">MEASURED IMPACT</span>
               </div>
               <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-mono font-bold text-white">{selectedClaim.metric_value}</div>
                  <div className="text-sm text-slate-400 font-medium">{selectedClaim.metric_context}</div>
               </div>
            </section>
          )}

          {/* Entities Chips */}
          <section className="space-y-3">
             <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" />
                EXTRACTED ENTITIES
             </div>
             <div className="flex flex-wrap gap-2">
                {selectedClaim.entities.map(entity => (
                  <button
                    key={entity}
                    onClick={() => handleEntityClick(entity)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs text-slate-300 hover:border-indigo-500 hover:text-indigo-400 transition-all flex items-center gap-1.5"
                  >
                    <span>{entity}</span>
                  </button>
                ))}
             </div>
          </section>

          {/* Original Sentence */}
          {selectedClaim.original_sentence && (
            <section className="space-y-3">
               <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-3.5 h-3.5" />
                  CHRONICLE SOURCE SEGMENT
               </div>
               <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl relative group">
                  <div className="absolute top-4 left-[-2px] w-1 h-6 bg-indigo-500 rounded-full opacity-50" />
                  <p className="text-sm text-slate-400 italic leading-relaxed">
                    "{selectedClaim.original_sentence}"
                  </p>
               </div>
            </section>
          )}

          {/* Related Claims */}
          {relatedClaims.length > 0 && (
            <section className="space-y-4">
               <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <LinkIcon className="w-3.5 h-3.5" />
                  RELATED INTELLIGENCE
               </div>
               <div className="space-y-3">
                  {relatedClaims.map(rc => (
                    <div
                      key={rc.id}
                      onClick={() => openClaim(rc, allClaims)}
                      className="p-3 bg-slate-900/40 border border-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-900 hover:border-slate-700 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-tighter ${CATEGORY_BADGE_COLORS[rc.category]}`}>
                           {rc.category}
                        </span>
                        <span className="text-[11px] text-slate-500">{new Date(rc.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-300 group-hover:text-white line-clamp-2">
                        {rc.claim_text}
                      </p>
                    </div>
                  ))}
               </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 shrink-0 flex gap-3 bg-slate-950">
          {selectedClaim.source_url && (
            <a
              href={selectedClaim.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Visit Original Source
            </a>
          )}
          <button
            className="flex-1 border border-slate-800 hover:bg-slate-900 text-slate-300 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4" />
            Share Signal
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
