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
  fx?: number | null;
  fy?: number | null;
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
  const simulationRef = useRef<ReturnType<typeof forceSimulation> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);

  // Zoom/pan state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  // Track container width
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const parent = svg.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setDimensions({ width: w, height });
        setViewBox({ x: 0, y: 0, w, h: height });
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

    const sNodes: SimNode[] = nodes.map(n => ({
      ...n,
      x: w / 2 + (Math.random() - 0.5) * w * 0.6,
      y: h / 2 + (Math.random() - 0.5) * h * 0.6,
      vx: 0,
      vy: 0,
      radius: nodeRadius(n.mentionCount, maxMentions),
    }));

    simNodesRef.current = sNodes;
    const nodeById = new Map(sNodes.map(n => [n.id, n]));

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
      .force('charge', forceManyBody<SimNode>().strength(-150))
      .force('center', forceCenter(w / 2, h / 2))
      .force('collide', forceCollide<SimNode>().radius(d => d.radius + 10))
      .force('x', forceX(w / 2).strength(0.03))
      .force('y', forceY(h / 2).strength(0.03))
      .alpha(0.8)
      .alphaDecay(0.012);

    sim.on('tick', () => {
      setSimNodes([...sNodes]);
      setSimEdges([...sEdges]);
    });

    simulationRef.current = sim;
    return () => { sim.stop(); };
  }, [nodes, edges, dimensions.width, dimensions.height]);

  // Convert screen coords to SVG viewBox coords
  const screenToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    return {
      x: viewBox.x + (clientX - rect.left) * scaleX,
      y: viewBox.y + (clientY - rect.top) * scaleY,
    };
  }, [viewBox]);

  // Zoom with scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const svg = svgRef.current;
    if (!svg) return;

    const { x: mx, y: my } = screenToSvg(e.clientX, e.clientY);

    setViewBox(prev => {
      const newW = prev.w * zoomFactor;
      const newH = prev.h * zoomFactor;
      // Zoom towards mouse position
      const newX = mx - (mx - prev.x) * zoomFactor;
      const newY = my - (my - prev.y) * zoomFactor;
      return { x: newX, y: newY, w: newW, h: newH };
    });
  }, [screenToSvg]);

  // Node drag start
  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingNode(nodeId);
    const sim = simulationRef.current;
    if (sim) sim.alphaTarget(0.15).restart();
  }, []);

  // Pan start (on SVG background)
  const handleSvgMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan if clicking on the SVG background, not on a node
    if ((e.target as Element).tagName === 'svg' || (e.target as Element).tagName === 'SVG') {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
    }
  }, [viewBox]);

  // Global mouse move/up for drag and pan
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isDraggingNode) {
        const { x, y } = screenToSvg(e.clientX, e.clientY);
        const node = simNodesRef.current.find(n => n.id === isDraggingNode);
        if (node) {
          node.fx = x;
          node.fy = y;
        }
      } else if (isPanning) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const scaleX = viewBox.w / rect.width;
        const scaleY = viewBox.h / rect.height;
        setViewBox(prev => ({
          ...prev,
          x: panStart.current.vx - dx * scaleX,
          y: panStart.current.vy - dy * scaleY,
        }));
      }
    };

    const handleUp = () => {
      if (isDraggingNode) {
        const node = simNodesRef.current.find(n => n.id === isDraggingNode);
        if (node) {
          node.fx = null;
          node.fy = null;
        }
        setIsDraggingNode(null);
        const sim = simulationRef.current;
        if (sim) sim.alphaTarget(0);
      }
      setIsPanning(false);
    };

    if (isDraggingNode || isPanning) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };
    }
  }, [isDraggingNode, isPanning, screenToSvg, viewBox.w, viewBox.h]);

  if (nodes.length === 0) return null;

  const maxStrength = Math.max(...edges.map(e => e.strength), 1);

  // Highlight connected nodes
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
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className={isDraggingNode ? 'cursor-grabbing' : isPanning ? 'cursor-grabbing' : 'cursor-grab'}
        style={{ background: '#020617' }}
        onWheel={handleWheel}
        onMouseDown={handleSvgMouseDown}
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
                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                onClick={(e) => { e.stopPropagation(); onNodeClick?.(node.id); }}
                opacity={dimmed ? 0.2 : 1}
              >
                {isActive && (
                  <circle r={node.radius + 6} fill={color} opacity={0.15} />
                )}
                <circle
                  r={node.radius}
                  fill={color}
                  stroke={isActive ? '#fff' : color}
                  strokeWidth={isActive ? 2 : 0.5}
                  opacity={0.85}
                />
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

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          onClick={() => setViewBox(prev => {
            const cx = prev.x + prev.w / 2;
            const cy = prev.y + prev.h / 2;
            const nw = prev.w * 0.8;
            const nh = prev.h * 0.8;
            return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
          })}
          className="w-8 h-8 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center text-lg font-mono"
        >+</button>
        <button
          onClick={() => setViewBox(prev => {
            const cx = prev.x + prev.w / 2;
            const cy = prev.y + prev.h / 2;
            const nw = prev.w * 1.25;
            const nh = prev.h * 1.25;
            return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
          })}
          className="w-8 h-8 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center text-lg font-mono"
        >-</button>
        <button
          onClick={() => setViewBox({ x: 0, y: 0, w: dimensions.width, h: dimensions.height })}
          className="w-8 h-8 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center text-xs"
          title="Reset zoom"
        >R</button>
      </div>
    </div>
  );
}
