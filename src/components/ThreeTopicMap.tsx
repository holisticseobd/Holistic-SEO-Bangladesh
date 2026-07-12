import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TopicNode } from '../types';
import { Play, Pause, RefreshCw, ZoomIn, Info, Filter } from 'lucide-react';

interface ThreeTopicMapProps {
  topics: TopicNode[];
  onSelectTopic?: (topic: TopicNode | null) => void;
  selectedTopic: TopicNode | null;
}

export default function ThreeTopicMap({ topics, onSelectTopic, selectedTopic }: ThreeTopicMapProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<TopicNode | null>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const selectedTopicRef = useRef<TopicNode | null>(selectedTopic);

  // Extract unique cluster categories
  const clusters = useMemo(() => {
    const set = new Set<string>();
    topics.forEach((t) => {
      if (t.cluster) set.add(t.cluster);
    });
    return Array.from(set);
  }, [topics]);

  // Reset selected cluster filter if current dataset topics change
  useEffect(() => {
    setSelectedCluster('all');
  }, [topics]);

  // Filter topics list based on user cluster selection
  const filteredTopics = useMemo(() => {
    if (selectedCluster === 'all') return topics;
    return topics.filter((t) => t.cluster === selectedCluster);
  }, [topics, selectedCluster]);

  // Sync ref to prevent stale closures in standard event loops
  useEffect(() => {
    selectedTopicRef.current = selectedTopic;
  }, [selectedTopic]);

  // Color generator based on cluster name
  const getClusterColor = (clusterName: string): string => {
    let hash = 0;
    for (let i = 0; i < clusterName.length; i++) {
      hash = clusterName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#10b981', // emerald
      '#06b6d4', // cyan
      '#6366f1', // indigo
      '#ec4899', // pink
      '#f59e0b', // amber
      '#8b5cf6', // violet
      '#ef4444', // red
      '#14b8a6', // teal
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create Scene, Camera, and WebGL Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030712'); // matching bg-slate-950

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 40;
    controls.minDistance = 5;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.2, 50);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x38bdf8, 1, 30);
    pointLight2.position.set(-10, -10, -10);
    scene.add(pointLight2);

    // Create Group for graph elements (so we can easily auto-rotate it)
    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    // Grid helper for tech feel
    const gridHelper = new THREE.GridHelper(30, 30, '#1e293b', '#0f172a');
    gridHelper.position.y = -6;
    gridHelper.material.opacity = 0.4;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Assign positions to topics if they are not already set
    // Spread nodes in a clean 3D sphere or layout
    const positionedTopics = filteredTopics.map((t, idx) => {
      if (t.x !== undefined && t.y !== undefined && t.z !== undefined && selectedCluster === 'all') {
        return t;
      }
      // Spherical distribution
      const phi = Math.acos(-1 + (2 * idx) / filteredTopics.length);
      const theta = Math.sqrt(filteredTopics.length * Math.PI) * phi;
      const radius = 6;
      return {
        ...t,
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
      };
    });

    // Create 3D Nodes
    const nodesMap: Record<string, THREE.Mesh> = {};
    const nodeGeometry = new THREE.SphereGeometry(1, 32, 32);

    positionedTopics.forEach((topic) => {
      const colorStr = getClusterColor(topic.cluster);
      const color = new THREE.Color(colorStr);

      // Sphere material with emissive glow
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: selectedTopicRef.current?.id === topic.id ? 0.7 : 0.25,
        roughness: 0.2,
        metalness: 0.8,
      });

      // Scale sphere by Search Volume
      const minVol = Math.min(...filteredTopics.map((t) => t.volume));
      const maxVol = Math.max(...filteredTopics.map((t) => t.volume));
      const range = maxVol - minVol || 1;
      const tScale = 0.4 + ((topic.volume - minVol) / range) * 0.6; // scale between 0.4 and 1.0

      const mesh = new THREE.Mesh(nodeGeometry, material);
      mesh.scale.set(tScale, tScale, tScale);
      mesh.position.set(topic.x || 0, topic.y || 0, topic.z || 0);
      mesh.userData = { topic, baseScale: tScale };

      graphGroup.add(mesh);
      nodesMap[topic.id] = mesh;

      // Inner glowing core
      const coreGeo = new THREE.SphereGeometry(0.3, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      mesh.add(coreMesh);
    });

    // Create Connecting Edges (Lines)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.5,
    });

    const activeLineMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });

    // Track drawn connections to avoid duplicates
    const drawnConnections = new Set<string>();

    positionedTopics.forEach((topic) => {
      topic.connections.forEach((targetId) => {
        const key1 = `${topic.id}-${targetId}`;
        const key2 = `${targetId}-${topic.id}`;
        if (drawnConnections.has(key1) || drawnConnections.has(key2)) return;

        const sourceMesh = nodesMap[topic.id];
        const targetMesh = nodesMap[targetId];

        if (sourceMesh && targetMesh) {
          const points = [sourceMesh.position, targetMesh.position];
          const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

          const isSelectedPath =
            selectedTopicRef.current?.id === topic.id ||
            selectedTopicRef.current?.id === targetId;

          const line = new THREE.Line(
            lineGeo,
            isSelectedPath ? activeLineMaterial : lineMaterial
          );
          graphGroup.add(line);
          drawnConnections.add(key1);
        }
      });
    });

    // Raycasting for Mouse Hover & Click Interactivity
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(graphGroup.children);

      // Filter intersects that have topic userData
      const nodeIntersects = intersects.filter((i) => i.object.userData?.topic);

      if (nodeIntersects.length > 0) {
        const hoveredMesh = nodeIntersects[0].object as THREE.Mesh;
        const topic = hoveredMesh.userData.topic as TopicNode;
        setHoveredNode(topic);
        container.style.cursor = 'pointer';

        // Scale up hovered node slightly
        graphGroup.children.forEach((child) => {
          if (child.userData?.topic) {
            const isHovered = child.id === hoveredMesh.id;
            const isSelected = selectedTopicRef.current?.id === child.userData.topic.id;
            const targetScale = child.userData.baseScale * (isHovered ? 1.25 : 1.0);
            child.scale.set(targetScale, targetScale, targetScale);

            // Boost glowing emissive intensity
            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = isHovered ? 1.2 : isSelected ? 0.9 : 0.25;
          }
        });
      } else {
        setHoveredNode(null);
        container.style.cursor = 'default';

        // Restore node scales
        graphGroup.children.forEach((child) => {
          if (child.userData?.topic) {
            const isSelected = selectedTopicRef.current?.id === child.userData.topic.id;
            const baseScale = child.userData.baseScale;
            child.scale.set(baseScale, baseScale, baseScale);

            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = isSelected ? 0.9 : 0.25;
          }
        });
      }
    };

    const handleMouseClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(graphGroup.children);
      const nodeIntersects = intersects.filter((i) => i.object.userData?.topic);

      if (nodeIntersects.length > 0) {
        const clickedMesh = nodeIntersects[0].object as THREE.Mesh;
        const topic = clickedMesh.userData.topic as TopicNode;
        if (onSelectTopic) {
          onSelectTopic(topic);
        }
      } else {
        // click background to deselect
        if (onSelectTopic) {
          // Check if mouse actually moved much to avoid deselecting on simple drag
          onSelectTopic(null);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleMouseClick);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Auto-rotation
      if (isRotating) {
        graphGroup.rotation.y += 0.002;
        graphGroup.rotation.x += 0.0005;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [filteredTopics, isRotating, selectedTopic, selectedCluster]);

  const resetCamera = () => {
    setIsRotating(true);
  };

  return (
    <div className="w-full h-full relative flex flex-col bg-slate-950/60 rounded-3xl border border-slate-900 overflow-hidden shadow-inner select-none">
      {/* Three.js canvas parent */}
      <div ref={mountRef} className="flex-1 w-full h-full min-h-[350px]" />

      {/* Floating UI overlay */}
      <div className="absolute top-4 left-4 flex flex-col md:flex-row items-start md:items-center gap-2.5 pointer-events-none">
        <div className="bg-slate-950/90 border border-slate-800/80 px-4 py-2 rounded-2xl flex items-center gap-2.5 shadow-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <div className="text-[10px] font-mono leading-none">
            <div className="font-bold text-slate-200">3D INTERACTIVE MAP</div>
            <div className="text-slate-500 mt-0.5">Drag to Rotate • Scroll to Zoom</div>
          </div>
        </div>

        {/* Cluster Selector UI */}
        <div className="bg-slate-950/90 border border-slate-800/80 px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-xl pointer-events-auto">
          <Filter size={10} className="text-cyan-400" />
          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Cluster:</span>
          <select
            value={selectedCluster}
            onChange={(e) => setSelectedCluster(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            <option value="all" className="bg-slate-950 text-slate-300">ALL CLUSTERS</option>
            {clusters.map((cluster) => (
              <option key={cluster} value={cluster} className="bg-slate-950 text-slate-300">
                {cluster.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={() => setIsRotating(!isRotating)}
          className={`p-2.5 rounded-xl border transition-all pointer-events-auto ${
            isRotating
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/80'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title={isRotating ? 'Pause Rotation' : 'Auto Rotate'}
        >
          {isRotating ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={resetCamera}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 pointer-events-auto transition-all"
          title="Reset Camera Orientation"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Hover/Select Details Overlay */}
      {(hoveredNode || selectedTopic) && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 border border-slate-800/80 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl backdrop-blur-md pointer-events-auto transition-all animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div
              className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: getClusterColor((hoveredNode || selectedTopic)!.cluster) }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 bg-indigo-950/40 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                  {(hoveredNode || selectedTopic)!.cluster}
                </span>
                {selectedTopic && !hoveredNode && (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                    Selected
                  </span>
                )}
              </div>
              <h4 className="text-sm font-extrabold text-white mt-1">
                {(hoveredNode || selectedTopic)!.label}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xl line-clamp-2">
                {(hoveredNode || selectedTopic)!.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 w-full sm:w-auto justify-around">
            <div className="text-center px-2">
              <div className="text-[10px] font-mono text-slate-500 font-bold uppercase">Search Vol</div>
              <div className="text-xs font-black text-slate-100 font-mono mt-0.5">
                {(hoveredNode || selectedTopic)!.volume.toLocaleString()}
              </div>
            </div>
            <div className="h-6 w-[1px] bg-slate-800" />
            <div className="text-center px-2">
              <div className="text-[10px] font-mono text-slate-500 font-bold uppercase">Difficulty (KD)</div>
              <div className="text-xs font-black font-mono mt-0.5 flex items-center justify-center gap-1">
                <span
                  className={
                    (hoveredNode || selectedTopic)!.difficulty > 70
                      ? 'text-red-400'
                      : (hoveredNode || selectedTopic)!.difficulty > 45
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }
                >
                  {(hoveredNode || selectedTopic)!.difficulty}
                </span>
                <span className="text-[10px] text-slate-500">/100</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
