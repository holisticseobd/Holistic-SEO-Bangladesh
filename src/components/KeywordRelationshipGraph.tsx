import React, { useState, useMemo, useRef, useEffect } from 'react';
import { KeywordNode, TopicNode, SearchIntent } from '../types';
import { 
  Search, 
  Compass, 
  DollarSign, 
  BarChart3, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  MousePointerClick, 
  Layers, 
  Activity,
  Award,
  BookOpen,
  X
} from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

interface KeywordRelationshipGraphProps {
  keywords: KeywordNode[];
  topics: TopicNode[];
}

interface PhysicsNode {
  id: string;
  label: string;
  volume: number;
  difficulty: number;
  cpc: number;
  authority: number;
  intent: SearchIntent;
  topicId: string;
  topicLabel: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  isTopVolume: boolean;
}

interface GroupCenter {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
}

export default function KeywordRelationshipGraph({ keywords, topics }: KeywordRelationshipGraphProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'intent' | 'authority' | 'topic'>('intent');
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  
  // Viewport transformation states (Zoom and Pan)
  const [zoom, setZoom] = useState<number>(1.0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);

  // Hover states
  const [hoveredNode, setHoveredNode] = useState<PhysicsNode | null>(null);

  // References
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<PhysicsNode[]>([]);
  const centersRef = useRef<Record<string, GroupCenter>>({});
  const animationFrameRef = useRef<number | null>(null);
  const simulationAlpha = useRef<number>(1.0);

  // Track dragging states
  const isDraggingViewport = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingNode = useRef<PhysicsNode | null>(null);

  // Map topic labels for fast lookup
  const topicLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    topics.forEach(t => map.set(t.id, t.label));
    return map;
  }, [topics]);

  // Color mappings for intents
  const getIntentColor = (intent: SearchIntent, opacity = 1.0): string => {
    switch (intent) {
      case 'Transactional':
        return `rgba(244, 63, 94, ${opacity})`; // rose/red
      case 'Commercial':
        return `rgba(245, 158, 11, ${opacity})`; // amber
      case 'Informational':
        return `rgba(16, 185, 129, ${opacity})`; // emerald
      case 'Navigational':
        return `rgba(99, 102, 241, ${opacity})`; // indigo
      default:
        return `rgba(148, 163, 184, ${opacity})`;
    }
  };

  // Assign distinct colors to topic groups
  const getTopicColor = (topicId: string, opacity = 1.0): string => {
    const topicIndex = topics.findIndex(t => t.id === topicId);
    if (topicIndex === -1) return `rgba(148, 163, 184, ${opacity})`;
    const hues = [190, 260, 320, 30, 120, 210, 280, 340];
    const hue = hues[topicIndex % hues.length];
    return `hsla(${hue}, 85%, 60%, ${opacity})`;
  };

  // Authority range colors
  const getAuthorityColor = (authority: number, opacity = 1.0): string => {
    if (authority > 70) return `rgba(139, 92, 246, ${opacity})`; // purple
    if (authority >= 45) return `rgba(6, 182, 212, ${opacity})`; // cyan
    return `rgba(100, 116, 139, ${opacity})`; // slate
  };

  const getActiveColor = (node: { intent: SearchIntent; topicId: string; authority: number }, opacity = 1.0): string => {
    if (groupBy === 'intent') return getIntentColor(node.intent, opacity);
    if (groupBy === 'topic') return getTopicColor(node.topicId, opacity);
    return getAuthorityColor(node.authority, opacity);
  };

  // Find the top 15% search volume threshold to prioritize labels
  const topVolumeThreshold = useMemo(() => {
    if (keywords.length === 0) return 0;
    const sorted = [...keywords].sort((a, b) => b.volume - a.volume);
    const index = Math.floor(sorted.length * 0.15);
    return sorted[index]?.volume || 0;
  }, [keywords]);

  // Filter keywords by search query
  const filteredKeywords = useMemo(() => {
    if (!searchQuery.trim()) return keywords;
    const q = searchQuery.toLowerCase();
    return keywords.filter((k) => 
      k.label.toLowerCase().includes(q) || 
      (topicLabelMap.get(k.topicId) || '').toLowerCase().includes(q)
    );
  }, [keywords, searchQuery, topicLabelMap]);

  // Initialize and update node list with physics variables
  useEffect(() => {
    if (filteredKeywords.length === 0) {
      nodesRef.current = [];
      return;
    }

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 450;

    // Preserve existing layout positions if possible
    const existingPositions = new Map<string, { x: number; y: number }>();
    nodesRef.current.forEach(n => existingPositions.set(n.id, { x: n.x, y: n.y }));

    // Map keywords to physics nodes
    const maxVol = Math.max(...keywords.map(kw => kw.volume)) || 1;
    const minVol = Math.min(...keywords.map(kw => kw.volume)) || 0;
    const volDiff = maxVol - minVol || 1;

    nodesRef.current = filteredKeywords.map(k => {
      const existing = existingPositions.get(k.id);
      
      // Calculate dynamic radius based on search volume
      const volumeRatio = (k.volume - minVol) / volDiff;
      const r = 5 + volumeRatio * 10 + (k.authority / 100) * 4;

      // Put node near corresponding group center initial positions
      let initialX = width / 2;
      let initialY = height / 2;

      if (existing) {
        initialX = existing.x;
        initialY = existing.y;
      } else {
        // Distribute nicely in a spiral around screen center initially
        const angle = Math.random() * Math.PI * 2;
        const radius = 50 + Math.random() * 150;
        initialX = width / 2 + Math.cos(angle) * radius;
        initialY = height / 2 + Math.sin(angle) * radius;
      }

      return {
        id: k.id,
        label: k.label,
        volume: k.volume,
        difficulty: k.difficulty,
        cpc: k.cpc,
        authority: k.authority,
        intent: k.intent,
        topicId: k.topicId,
        topicLabel: topicLabelMap.get(k.topicId) || 'Unassigned Topic',
        x: initialX,
        y: initialY,
        vx: 0,
        vy: 0,
        r,
        isTopVolume: k.volume >= topVolumeThreshold
      };
    });

    // Reset alpha to reheat the simulation when dataset or filter updates
    simulationAlpha.current = 1.0;
  }, [filteredKeywords, topicLabelMap, topVolumeThreshold]);

  // Triggered when GroupBy changes - calculate new attraction centers and reheat simulation
  useEffect(() => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 450;

    const newCenters: Record<string, GroupCenter> = {};

    if (groupBy === 'intent') {
      newCenters['Transactional'] = { id: 'Transactional', label: 'Transactional Intent', color: getIntentColor('Transactional', 1.0), x: width * 0.25, y: height * 0.35, targetX: width * 0.25, targetY: height * 0.35, radius: 100 };
      newCenters['Commercial'] = { id: 'Commercial', label: 'Commercial Intent', color: getIntentColor('Commercial', 1.0), x: width * 0.75, y: height * 0.35, targetX: width * 0.75, targetY: height * 0.35, radius: 100 };
      newCenters['Informational'] = { id: 'Informational', label: 'Informational Intent', color: getIntentColor('Informational', 1.0), x: width * 0.25, y: height * 0.72, targetX: width * 0.25, targetY: height * 0.72, radius: 100 };
      newCenters['Navigational'] = { id: 'Navigational', label: 'Navigational Intent', color: getIntentColor('Navigational', 1.0), x: width * 0.75, y: height * 0.72, targetX: width * 0.75, targetY: height * 0.72, radius: 100 };
    } else if (groupBy === 'topic') {
      topics.forEach((t, index) => {
        const angle = (index / topics.length) * Math.PI * 2;
        const radius = Math.min(width, height) * 0.3;
        const cx = width / 2 + Math.cos(angle) * radius;
        const cy = height / 2 + Math.sin(angle) * radius;
        newCenters[t.id] = {
          id: t.id,
          label: t.label,
          color: getTopicColor(t.id, 1.0),
          x: cx,
          y: cy,
          targetX: cx,
          targetY: cy,
          radius: 90
        };
      });
    } else {
      newCenters['high'] = { id: 'high', label: 'High Authority (>70)', color: getAuthorityColor(80, 1.0), x: width * 0.25, y: height * 0.5, targetX: width * 0.25, targetY: height * 0.5, radius: 110 };
      newCenters['medium'] = { id: 'medium', label: 'Medium Authority (45-70)', color: getAuthorityColor(55, 1.0), x: width * 0.5, y: height * 0.5, targetX: width * 0.5, targetY: height * 0.5, radius: 110 };
      newCenters['low'] = { id: 'low', label: 'Low Authority (<45)', color: getAuthorityColor(20, 1.0), x: width * 0.75, y: height * 0.5, targetX: width * 0.75, targetY: height * 0.5, radius: 110 };
    }

    centersRef.current = newCenters;
    simulationAlpha.current = 1.0; // fully reheat forces
  }, [groupBy, topics]);

  // Main Canvas Physics & Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const runSimulation = () => {
      const nodes = nodesRef.current;
      const centers = centersRef.current;
      const alpha = simulationAlpha.current;

      const width = canvas.width;
      const height = canvas.height;

      // 1. UPDATE PHYSICS FORCES IF SIMULATION IS WARM
      if (alpha > 0.01) {
        const friction = 0.82;
        const centerGravity = 0.08 * alpha;
        const repulsionStrength = 120.0 * alpha;
        const linkStrength = 0.06 * alpha;

        // Group centers - attract corresponding nodes
        nodes.forEach(node => {
          let centerId = '';
          if (groupBy === 'intent') centerId = node.intent;
          else if (groupBy === 'topic') centerId = node.topicId;
          else centerId = node.authority > 70 ? 'high' : node.authority >= 45 ? 'medium' : 'low';

          const center = centers[centerId];
          if (center) {
            const dx = center.x - node.x;
            const dy = center.y - node.y;
            node.vx += dx * centerGravity;
            node.vy += dy * centerGravity;
          }
        });

        // Repulsion force between nodes (prevent overlaps & spread them out strongly)
        for (let i = 0; i < nodes.length; i++) {
          const nodeA = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const nodeB = nodes[j];
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);

            // Spacing depends on their sizes and general repulsion threshold
            const spacing = nodeA.r + nodeB.r + 48; // generous spacing for label readability

            if (dist < spacing) {
              const overlap = spacing - dist;
              const force = (overlap / spacing) * repulsionStrength;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              nodeA.vx -= fx;
              nodeA.vy -= fy;
              nodeB.vx += fx;
              nodeB.vy += fy;
            }
          }
        }

        // Mutual attraction among keywords in the same cluster/group to keep clusters cohesive
        // We find the "hub" (highest volume node) of each group, and pull other members toward it
        const groupHubs: Record<string, PhysicsNode> = {};
        nodes.forEach(n => {
          let key = '';
          if (groupBy === 'intent') key = n.intent;
          else if (groupBy === 'topic') key = n.topicId;
          else key = n.authority > 70 ? 'high' : n.authority >= 45 ? 'medium' : 'low';

          if (!groupHubs[key] || n.volume > groupHubs[key].volume) {
            groupHubs[key] = n;
          }
        });

        nodes.forEach(node => {
          let key = '';
          if (groupBy === 'intent') key = node.intent;
          else if (groupBy === 'topic') key = node.topicId;
          else key = node.authority > 70 ? 'high' : node.authority >= 45 ? 'medium' : 'low';

          const hub = groupHubs[key];
          if (hub && hub.id !== node.id) {
            const dx = hub.x - node.x;
            const dy = hub.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetDist = 70; // preferred distance from hub

            if (dist > targetDist) {
              const pull = (dist - targetDist) * linkStrength;
              node.vx += (dx / dist) * pull;
              node.vy += (dy / dist) * pull;
            }
          }
        });

        // Apply friction and boundary collisions
        nodes.forEach(node => {
          if (isDraggingNode.current?.id === node.id) return; // skip for dragged node

          node.vx *= friction;
          node.vy *= friction;
          node.x += node.vx;
          node.y += node.vy;

          // Stay within logical boundaries
          const pad = node.r + 20;
          if (node.x < pad) { node.x = pad; node.vx = 0; }
          if (node.x > width - pad) { node.x = width - pad; node.vx = 0; }
          if (node.y < pad) { node.y = pad; node.vy = 0; }
          if (node.y > height - pad) { node.y = height - pad; node.vy = 0; }
        });

        // Cool down the physics engine
        simulationAlpha.current *= 0.985;
      }

      // 2. CANVAS DRAWING
      ctx.clearRect(0, 0, width, height);

      // Save canvas state and apply view port offset & scale (Zoom & Pan)
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(zoom, zoom);

      // Draw subtle grid lines
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.lineWidth = 0.5 / zoom;
      const gridSize = 50;
      // Grid dimensions should cover a large virtual area
      const minVirtualX = -2000;
      const maxVirtualX = 3000;
      const minVirtualY = -2000;
      const maxVirtualY = 3000;

      for (let x = minVirtualX; x < maxVirtualX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, minVirtualY);
        ctx.lineTo(x, maxVirtualY);
        ctx.stroke();
      }
      for (let y = minVirtualY; y < maxVirtualY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(minVirtualX, y);
        ctx.lineTo(maxVirtualX, y);
        ctx.stroke();
      }

      // 2A. Draw shaded boundaries (Grouping Hulls)
      (Object.values(centers) as GroupCenter[]).forEach(center => {
        // Calculate dynamic cluster radius from its member nodes to fit perfectly
        const groupNodes = nodes.filter(n => {
          if (groupBy === 'intent') return n.intent === center.id;
          if (groupBy === 'topic') return n.topicId === center.id;
          const authRange = n.authority > 70 ? 'high' : n.authority >= 45 ? 'medium' : 'low';
          return authRange === center.id;
        });

        if (groupNodes.length === 0) return;

        // Find average position of members to dynamically position cluster background
        let sumX = 0, sumY = 0;
        groupNodes.forEach(n => { sumX += n.x; sumY += n.y; });
        const avgX = sumX / groupNodes.length;
        const avgY = sumY / groupNodes.length;

        // Smoothly move center toward average position
        center.x += (avgX - center.x) * 0.1;
        center.y += (avgY - center.y) * 0.1;

        // Determine dynamic radius enclosing all nodes in the cluster
        let maxDist = 60;
        groupNodes.forEach(n => {
          const dx = n.x - center.x;
          const dy = n.y - center.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > maxDist) maxDist = dist;
        });
        center.radius = maxDist + 45;

        // Draw soft outer radial aura
        const grad = ctx.createRadialGradient(center.x, center.y, 10, center.x, center.y, center.radius);
        const baseColor = center.color.replace('1.0', '0.015').replace('rgba', 'rgba').replace('hsla', 'hsla');
        const edgeColor = center.color.replace('1.0', '0').replace('rgba', 'rgba').replace('hsla', 'hsla');
        grad.addColorStop(0, baseColor);
        grad.addColorStop(1, edgeColor);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(center.x, center.y, center.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw subtle dashed boundary ring
        ctx.strokeStyle = center.color.replace('1.0', '0.08');
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(center.x, center.y, center.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]); // reset

        // Draw cluster identifier title in back
        ctx.font = `bold ${Math.max(10, 11 / zoom)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = center.color.replace('1.0', '0.35');
        ctx.textAlign = 'center';
        ctx.fillText(center.label.toUpperCase(), center.x, center.y - center.radius + 18);
      });

      // 2B. Draw connections/edges
      // Draw links between nodes in same group. Only draw strong ones if zoomed out.
      nodes.forEach(nodeA => {
        const isSelectedA = selectedKeywordId === nodeA.id;
        const isHoveredA = hoveredNode?.id === nodeA.id;
        const hasFocus = selectedKeywordId !== null || hoveredNode !== null;

        // Only draw connection to hub of same group to prevent gridlock
        nodes.forEach(nodeB => {
          if (nodeA.id >= nodeB.id) return; // avoid duplicates

          let keyA = '', keyB = '';
          if (groupBy === 'intent') { keyA = nodeA.intent; keyB = nodeB.intent; }
          else if (groupBy === 'topic') { keyA = nodeA.topicId; keyB = nodeB.topicId; }
          else {
            keyA = nodeA.authority > 70 ? 'high' : nodeA.authority >= 45 ? 'medium' : 'low';
            keyB = nodeB.authority > 70 ? 'high' : nodeB.authority >= 45 ? 'medium' : 'low';
          }

          if (keyA === keyB) {
            // Find if either is selected/hovered
            const edgeActive = (isSelectedA || isHoveredA || selectedKeywordId === nodeB.id || hoveredNode?.id === nodeB.id);
            
            // If some node has focus but this edge is not active, fade it out heavily
            if (hasFocus && !edgeActive) return;

            // Compute connection thickness based on volume hierarchy
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Skip drawing extremely long connections when zoomed out to reduce clutter
            if (dist > 300 && zoom < 0.75 && !edgeActive) return;

            const baseColor = getActiveColor(nodeA, edgeActive ? 0.45 : 0.04);
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = (edgeActive ? 2.5 : 0.8) / zoom;
            
            ctx.beginPath();
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            ctx.stroke();
          }
        });
      });

      // 2C. Draw physics keyword nodes
      nodes.forEach(node => {
        const isSelected = selectedKeywordId === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const hasFocus = selectedKeywordId !== null || hoveredNode !== null;

        const baseColor = getActiveColor(node, 1.0);
        let opacity = 1.0;

        if (hasFocus) {
          // If a node is selected/hovered, fade others
          const isConnected = isSelected || isHovered || (
            groupBy === 'intent' && (hoveredNode?.intent === node.intent || selectedKeywordId && nodes.find(n => n.id === selectedKeywordId)?.intent === node.intent)
          ) || (
            groupBy === 'topic' && (hoveredNode?.topicId === node.topicId || selectedKeywordId && nodes.find(n => n.id === selectedKeywordId)?.topicId === node.topicId)
          ) || (
            groupBy === 'authority' && (
              (hoveredNode && (hoveredNode.authority > 70 === node.authority > 70)) ||
              (selectedKeywordId && ((nodes.find(n => n.id === selectedKeywordId)?.authority || 0) > 70 === node.authority > 70))
            )
          );

          if (!isConnected) opacity = 0.12;
        }

        // Draw shadow glow for active/hovered nodes
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.r + 7, 0, Math.PI * 2);
          ctx.fillStyle = getActiveColor(node, 0.15);
          ctx.fill();
        }

        // Base outer circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = getActiveColor(node, opacity * (isSelected || isHovered ? 0.95 : 0.25));
        ctx.strokeStyle = getActiveColor(node, opacity);
        ctx.lineWidth = (isSelected || isHovered ? 2.5 : 1.2) / zoom;
        ctx.fill();
        ctx.stroke();

        // Inner core dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = getActiveColor(node, opacity);
        ctx.fill();

        // 2D. Progressive Level of Detail Label rendering
        // Labels are drawn based on zoom depth, node significance, or hover/click focus
        const shouldShowLabel = isSelected || isHovered || (zoom >= 1.6) || (zoom >= 0.8 && node.isTopVolume) || (zoom >= 0.5 && node.volume > topVolumeThreshold * 1.5);

        if (shouldShowLabel && opacity > 0.2) {
          ctx.font = `${isSelected || isHovered ? 'bold' : '500'} ${Math.max(8.5, 9.5 / zoom)}px "Inter", sans-serif`;
          ctx.fillStyle = isSelected || isHovered ? '#ffffff' : 'rgba(203, 213, 225, 0.85)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(node.label, node.x, node.y + node.r + 6);
        }
      });

      ctx.restore();

      // Loop frame
      animationFrameRef.current = requestAnimationFrame(runSimulation);
    };

    runSimulation();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [selectedKeywordId, hoveredNode, zoom, offsetX, offsetY, groupBy]);

  // Handle Resize Observer for Canvas boundaries
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      canvasRef.current.width = containerRef.current.clientWidth;
      canvasRef.current.height = containerRef.current.clientHeight;
      simulationAlpha.current = 1.0; // reheat
    };

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);

    // Run once on load
    handleResize();

    return () => observer.disconnect();
  }, []);

  // Zoom manipulation helpers
  const zoomIn = () => {
    setZoom(z => Math.min(3.5, z * 1.25));
    simulationAlpha.current = 1.0;
  };

  const zoomOut = () => {
    setZoom(z => Math.max(0.35, z * 0.8));
    simulationAlpha.current = 1.0;
  };

  const resetView = () => {
    setZoom(1.0);
    setOffsetX(0);
    setOffsetY(0);
    setSelectedKeywordId(null);
    simulationAlpha.current = 1.0;
  };

  const fitToScreen = () => {
    const nodes = nodesRef.current;
    if (nodes.length === 0 || !canvasRef.current) return;

    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const graphW = maxX - minX || 1;
    const graphH = maxY - minY || 1;

    const canvasW = canvasRef.current.width;
    const canvasH = canvasRef.current.height;

    // Determine scale to fit with 10% safety padding
    const padding = 60;
    const scaleX = (canvasW - padding * 2) / graphW;
    const scaleY = (canvasH - padding * 2) / graphH;
    const targetZoom = Math.max(0.4, Math.min(2.0, Math.min(scaleX, scaleY)));

    // Center of graph
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    setZoom(targetZoom);
    setOffsetX(canvasW / 2 - midX * targetZoom);
    setOffsetY(canvasH / 2 - midY * targetZoom);
    simulationAlpha.current = 1.0;
  };

  // Convert client/mouse coordinates to visual virtual world coordinates inside translation
  const getVirtualCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    return {
      x: (mx - offsetX) / zoom,
      y: (my - offsetY) / zoom
    };
  };

  // Mouse / Touch Handlers for Drag Panning & Node Dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getVirtualCoords(e.clientX, e.clientY);
    
    // Check if user clicked on any keyword node
    let clickedNode: PhysicsNode | null = null;
    nodesRef.current.forEach(node => {
      const dx = node.x - coords.x;
      const dy = node.y - coords.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < node.r + 14) {
        clickedNode = node;
      }
    });

    if (clickedNode) {
      isDraggingNode.current = clickedNode;
      setSelectedKeywordId((clickedNode as PhysicsNode).id);
      simulationAlpha.current = 1.0; // reheat force loop
    } else {
      isDraggingViewport.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getVirtualCoords(e.clientX, e.clientY);

    // 1. DRAGGING PHYSICAL NODE
    if (isDraggingNode.current) {
      const dragged = isDraggingNode.current;
      dragged.x = coords.x;
      dragged.y = coords.y;
      dragged.vx = 0;
      dragged.vy = 0;
      simulationAlpha.current = 1.0; // keep forces alive
      return;
    }

    // 2. DRAGGING VIEWPORT (PANNING)
    if (isDraggingViewport.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setOffsetX(ox => ox + dx);
      setOffsetY(oy => oy + dy);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 3. HOVER DETECTION
    let hoverFound: PhysicsNode | null = null;
    nodesRef.current.forEach(node => {
      const dx = node.x - coords.x;
      const dy = node.y - coords.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < node.r + 12) {
        hoverFound = node;
      }
    });

    setHoveredNode(hoverFound);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingViewport.current = false;
    isDraggingNode.current = null;
  };

  const handleMouseLeave = () => {
    isDraggingViewport.current = false;
    isDraggingNode.current = null;
    setHoveredNode(null);
  };

  // Zoom with scroll wheel centered on mouse pointer
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoomIntensity = 0.12;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Current virtual coordinates under mouse pointer
    const wheelX = (mouseX - offsetX) / zoom;
    const wheelY = (mouseY - offsetY) / zoom;

    const zoomFactor = e.deltaY < 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);
    const nextZoom = Math.max(0.35, Math.min(3.5, zoom * zoomFactor));

    setZoom(nextZoom);
    // Align translation to zoom toward mouse position
    setOffsetX(mouseX - wheelX * nextZoom);
    setOffsetY(mouseY - wheelY * nextZoom);
    simulationAlpha.current = 1.0; // reheat
  };

  // Derive detail display metrics based on hovered or clicked node
  const activeDetailNode = useMemo(() => {
    if (hoveredNode) return hoveredNode;
    if (selectedKeywordId) {
      return nodesRef.current.find(n => n.id === selectedKeywordId) || null;
    }
    return null;
  }, [hoveredNode, selectedKeywordId]);

  // Intent volume calculation for right panel chart
  const intentDistribution = useMemo(() => {
    const distribution: Record<SearchIntent, { volume: number; count: number }> = {
      Transactional: { volume: 0, count: 0 },
      Commercial: { volume: 0, count: 0 },
      Informational: { volume: 0, count: 0 },
      Navigational: { volume: 0, count: 0 },
    };

    filteredKeywords.forEach((k) => {
      if (distribution[k.intent]) {
        distribution[k.intent].volume += k.volume;
        distribution[k.intent].count += 1;
      }
    });

    return Object.entries(distribution).map(([intent, data]) => ({
      intent: intent as SearchIntent,
      volume: data.volume,
      count: data.count,
      color: getIntentColor(intent as SearchIntent),
    }));
  }, [filteredKeywords]);

  return (
    <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 flex flex-col h-full gap-5">
      
      {/* Top Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="text-cyan-400 animate-pulse" size={18} />
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              SEMANTIC RELATIONSHIP MODELER v2.5
            </span>
          </div>
          <h3 className="text-lg font-black text-white mt-1.5">
            Keyword Relationship Graph
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Map semantic associations, search volume weights, and user search intents. High-performance progressive rendering.
          </p>
        </div>

        {/* Sorting / Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Grouping Selector */}
          <div className="flex items-center bg-slate-900/60 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => { setGroupBy('intent'); setSelectedKeywordId(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                groupBy === 'intent' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Search Intent
            </button>
            <button
              onClick={() => { setGroupBy('authority'); setSelectedKeywordId(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                groupBy === 'authority' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Topic Authority
            </button>
            <button
              onClick={() => { setGroupBy('topic'); setSelectedKeywordId(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                groupBy === 'topic' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Topics Mapping
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedKeywordId(null); }}
              placeholder="Search keywords..."
              className="pl-8.5 pr-4 py-2 w-[180px] bg-slate-900/60 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl text-xs font-semibold focus:outline-none focus:border-cyan-500/60 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Dynamic Canvas Area (7 cols) */}
        <div ref={containerRef} className="lg:col-span-7 h-[420px] bg-slate-950 rounded-2xl border border-slate-900 relative overflow-hidden group select-none">
          <canvas 
            ref={canvasRef} 
            className="w-full h-full cursor-grab active:cursor-grabbing" 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
          />

          {/* Floating Canvas Navigation UI */}
          <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md border border-slate-900 p-1 rounded-xl flex items-center gap-1 shadow-2xl">
            <button 
              onClick={zoomIn} 
              className="p-1.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button 
              onClick={zoomOut} 
              className="p-1.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button 
              onClick={fitToScreen} 
              className="p-1.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Fit to Screen"
            >
              <Maximize2 size={14} />
            </button>
            <button 
              onClick={resetView} 
              className="p-1.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Reset View"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Floating Instructions Legend */}
          <div className="absolute bottom-4 left-4 bg-slate-950/90 backdrop-blur-md border border-slate-900 px-3 py-2 rounded-xl flex items-center gap-4 text-[9px] font-mono">
            <div className="flex items-center gap-1.5 text-slate-400">
              <MousePointerClick size={10} className="text-cyan-400" />
              <span>Click to Focus</span>
            </div>
            <div className="text-slate-600">|</div>
            <div className="flex items-center gap-1 text-slate-500">
              <span className="text-slate-400">Scroll</span> to Zoom
            </div>
            <div className="text-slate-600">|</div>
            <div className="flex items-center gap-1 text-slate-500">
              <span className="text-slate-400">Drag</span> to Pan / Move nodes
            </div>
          </div>

          {/* Floating Zoom Level Indicator */}
          <div className="absolute bottom-4 right-4 bg-slate-950/90 backdrop-blur-md border border-slate-900 px-2 py-1 rounded-lg text-[9px] font-mono text-slate-500">
            ZOOM: {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Hover / Metric Detail Card (2.5 cols) */}
        <div className="lg:col-span-2.5 flex flex-col justify-between bg-slate-900/10 border border-slate-900 p-4.5 rounded-2xl">
          {activeDetailNode ? (
            <div className="space-y-4.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase rounded-md border"
                  style={{
                    backgroundColor: `${getActiveColor(activeDetailNode, 0.08)}`,
                    borderColor: `${getActiveColor(activeDetailNode, 0.25)}`,
                    color: getActiveColor(activeDetailNode, 1.0),
                  }}
                >
                  {activeDetailNode.intent}
                </span>
                <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">
                  Active Keyword
                </span>
              </div>

              <h4 className="text-sm font-black text-white leading-relaxed tracking-tight break-words">
                {activeDetailNode.label}
              </h4>

              <div className="space-y-2.5">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-900">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[8px] font-mono text-slate-500 uppercase font-bold flex items-center gap-1">
                      <BarChart3 size={9} /> Search Volume
                    </span>
                    <span className="text-[11px] font-extrabold text-slate-200 font-mono">
                      {activeDetailNode.volume.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-cyan-500 h-full rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(100, (activeDetailNode.volume / 10000) * 100)}%` }} 
                    />
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-900">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[8px] font-mono text-slate-500 uppercase font-bold flex items-center gap-1">
                      <Award size={9} /> Keyword Difficulty
                    </span>
                    <span className={`text-[11px] font-extrabold font-mono ${
                      activeDetailNode.difficulty > 70
                        ? 'text-rose-400'
                        : activeDetailNode.difficulty > 45
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}>
                      {activeDetailNode.difficulty}/100
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        activeDetailNode.difficulty > 70
                          ? 'bg-rose-500'
                          : activeDetailNode.difficulty > 45
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`} 
                      style={{ width: `${activeDetailNode.difficulty}%` }} 
                    />
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-900">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-mono text-slate-500 uppercase font-bold flex items-center gap-1">
                      <DollarSign size={9} /> Est. CPC
                    </span>
                    <span className="text-[11px] font-extrabold text-slate-200 font-mono">
                      ${activeDetailNode.cpc.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-900">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-mono text-slate-500 uppercase font-bold flex items-center gap-1">
                      <BookOpen size={9} /> Semantic Topic
                    </span>
                    <span className="text-[10px] font-bold text-indigo-400 font-mono truncate max-w-[100px]" title={activeDetailNode.topicLabel}>
                      {activeDetailNode.topicLabel}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-900">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-mono text-slate-500 uppercase font-bold flex items-center gap-1">
                      <Layers size={9} /> Topic Authority
                    </span>
                    <span className="text-[11px] font-extrabold text-indigo-400 font-mono">
                      {activeDetailNode.authority}%
                    </span>
                  </div>
                </div>
              </div>

              {selectedKeywordId && (
                <button
                  onClick={() => setSelectedKeywordId(null)}
                  className="w-full py-2 bg-slate-900/60 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-mono font-bold transition-colors cursor-pointer"
                >
                  CLEAR SELECTION
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <Compass className="mx-auto text-slate-600 animate-pulse" size={24} />
              <p className="text-[10px] font-mono font-bold text-slate-400">
                INSPECT SEMANTIC NODE
              </p>
              <p className="text-[9px] text-slate-600 leading-normal max-w-[160px] mx-auto">
                Hover or click nodes directly on the force-directed graph to inspect real-time search volume ratios, authority index distributions, and intent scores.
              </p>
            </div>
          )}

          {/* Bottom intent context guide */}
          <div className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl text-[8.5px] text-slate-500 font-mono leading-normal mt-3">
            <strong className="text-slate-400 block mb-1">Intent Category Keys:</strong>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>Transactional</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Commercial</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Informational</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span>Navigational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Intent Distribution Chart Card (2.5 cols) */}
        <div className="lg:col-span-2.5 flex flex-col justify-between bg-slate-900/10 border border-slate-900 p-4.5 rounded-2xl gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="text-cyan-400" size={13} />
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                INTENT DENSITIES
              </span>
            </div>
            <h4 className="text-xs font-black text-white mt-1">Search Intent Split</h4>
            <p className="text-[9px] text-slate-500 leading-normal mt-0.5">
              Accumulated search volumes filtered across intents.
            </p>
          </div>

          <div className="h-[200px] w-full mt-1.5">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={intentDistribution}
                layout="vertical"
                margin={{ top: 0, right: 10, left: -24, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="intent"
                  type="category"
                  width={65}
                  tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(30, 41, 59, 0.2)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950/95 border border-slate-800 p-2.5 rounded-xl shadow-xl text-[9px] font-mono">
                          <p className="font-bold text-cyan-400 uppercase">
                            {data.intent}
                          </p>
                          <p className="font-black text-white mt-0.5">
                            Vol: {data.volume.toLocaleString()}
                          </p>
                          <p className="text-slate-500 mt-0.5">
                            Count: {data.count} keywords
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="volume" radius={[0, 4, 4, 0]} barSize={8}>
                  {intentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-950/40 border border-slate-900 p-2.5 rounded-xl text-[9px] text-center font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Graph Size:</span>
              <span className="font-bold text-slate-200">{filteredKeywords.length} Nodes</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
