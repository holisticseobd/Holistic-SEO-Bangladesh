import React, { useEffect, useRef, useState } from 'react';
import { TopicNode } from '../types';
import { Play, Pause, Zap, Compass, Info } from 'lucide-react';

interface NeuralTopicNetworkProps {
  topics: TopicNode[];
  onSelectTopic?: (topic: TopicNode) => void;
  selectedTopic: TopicNode | null;
}

interface PhysicsNode {
  id: string;
  label: string;
  cluster: string;
  volume: number;
  difficulty: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isCentral: boolean;
  rawTopic: TopicNode;
}

interface Connection {
  sourceId: string;
  targetId: string;
}

interface SignalPulse {
  sourceId: string;
  targetId: string;
  progress: number; // 0 to 1
  speed: number;
  color: string;
}

export default function NeuralTopicNetwork({ topics, onSelectTopic, selectedTopic }: NeuralTopicNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [pulseSpeed, setPulseSpeed] = useState(0.015);

  // Derive the active central topic
  const centralTopic = selectedTopic || topics[0] || null;

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !centralTopic) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    canvas.width = width;
    canvas.height = height;

    // Create the Physics Nodes based on central topic and its related subtopics
    // Let's gather the central node + its directly connected nodes, plus maybe some others to fill up a beautiful neural graph
    const relatedIds = new Set(centralTopic.connections);
    relatedIds.add(centralTopic.id);

    // Filter topics to include in this visual neural network
    const activeNodesData = topics.filter((t) => t.id === centralTopic.id || relatedIds.has(t.id));

    // Fallback: if very few nodes, add a couple more for density
    if (activeNodesData.length < 4 && topics.length > activeNodesData.length) {
      topics.forEach((t) => {
        if (activeNodesData.length < 6 && !activeNodesData.find((n) => n.id === t.id)) {
          activeNodesData.push(t);
        }
      });
    }

    // Build the initial positions of the physics nodes
    const pNodes: PhysicsNode[] = activeNodesData.map((topic, index) => {
      const isCentral = topic.id === centralTopic.id;
      // Position central node in the center, and subnodes in a circle around it
      let px = width / 2;
      let py = height / 2;

      if (!isCentral) {
        const angle = (index / (activeNodesData.length - 1)) * Math.PI * 2;
        const dist = Math.min(width, height) * 0.3;
        px += Math.cos(angle) * dist + (Math.random() - 0.5) * 50;
        py += Math.sin(angle) * dist + (Math.random() - 0.5) * 50;
      }

      // Radius based on Search Volume
      const baseRadius = isCentral ? 22 : 14;
      const volScale = Math.log10(topic.volume) * 2;

      return {
        id: topic.id,
        label: topic.label,
        cluster: topic.cluster,
        volume: topic.volume,
        difficulty: topic.difficulty,
        x: px,
        y: py,
        vx: 0,
        vy: 0,
        radius: baseRadius + volScale,
        isCentral,
        rawTopic: topic,
      };
    });

    // Connections (edges)
    const connections: Connection[] = [];
    pNodes.forEach((node) => {
      if (!node.isCentral) {
        // Draw connection to central
        connections.push({ sourceId: centralTopic.id, targetId: node.id });
      }
      // Draw connection between subnodes if they connect in rawTopic and exist in our active array
      node.rawTopic.connections.forEach((targetId) => {
        const targetNode = pNodes.find((pn) => pn.id === targetId);
        if (targetNode && !node.isCentral && !targetNode.isCentral) {
          // ensure no duplicates
          const exists = connections.some(
            (c) =>
              (c.sourceId === node.id && c.targetId === targetId) ||
              (c.sourceId === targetId && c.targetId === node.id)
          );
          if (!exists) {
            connections.push({ sourceId: node.id, targetId });
          }
        }
      });
    });

    // Animated electrical pulse signals traveling down connection lines
    let signals: SignalPulse[] = [];
    const spawnSignal = () => {
      if (connections.length === 0) return;
      const conn = connections[Math.floor(Math.random() * connections.length)];
      signals.push({
        sourceId: conn.sourceId,
        targetId: conn.targetId,
        progress: 0,
        speed: pulseSpeed + Math.random() * 0.005,
        color: ['#10b981', '#06b6d4', '#6366f1', '#a855f7'][Math.floor(Math.random() * 4)],
      });
    };

    // Spawn a couple signals initially
    for (let i = 0; i < 5; i++) {
      spawnSignal();
    }

    // Drag tracking
    let draggedNode: PhysicsNode | null = null;
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Find if clicked on any node
      pNodes.forEach((node) => {
        const dx = node.x - mouseX;
        const dy = node.y - mouseY;
        if (Math.sqrt(dx * dx + dy * dy) < node.radius + 10) {
          draggedNode = node;
        }
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedNode) return;
      const rect = canvas.getBoundingClientRect();
      draggedNode.x = e.clientX - rect.left;
      draggedNode.y = e.clientY - rect.top;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (draggedNode) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // If simple click and released on a different node, navigate to it!
        if (draggedNode.id !== centralTopic.id && onSelectTopic) {
          const dx = draggedNode.x - mouseX;
          const dy = draggedNode.y - mouseY;
          if (Math.sqrt(dx * dx + dy * dy) < 30) {
            onSelectTopic(draggedNode.rawTopic);
          }
        }
        draggedNode = null;
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    // Physics Engine loop
    let animationFrameId: number;
    let frameCount = 0;

    const updatePhysics = () => {
      if (!isPlaying) return;

      frameCount++;
      if (frameCount % 40 === 0 && signals.length < 15) {
        spawnSignal();
      }

      // Consts
      const targetLength = Math.min(width, height) * 0.28;
      const gravityStrength = 0.035;
      const chargeStrength = 320; // repulsion coefficient
      const springK = 0.045; // attraction stiffness
      const friction = 0.82;

      // 1. Repulsion force between all nodes (Coulomb's Law style)
      for (let i = 0; i < pNodes.length; i++) {
        const n1 = pNodes[i];
        for (let j = i + 1; j < pNodes.length; j++) {
          const n2 = pNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          // Repulsion force
          const force = chargeStrength / (dist * dist + 400);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (n1 !== draggedNode) {
            n1.vx -= fx;
            n1.vy -= fy;
          }
          if (n2 !== draggedNode) {
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // 2. Spring Forces between connected nodes (Hooke's Law style)
      connections.forEach((conn) => {
        const n1 = pNodes.find((n) => n.id === conn.sourceId);
        const n2 = pNodes.find((n) => n.id === conn.targetId);
        if (!n1 || !n2) return;

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const delta = dist - targetLength;
        const force = delta * springK;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (n1 !== draggedNode) {
          n1.vx += fx;
          n1.vy += fy;
        }
        if (n2 !== draggedNode) {
          n2.vx -= fx;
          n2.vy -= fy;
        }
      });

      // 3. Central topic gravitational anchor & Screen Boundaries
      pNodes.forEach((node) => {
        if (node === draggedNode) return;

        if (node.isCentral) {
          // Strongly anchor central node towards screen center
          const targetX = width / 2;
          const targetY = height / 2;
          node.vx += (targetX - node.x) * 0.08;
          node.vy += (targetY - node.y) * 0.08;
        } else {
          // Softly anchor subnodes to center
          const targetX = width / 2;
          const targetY = height / 2;
          node.vx += (targetX - node.x) * gravityStrength;
          node.vy += (targetY - node.y) * gravityStrength;
        }

        // Apply velocities
        node.x += node.vx;
        node.y += node.vy;

        // Friction/damping
        node.vx *= friction;
        node.vy *= friction;

        // Wall collisions
        const margin = node.radius + 15;
        if (node.x < margin) {
          node.x = margin;
          node.vx *= -0.5;
        }
        if (node.x > width - margin) {
          node.x = width - margin;
          node.vx *= -0.5;
        }
        if (node.y < margin) {
          node.y = margin;
          node.vy *= -0.5;
        }
        if (node.y > height - margin) {
          node.y = height - margin;
          node.vy *= -0.5;
        }
      });

      // 4. Update Signal Pulses progress
      signals.forEach((sig) => {
        sig.progress += sig.speed;
      });
      // Remove finished signals
      signals = signals.filter((sig) => sig.progress < 1.0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // A. Draw connection wires with glow effects
      connections.forEach((conn) => {
        const n1 = pNodes.find((n) => n.id === conn.sourceId);
        const n2 = pNodes.find((n) => n.id === conn.targetId);
        if (!n1 || !n2) return;

        const isMainBridge = n1.isCentral || n2.isCentral;

        // Base line
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.lineWidth = isMainBridge ? 2 : 1.2;
        ctx.strokeStyle = isMainBridge ? 'rgba(56, 189, 248, 0.25)' : 'rgba(71, 85, 105, 0.15)';
        ctx.stroke();
      });

      // B. Draw pulsing signal packets on top of wires
      signals.forEach((sig) => {
        const n1 = pNodes.find((n) => n.id === sig.sourceId);
        const n2 = pNodes.find((n) => n.id === sig.targetId);
        if (!n1 || !n2) return;

        // Interpolate position
        const px = n1.x + (n2.x - n1.x) * sig.progress;
        const py = n1.y + (n2.y - n1.y) * sig.progress;

        // Draw glowing signal ball
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = sig.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = sig.color;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // C. Draw nodes
      pNodes.forEach((node) => {
        // Glow effect
        const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius + 10);
        const baseColor = node.isCentral ? 'rgba(6, 182, 212, 0.3)' : 'rgba(99, 102, 241, 0.15)';
        grad.addColorStop(0, baseColor);
        grad.addColorStop(1, 'rgba(3, 7, 18, 0)');

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 10, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Node circle outer outline
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.isCentral ? '#083344' : '#1e1b4b'; // dark teal/indigo bg
        ctx.strokeStyle = node.isCentral ? '#06b6d4' : '#6366f1'; // cyan/indigo border
        ctx.lineWidth = node.isCentral ? 3 : 2;
        ctx.fill();
        ctx.stroke();

        // Draw difficulty ring indicator
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius - 4, 0, Math.PI * 2 * (node.difficulty / 100));
        ctx.strokeStyle = node.difficulty > 70 ? '#f87171' : node.difficulty > 45 ? '#fbbf24' : '#34d399';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Draw text labels
        ctx.fillStyle = '#ffffff';
        ctx.font = node.isCentral ? 'bold 12px Inter, system-ui' : '500 10.5px Inter, system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Wrap text if too long
        const words = node.label.split(' ');
        if (words.length > 2) {
          ctx.fillText(words.slice(0, 2).join(' '), node.x, node.y - 6);
          ctx.fillText(words.slice(2).join(' '), node.x, node.y + 6);
        } else if (words.length === 2) {
          ctx.fillText(words[0], node.x, node.y - 5);
          ctx.fillText(words[1], node.x, node.y + 5);
        } else {
          ctx.fillText(node.label, node.x, node.y);
        }

        // Mini metric badge below nodes
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
        ctx.fillText(`${(node.volume / 1000).toFixed(1)}k`, node.x, node.y + node.radius + 14);
      });
    };

    // Main render loop
    const tick = () => {
      updatePhysics();
      draw();
      animationFrameId = requestAnimationFrame(tick);
    };
    tick();

    // Resize listener
    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width;
      canvas.height = height;
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [topics, centralTopic, isPlaying, pulseSpeed]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] relative bg-slate-950/60 border border-slate-900 rounded-3xl overflow-hidden flex flex-col"
    >
      {/* Canvas */}
      <canvas ref={canvasRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Overlays and controls */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="bg-slate-950/90 border border-slate-800/80 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-xl">
          <Zap size={14} className="text-amber-400 animate-pulse" />
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-300 block">
              NEURAL TOPIC NETWORK
            </span>
            <span className="text-[9px] font-mono text-slate-500">
              Central node connects to subtopics • Drag nodes to organic shapes
            </span>
          </div>
        </div>
      </div>

      {/* Floating interactive controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2.5 rounded-xl border transition-all ${
            isPlaying
              ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-400'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
          title={isPlaying ? 'Pause Physics' : 'Resume Physics'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 px-3 py-1 rounded-xl">
          <span className="text-[8.5px] font-mono text-slate-500 font-bold">PULSES:</span>
          <select
            value={pulseSpeed}
            onChange={(e) => setPulseSpeed(parseFloat(e.target.value))}
            className="bg-transparent border-none text-[9.5px] text-slate-300 focus:outline-none font-mono font-bold"
          >
            <option value="0.007" className="bg-slate-950">Slow</option>
            <option value="0.015" className="bg-slate-950">Medium</option>
            <option value="0.03" className="bg-slate-950">Rapid</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-4 bg-slate-950/90 border border-slate-800/80 px-4 py-2 rounded-xl text-[9px] font-mono font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-cyan-400 bg-cyan-950" />
            <span className="text-slate-400">Central Focus</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-indigo-400 bg-indigo-950" />
            <span className="text-slate-400">Subtopic</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-0.5 bg-red-400" />
            <span className="text-slate-400">High Difficulty (&gt;70)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-0.5 bg-emerald-400" />
            <span className="text-slate-400">Easy (&lt;45)</span>
          </div>
        </div>

        {centralTopic && (
          <div className="bg-cyan-950/50 border border-cyan-500/30 px-3 py-2 rounded-xl text-[10px] text-cyan-200 font-mono flex items-center gap-1.5">
            <Compass size={11} className="text-cyan-400" />
            Focus: <strong className="text-white">{centralTopic.label}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
