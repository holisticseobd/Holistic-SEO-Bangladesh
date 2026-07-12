import React, { useState, useMemo } from 'react';
import { TopicNode, KeywordNode, LocationNode, EntityEdge } from '../types';
import {
  Search,
  Filter,
  Globe,
  Tag,
  Key,
  Database,
  Grid,
  Info,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface SEOKnowledgeGraphProps {
  topics: TopicNode[];
  keywords: KeywordNode[];
  locations: LocationNode[];
  edges: EntityEdge[];
}

interface GraphNode {
  id: string;
  label: string;
  type: 'topic' | 'keyword' | 'location';
  metric: string;
  color: string;
  raw: any;
}

export default function SEOKnowledgeGraph({ topics, keywords, locations, edges }: SEOKnowledgeGraphProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Filter selections
  const [showTopics, setShowTopics] = useState(true);
  const [showKeywords, setShowKeywords] = useState(true);
  const [showLocations, setShowLocations] = useState(true);

  // Pan / Zoom states
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Map elements to standardized visual Graph Nodes
  const allNodes = useMemo(() => {
    const nodes: GraphNode[] = [];

    if (showTopics) {
      topics.forEach((t) => {
        nodes.push({
          id: t.id,
          label: t.label,
          type: 'topic',
          metric: `${t.volume.toLocaleString()} vol • KD: ${t.difficulty}`,
          color: '#06b6d4', // cyan
          raw: t,
        });
      });
    }

    if (showKeywords) {
      keywords.forEach((k) => {
        nodes.push({
          id: k.id,
          label: k.label,
          type: 'keyword',
          metric: `${k.volume.toLocaleString()} vol • KD: ${k.difficulty} • CPC: $${k.cpc.toFixed(1)}`,
          color: '#6366f1', // indigo
          raw: k,
        });
      });
    }

    if (showLocations) {
      // Limit locations display to countries & states to keep visual graph extremely clean
      locations
        .filter((l) => l.type === 'country' || l.type === 'state')
        .forEach((l) => {
          nodes.push({
            id: l.id,
            label: l.name,
            type: 'location',
            metric: `${l.volume.toLocaleString()} searches • ${l.type.toUpperCase()}`,
            color: '#10b981', // emerald
            raw: l,
          });
        });
    }

    return nodes;
  }, [topics, keywords, locations, showTopics, showKeywords, showLocations]);

  // Construct visual edges/connections
  const visualEdges = useMemo(() => {
    const activeIds = new Set(allNodes.map((n) => n.id));
    const list: EntityEdge[] = [];

    // Add explicit edges
    edges.forEach((edge) => {
      if (activeIds.has(edge.source) && activeIds.has(edge.target)) {
        list.push(edge);
      }
    });

    // Auto-generate implicit parent-child edges to make the graph beautifully connected
    if (showKeywords && showTopics) {
      keywords.forEach((k) => {
        if (activeIds.has(k.id) && activeIds.has(k.topicId)) {
          list.push({
            source: k.id,
            target: k.topicId,
            type: 'belongs_to',
          });
        }
      });
    }

    if (showLocations && showTopics) {
      // Connect countries to a few matching topics to make things look organic
      locations
        .filter((l) => l.type === 'country')
        .forEach((l, idx) => {
          const targetTopic = topics[idx % topics.length];
          if (targetTopic && activeIds.has(l.id) && activeIds.has(targetTopic.id)) {
            list.push({
              source: l.id,
              target: targetTopic.id,
              type: 'targets_in',
            });
          }
        });
    }

    return list;
  }, [allNodes, edges, keywords, locations, topics, showKeywords, showTopics, showLocations]);

  // Spread coordinates in a visual circle layout with custom spring scatter
  const positionedNodes = useMemo(() => {
    const width = 800;
    const height = 500;
    const center = { x: width / 2, y: height / 2 };

    return allNodes.map((node, idx) => {
      // Organize layers: Locations on outside, Topics in middle, Keywords radiating in inner loops
      let radius = 220;
      let angle = (idx / allNodes.length) * Math.PI * 2;

      if (node.type === 'location') {
        radius = 230;
      } else if (node.type === 'topic') {
        radius = 120;
        // spread topics evenly
        const tIdx = topics.findIndex((t) => t.id === node.id);
        angle = (tIdx / Math.max(1, topics.length)) * Math.PI * 2;
      } else {
        // keywords scatter
        radius = 70 + (idx * 15) % 45;
      }

      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;

      return {
        ...node,
        x,
        y,
      };
    });
  }, [allNodes, topics]);

  // Filter nodes matching search query
  const filteredPositions = useMemo(() => {
    if (!searchQuery.trim()) return positionedNodes;
    return positionedNodes.map((pn) => ({
      ...pn,
      isMatched: pn.label.toLowerCase().includes(searchQuery.toLowerCase()),
    }));
  }, [positionedNodes, searchQuery]);

  // Gather neighbors of selected node to dim others
  const neighborIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const set = new Set<string>();
    set.add(selectedNodeId);

    visualEdges.forEach((e) => {
      if (e.source === selectedNodeId) set.add(e.target);
      if (e.target === selectedNodeId) set.add(e.source);
    });

    return set;
  }, [selectedNodeId, visualEdges]);

  // Pan dragging helpers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.15, 2));
  const zoomOut = () => setScale((s) => Math.max(s - 0.15, 0.5));
  const resetZoom = () => {
    setScale(1);
    setPanX(0);
    setPanY(0);
    setSelectedNodeId(null);
  };

  return (
    <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 flex flex-col h-full gap-5 select-none">
      
      {/* Header Deck */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Database className="text-cyan-400 animate-pulse" size={18} />
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              GRAPH KNOWLEDGE MODEL
            </span>
          </div>
          <h3 className="text-lg font-black text-white mt-1.5">
            Interactive SEO Knowledge Graph
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Analyze multi-entity relations. Nodes of various classes connect keywords, user locations, and semantic topics in a single graph.
          </p>
        </div>

        {/* Controls, Filters, Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Node Type Checklist */}
          <div className="flex items-center gap-3.5 bg-slate-900/60 border border-slate-800 p-2 rounded-xl text-xs font-mono font-bold">
            <span className="text-slate-500 text-[10px] uppercase flex items-center gap-1">
              <Filter size={11} /> Filters:
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer text-cyan-400">
              <input
                type="checkbox"
                checked={showTopics}
                onChange={() => setShowTopics(!showTopics)}
                className="accent-cyan-500"
              />
              Topics
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-indigo-400">
              <input
                type="checkbox"
                checked={showKeywords}
                onChange={() => setShowKeywords(!showKeywords)}
                className="accent-indigo-500"
              />
              Keywords
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-emerald-400">
              <input
                type="checkbox"
                checked={showLocations}
                onChange={() => setShowLocations(!showLocations)}
                className="accent-emerald-500"
              />
              Locations
            </label>
          </div>

          {/* Node search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entities..."
              className="pl-8.5 pr-4 py-2 w-[160px] bg-slate-900/60 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl text-xs font-semibold focus:outline-none focus:border-cyan-500/60 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        
        {/* Main Canvas SVG (8 cols) */}
        <div className="xl:col-span-8 bg-slate-950 rounded-2xl border border-slate-900 relative h-[450px] overflow-hidden">
          
          {/* Pan / Zoom Control Hub floating overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-2 bg-slate-950/95 border border-slate-850 p-1.5 rounded-xl shadow-xl z-20">
            <button
              onClick={zoomIn}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-all"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={zoomOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-all"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <button
              onClick={resetZoom}
              className="text-[9.5px] font-mono font-bold text-slate-400 hover:text-white px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg transition-all"
            >
              RESET VIEW
            </button>
          </div>

          {/* Interactive Drag & Zoom Stage */}
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`w-full h-full relative cursor-grab active:cursor-grabbing ${
              isDragging ? 'cursor-grabbing' : ''
            }`}
          >
            <svg className="w-full h-full pointer-events-none">
              <g transform={`translate(${panX}, ${panY}) scale(${scale})`}>
                
                {/* 1. Draw Connecting Edges */}
                {visualEdges.map((edge, idx) => {
                  const sourceNode = filteredPositions.find((n) => n.id === edge.source);
                  const targetNode = filteredPositions.find((n) => n.id === edge.target);

                  if (!sourceNode || !targetNode) return null;

                  // Dim edge if high-fidelity selection is active and neither nodes are selected/neighbors
                  const isDimmed =
                    neighborIds &&
                    (!neighborIds.has(edge.source) || !neighborIds.has(edge.target));

                  const isHighlighted =
                    selectedNodeId &&
                    (edge.source === selectedNodeId || edge.target === selectedNodeId);

                  return (
                    <line
                      key={`edge-${idx}`}
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={isHighlighted ? '#22d3ee' : '#334155'}
                      strokeWidth={isHighlighted ? 2.2 : 1.0}
                      strokeDasharray={edge.type === 'belongs_to' ? 'none' : '4 4'}
                      opacity={isDimmed ? 0.08 : isHighlighted ? 0.95 : 0.4}
                      className="transition-all duration-300"
                    />
                  );
                })}

                {/* 2. Draw Interactive Nodes */}
                {filteredPositions.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const isDimmed = neighborIds && !neighborIds.has(node.id);
                  const isSearchMatch = searchQuery && node.label.toLowerCase().includes(searchQuery.toLowerCase());

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(isSelected ? null : node.id);
                      }}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      {/* Search highlight ring */}
                      {isSearchMatch && (
                        <circle r={25} fill="none" stroke="#22d3ee" strokeWidth={1.5} className="animate-ping" />
                      )}

                      {/* Hover / Selected outline glow */}
                      {(isSelected || hoveredNode?.id === node.id) && (
                        <circle r={18} fill={node.color} opacity={0.15} className="animate-pulse" />
                      )}

                      {/* Main Node Icon Shape */}
                      {node.type === 'location' ? (
                        // Location = Diamond / Square
                        <rect
                          x={-9}
                          y={-9}
                          width={18}
                          height={18}
                          rx={3}
                          fill="#064e3b"
                          stroke={node.color}
                          strokeWidth={isSelected ? 3 : 1.8}
                          opacity={isDimmed ? 0.3 : 1.0}
                          className="transition-all duration-300"
                        />
                      ) : node.type === 'topic' ? (
                        // Topic = Hexagon / Circle
                        <circle
                          r={11}
                          fill="#164e63"
                          stroke={node.color}
                          strokeWidth={isSelected ? 3.5 : 2}
                          opacity={isDimmed ? 0.3 : 1.0}
                          className="transition-all duration-300"
                        />
                      ) : (
                        // Keyword = Small circle
                        <circle
                          r={8}
                          fill="#1e1b4b"
                          stroke={node.color}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          opacity={isDimmed ? 0.3 : 1.0}
                          className="transition-all duration-300"
                        />
                      )}

                      {/* Mini dot inside node */}
                      <circle r={3} fill={node.color} opacity={isDimmed ? 0.3 : 1.0} />

                      {/* Node Label Text */}
                      <text
                        y={node.type === 'keyword' ? 18 : 22}
                        textAnchor="middle"
                        fill={isSelected ? '#ffffff' : '#94a3b8'}
                        fontSize={isSelected ? 10 : 8.5}
                        fontWeight={isSelected ? 'black' : 'semibold'}
                        fontFamily="Inter, system-ui"
                        opacity={isDimmed ? 0.25 : 1.0}
                        className="transition-all duration-200 select-none pointer-events-none"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}

              </g>
            </svg>

            {/* Quick Helper guidelines floating overlay */}
            <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-800 p-2 rounded-xl text-[8.5px] font-mono text-slate-500">
              Drag to PAN stage • Click nodes to highlight parent-child relationships.
            </div>
          </div>
        </div>

        {/* Selected Entity Metrics Panel (4 cols) */}
        <div className="xl:col-span-4 flex flex-col justify-between bg-slate-900/10 border border-slate-900 p-5 rounded-2xl gap-4">
          
          <div className="space-y-4">
            <span className="text-[10px] font-mono font-bold text-slate-500 block uppercase tracking-wider">
              Entity Knowledge Profiler
            </span>

            {/* Display profile of selected node, fallback to hovered, fallback to prompt */}
            {(hoveredNode || (selectedNodeId && positionedNodes.find((n) => n.id === selectedNodeId))) ? (
              (() => {
                const node = hoveredNode || positionedNodes.find((n) => n.id === selectedNodeId)!;
                const isSelected = selectedNodeId === node.id;

                return (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase rounded-md"
                        style={{
                          backgroundColor: `${node.color}22`,
                          color: node.color,
                          border: `1px solid ${node.color}33`,
                        }}
                      >
                        {node.type.toUpperCase()}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-1.5 py-0.5 rounded-md">
                          Active Selection
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-white">{node.label}</h4>
                      <p className="text-[11px] font-mono text-slate-400 mt-1.5 leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                        {node.metric}
                      </p>
                    </div>

                    {/* Show contextual connections counts */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono text-slate-500 font-bold block">
                        CONNECTOR RELATIONSHIPS
                      </span>

                      {node.type === 'topic' && (
                        <div className="text-xs space-y-1.5">
                          <div className="flex justify-between text-slate-300">
                            <span>Semantic Category:</span>
                            <span className="font-mono text-cyan-400 font-bold">{(node.raw as TopicNode).cluster}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Target Neighbors:</span>
                            <span className="font-mono text-slate-400">{(node.raw as TopicNode).connections.length} nodes</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal mt-1 pt-1 border-t border-slate-900">
                            {(node.raw as TopicNode).description}
                          </p>
                        </div>
                      )}

                      {node.type === 'keyword' && (
                        <div className="text-xs space-y-1.5">
                          <div className="flex justify-between text-slate-300">
                            <span>Target Difficulty (KD):</span>
                            <span className="font-mono text-amber-400">{(node.raw as KeywordNode).difficulty}/100</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Search Intent Profile:</span>
                            <span className="font-mono text-indigo-400 font-bold">{(node.raw as KeywordNode).intent}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Topic Authority Index:</span>
                            <span className="font-mono text-emerald-400">{(node.raw as KeywordNode).authority}%</span>
                          </div>
                        </div>
                      )}

                      {node.type === 'location' && (
                        <div className="text-xs space-y-1.5">
                          <div className="flex justify-between text-slate-300">
                            <span>Regional Profile:</span>
                            <span className="font-mono text-emerald-400 font-bold">{(node.raw as LocationNode).type.toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Demand Weight:</span>
                            <span className="font-mono text-slate-300">{(node.raw as LocationNode).percentage}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-16 space-y-3">
                <Grid className="mx-auto text-slate-600 animate-pulse" size={24} />
                <p className="text-xs font-mono font-bold text-slate-400">
                  Select a graph element
                </p>
                <p className="text-[10px] text-slate-600 leading-normal max-w-[200px] mx-auto">
                  Click or hover any node in the left multi-entity map to reveal comprehensive relational weights.
                </p>
              </div>
            )}
          </div>

          {/* Quick interactive note */}
          <div className="bg-cyan-950/15 border border-cyan-500/20 p-3.5 rounded-2xl flex items-start gap-2.5">
            <Info size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="text-[9.5px] font-mono text-cyan-300 leading-normal">
              <strong>Quick Toggle:</strong> Uncheck filters in the header to isolate topics or regional locations for cleaner structural audits.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
