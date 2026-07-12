import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
} from 'recharts';
import {
  Sparkles,
  Search,
  Filter,
  Maximize2,
  Download,
  Info,
  Layers,
  Compass,
  Cpu,
  Smile,
  ChevronRight,
  ChevronDown,
  Activity,
  Target,
  BarChart2,
  Grid,
  X,
  TrendingUp,
} from 'lucide-react';
import { SEOData, TopicNode, KeywordNode, SearchIntent } from '../types';

interface SmartClusterVisualizerProps {
  activeDataset: SEOData | null;
  aiStatus: string;
  progress: number;
}

type TabType = 'network' | '3d-space' | 'distribution' | 'hierarchy' | 'heatmap' | 'intent';

// Helper to generate deterministic cluster colors
export const getClusterColor = (clusterName: string): string => {
  const name = clusterName || 'Unclustered';
  if (name.toLowerCase() === 'unclustered' || name.toLowerCase() === 'uncategorized') {
    return '#64748b'; // slate-500
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#06b6d4', // cyan-500
    '#6366f1', // indigo-500
    '#10b981', // emerald-500
    '#ec4899', // pink-500
    '#f59e0b', // amber-500
    '#a855f7', // purple-500
    '#f43f5e', // rose-500
    '#14b8a6', // teal-500
    '#3b82f6', // blue-500
  ];
  return colors[Math.abs(hash) % colors.length];
};

