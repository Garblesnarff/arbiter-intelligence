import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { useEntityGraph } from '../../hooks/useEntityGraph';
import KnowledgeGraph from './KnowledgeGraph';

export const KnowledgeGraphPreview: React.FC = () => {
  const navigate = useNavigate();
  const { nodes, edges, loading } = useEntityGraph();

  // Limit to top 30 nodes by mention count for the preview
  const previewNodes = [...nodes]
    .sort((a, b) => b.mentionCount - a.mentionCount)
    .slice(0, 30);

  const previewNodeIds = new Set(previewNodes.map(n => n.id));
  const previewEdges = edges.filter(
    e => previewNodeIds.has(e.source) && previewNodeIds.has(e.target)
  );

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-[240px] animate-pulse">
        <div className="h-4 w-32 bg-slate-800 rounded mb-4" />
        <div className="h-[180px] bg-slate-800/50 rounded-lg" />
      </div>
    );
  }

  if (nodes.length === 0) return null;

  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-slate-700 transition-colors group"
      onClick={() => navigate('/graph')}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-indigo-400" />
          Knowledge Graph
        </h3>
        <span className="text-xs text-slate-600 font-mono group-hover:text-indigo-400 transition-colors">
          {nodes.length} entities →
        </span>
      </div>
      <div className="h-[180px] rounded-lg overflow-hidden">
        <KnowledgeGraph
          nodes={previewNodes}
          edges={previewEdges}
          height={180}
        />
      </div>
    </div>
  );
};
