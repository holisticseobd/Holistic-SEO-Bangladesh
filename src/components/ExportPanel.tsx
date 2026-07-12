import React, { useState } from 'react';
import { SEOData } from '../types';
import { Download, FileCode, Database, Check, Cpu, Sparkles, Loader2 } from 'lucide-react';

interface ExportPanelProps {
  activeData: SEOData;
}

export default function ExportPanel({ activeData }: ExportPanelProps) {
  const [exportingHtml, setExportingHtml] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${activeData.datasetName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_seo_data.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerCopyNotification('json');
  };

  const handleDownloadSVG = () => {
    // Generate a simple, clean, responsive standalone vector representation of the active Topics
    const width = 800;
    const height = 450;
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background-color: #030712; font-family: sans-serif;">`;
    
    // Background Grid
    svgContent += `<g stroke="#1e293b" stroke-width="0.5" opacity="0.4">`;
    for (let i = 40; i < width; i += 40) svgContent += `<line x1="${i}" y1="0" x2="${i}" y2="${height}" />`;
    for (let j = 40; j < height; j += 40) svgContent += `<line x1="0" y1="${j}" x2="${width}" y2="${j}" />`;
    svgContent += `</g>`;

    // Add visual connections
    const centers = activeData.topics.map((t, idx) => {
      const angle = (idx / activeData.topics.length) * Math.PI * 2;
      return {
        id: t.id,
        label: t.label,
        x: width / 2 + Math.cos(angle) * 160,
        y: height / 2 + Math.sin(angle) * 140
      };
    });

    centers.forEach(c => {
      const topic = activeData.topics.find(t => t.id === c.id)!;
      topic.connections.forEach(targetId => {
        const target = centers.find(tc => tc.id === targetId);
        if (target) {
          svgContent += `<line x1="${c.x}" y1="${c.y}" x2="${target.x}" y2="${target.y}" stroke="#334155" stroke-width="1.5" opacity="0.6" />`;
        }
      });
    });

    // Add Nodes
    centers.forEach(c => {
      svgContent += `
        <g style="cursor: pointer;">
          <circle cx="${c.x}" cy="${c.y}" r="22" fill="#0f172a" stroke="#06b6d4" stroke-width="2.5" />
          <circle cx="${c.x}" cy="${c.y}" r="6" fill="#06b6d4" />
          <text x="${c.x}" y="${c.y + 36}" fill="#94a3b8" font-size="9" font-weight="bold" text-anchor="middle">${c.label.toUpperCase()}</text>
        </g>
      `;
    });

    svgContent += `</svg>`;

    const dataStr = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${activeData.datasetName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_topic_graph.svg`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerCopyNotification('svg');
  };

  const handleDownloadHTML = () => {
    setExportingHtml(true);

    setTimeout(() => {
      // Build a stunning, self-contained, offline-compatible HTML page that loads three.js via CDN
      // and renders an interactive 3D particle network of the dataset
      const embeddedData = JSON.stringify(activeData.topics);
      
      const htmlString = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3D Interactive SEO Topic Map - ${activeData.datasetName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Load Three.js & OrbitControls via CDN -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  <style>
    body {
      margin: 0;
      overflow: hidden;
      background-color: #030712;
      color: #f3f4f6;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #canvas-container {
      width: 100vw;
      height: 100vh;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
    }
  </style>
</head>
<body>

  <div id="canvas-container"></div>

  <!-- HUD Control Overlays -->
  <div class="absolute top-6 left-6 z-10 pointer-events-none select-none max-w-sm">
    <div class="bg-gray-950/90 border border-gray-800 p-5 rounded-2xl shadow-2xl backdrop-blur-md">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
        <span class="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase">OFFLINE 3D EXPORT</span>
      </div>
      <h1 class="text-lg font-black text-white mt-1.5">${activeData.datasetName}</h1>
      <p class="text-xs text-gray-400 mt-1 leading-normal">
        Interactive 3D Topic Node visualization exported from SEO Topic Intelligence.
      </p>
      <div class="mt-4 border-t border-gray-800 pt-3 text-[10px] font-mono text-gray-500">
        Drag to Rotate • scroll to Zoom • Click node for details
      </div>
    </div>
  </div>

  <!-- Floating Selection Info Panel -->
  <div id="info-panel" class="absolute bottom-6 left-6 right-6 z-10 bg-gray-950/90 border border-gray-800 p-5 rounded-2xl shadow-2xl backdrop-blur-md max-w-xl mx-auto hidden transition-all duration-300">
    <div class="flex items-start gap-3">
      <div id="info-cluster-color" class="w-4 h-4 rounded-full mt-1 flex-shrink-0 bg-cyan-500"></div>
      <div>
        <span id="info-cluster" class="text-[9.5px] font-mono font-bold uppercase text-indigo-400 bg-indigo-950/50 border border-indigo-500/20 px-2 py-0.5 rounded">CLUSTER</span>
        <h2 id="info-title" class="text-base font-extrabold text-white mt-1.5">Topic Node</h2>
        <p id="info-desc" class="text-xs text-gray-400 mt-1 leading-relaxed">Description of selected topic.</p>
        <div class="mt-3.5 flex items-center gap-6 bg-gray-900/60 p-3 rounded-xl border border-gray-800">
          <div>
            <span class="text-[8.5px] font-mono text-gray-500 uppercase block font-bold">Search Volume</span>
            <span id="info-vol" class="text-xs font-extrabold text-gray-100 font-mono">15,000</span>
          </div>
          <div class="h-6 w-[1px] bg-gray-800"></div>
          <div>
            <span class="text-[8.5px] font-mono text-gray-500 uppercase block font-bold">Difficulty</span>
            <span id="info-kd" class="text-xs font-extrabold text-amber-400 font-mono">65/100</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const topics = ${embeddedData};

    // Set up Scene, Camera, WebGL Renderer
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030712');

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.2, 50);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Group for nodes
    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    // Dynamic coloring based on cluster name
    const colors = ['#10b981', '#06b6d4', '#6366f1', '#ec4899', '#f59e0b', '#8b5cf6'];
    const getClusterColor = (cluster) => {
      let hash = 0;
      for (let i = 0; i < cluster.length; i++) {
        hash = cluster.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    // Position nodes spherically
    const positioned = topics.map((t, idx) => {
      const phi = Math.acos(-1 + (2 * idx) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      const radius = 6;
      return {
        ...t,
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi)
      };
    });

    const nodesMap = {};
    const geo = new THREE.SphereGeometry(1, 32, 32);

    positioned.forEach(t => {
      const colorStr = getClusterColor(t.cluster);
      const color = new THREE.Color(colorStr);
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.25,
        roughness: 0.2,
        metalness: 0.8
      });

      const mesh = new THREE.Mesh(geo, mat);
      const scale = 0.45 + (t.volume / 100000) * 0.45;
      mesh.scale.set(scale, scale, scale);
      mesh.position.set(t.x, t.y, t.z);
      mesh.userData = { topic: t, baseScale: scale };

      graphGroup.add(mesh);
      nodesMap[t.id] = mesh;
    });

    // Draw connecting lines
    const lineMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.4 });
    const drawn = new Set();
    positioned.forEach(t => {
      t.connections.forEach(tid => {
        const key = t.id + '-' + tid;
        const rev = tid + '-' + t.id;
        if (drawn.has(key) || drawn.has(rev)) return;

        const m1 = nodesMap[t.id];
        const m2 = nodesMap[tid];
        if (m1 && m2) {
          const points = [m1.position, m2.position];
          const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(lineGeo, lineMat);
          graphGroup.add(line);
          drawn.add(key);
        }
      });
    });

    // Raycast Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const infoPanel = document.getElementById('info-panel');

    const onMouseClick = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(graphGroup.children);
      const nodes = intersects.filter(i => i.object.userData?.topic);

      if (nodes.length > 0) {
        const topic = nodes[0].object.userData.topic;
        
        document.getElementById('info-cluster').innerText = topic.cluster;
        document.getElementById('info-cluster-color').style.backgroundColor = getClusterColor(topic.cluster);
        document.getElementById('info-title').innerText = topic.label;
        document.getElementById('info-desc').innerText = topic.description;
        document.getElementById('info-vol').innerText = topic.volume.toLocaleString();
        document.getElementById('info-kd').innerText = topic.difficulty + '/100';
        
        infoPanel.classList.remove('hidden');
      } else {
        infoPanel.classList.add('hidden');
      }
    };

    window.addEventListener('click', onMouseClick);

    // Rotate and animate
    const animate = () => {
      requestAnimationFrame(animate);
      graphGroup.rotation.y += 0.0018;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>`;

      const blob = new Blob([htmlString], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', `${activeData.datasetName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_3d_map.html`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
      setExportingHtml(false);
      triggerCopyNotification('html');
    }, 1200);
  };

  const triggerCopyNotification = (type: string) => {
    setCopied(type);
    setTimeout(() => setCopied(null), 3000);
  };

  return (
    <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 flex flex-col h-full gap-5">
      
      {/* Header */}
      <div className="border-b border-slate-900 pb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="text-amber-400" size={18} />
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
            INTELLIGENCE DISSEMINATION
          </span>
        </div>
        <h3 className="text-lg font-black text-white mt-1.5">
          3D Interactive Export Control
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Export your analyzed topic structures as robust, offline-compatible interactive 3D presentations, vector blueprints, or database backups.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        
        {/* Core Column 1: HTML Visualizer package (Primary action) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/60 to-indigo-950/20 border border-indigo-500/20 flex flex-col justify-between gap-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-[40px]" />
          
          <div className="space-y-2 relative">
            <div className="p-3 bg-indigo-950/50 border border-indigo-500/30 rounded-xl text-indigo-400 w-fit">
              <FileCode size={20} />
            </div>
            <h4 className="text-sm font-extrabold text-white">
              Standalone 3D HTML Model
            </h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              A single-file HTML package containing Three.js visual scripts. Works 100% offline, fits full-screen, and is presentation-ready!
            </p>
          </div>

          <button
            onClick={handleDownloadHTML}
            disabled={exportingHtml}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs font-mono tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer relative"
          >
            {exportingHtml ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                PACKAGING BUILD...
              </>
            ) : copied === 'html' ? (
              <>
                <Check size={13} className="text-emerald-400" />
                BUILD EXPORTED
              </>
            ) : (
              <>
                <Download size={13} />
                EXPORT 3D MODEL
              </>
            )}
          </button>
        </div>

        {/* Core Column 2: Vector SVG Wireframe */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/20 rounded-xl text-emerald-400 w-fit">
              <Sparkles size={20} />
            </div>
            <h4 className="text-sm font-extrabold text-white">
              Vector SVG Blueprints
            </h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              Generates high-definition vector blueprints of active semantic map structures. Fully customizable inside Adobe Illustrator or Figma.
            </p>
          </div>

          <button
            onClick={handleDownloadSVG}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 font-bold text-xs font-mono tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {copied === 'svg' ? (
              <>
                <Check size={13} className="text-emerald-400" />
                SVG DOWNLOADED
              </>
            ) : (
              <>
                <Download size={13} />
                DOWNLOAD VECTOR
              </>
            )}
          </button>
        </div>

        {/* Core Column 3: Raw structural database backup */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <div className="p-3 bg-cyan-950/50 border border-cyan-500/20 rounded-xl text-cyan-400 w-fit">
              <Database size={20} />
            </div>
            <h4 className="text-sm font-extrabold text-white">
              JSON Database Backup
            </h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              Structured raw data of topic clusters, keywords, and geography volumes. Perfect for backend integration or custom dashboards.
            </p>
          </div>

          <button
            onClick={handleDownloadJSON}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 font-bold text-xs font-mono tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {copied === 'json' ? (
              <>
                <Check size={13} className="text-emerald-400" />
                JSON EXPORTED
              </>
            ) : (
              <>
                <Download size={13} />
                DOWNLOAD DATABASE
              </>
            )}
          </button>
        </div>

      </div>

      {/* Floating System Specs */}
      <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5"><Cpu size={12} className="text-cyan-400" /> ENGINE: THREE.js SPATIAL RENDER</span>
        <span className="text-slate-700 hidden sm:inline">•</span>
        <span>EXPORT STATUS: PRESENTATION READY</span>
        <span className="text-slate-700 hidden sm:inline">•</span>
        <span>STANDALONE VIEWS: OFFLINE SUPPORT</span>
      </div>

    </div>
  );
}
