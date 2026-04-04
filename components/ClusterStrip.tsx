import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { useClaimsData } from '../contexts/ClaimsContext';
import { useTopicClusters } from '../hooks/useTopicClusters';

export const ClusterStrip: React.FC = () => {
  const { claims } = useClaimsData();
  const { clusters } = useTopicClusters(claims);
  const navigate = useNavigate();

  if (clusters.length === 0) return null;

  // Build a quick lookup for claim text by ID
  const claimTextById = new Map<string, string>();
  for (const c of claims) {
    claimTextById.set(c.id, c.claim_text);
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Share2 className="w-4 h-4 text-indigo-500" />
        Emerging Narratives
      </h2>

      {/* Horizontally scrollable on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-x-visible md:pb-0 scrollbar-thin scrollbar-thumb-slate-800">
        {clusters.slice(0, 8).map((cluster) => {
          const recentClaimText = (() => {
            // Find the most recent claim's text
            let latest = '';
            let latestDate = '';
            for (const cid of cluster.claim_ids) {
              const claim = claims.find(c => c.id === cid);
              if (claim && claim.date > latestDate) {
                latestDate = claim.date;
                latest = claim.claim_text;
              }
            }
            return latest.length > 80 ? latest.slice(0, 77) + '...' : latest;
          })();

          return (
            <button
              key={cluster.id}
              onClick={() =>
                navigate(`/chronicles?entity=${encodeURIComponent(cluster.label)}`)
              }
              className="flex-shrink-0 w-[260px] md:w-auto bg-slate-900 border border-slate-800 rounded-xl p-4 text-left hover:border-indigo-500/40 transition-colors group cursor-pointer"
            >
              {/* Header row: label + claim count */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                  {cluster.label}
                </span>
                <span className="ml-2 shrink-0 text-[11px] font-mono bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded">
                  {cluster.claim_ids.length}
                </span>
              </div>

              {/* Source count */}
              <div className="text-[11px] text-slate-500 mb-2">
                {cluster.source_count} {cluster.source_count === 1 ? 'source' : 'sources'}
              </div>

              {/* Entity chips */}
              <div className="flex flex-wrap gap-1 mb-2">
                {cluster.top_entities.slice(0, 3).map((entity) => (
                  <span
                    key={entity}
                    className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded-md"
                  >
                    {entity}
                  </span>
                ))}
              </div>

              {/* Recent claim text */}
              {recentClaimText && (
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {recentClaimText}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