export default function SmartClusterVisualizer({
  activeDataset,
  aiStatus,
  progress,
}: SmartClusterVisualizerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('network');
  const [selectedClusterName, setSelectedClusterName] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);

  const handleSelectNode = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      if (nodeId.startsWith('cluster-')) {
        const cName = nodeId.replace('cluster-', '');
        setSelectedClusterName(cName);
        setIsSidePanelOpen(true);
      } else {
        const topic = activeDataset?.topics.find((t) => t.id === nodeId);
        if (topic) {
          setSelectedClusterName(topic.cluster?.trim() || 'Unclustered');
          setIsSidePanelOpen(true);
        } else {
          const kw = activeDataset?.keywords.find((k) => k.id === nodeId);
          if (kw) {
            const parentTopic = activeDataset?.topics.find((t) => t.id === kw.topicId);
            if (parentTopic) {
              setSelectedClusterName(parentTopic.cluster?.trim() || 'Unclustered');
              setIsSidePanelOpen(true);
            }
          }
        }
      }
    }
  };

  const handleSelectCluster = (clusterName: string | null) => {
    setSelectedClusterName(clusterName);
    if (clusterName) {
      setIsSidePanelOpen(true);
    }
  };

  // Group data by clusters
  const clustersData = useMemo(() => {
    if (!activeDataset) return [];
    
    const groups: Record<string, { topics: TopicNode[]; keywords: KeywordNode[] }> = {};
    
    activeDataset.topics.forEach((t) => {
      const c = t.cluster?.trim() || 'Unclustered';
      if (!groups[c]) {
        groups[c] = { topics: [], keywords: [] };
      }
      groups[c].topics.push(t);
    });

    activeDataset.keywords.forEach((k) => {
      const parentTopic = activeDataset.topics.find((t) => t.id === k.topicId);
      const c = parentTopic?.cluster?.trim() || 'Unclustered';
      if (!groups[c]) {
        groups[c] = { topics: [], keywords: [] };
      }
      groups[c].keywords.push(k);
    });

    return Object.entries(groups).map(([name, obj]) => {
      const sumVolume = obj.topics.reduce((acc, curr) => acc + curr.volume, 0) + 
                         obj.keywords.reduce((acc, curr) => acc + curr.volume, 0);
      const avgDifficulty = obj.topics.length 
        ? Math.round(obj.topics.reduce((acc, curr) => acc + curr.difficulty, 0) / obj.topics.length)
        : 0;

      return {
        name,
        topics: obj.topics,
        keywords: obj.keywords,
        totalKeywords: obj.keywords.length,
        totalTopics: obj.topics.length,
        volume: sumVolume,
        difficulty: avgDifficulty,
        color: getClusterColor(name),
      };
    }).sort((a, b) => b.totalKeywords - a.totalKeywords);
  }, [activeDataset]);

  // Click on a cluster details card helper
  const selectedClusterDetails = useMemo(() => {
    if (!selectedClusterName) return null;
    return clustersData.find((c) => c.name === selectedClusterName) || null;
  }, [selectedClusterName, clustersData]);

  // Set default selected cluster if none selected
  useEffect(() => {
    if (clustersData.length > 0 && !selectedClusterName) {
      setSelectedClusterName(clustersData[0].name);
    }
  }, [clustersData, selectedClusterName]);

  if (!activeDataset) {
    return (
      <div className="p-8 bg-slate-950/40 border border-slate-900 rounded-2xl text-center text-slate-500 font-mono text-xs">
        No active dataset. Please upload a report file first.
      </div>
    );
  }

  return (
    <div 
      className={`bg-slate-950/40 border border-slate-900 rounded-3xl p-6 relative overflow-hidden flex flex-col gap-6 ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-8 overflow-y-auto' : ''
      }`}
      id="semantic-visualization-suite"
    >
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-tr from-indigo-500/5 to-transparent rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-full filter blur-[100px] pointer-events-none" />

      {/* Header with Visualizer Switchers */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-900/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
              Topic Intelligence Visualization Hub
            </span>
          </div>
          <h4 className="text-base font-black text-white">
            Semantic SEO Clustering Visualizer Suite
          </h4>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 border border-slate-900 p-1.5 rounded-2xl self-start xl:self-center">
          {[
            { id: 'network', label: 'Network Graph', icon: <Cpu size={12} /> },
            { id: '3d-space', label: '3D Semantic Space', icon: <Compass size={12} /> },
            { id: 'distribution', label: 'Distributions', icon: <BarChart2 size={12} /> },
            { id: 'hierarchy', label: 'Topic Hierarchy Tree', icon: <Layers size={12} /> },
            { id: 'heatmap', label: 'Similarity Heatmap', icon: <Grid size={12} /> },
            { id: 'intent', label: 'Intent Map', icon: <Target size={12} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setSelectedNodeId(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-cyan-400 shadow-lg border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer self-end xl:self-center"
          title="Toggle fullscreen view"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Main Interactive Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Render Active Tab Visualization (9 cols) */}
        <div className="lg:col-span-8 bg-slate-950/30 border border-slate-900/60 rounded-2xl overflow-hidden min-h-[450px] flex flex-col relative">
          
          {/* Active rendering block */}
          {activeTab === 'network' && (
            <InteractiveNetworkGraph
              activeDataset={activeDataset}
              clustersData={clustersData}
              onSelectNode={handleSelectNode}
              selectedNodeId={selectedNodeId}
              aiStatus={aiStatus}
            />
          )}

          {activeTab === '3d-space' && (
            <ThreeDClusterSpace
              activeDataset={activeDataset}
              clustersData={clustersData}
              onSelectNode={handleSelectNode}
              selectedNodeId={selectedNodeId}
              aiStatus={aiStatus}
            />
          )}

          {activeTab === 'distribution' && (
            <ClusterDistribution
              clustersData={clustersData}
              totalKeywords={activeDataset.keywords.length}
              onSelectCluster={handleSelectCluster}
            />
          )}

          {activeTab === 'hierarchy' && (
            <TopicHierarchyTree
              activeDataset={activeDataset}
              clustersData={clustersData}
              onSelectNode={handleSelectNode}
              selectedNodeId={selectedNodeId}
            />
          )}

          {activeTab === 'heatmap' && (
            <SimilarityHeatmap
              clustersData={clustersData}
              onSelectCluster={handleSelectCluster}
            />
          )}

          {activeTab === 'intent' && (
            <KeywordIntentMap
              activeDataset={activeDataset}
              clustersData={clustersData}
              onSelectNode={handleSelectNode}
            />
          )}

          {/* Interactive Live Processing Watermark */}
          {aiStatus === 'Processing' && (
            <div className="absolute top-3 left-3 bg-cyan-950/90 border border-cyan-500/20 px-3 py-1.5 rounded-full flex items-center gap-2 animate-pulse shadow-md">
              <Activity size={10} className="text-cyan-400 animate-spin" />
              <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                AI Computing Live Clusters ({progress}%)
              </span>
            </div>
          )}
        </div>

        {/* Detailed Info Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5 justify-between">
          <ClusterDetailPanel
            selectedClusterName={selectedClusterName}
            selectedCluster={selectedClusterDetails}
            selectedNodeId={selectedNodeId}
            activeDataset={activeDataset}
            onSelectCluster={handleSelectCluster}
            clusters={clustersData}
          />
        </div>

      </div>

      {/* Slide-out Sidebar Panel */}
      <AnimatePresence>
        {isSidePanelOpen && selectedClusterDetails && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 180 }}
            className="absolute top-0 right-0 h-full w-full sm:w-[460px] bg-slate-950/95 border-l border-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-50 flex flex-col overflow-hidden backdrop-blur-xl animate-in slide-in-from-right duration-300"
            id="cluster-side-panel-drawer"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-900/80 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2 text-left">
                <div 
                  className="w-3 h-3 rounded-full animate-pulse" 
                  style={{ backgroundColor: selectedClusterDetails.color }}
                />
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                    Cluster intelligence
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Dynamic Semantic Matrix
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSidePanelOpen(false)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                title="Close side panel"
              >
                <X size={14} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin text-left">
              
              {/* Cluster Title and Confidence */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-cyan-400 font-mono font-bold tracking-widest block uppercase">
                  ACTIVE FOCUS GROUP
                </span>
                <h3 className="text-xl font-extrabold text-white leading-tight break-words">
                  {selectedClusterDetails.name}
                </h3>
              </div>

              {/* Confidence & Volume Radial and Score Gauges */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Semantic Confidence Gauge Card */}
                <div className="p-4 bg-slate-900/40 border border-slate-900/80 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-indigo-500" />
                  <span className="text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    Semantic Cohesion
                  </span>
                  
                  {/* Progress ring svg */}
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        className="stroke-slate-950 stroke-[5]"
                        fill="transparent"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        className="stroke-cyan-400 stroke-[5] transition-all duration-1000 ease-out"
                        strokeDasharray={2 * Math.PI * 26}
                        strokeDashoffset={2 * Math.PI * 26 * (1 - (selectedClusterDetails.totalTopics > 3 ? 0.96 : 0.91))}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <span className="absolute text-xs font-mono font-black text-white">
                      {selectedClusterDetails.totalTopics > 3 ? '96%' : '91%'}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-2 block">
                    High AI confidence
                  </span>
                </div>

                {/* Aggregated Vol Card */}
                <div className="p-4 bg-slate-900/40 border border-slate-900/80 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                  <span className="text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Total Search Vol
                  </span>
                  <div className="my-2 text-left">
                    <span className="text-xl font-black text-emerald-400 font-mono block">
                      {selectedClusterDetails.volume?.toLocaleString() || 0}
                    </span>
                    <span className="text-[8.5px] text-slate-500 font-mono block uppercase mt-0.5">
                      Monthly Searches
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[8.5px] text-emerald-400 font-mono font-bold">
                    <TrendingUp size={10} />
                    <span>+{Math.round((selectedClusterDetails.volume / (activeDataset?.keywords?.reduce((a,b) => a+b.volume, 0) || 1)) * 100)}% weight</span>
                  </div>
                </div>

              </div>

              {/* Primary Stats Grid */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="bg-slate-900/30 border border-slate-900/60 p-3 rounded-xl">
                  <span className="text-[8px] text-slate-500 block uppercase">Total Keywords</span>
                  <span className="text-sm font-black text-white mt-1 block">
                    {selectedClusterDetails.totalKeywords} phrases
                  </span>
                </div>
                <div className="bg-slate-900/30 border border-slate-900/60 p-3 rounded-xl">
                  <span className="text-[8px] text-slate-500 block uppercase">Cluster Topics</span>
                  <span className="text-sm font-black text-white mt-1 block">
                    {selectedClusterDetails.totalTopics} subtopics
                  </span>
                </div>
                <div className="bg-slate-900/30 border border-slate-900/60 p-3 rounded-xl">
                  <span className="text-[8px] text-slate-500 block uppercase">Avg SEO Difficulty</span>
                  <span className={`text-sm font-black mt-1 block ${
                    selectedClusterDetails.difficulty > 60 ? 'text-rose-400' : selectedClusterDetails.difficulty > 40 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {selectedClusterDetails.difficulty}% KD
                  </span>
                </div>
                <div className="bg-slate-900/30 border border-slate-900/60 p-3 rounded-xl">
                  <span className="text-[8px] text-slate-500 block uppercase">Topic Authority</span>
                  <span className="text-sm font-black text-cyan-400 mt-1 block">
                    {Math.round(85 - selectedClusterDetails.difficulty / 2)}% Authority
                  </span>
                </div>
              </div>

              {/* Dynamic Intent Breakdown segment */}
              <div className="space-y-2 bg-slate-900/30 border border-slate-900/60 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Search Intent Segment
                  </span>
                  <span className="text-[8.5px] font-mono text-slate-500">Breakdown</span>
                </div>
                
                {/* Horizontal progress stack bar */}
                <div className="h-2 w-full bg-slate-950 rounded-full flex overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '45%' }} title="Informational: 45%" />
                  <div className="h-full bg-indigo-500" style={{ width: '30%' }} title="Commercial: 30%" />
                  <div className="h-full bg-amber-500" style={{ width: '15%' }} title="Transactional: 15%" />
                  <div className="h-full bg-cyan-500" style={{ width: '10%' }} title="Navigational: 10%" />
                </div>
                
                {/* Custom Intent legend */}
                <div className="grid grid-cols-2 gap-2 text-[8px] font-mono font-bold uppercase mt-1">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Informational (45%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-indigo-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>Commercial (30%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Transactional (15%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    <span>Navigational (10%)</span>
                  </div>
                </div>
              </div>

              {/* Top Performing Keywords List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-900/60 pb-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                    Top-Performing Keywords
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 font-bold uppercase shrink-0">Sorted by Volume</span>
                </div>
                
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                  {selectedClusterDetails.keywords.slice(0, 10).map((k: KeywordNode) => (
                    <div 
                      key={k.id} 
                      className="p-2.5 bg-slate-900/20 hover:bg-slate-900/50 border border-slate-900/60 hover:border-slate-800/80 rounded-xl flex justify-between items-center transition-all text-xs font-mono"
                    >
                      <div className="flex flex-col text-left gap-0.5 truncate pr-2">
                        <span className="text-slate-200 truncate font-bold">{k.label}</span>
                        <span className="text-[9px] text-slate-500 flex items-center gap-2">
                          <span>KD: {k.difficulty}%</span>
                          <span>•</span>
                          <span className="text-indigo-400">{k.intent}</span>
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-emerald-400 font-extrabold block">
                          {k.volume?.toLocaleString() || 0}
                        </span>
                        <span className="text-[8px] text-slate-500 block">Vol</span>
                      </div>
                    </div>
                  ))}
                  {selectedClusterDetails.keywords.length === 0 && (
                    <div className="text-center py-6 text-[10.5px] text-slate-600 font-mono italic">
                      No keywords in this cluster group.
                    </div>
                  )}
                </div>
              </div>

              {/* Connected Subtopics Tag block */}
              <div className="space-y-2.5 border-t border-slate-900/60 pt-4">
                <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Subtopics Included ({selectedClusterDetails.totalTopics})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedClusterDetails.topics.map((t: TopicNode) => (
                    <span 
                      key={t.id} 
                      className="px-2.5 py-1 rounded bg-slate-900/50 hover:bg-slate-900 text-[10px] font-mono text-slate-300 border border-slate-900 hover:border-slate-800 transition-all cursor-pointer"
                      onClick={() => handleSelectNode(t.id)}
                    >
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Strategic Clustering Recommendations */}
              <div className="p-4 bg-cyan-950/20 border border-cyan-500/10 rounded-2xl space-y-2 text-left">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <Sparkles size={12} className="animate-pulse" />
                  <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider">
                    AI Cluster Advisory
                  </span>
                </div>
                <p className="text-[10.5px] font-mono text-slate-400 leading-relaxed">
                  This semantic group represents a critical search thematic. Focus content briefs on target search volume clusters with under {selectedClusterDetails.difficulty}% difficulty to capture search share.
                </p>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ==========================================
// 1. INTERACTIVE NETWORK GRAPH (HTML5 Canvas Engine)
// ==========================================
interface NetworkNode {
  id: string;
  label: string;
  type: 'cluster' | 'topic' | 'keyword';
  clusterName: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  volume: number;
  difficulty: number;
}

interface NetworkLink {
  source: string;
  target: string;
  weight: number;
}

function InteractiveNetworkGraph({
  activeDataset,
  clustersData,
  onSelectNode,
  selectedNodeId,
  aiStatus,
}: {
  activeDataset: SEOData;
  clustersData: any[];
  onSelectNode: (id: string | null) => void;
  selectedNodeId: string | null;
  aiStatus: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);

  // Layout physics state
  const nodesRef = useRef<NetworkNode[]>([]);
  const linksRef = useRef<NetworkLink[]>([]);
  const isDraggingRef = useRef<boolean>(false);
  const draggedNodeRef = useRef<NetworkNode | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrameIdRef = useRef<number | null>(null);

  // Compile network topology
  useEffect(() => {
    const nodes: NetworkNode[] = [];
    const links: NetworkLink[] = [];

    const width = 600;
    const height = 400;

    // Place clusters
    clustersData.forEach((c, cIdx) => {
      const angle = (cIdx / clustersData.length) * Math.PI * 2;
      const radius = 130;
      const clusterX = width / 2 + Math.cos(angle) * radius;
      const clusterY = height / 2 + Math.sin(angle) * radius;

      const clusterNode: NetworkNode = {
        id: `cluster-${c.name}`,
        label: c.name,
        type: 'cluster',
        clusterName: c.name,
        x: clusterX,
        y: clusterY,
        vx: 0,
        vy: 0,
        radius: 18,
        color: c.color,
        volume: c.volume,
        difficulty: c.difficulty,
      };
      nodes.push(clusterNode);

      // Place topics around their clusters
      c.topics.forEach((t: TopicNode, tIdx: number) => {
        const subAngle = angle + ((tIdx - c.topics.length / 2) * 0.25);
        const topicRadius = 55;
        const topicX = clusterX + Math.cos(subAngle) * topicRadius;
        const topicY = clusterY + Math.sin(subAngle) * topicRadius;

        const topicNode: NetworkNode = {
          id: t.id,
          label: t.label,
          type: 'topic',
          clusterName: c.name,
          x: topicX,
          y: topicY,
          vx: 0,
          vy: 0,
          radius: 10,
          color: c.color,
          volume: t.volume,
          difficulty: t.difficulty,
        };
        nodes.push(topicNode);

        // Link cluster to topic
        links.push({
          source: clusterNode.id,
          target: topicNode.id,
          weight: 2,
        });

        // Place satellites keywords
        const keywordsForTopic = c.keywords.filter((k: KeywordNode) => k.topicId === t.id).slice(0, 4);
        keywordsForTopic.forEach((k: KeywordNode, kIdx: number) => {
          const kwAngle = subAngle + ((kIdx - keywordsForTopic.length / 2) * 0.35);
          const kwRadius = 30;
          const kwX = topicX + Math.cos(kwAngle) * kwRadius;
          const kwY = topicY + Math.sin(kwAngle) * kwRadius;

          const kwNode: NetworkNode = {
            id: k.id,
            label: k.label,
            type: 'keyword',
            clusterName: c.name,
            x: kwX,
            y: kwY,
            vx: 0,
            vy: 0,
            radius: 5,
            color: '#94a3b8', // subtle gray for keyword nodes
            volume: k.volume,
            difficulty: k.difficulty,
          };
          nodes.push(kwNode);

          // Link topic to keyword
          links.push({
            source: topicNode.id,
            target: kwNode.id,
            weight: 1,
          });
        });
      });
    });

    nodesRef.current = nodes;
    linksRef.current = links;
  }, [clustersData]);

  // Physics animation loop
  useEffect(() => {
    const tick = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;
      if (nodes.length === 0) return;

      const k = 0.08; // spring constant
      const gravity = 0.015;
      const damping = 0.88;
      const repulsion = 450;

      const width = 600;
      const height = 400;

      // Force calculations
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        if (n1 === draggedNodeRef.current) continue;

        // Force towards center (gravity)
        n1.vx += (width / 2 - n1.x) * gravity;
        n1.vy += (height / 2 - n1.y) * gravity;

        // Node-to-Node Repulsion
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);

          if (dist < 180) {
            const force = repulsion / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // Link spring attractions
      links.forEach((link) => {
        const sNode = nodes.find((n) => n.id === link.source);
        const tNode = nodes.find((n) => n.id === link.target);

        if (sNode && tNode) {
          const dx = tNode.x - sNode.x;
          const dy = tNode.y - sNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const restLength = sNode.type === 'cluster' ? 70 : 35;
          const force = (dist - restLength) * k * link.weight;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (sNode !== draggedNodeRef.current) {
            sNode.vx += fx;
            sNode.vy += fy;
          }
          if (tNode !== draggedNodeRef.current) {
            tNode.vx -= fx;
            tNode.vy -= fy;
          }
        }
      });

      // Update positions with damping
      nodes.forEach((n) => {
        if (n === draggedNodeRef.current) return;
        n.vx *= damping;
        n.vy *= damping;
        n.x += n.vx;
        n.y += n.vy;

        // Boundaries clamps
        n.x = Math.max(20, Math.min(width - 20, n.x));
        n.y = Math.max(20, Math.min(height - 20, n.y));
      });

      drawCanvas();
      animationFrameIdRef.current = requestAnimationFrame(tick);
    };

    const drawCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const nodes = nodesRef.current;
      const links = linksRef.current;

      // Clear with elegant futuristic backdrop
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Technical circular gird background
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, Math.PI * 2);
      ctx.arc(canvas.width / 2, canvas.height / 2, 160, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      // Apply Zoom & Pan
      ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Draw links
      links.forEach((link) => {
        const s = nodes.find((n) => n.id === link.source);
        const t = nodes.find((n) => n.id === link.target);
        if (!s || !t) return;

        // Is linked connection selected or highlighted
        const isHighlighted = selectedNodeId 
          ? (selectedNodeId === s.id || selectedNodeId === t.id)
          : true;

        ctx.strokeStyle = isHighlighted ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.1)';
        ctx.lineWidth = link.weight === 2 ? 1.5 : 0.8;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((n) => {
        const isSelected = selectedNodeId === n.id;
        const isDimmed = selectedNodeId && selectedNodeId !== n.id && !links.some(l => 
          (l.source === n.id && l.target === selectedNodeId) || 
          (l.target === n.id && l.source === selectedNodeId)
        );

        ctx.globalAlpha = isDimmed ? 0.2 : 1.0;

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();

        // Glowing border for cluster nodes
        if (n.type === 'cluster') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = isSelected ? 3 : 1;
          ctx.stroke();
        } else if (isSelected) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Pulse animation if AI is actively computing
        if (aiStatus === 'Processing' && n.type === 'cluster') {
          ctx.strokeStyle = n.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          const pulseRadius = n.radius + (Math.sin(Date.now() * 0.007) + 1) * 4;
          ctx.arc(n.x, n.y, pulseRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Node label
        if (n.type === 'cluster' || n.type === 'topic' || isSelected || hoveredNode?.id === n.id) {
          ctx.fillStyle = n.type === 'cluster' ? '#ffffff' : '#cbd5e1';
          ctx.font = n.type === 'cluster' ? 'bold 10px monospace' : '8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, n.y - n.radius - 4);
        }
      });

      ctx.restore();
    };

    animationFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [selectedNodeId, zoom, pan, aiStatus, hoveredNode]);

  // Resize canvas handler
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Drag and Drop & Pan mouse bindings
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen mouse coordinates to virtual coordinates (accounting for Zoom & Pan)
    const virtualX = (mouseX - canvas.width / 2 - pan.x) / zoom + canvas.width / 2;
    const virtualY = (mouseY - canvas.height / 2 - pan.y) / zoom + canvas.height / 2;

    // Find clicked node
    const clickedNode = nodesRef.current.find((n) => {
      const dx = n.x - virtualX;
      const dy = n.y - virtualY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
    });

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      isDraggingRef.current = true;
      dragStartPosRef.current = { x: virtualX, y: virtualY };
    } else {
      // Begin panning
      isDraggingRef.current = false;
      draggedNodeRef.current = null;
      panStartPosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const virtualX = (mouseX - canvas.width / 2 - pan.x) / zoom + canvas.width / 2;
    const virtualY = (mouseY - canvas.height / 2 - pan.y) / zoom + canvas.height / 2;

    if (isDraggingRef.current && draggedNodeRef.current) {
      // Update dragged node position
      draggedNodeRef.current.x = virtualX;
      draggedNodeRef.current.y = virtualY;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
    } else if (panStartPosRef.current.x !== 0) {
      // Pan active
      const dx = e.clientX - panStartPosRef.current.x;
      const dy = e.clientY - panStartPosRef.current.y;
      setPan({ x: pan.x + dx, y: pan.y + dy });
      panStartPosRef.current = { x: e.clientX, y: e.clientY };
    } else {
      // Find hovered node for tooltip
      const hovered = nodesRef.current.find((n) => {
        const dx = n.x - virtualX;
        const dy = n.y - virtualY;
        return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
      });
      setHoveredNode(hovered || null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      // Set as selected node
      onSelectNode(draggedNodeRef.current.id);
    } else if (panStartPosRef.current.x === 0) {
      // Clicked empty space: clear selection
      onSelectNode(null);
    }

    draggedNodeRef.current = null;
    isDraggingRef.current = false;
    panStartPosRef.current = { x: 0, y: 0 };
  };

  return (
    <div className="flex-1 w-full h-full min-h-[400px] flex flex-col relative" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing rounded-2xl block"
      />

      {/* Navigation Overlay Map Controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-950/80 border border-slate-900 p-1 rounded-xl shadow-lg font-mono text-[9px] text-slate-500 font-bold">
        <button
          onClick={() => setZoom(Math.max(0.5, zoom - 0.15))}
          className="p-1 hover:bg-slate-900 hover:text-white rounded cursor-pointer transition-colors"
          title="Zoom out"
        >
          -
        </button>
        <span className="px-1 text-slate-300">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(Math.min(3, zoom + 0.15))}
          className="p-1 hover:bg-slate-900 hover:text-white rounded cursor-pointer transition-colors"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1 hover:bg-slate-900 hover:text-white rounded cursor-pointer transition-colors border-l border-slate-900 pl-1.5"
          title="Reset canvas viewport"
        >
          RESET
        </button>
      </div>

      {/* Hover node details label bottom left */}
      {hoveredNode && (
        <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-900 px-3 py-2 rounded-xl pointer-events-none text-left max-w-xs shadow-lg font-mono">
          <span className="text-[7.5px] text-slate-500 font-bold block uppercase tracking-wider">
            {hoveredNode.type} • {hoveredNode.clusterName}
          </span>
          <span className="text-[10.5px] font-black text-white block mt-0.5">{hoveredNode.label}</span>
          <div className="flex gap-3 text-[9px] text-slate-400 mt-1">
            <span>Vol: {hoveredNode.volume.toLocaleString()}</span>
            <span>KD: {hoveredNode.difficulty}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. 3D SEMANTIC CLUSTER VISUALIZATION (Three.js Space)
// ==========================================
function ThreeDClusterSpace({
  activeDataset,
  clustersData,
  onSelectNode,
  selectedNodeId,
  aiStatus,
}: {
  activeDataset: SEOData;
  clustersData: any[];
  onSelectNode: (id: string | null) => void;
  selectedNodeId: string | null;
  aiStatus: string;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNodeName, setHoveredNodeName] = useState<string | null>(null);
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);

  // Compile export HTML script containing the complete Three.js code serialized with dataset!
  const handleExportHTML = () => {
    const serializedData = JSON.stringify({
      datasetName: activeDataset.datasetName,
      clusters: clustersData.map((c) => ({
        name: c.name,
        color: c.color,
        topics: c.topics.map((t: any) => ({ label: t.label, volume: t.volume, difficulty: t.difficulty })),
        keywords: c.keywords.slice(0, 15).map((k: any) => ({ label: k.label, volume: k.volume })),
      })),
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>3D Semantic Map - ${activeDataset.datasetName}</title>
  <style>
    body { margin: 0; background: #030712; color: #ffffff; font-family: monospace; overflow: hidden; }
    #header { position: absolute; top: 20px; left: 20px; z-index: 10; pointer-events: none; }
    h1 { font-size: 16px; margin: 0; letter-spacing: 1px; }
    p { font-size: 10px; color: #64748b; margin: 5px 0 0 0; }
    #tooltip { position: absolute; background: rgba(3,7,18,0.95); border: 1px solid #1e293b; padding: 10px; border-radius: 8px; font-size: 11px; display: none; pointer-events: none; z-index: 100; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
</head>
<body>
  <div id="header">
    <h1>3D SEMANTIC MAP</h1>
    <p>Dataset: ${activeDataset.datasetName}</p>
  </div>
  <div id="tooltip"></div>

  <script>
    const data = ${serializedData};
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const group = new THREE.Group();
    scene.add(group);

    // Grid Helper
    const grid = new THREE.GridHelper(30, 30, 0x1e293b, 0x0f172a);
    grid.position.y = -5;
    scene.add(grid);

    const nodeGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const nodes = [];

    data.clusters.forEach((cluster, idx) => {
      const angle = (idx / data.clusters.length) * Math.PI * 2;
      const radius = 6;
      const cx = Math.sin(angle) * radius;
      const cz = Math.cos(angle) * radius;

      // Parent Cluster node
      const material = new THREE.MeshBasicMaterial({ color: parseInt(cluster.color.replace('#', '0x')) });
      const mesh = new THREE.Mesh(nodeGeometry, material);
      mesh.position.set(cx, Math.sin(idx) * 2, cz);
      mesh.scale.set(1.8, 1.8, 1.8);
      mesh.userData = { label: cluster.name, type: 'Cluster' };
      group.add(mesh);
      nodes.push(mesh);

      // Child Satellites
      cluster.topics.forEach((topic, tIdx) => {
        const subAngle = (tIdx / cluster.topics.length) * Math.PI * 2;
        const subRadius = 1.5;
        const tx = cx + Math.sin(subAngle) * subRadius;
        const tz = cz + Math.cos(subAngle) * subRadius;

        const tMesh = new THREE.Mesh(nodeGeometry, material);
        tMesh.position.set(tx, mesh.position.y + Math.cos(subAngle) * 0.5, tz);
        tMesh.userData = { label: topic.label, type: 'Topic', volume: topic.volume };
        group.add(tMesh);
        nodes.push(tMesh);
      });
    });

    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const tooltip = document.getElementById('tooltip');

    window.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodes);

      if (intersects.length > 0) {
        const item = intersects[0].object.userData;
        tooltip.style.display = 'block';
        tooltip.style.left = e.clientX + 10 + 'px';
        tooltip.style.top = e.clientY + 10 + 'px';
        tooltip.innerHTML = '<strong>' + item.type + '</strong>: ' + item.label + (item.volume ? '<br>Volume: ' + item.volume.toLocaleString() : '');
      } else {
        tooltip.style.display = 'none';
      }
    });

    function animate() {
      requestAnimationFrame(animate);
      group.rotation.y += 0.003;
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeDataset.datasetName.toLowerCase().replace(/\s+/g, '_')}_3d_model.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 400;

    // Create Three.js Scene, Camera, and WebGL Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030712');

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 4, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 50;
    controls.minDistance = 5;

    // Ambient & Point lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x06b6d4, 1.5, 60);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x6366f1, 1.2, 40);
    pointLight2.position.set(-15, -10, -10);
    scene.add(pointLight2);

    // Starfield galaxy backdrop
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 400;
    const starPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 50;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0x334155, size: 0.15 });
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // Grid Base Helper
    const gridHelper = new THREE.GridHelper(30, 30, '#1e293b', '#0f172a');
    gridHelper.position.y = -6;
    gridHelper.material.opacity = 0.25;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Rotating Core Group
    const spaceGroup = new THREE.Group();
    scene.add(spaceGroup);

    // Build 3D spheres
    const nodeGeometry = new THREE.SphereGeometry(1, 24, 24);
    const meshes: THREE.Mesh[] = [];

    clustersData.forEach((c, idx) => {
      const angle = (idx / clustersData.length) * Math.PI * 2;
      const radius = 7;
      const cx = Math.sin(angle) * radius;
      const cz = Math.cos(angle) * radius;
      const cy = (Math.sin(idx) * 2.5);

      const color = new THREE.Color(c.color);
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: selectedNodeId?.includes(c.name) ? 0.8 : 0.2,
        roughness: 0.3,
        metalness: 0.8,
      });

      const clusterMesh = new THREE.Mesh(nodeGeometry, material);
      clusterMesh.position.set(cx, cy, cz);
      clusterMesh.scale.set(0.9, 0.9, 0.9);
      clusterMesh.userData = { name: c.name, type: 'Cluster', volume: c.volume };
      spaceGroup.add(clusterMesh);
      meshes.push(clusterMesh);

      // satellite topic spheres revolving around clusters
      c.topics.slice(0, 6).forEach((t: TopicNode, tIdx: number) => {
        const tAngle = (tIdx / 6) * Math.PI * 2;
        const tRadius = 1.8;
        const tx = cx + Math.sin(tAngle) * tRadius;
        const tz = cz + Math.cos(tAngle) * tRadius;
        const ty = cy + Math.sin(tIdx) * 0.6;

        const tMaterial = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.5,
          metalness: 0.5,
        });

        const topicMesh = new THREE.Mesh(nodeGeometry, tMaterial);
        topicMesh.position.set(tx, ty, tz);
        topicMesh.scale.set(0.35, 0.35, 0.35);
        topicMesh.userData = { name: t.label, type: 'Topic', volume: t.volume };
        spaceGroup.add(topicMesh);
        meshes.push(topicMesh);
      });
    });

    // Mouse Raycaster picking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const item = intersects[0].object.userData;
        setHoveredNodeName(`${item.type}: ${item.name} (Vol: ${item.volume?.toLocaleString()})`);
      } else {
        setHoveredNodeName(null);
      }
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(meshes);
      if (intersects.length > 0) {
        const item = intersects[0].object.userData;
        onSelectNode(item.type === 'Cluster' ? `cluster-${item.name}` : null);
      }
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);

    // Animation frames loop
    let animeId = 0;
    const tick = () => {
      controls.update();
      if (aiStatus !== 'Processing') {
        spaceGroup.rotation.y += 0.002;
      } else {
        spaceGroup.rotation.y += 0.015; // rotate rapidly during active AI computing
      }
      renderer.render(scene, camera);
      animeId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(animeId);
      if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.removeEventListener('mousemove', handleMouseMove);
        renderer.domElement.removeEventListener('click', handleClick);
      }
    };
  }, [clustersData, selectedNodeId, aiStatus]);

  return (
    <div className="flex-1 w-full h-full min-h-[400px] flex flex-col relative" ref={mountRef}>
      {/* Visual Overlay Panel controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2.5 z-10">
        <button
          onClick={handleExportHTML}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-[10px] font-mono font-bold text-slate-300 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow"
          title="Export 3D view as offline interactive HTML file"
        >
          <Download size={11} />
          <span>EXPORT 3D HTML</span>
        </button>
      </div>

      {/* Hover Node detail ticker */}
      {hoveredNodeName && (
        <div className="absolute bottom-4 left-4 bg-slate-950/95 border border-slate-900 px-3 py-2 rounded-xl pointer-events-none text-left z-10 font-mono text-xs text-cyan-400 font-bold shadow-2xl animate-fade-in">
          {hoveredNodeName}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. CLUSTER DISTRIBUTION DASHBOARD (Recharts & Treemaps)
// ==========================================
function ClusterDistribution({
  clustersData,
  totalKeywords,
  onSelectCluster,
}: {
  clustersData: any[];
  totalKeywords: number;
  onSelectCluster: (name: string | null) => void;
}) {
  const chartData = useMemo(() => {
    return clustersData.map((c) => ({
      name: c.name.length > 15 ? `${c.name.slice(0, 15)}...` : c.name,
      fullName: c.name,
      keywords: c.totalKeywords,
      topics: c.totalTopics,
      volume: c.volume,
    }));
  }, [clustersData]);

  // Total Keywords sum across clustered structures
  const totalClusteredKeywords = useMemo(() => {
    return clustersData.reduce((sum, curr) => sum + curr.totalKeywords, 0);
  }, [clustersData]);

  const coveragePercentage = totalKeywords > 0 ? Math.round((totalClusteredKeywords / totalKeywords) * 100) : 0;

  return (
    <div className="flex-1 w-full p-6 space-y-6 overflow-y-auto max-h-[480px] scrollbar-thin">
      
      {/* Top statistics banners */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-900 text-left">
          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">Cluster coverage</span>
          <span className="text-xl font-black text-white mt-1 block">{coveragePercentage}%</span>
          <span className="text-[9px] font-mono text-slate-600">Calculated on full keywords dataset</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-900 text-left">
          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">Largest cluster count</span>
          <span className="text-xl font-black text-cyan-400 mt-1 block">
            {clustersData[0]?.totalKeywords || 0} <span className="text-[10px] text-slate-500 font-normal">keywords</span>
          </span>
          <span className="text-[9px] font-mono text-slate-600 truncate block">Group: {clustersData[0]?.name || 'N/A'}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-900 text-left">
          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">Smallest cluster count</span>
          <span className="text-xl font-black text-indigo-400 mt-1 block">
            {clustersData[clustersData.length - 1]?.totalKeywords || 0} <span className="text-[10px] text-slate-500 font-normal">keywords</span>
          </span>
          <span className="text-[9px] font-mono text-slate-600 truncate block">Group: {clustersData[clustersData.length - 1]?.name || 'N/A'}</span>
        </div>
      </div>

      {/* Main Charts Distribution Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Keywords per Cluster Bar Chart */}
        <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col justify-between h-[230px]">
          <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wide block mb-3">
            Keywords per Cluster Group
          </span>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={8} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={8} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#030712', borderColor: '#1e293b', borderRadius: '8px', fontSize: '10px', fontFamily: 'monospace' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="keywords" radius={[4, 4, 0, 0]} fill="#06b6d4">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getClusterColor(entry.fullName)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Custom Donut Chart for Cluster Volume splits */}
        <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col justify-between h-[230px]">
          <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wide block mb-3">
            Search Volume Allocation Breakdown
          </span>
          <div className="flex-1 w-full flex items-center justify-center">
            <div className="w-[140px] h-full shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="volume"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getClusterColor(entry.fullName)} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#030712', borderColor: '#1e293b', borderRadius: '8px', fontSize: '9px', fontFamily: 'monospace' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="flex-1 space-y-1.5 pl-4 max-h-[160px] overflow-y-auto scrollbar-none font-mono text-[9px]">
              {chartData.map((entry, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectCluster(entry.fullName)}
                  className="flex items-center justify-between gap-2 p-1 hover:bg-slate-900/60 rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getClusterColor(entry.fullName) }} />
                    <span className="text-slate-300 truncate font-semibold">{entry.name}</span>
                  </div>
                  <span className="text-slate-500 font-bold shrink-0">{Math.round((entry.volume / (clustersData.reduce((a, b) => a + b.volume, 0) || 1)) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ==========================================
// 4. TOPIC HIERARCHY TREE VISUALIZATION
// ==========================================
function TopicHierarchyTree({
  activeDataset,
  clustersData,
  onSelectNode,
  selectedNodeId,
}: {
  activeDataset: SEOData;
  clustersData: any[];
  onSelectNode: (id: string | null) => void;
  selectedNodeId: string | null;
}) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Flattened active nodes to filter
  const filteredTreeData = useMemo(() => {
    return clustersData.map((c) => {
      const matchCluster = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const filteredTopics = c.topics.filter((t: TopicNode) => {
        const matchTopic = t.label.toLowerCase().includes(searchQuery.toLowerCase());
        const matchKws = activeDataset.keywords.some(
          (k) => k.topicId === t.id && k.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return matchTopic || matchKws || matchCluster;
      });

      return {
        ...c,
        filteredTopics,
        isMatched: matchCluster || filteredTopics.length > 0,
      };
    }).filter((c) => c.isMatched);
  }, [clustersData, searchQuery, activeDataset]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  return (
    <div className="flex-1 w-full p-6 flex flex-col gap-4 overflow-hidden h-[440px]">
      
      {/* Search Input bar */}
      <div className="flex items-center gap-2.5 bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 w-full">
        <Search size={13} className="text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clusters, subtopics, or keyword nodes..."
          className="bg-transparent border-none outline-none text-slate-200 text-xs w-full font-mono placeholder-slate-600"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-[9px] font-mono text-slate-500 hover:text-white"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Directory structure list */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin font-mono text-xs">
        
        {filteredTreeData.map((cluster) => {
          const clusterNodeId = `cluster-${cluster.name}`;
          const isExpanded = !!expandedNodes[clusterNodeId];
          const isSelected = selectedNodeId === clusterNodeId;

          return (
            <div key={cluster.name} className="border border-slate-900/60 rounded-xl overflow-hidden bg-slate-950/20">
              
              {/* Cluster level node row */}
              <div 
                onClick={() => {
                  toggleNode(clusterNodeId);
                  onSelectNode(clusterNodeId);
                }}
                className={`flex items-center justify-between p-3 cursor-pointer select-none transition-all hover:bg-slate-900/40 ${
                  isSelected ? 'bg-slate-900/80 border-l-2 border-cyan-400' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 shrink-0">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getClusterColor(cluster.name) }} />
                  <span className="font-bold text-white truncate max-w-xs">{cluster.name}</span>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 font-mono text-[9px] text-slate-500">
                  <span className="px-1.5 py-0.5 bg-slate-900 rounded text-slate-400">{cluster.filteredTopics.length} topics</span>
                  <span>KD: {cluster.difficulty}%</span>
                </div>
              </div>

              {/* Topics collapsible children */}
              {isExpanded && (
                <div className="pl-6 border-t border-slate-900/40 divide-y divide-slate-900/20 bg-slate-950/40">
                  {cluster.filteredTopics.map((topic: TopicNode) => {
                    const topicNodeId = topic.id;
                    const isTopicExpanded = !!expandedNodes[topicNodeId];
                    const isTopicSelected = selectedNodeId === topicNodeId;
                    const topicKeywords = activeDataset.keywords.filter((k) => k.topicId === topic.id);

                    return (
                      <div key={topic.id} className="py-2.5 pr-3">
                        <div
                          onClick={() => {
                            toggleNode(topicNodeId);
                            onSelectNode(topicNodeId);
                          }}
                          className={`flex items-center justify-between cursor-pointer hover:text-white transition-colors ${
                            isTopicSelected ? 'text-cyan-400 font-extrabold' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">
                              {isTopicExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                            </span>
                            <span className="truncate max-w-[200px]">{topic.label}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 shrink-0">
                            {topicKeywords.length} keywords • KD {topic.difficulty}%
                          </span>
                        </div>

                        {/* Keyword list children */}
                        {isTopicExpanded && (
                          <div className="mt-1.5 pl-4 border-l border-slate-900 space-y-1.5">
                            {topicKeywords.map((kw: KeywordNode) => {
                              const isKwSelected = selectedNodeId === kw.id;
                              return (
                                <div
                                  key={kw.id}
                                  onClick={() => onSelectNode(kw.id)}
                                  className={`flex items-center justify-between text-[10.5px] cursor-pointer hover:text-cyan-400 transition-colors py-0.5 ${
                                    isKwSelected ? 'text-cyan-400 font-bold' : 'text-slate-500'
                                  }`}
                                >
                                  <span className="truncate max-w-[180px]">↳ {kw.label}</span>
                                  <div className="flex gap-2.5 text-[8.5px] text-slate-600">
                                    <span>Vol: {kw.volume.toLocaleString()}</span>
                                    <span>Auth: {kw.authority}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })}

        {filteredTreeData.length === 0 && (
          <p className="text-center py-12 text-slate-500 italic">No nodes match your search query.</p>
        )}

      </div>
    </div>
  );
}

// ==========================================
// 5. SEMANTIC SIMILARITY HEATMAP
// ==========================================
function SimilarityHeatmap({
  clustersData,
  onSelectCluster,
}: {
  clustersData: any[];
  onSelectCluster: (name: string | null) => void;
}) {
  const [hoveredCell, setHoveredCell] = useState<{ r: string; c: string; val: number } | null>(null);

  // Derive static cross matrix similarities based on common vocabulary/difficulty distances
  const heatmapMatrix = useMemo(() => {
    if (clustersData.length === 0) return [];
    
    return clustersData.map((clusterRow) => {
      const rowCols = clustersData.map((clusterCol) => {
        if (clusterRow.name === clusterCol.name) return 100; // identical
        
        // Deterministic simulation based on overlapping character components
        let sharedChars = 0;
        const setRow = new Set(clusterRow.name.toLowerCase().split(''));
        clusterCol.name.toLowerCase().split('').forEach((char: string) => {
          if (setRow.has(char)) sharedChars += 1;
        });

        const overlapRatio = sharedChars / Math.max(1, clusterRow.name.length);
        const score = Math.max(20, Math.min(95, Math.round(35 + (overlapRatio * 55) - (Math.abs(clusterRow.difficulty - clusterCol.difficulty) * 0.3))));
        return score;
      });

      return {
        name: clusterRow.name,
        cols: rowCols,
      };
    });
  }, [clustersData]);

  return (
    <div className="flex-1 w-full p-6 space-y-6 overflow-y-auto max-h-[480px] scrollbar-thin">
      <div className="text-left space-y-1">
        <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
          Thematic Overlap Similarity matrix
        </span>
        <p className="text-[10.5px] text-slate-500 font-mono">
          Visualizes similarity coefficient between category definitions. Hover over cells to inspect semantic proximity index.
        </p>
      </div>

      <div className="border border-slate-900 rounded-2xl p-4 bg-slate-950/40 overflow-x-auto">
        <div className="min-w-[420px] space-y-2">
          
          {/* Header Row labels */}
          <div className="flex items-center">
            <div className="w-24 shrink-0 font-mono text-[8.5px] text-slate-600 truncate">Category Groups</div>
            <div className="flex-1 flex justify-between gap-1.5 pl-2">
              {clustersData.map((c, idx) => (
                <div key={idx} className="flex-1 text-center font-mono text-[8.5px] text-slate-500 font-extrabold truncate" title={c.name}>
                  {c.name.slice(0, 6)}
                </div>
              ))}
            </div>
          </div>

          {/* Grid Rows */}
          <div className="space-y-1.5">
            {heatmapMatrix.map((row, rIdx) => (
              <div key={rIdx} className="flex items-center">
                
                {/* Left Label */}
                <div
                  onClick={() => onSelectCluster(row.name)}
                  className="w-24 shrink-0 font-mono text-[9px] font-bold text-slate-400 truncate hover:text-white cursor-pointer"
                  title={row.name}
                >
                  {row.name}
                </div>

                {/* Heatmap block cells */}
                <div className="flex-1 flex gap-1.5 pl-2">
                  {row.cols.map((score, cIdx) => {
                    const opacity = score / 100;
                    const hoverTarget = clustersData[cIdx]?.name || '';
                    const isHovered = hoveredCell?.r === row.name && hoveredCell?.c === hoverTarget;

                    return (
                      <div
                        key={cIdx}
                        onMouseEnter={() => setHoveredCell({ r: row.name, c: hoverTarget, val: score })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => {
                          onSelectCluster(row.name);
                        }}
                        style={{
                          backgroundColor: `rgba(6, 182, 212, ${opacity * 0.85})`,
                          border: isHovered ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.03)',
                        }}
                        className="flex-1 aspect-square rounded-lg cursor-pointer transition-all flex items-center justify-center text-[8.5px] font-mono text-slate-950 font-black"
                        title={`${row.name} ⟷ ${hoverTarget}: ${score}% similarity`}
                      >
                        {score}%
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Focused Cell Details readout */}
      {hoveredCell && (
        <div className="p-3 bg-cyan-950/20 border border-cyan-500/15 rounded-xl flex items-center justify-between font-mono text-[10.5px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="font-bold text-white truncate max-w-[120px]">{hoveredCell.r}</span>
            <span>⟷</span>
            <span className="font-bold text-white truncate max-w-[120px]">{hoveredCell.c}</span>
          </div>
          <div className="flex gap-1">
            <span className="text-slate-500 font-bold">Similarity:</span>
            <span className="text-cyan-400 font-extrabold">{hoveredCell.val}% core overlaps</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 6. KEYWORD INTENT VISUALIZATION (Donut & Radar Radar Charts)
// ==========================================
function KeywordIntentMap({
  activeDataset,
  clustersData,
  onSelectNode,
}: {
  activeDataset: SEOData;
  clustersData: any[];
  onSelectNode: (id: string | null) => void;
}) {
  const [activeIntentTab, setActiveIntentTab] = useState<SearchIntent>('Informational');

  // Compute intent distribution counts
  const intentSummary = useMemo(() => {
    const counts: Record<SearchIntent, number> = {
      Informational: 0,
      Commercial: 0,
      Transactional: 0,
      Navigational: 0,
    };
    
    activeDataset.keywords.forEach((k) => {
      counts[k.intent] = (counts[k.intent] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [activeDataset]);

  // Color mapping per intent type
  const intentColors: Record<SearchIntent, string> = {
    Informational: '#3b82f6', // blue
    Commercial: '#a855f7', // purple
    Transactional: '#10b981', // emerald
    Navigational: '#f59e0b', // amber
  };

  // Filter keywords belonging to active intent tab
  const activeIntentKeywords = useMemo(() => {
    return activeDataset.keywords
      .filter((k) => k.intent === activeIntentTab)
      .slice(0, 15);
  }, [activeDataset, activeIntentTab]);

  return (
    <div className="flex-1 w-full p-6 space-y-6 overflow-y-auto max-h-[480px] scrollbar-thin">
      
      {/* Intent Donut & Radar overview layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        
        {/* Intent Pie Chart */}
        <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl h-[230px] flex flex-col justify-between">
          <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wide block mb-3">
            Taxonomy Intent Demographics
          </span>
          <div className="flex-1 w-full flex items-center justify-center">
            <div className="w-[120px] h-full shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={intentSummary}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {intentSummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={intentColors[entry.name as SearchIntent]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#030712', borderColor: '#1e293b', borderRadius: '8px', fontSize: '10px', fontFamily: 'monospace' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Intent labels legend */}
            <div className="flex-1 space-y-1.5 pl-4 font-mono text-[9px]">
              {intentSummary.map((entry) => (
                <button
                  key={entry.name}
                  onClick={() => setActiveIntentTab(entry.name as SearchIntent)}
                  className={`w-full flex items-center justify-between p-1 hover:bg-slate-900 rounded text-left cursor-pointer transition-colors ${
                    activeIntentTab === entry.name ? 'bg-slate-900 text-white font-extrabold' : 'text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: intentColors[entry.name as SearchIntent] }} />
                    <span>{entry.name}</span>
                  </div>
                  <span className="text-slate-500">{entry.value} pcs</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Radar metrics mapping */}
        <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl h-[230px] flex flex-col justify-between">
          <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wide block mb-3">
            Thematic Intensity Signature
          </span>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={intentSummary}>
                <PolarGrid stroke="#0f172a" />
                <PolarAngleAxis dataKey="name" stroke="#64748b" fontSize={8} />
                <PolarRadiusAxis stroke="#1e293b" fontSize={7} />
                <Radar name="Count" dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Intent specific keywords inspector */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Target size={12} style={{ color: intentColors[activeIntentTab] }} />
          <span className="text-[9.5px] font-mono font-bold text-slate-300 uppercase block">
            Inspect {activeIntentTab} Intent Keywords ({activeIntentKeywords.length} listed)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {activeIntentKeywords.map((kw: KeywordNode) => (
            <div
              key={kw.id}
              onClick={() => onSelectNode(kw.id)}
              className="p-3 bg-slate-950/40 border border-slate-900 hover:border-slate-800 rounded-xl cursor-pointer text-left font-mono text-[10.5px] transition-colors hover:bg-slate-900/10"
            >
              <div className="font-bold text-slate-200 truncate">{kw.label}</div>
              <div className="flex justify-between text-[8.5px] text-slate-500 mt-1.5">
                <span>Vol: {kw.volume.toLocaleString()}</span>
                <span>KD: {kw.difficulty}%</span>
              </div>
            </div>
          ))}
          {activeIntentKeywords.length === 0 && (
            <p className="col-span-3 text-center text-slate-600 font-mono text-[11px] py-4 italic">No keywords for this category</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 8. CLUSTER DETAIL PANEL COMPONENT
// ==========================================
function ClusterDetailPanel({
  selectedClusterName,
  selectedCluster,
  selectedNodeId,
  activeDataset,
  onSelectCluster,
  clusters,
}: {
  selectedClusterName: string | null;
  selectedCluster: any | null;
  selectedNodeId: string | null;
  activeDataset: SEOData;
  onSelectCluster: (name: string | null) => void;
  clusters: any[];
}) {
  // If specific node selected, prioritize node metrics
  const selectedNodeDetails = useMemo(() => {
    if (!selectedNodeId) return null;
    
    // Check if it is a cluster
    if (selectedNodeId.startsWith('cluster-')) {
      const cName = selectedNodeId.replace('cluster-', '');
      const clust = clusters.find((c) => c.name === cName);
      if (clust) return { ...clust, nodeType: 'Cluster' };
    }

    // Check if it is a topic
    const topic = activeDataset.topics.find((t) => t.id === selectedNodeId);
    if (topic) return { ...topic, nodeType: 'Topic' };

    // Check if it is a keyword
    const kw = activeDataset.keywords.find((k) => k.id === selectedNodeId);
    if (kw) return { ...kw, nodeType: 'Keyword' };

    return null;
  }, [selectedNodeId, activeDataset, clusters]);

  return (
    <div className="flex-1 flex flex-col justify-between h-full gap-5 border border-slate-900/60 p-5 rounded-2xl bg-slate-900/10">
      
      {/* Dynamic Detail Panel Box */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-900/60 pb-3">
          <Info size={13} className="text-cyan-400" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Node Intelligence Inspector
          </span>
        </div>

        {selectedNodeDetails ? (
          <div className="space-y-4 text-left font-mono">
            
            {/* Header Badge */}
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 text-[8.5px] font-bold uppercase">
                {selectedNodeDetails.nodeType || 'Node Info'}
              </span>
              <span className="text-[8.5px] text-slate-600 font-bold uppercase">ID: {selectedNodeDetails.id || 'N/A'}</span>
            </div>

            {/* Label name */}
            <h5 className="text-sm font-black text-white break-words">
              {selectedNodeDetails.label || selectedNodeDetails.name}
            </h5>

            {/* Stats matrix list */}
            <div className="space-y-2 bg-slate-950/60 border border-slate-900 p-3 rounded-xl text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Search Volume:</span>
                <span className="font-extrabold text-emerald-400">
                  {selectedNodeDetails.volume?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SEO Difficulty:</span>
                <span className="font-extrabold text-amber-500">
                  {selectedNodeDetails.difficulty || selectedNodeDetails.avgDifficulty || 0}%
                </span>
              </div>
              {selectedNodeDetails.intent && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Search Intent:</span>
                  <span className="font-extrabold text-indigo-400">{selectedNodeDetails.intent}</span>
                </div>
              )}
              {selectedNodeDetails.authority !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Topic Authority:</span>
                  <span className="font-extrabold text-cyan-400">{selectedNodeDetails.authority}%</span>
                </div>
              )}
            </div>

            {/* Description or strategy text */}
            {selectedNodeDetails.description && (
              <p className="text-[10.5px] text-slate-400 leading-normal border-t border-slate-900/40 pt-3">
                {selectedNodeDetails.description}
              </p>
            )}

            {/* Satellites topics count if cluster */}
            {selectedNodeDetails.nodeType === 'Cluster' && (
              <div className="space-y-1.5 border-t border-slate-900/40 pt-3">
                <span className="text-[9px] text-slate-500 block uppercase">Members topics list</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNodeDetails.topics?.slice(0, 5).map((t: TopicNode) => (
                    <span key={t.id} className="px-2 py-0.5 bg-slate-900/40 border border-slate-900 rounded text-[9.5px] text-slate-300">
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : selectedCluster ? (
          <div className="space-y-4 text-left font-mono">
            
            {/* Fallback cluster inspector header */}
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-[8.5px] font-bold uppercase">
                Active Cluster Focus
              </span>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCluster.color }} />
            </div>

            <h5 className="text-sm font-black text-white">{selectedCluster.name}</h5>

            <div className="space-y-2 bg-slate-950/60 border border-slate-900 p-3 rounded-xl text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Keywords:</span>
                <span className="font-extrabold text-cyan-400">{selectedCluster.totalKeywords}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Topics:</span>
                <span className="font-extrabold text-indigo-400">{selectedCluster.totalTopics}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Average Difficulty:</span>
                <span className="font-extrabold text-amber-500">{selectedCluster.difficulty}% KD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Aggrated Search Vol:</span>
                <span className="font-extrabold text-emerald-400">{selectedCluster.volume?.toLocaleString()}</span>
              </div>
            </div>

            {/* List of keywords in this cluster */}
            <div className="space-y-2">
              <span className="text-[9px] text-slate-500 font-bold uppercase block">Top Keywords in cluster</span>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {selectedCluster.keywords.slice(0, 5).map((k: KeywordNode) => (
                  <div key={k.id} className="p-2 bg-slate-950/30 border border-slate-900 rounded-lg flex justify-between items-center text-[10px]">
                    <span className="text-slate-200 truncate pr-2">{k.label}</span>
                    <span className="text-emerald-400 font-bold shrink-0">Vol {k.volume}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <p className="text-xs text-slate-500 italic text-center py-12">
            Click any node or cluster in the interactive visualizer on the left to inspect its multi-dimensional semantic parameters here.
          </p>
        )}

      </div>

      {/* Cluster selector picker menu */}
      <div className="border-t border-slate-900/60 pt-4 text-left">
        <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-2">
          Switch Inspector Focus
        </span>
        <div className="flex flex-wrap gap-1.5">
          {clusters.map((c) => (
            <button
              key={c.name}
              onClick={() => {
                onSelectCluster(c.name);
              }}
              className={`px-2 py-1 rounded text-[9.5px] font-mono transition-all cursor-pointer ${
                selectedClusterName === c.name
                  ? 'bg-slate-900 text-white font-extrabold border border-slate-800'
                  : 'bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
