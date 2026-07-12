import React, { useState, useMemo } from 'react';
import { LocationNode } from '../types';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Treemap,
} from 'recharts';
import { Compass, Globe, Map, PieChart as PieIcon, Layers, Sun } from 'lucide-react';

interface LocationTypeAnalysisProps {
  locations: LocationNode[];
}

export default function LocationTypeAnalysis({ locations }: LocationTypeAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'pie' | 'treemap' | 'geomap'>('pie');

  // Filter locations by type
  const countries = useMemo(() => {
    return locations.filter((loc) => loc.type === 'country');
  }, [locations]);

  const geoLocations = useMemo(() => {
    return locations.filter((loc) => loc.latitude !== undefined && loc.longitude !== undefined);
  }, [locations]);

  // Color generator for Pie/Treemap
  const COLORS = ['#10b981', '#06b6d4', '#6366f1', '#a855f7', '#f59e0b', '#ec4899', '#3b82f6'];

  // Custom Treemap Content
  const CustomizedTreemapContent = (props: any) => {
    const { x, y, width, height, index, name, volume } = props;
    if (width < 35 || height < 20) return null;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: COLORS[index % COLORS.length],
            stroke: '#0f172a',
            strokeWidth: 2,
            fillOpacity: 0.85,
          }}
          className="hover:fill-opacity-100 transition-opacity duration-200 cursor-pointer"
        />
        <text
          x={x + 6}
          y={y + 18}
          fill="#fff"
          fontSize={10}
          fontWeight="bold"
          fontFamily="Inter, system-ui"
        >
          {name}
        </text>
        {height > 35 && (
          <text
            x={x + 6}
            y={y + 30}
            fill="rgba(255,255,255,0.7)"
            fontSize={9}
            fontFamily="JetBrains Mono, monospace"
          >
            {(volume / 1000).toFixed(1)}k
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 flex flex-col h-full gap-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="text-emerald-400" size={18} />
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              DISTRIBUTION ANALYSIS
            </span>
          </div>
          <h3 className="text-lg font-black text-white mt-1.5">
            Location Type Analysis
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Compare geographical volume concentration using pie charts, treemaps, or full-scale spatial coordinate tracking.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-slate-900/60 border border-slate-800 p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setActiveTab('pie')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'pie'
                ? 'bg-slate-800 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieIcon size={12} />
            Pie Chart
          </button>
          <button
            onClick={() => setActiveTab('treemap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'treemap'
                ? 'bg-slate-800 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={12} />
            Treemap
          </button>
          <button
            onClick={() => setActiveTab('geomap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'geomap'
                ? 'bg-slate-800 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Map size={12} />
            Geo Coordinates
          </button>
        </div>
      </div>

      {/* Visual Workspace */}
      <div className="flex-1 min-h-[300px] flex items-center justify-center">
        {activeTab === 'pie' && (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Pie Chart display */}
            <div className="h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-2xl font-mono">
                            <p className="text-xs font-bold text-slate-100">{data.name}</p>
                            <p className="text-xs text-cyan-400 mt-1">
                              Volume: {data.volume.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Global Share: {data.percentage}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={countries}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="volume"
                  >
                    {countries.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Globe className="text-slate-500 animate-pulse" size={24} />
                <span className="text-[10px] font-mono font-bold text-slate-400 mt-1">
                  COUNTRIES
                </span>
              </div>
            </div>

            {/* List and weights */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono font-bold text-slate-500 block uppercase">
                Country Volume Concentration
              </span>
              {countries.map((loc, idx) => (
                <div key={loc.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-slate-900">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-xs font-semibold text-slate-200">{loc.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-white">
                      {loc.volume.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 block">
                      {loc.percentage}% share
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'treemap' && (
          <div className="w-full h-[280px]">
            {countries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={countries}
                  dataKey="volume"
                  aspectRatio={4 / 3}
                  stroke="#0f172a"
                  content={<CustomizedTreemapContent />}
                />
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-500 font-mono">No data available for Treemap.</div>
            )}
          </div>
        )}

        {activeTab === 'geomap' && (
          <div className="w-full flex flex-col gap-4">
            {/* Custom Interactive Coordinate Map Canvas/SVG */}
            <div className="h-[250px] w-full bg-slate-950 rounded-2xl border border-slate-900 relative overflow-hidden flex items-center justify-center">
              
              {/* Radar Grid Graphic */}
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
              <div className="absolute h-full w-[1px] bg-slate-900 left-1/2" />
              <div className="absolute w-full h-[1px] bg-slate-900 top-1/2" />

              {/* Glowing vector radar circle */}
              <div className="absolute w-[200px] h-[200px] border border-slate-800/60 rounded-full animate-ping opacity-10 pointer-events-none" />

              {/* Geographic Coordinates Plotter */}
              {geoLocations.length > 0 ? (
                <svg className="absolute inset-0 w-full h-full">
                  {geoLocations.map((loc, idx) => {
                    // Map Lat/Lng to local SVG grid boundaries
                    // Lat is roughly [-90, 90], Lng is roughly [-180, 180]
                    const lat = loc.latitude || 0;
                    const lng = loc.longitude || 0;

                    // Simple projection to fit SVG area [0% - 100%]
                    // Lat maps to Y: 90 is top, -90 is bottom
                    // Lng maps to X: -180 is left, 180 is right
                    const xPercent = ((lng + 180) / 360) * 100;
                    const yPercent = (1 - (lat + 90) / 180) * 100;

                    const scale = Math.log10(loc.volume) * 2;

                    return (
                      <g key={loc.id} className="group cursor-pointer">
                        {/* Pulse Ring */}
                        <circle
                          cx={`${xPercent}%`}
                          cy={`${yPercent}%`}
                          r={scale * 2.5}
                          fill="none"
                          stroke={COLORS[idx % COLORS.length]}
                          strokeWidth={0.8}
                          className="animate-pulse"
                          opacity={0.65}
                        />

                        {/* Node core */}
                        <circle
                          cx={`${xPercent}%`}
                          cy={`${yPercent}%`}
                          r={scale * 1.1 || 5}
                          fill={COLORS[idx % COLORS.length]}
                          className="hover:scale-125 transition-transform duration-200"
                          opacity={0.85}
                        />

                        {/* Floating tooltip/label on hover */}
                        <foreignObject
                          x={`${xPercent + 1}%`}
                          y={`${yPercent - 6}%`}
                          width="120"
                          height="50"
                          className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        >
                          <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-lg shadow-xl text-[9px] font-mono leading-tight">
                            <span className="font-bold text-white block">{loc.name}</span>
                            <span className="text-cyan-400 font-bold block">{loc.volume.toLocaleString()} vol</span>
                            <span className="text-slate-500 text-[8px]">{lat.toFixed(2)}°, {lng.toFixed(2)}°</span>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div className="text-xs font-mono text-slate-500 text-center px-4">
                  No geographic coordinates detected in columns.<br />
                  Add 'latitude' and 'longitude' columns to plot.
                </div>
              )}

              {/* Geographic telemetry metrics */}
              <div className="absolute bottom-3 left-3 bg-slate-950/95 border border-slate-800/80 p-2 rounded-xl flex items-center gap-2">
                <Compass size={12} className="text-emerald-400 animate-spin" />
                <span className="text-[8.5px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                  Global Geo Telemetry: {geoLocations.length} Points plotted
                </span>
              </div>
            </div>

            {/* List coordinates table */}
            {geoLocations.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {geoLocations.slice(0, 4).map((loc) => (
                  <div key={loc.id} className="bg-slate-900/30 border border-slate-900 p-2.5 rounded-xl flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-300 font-bold">{loc.name}</span>
                    <span className="text-slate-500">
                      {loc.latitude?.toFixed(1)}°, {loc.longitude?.toFixed(1)}°
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
