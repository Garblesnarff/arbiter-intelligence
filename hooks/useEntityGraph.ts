import { useState, useEffect, useCallback } from 'react';
import {
  getEntityGraph,
  getEntitiesForGraph,
  getEntityDetail,
  type EntityGraphEdge,
  type EntityRow,
  type EntityDetail,
} from '../services/claimsPersistence';

export interface GraphNode {
  id: string;
  name: string;
  mentionCount: number;
  entityType: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  strength: number;
}

export interface UseEntityGraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  loading: boolean;
  error: string | null;
  selectedEntity: string | null;
  selectEntity: (id: string | null) => void;
  entityDetail: EntityDetail | null;
  detailLoading: boolean;
}

export function useEntityGraph(): UseEntityGraphResult {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [entityDetail, setEntityDetail] = useState<EntityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch graph data on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchGraph() {
      setLoading(true);
      setError(null);

      try {
        const rawEdges: EntityGraphEdge[] = await getEntityGraph();

        if (cancelled) return;

        // Extract unique entity IDs from edges
        const entityIds = new Set<string>();
        const nameMap = new Map<string, string>();

        for (const edge of rawEdges) {
          entityIds.add(edge.entity_a);
          entityIds.add(edge.entity_b);
          nameMap.set(edge.entity_a, edge.name_a);
          nameMap.set(edge.entity_b, edge.name_b);
        }

        // Fetch entity metadata
        const entityRows: EntityRow[] =
          entityIds.size > 0
            ? await getEntitiesForGraph(Array.from(entityIds))
            : [];

        if (cancelled) return;

        // Build a lookup for entity metadata
        const entityMap = new Map<string, EntityRow>();
        for (const row of entityRows) {
          entityMap.set(row.id, row);
        }

        // Count connections per entity to filter noise
        const connectionCount = new Map<string, number>();
        for (const edge of rawEdges) {
          connectionCount.set(edge.entity_a, (connectionCount.get(edge.entity_a) || 0) + 1);
          connectionCount.set(edge.entity_b, (connectionCount.get(edge.entity_b) || 0) + 1);
        }

        // Only include entities with 2+ connections (reduces arXiv author noise)
        const connectedIds = new Set(
          Array.from(entityIds).filter(id => (connectionCount.get(id) || 0) >= 2)
        );

        // Transform to GraphNode[] (only well-connected entities)
        const graphNodes: GraphNode[] = Array.from(connectedIds).map((id) => {
          const meta = entityMap.get(id);
          return {
            id,
            name: meta?.canonical_name ?? nameMap.get(id) ?? id,
            mentionCount: meta?.mention_count ?? 1,
            entityType: meta?.entity_type ?? 'unknown',
          };
        });

        // Transform to GraphEdge[] (only edges where both nodes survived filtering)
        const graphEdges: GraphEdge[] = rawEdges
          .filter(e => connectedIds.has(e.entity_a) && connectedIds.has(e.entity_b))
          .map((e) => ({
            source: e.entity_a,
            target: e.entity_b,
            strength: e.strength,
          }));

        setNodes(graphNodes);
        setEdges(graphEdges);
      } catch (err) {
        if (!cancelled) {
          console.error('[Arbiter] Error fetching entity graph:', err);
          setError(
            err instanceof Error ? err.message : 'Failed to load entity graph'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGraph();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch entity detail when selection changes
  const selectEntity = useCallback((id: string | null) => {
    setSelectedEntity(id);
    if (!id) {
      setEntityDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);

    getEntityDetail(id)
      .then((detail) => {
        if (!cancelled) {
          setEntityDetail(detail);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[Arbiter] Error fetching entity detail:', err);
          setEntityDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    nodes,
    edges,
    loading,
    error,
    selectedEntity,
    selectEntity,
    entityDetail,
    detailLoading,
  };
}
