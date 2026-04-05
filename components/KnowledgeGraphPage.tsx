import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import KnowledgeGraph from './semiotic/KnowledgeGraph';
import EntityDetailPanel from './EntityDetailPanel';
import { useEntityGraph } from '../hooks/useEntityGraph';
import type { GraphNode, GraphEdge } from '../hooks/useEntityGraph';

/**
 * Full-page knowledge graph view.
 * Search filters nodes by name; clicking a node opens the detail panel.
 */
export default function KnowledgeGraphPage() {
  const {
    nodes,
    edges,
    loading,
    error,
    selectedEntity,
    selectEntity,
    entityDetail,
    detailLoading,
  } = useEntityGraph();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search input by 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // Filter nodes + their direct connections when searching
  const { filteredNodes, filteredEdges } = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return { filteredNodes: nodes, filteredEdges: edges };
    }

    const term = debouncedSearch.toLowerCase();
    const matchingIds = new Set(
      nodes
        .filter((n) => n.name.toLowerCase().includes(term))
        .map((n) => n.id)
    );

    // Include directly connected nodes
    const connectedIds = new Set(matchingIds);
    for (const edge of edges) {
      if (matchingIds.has(edge.source)) connectedIds.add(edge.target);
      if (matchingIds.has(edge.target)) connectedIds.add(edge.source);
    }

    const fNodes = nodes.filter((n) => connectedIds.has(n.id));
    const fEdges = edges.filter(
      (e) => connectedIds.has(e.source) && connectedIds.has(e.target)
    );

    return { filteredNodes: fNodes, filteredEdges: fEdges };
  }, [nodes, edges, debouncedSearch]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      selectEntity(nodeId === selectedEntity ? null : nodeId);
    },
    [selectEntity, selectedEntity]
  );

  const handleEntityClick = useCallback(
    (entityId: string) => {
      selectEntity(entityId);
    },
    [selectEntity]
  );

  const handleCloseDetail = useCallback(() => {
    selectEntity(null);
  }, [selectEntity]);

  // Empty / loading / error states
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 400,
          color: '#94a3b8',
          fontSize: 14,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid #334155',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          Loading entity graph...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 400,
          color: '#f87171',
          fontSize: 14,
          padding: 24,
          textAlign: 'center',
        }}
      >
        Failed to load entity graph: {error}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 400,
          color: '#64748b',
          fontSize: 14,
          padding: 24,
          textAlign: 'center',
        }}
      >
        No entity data yet. Load the dashboard to start building the knowledge graph.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: '#020617',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid #1e293b',
          flexShrink: 0,
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: '#f1f5f9',
              whiteSpace: 'nowrap',
            }}
          >
            Knowledge Graph
          </h2>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {filteredNodes.length} entities, {filteredEdges.length} connections
          </span>
        </div>

        <div style={{ position: 'relative', maxWidth: 280, width: '100%' }}>
          <input
            type="text"
            placeholder="Search entities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 32px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              color: '#e2e8f0',
              fontSize: 13,
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
            onBlur={(e) => (e.target.style.borderColor = '#334155')}
          />
          {/* Search icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <KnowledgeGraph
          nodes={filteredNodes}
          edges={filteredEdges}
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedEntity}
          height={700}
        />

        {/* Detail panel */}
        {(entityDetail || detailLoading) && (
          <>
            {detailLoading && !entityDetail ? (
              <div
                className="animate-slide-in-right"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 350,
                  background: '#0f172a',
                  borderLeft: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 20,
                  color: '#94a3b8',
                  fontSize: 13,
                }}
              >
                Loading entity details...
              </div>
            ) : (
              <EntityDetailPanel
                detail={entityDetail}
                onClose={handleCloseDetail}
                onEntityClick={handleEntityClick}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
