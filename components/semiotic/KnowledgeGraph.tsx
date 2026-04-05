import React, { useRef, useEffect, useState, useCallback } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from 'd3-force';
import { CATEGORY_CHART_COLORS } from './theme';
import type { GraphNode, GraphEdge } from '../../hooks/useEntityGraph';

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  height?: number;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface SimEdge {
  source: SimNode;
  target: SimNode;
  strength: number;
}

function nodeRadius(mentionCount: number, max: number): number {
  const normalized = Math.min(mentionCount / Math.max(max, 1), 1);
  return 5 + normalized * 18;
}

function nodeColor(entityType: string): string {
  // Use the category colors since entity_type is often "unknown"
  // Map common entity types to category colors
  return CATEGORY_CHART_COLORS[entityType] || '#6366f1';
}

export default function KnowledgeGraph({
  nodes,
  edges,
  onNodeClick,
  selectedNodeId,
  height = 600,
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simEdges, setSimEdges] = useState<SimEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height });
  const [dragNode, setDragNode] = useState<string | null>(null);
  const simulationRef = useRef<ReturnType<typeof forceSimulation> | null>(null);

  // Track container width
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const parent = svg.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({ width: entry.contentRect.width, height });
      }
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, [height]);

  // Run force simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const maxMentions = Math.max(...nodes.map(n => n.mentionCount), 1);
    const w = dimensions.width;
    const h = dimensions.height;

    // Create simulation nodes
    const sNodes: SimNode[] = nodes.map((n, i) => ({
      ...n,
      x: w / 2 + (Math.random() - 0.5) * w * 0.6,
      y: h / 2 + (Math.random() - 0.5) * h * 0.6,
      vx: 0,
      vy: 0,
      radius: nodeRadius(n.mentionCount, maxMentions),
    }));

    const nodeById = new Map(sNodes.map(n => [n.id, n]));

    // Create simulation edges (filter to only edges where both nodes exist)
    const sEdges: SimEdge[] = edges
      .filter(e => nodeById.has(e.source) && nodeById.has(e.target))
      .map(e => ({
        source: nodeById.get(e.source)!,
        target: nodeById.get(e.target)!,
        strength: e.strength,
      }));

    const maxStrength = Math.max(...sEdges.map(e => e.strength), 1);

    const sim = forceSimulation<SimNode>(sNodes)
      .force('link', forceLink<SimNode, SimEdge>(sEdges)
        .id(d => d.id)
        .distance(d => 80 - (d.strength / maxStrength) * 30)
        .strength(d => 0.3 + (d.strength / maxStrength) * 0.5)
      )
      .force('charge', forceManyBody<SimNode>().strength(-120))
      .force('center', forceCenter(w / 2, h / 2))
      .force('collide', forceCollide<SimNode>().radius(d => d.radius + 8))
      .force('x', forceX(w / 2).strength(0.05))
      .force('y', forceY(h / 2).strength(0.05))
      .alpha(0.8)
      .alphaDecay(0.015);

    sim.on('tick', () => {
      // Clamp nodes within bounds
      for (const n of sNodes) {
        n.x = Math.max(n.radius + 20, Math.min(w - n.radius - 20, n.x));
        n.y = Math.max(n.radius + 20, Math.min(h - n.radius - 20, n.y));
      }
      setSimNodes([...sNodes]);
      setSimEdges([...sEdges]);
    });

    simulationRef.current = sim;

    return () => { sim.stop(); };
  }, [nodes, edges, dimensions.width, dimensions.height]);

  // Handle drag
  const handleMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDragNode(nodeId);
    const sim = simulationRef.current;
    if (sim) {
      sim.alphaTarget(0.1).restart();
    }
  }, []);

  useEffect(() => {
    if (!dragNode) return;

    const handleMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const node = simNodes.find(n => n.id === dragNode);
      if (node) {
        node.fx = x;
        node.fy = y;
      }
    };

    const handleUp = () => {
      const node = simNodes.find(n => n.id === dragNode);
      if (node) {
        node.fx = null as any;
        node.fy = null as any;
      }
      setDragNode(null);
      const sim = simulationRef.current;
      if (sim) sim.alphaTarget(0);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragNode, simNodes]);

  if (nodes.length === 0) return null;

  const maxStrength = Math.max(...edges.map(e => e.strength), 1);

  // Determine which nodes are connected to hovered/selected
  const highlightedIds = new Set<string>();
  const activeId = hoveredNode || selectedNodeId;
  if (activeId) {
    highlightedIds.add(activeId);
    for (const e of simEdges) {
      if (e.source.id === activeId) highlightedIds.add(e.target.id);
      if (e.target.id === activeId) highlightedIds.add(e.source.id);
    }
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        className="cursor-grab"
        style={{ background: '#020617' }}
      >
        {/* Edges */}
        <g>
          {simEdges.map((edge, i) => {
            const dimmed = activeId && !highlightedIds.has(edge.source.id) && !highlightedIds.has(edge.target.id);
            return (
              <line
                key={`e-${i}`}
                x1={edge.source.x}
                y1={edge.source.y}
                x2={edge.target.x}
                y2={edge.target.y}
                stroke={dimmed ? '#1e293b' : '#334155'}
                strokeWidth={0.5 + (edge.strength / maxStrength) * 2.5}
                strokeOpacity={dimmed ? 0.15 : 0.5}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {simNodes.map((node) => {
            const isActive = node.id === activeId;
            const isConnected = highlightedIds.has(node.id);
            const dimmed = activeId && !isConnected;
            const color = nodeColor(node.entityType);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onMouseDown={(e) => handleMouseDown(node.id, e)}
                onClick={() => onNodeClick?.(node.id)}
                opacity={dimmed ? 0.2 : 1}
              >
                {/* Glow for active node */}
                {isActive && (
                  <circle r={node.radius + 6} fill={color} opacity={0.15} />
                )}
                {/* Node circle */}
                <circle
                  r={node.radius}
                  fill={color}
                  stroke={isActive ? '#fff' : color}
                  strokeWidth={isActive ? 2 : 0.5}
                  opacity={0.85}
                />
                {/* Label */}
                {(node.radius > 7 || isActive || isConnected) && (
                  <text
                    y={node.radius + 14}
                    textAnchor="middle"
                    fill={dimmed ? '#475569' : '#94a3b8'}
                    fontSize={isActive ? 13 : 11}
                    fontWeight={isActive ? 600 : 400}
                    fontFamily='"Geist", sans-serif'
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {node.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
