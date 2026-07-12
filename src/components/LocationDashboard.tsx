import React, { useState, useMemo } from 'react';
import { LocationNode } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ArrowLeft, Globe, MapPin, Building, ChevronRight, BarChart2 } from 'lucide-react';

interface LocationDashboardProps {
  locations: LocationNode[];
}

export default function LocationDashboard({ locations }: LocationDashboardProps) {
  // Navigation hierarchy states
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);

  // Group locations by type
  const countries = useMemo(() => {
    return locations.filter((loc) => loc.type === 'country');
  }, [locations]);

  const states = useMemo(() => {
    return locations.filter((loc) => loc.type === 'state');
  }, [locations]);

  const cities = useMemo(() => {
    return locations.filter((loc) => loc.type === 'city');
  }, [locations]);

  // Determine active level and current list
  const currentLevel = useMemo(() => {
    if (selectedStateId) return 'city';
    if (selectedCountryId) return 'state';
    return 'country';
  }, [selectedCountryId, selectedStateId]);

  const displayData = useMemo(() => {
    if (currentLevel === 'city') {
      // Find cities under selected state
      return cities.filter((c) => c.parentId === selectedStateId);
    }
    if (currentLevel === 'state') {
      // Find states under selected country
      return states.filter((s) => s.parentId === selectedCountryId);
    }
    // Base level: countries
    return countries;
  }, [currentLevel, countries, states, cities, selectedCountryId, selectedStateId]);

  // Find names of selected nodes for breadcrumb display
  const selectedCountryName = useMemo(() => {
    if (!selectedCountryId) return '';
    return locations.find((l) => l.id === selectedCountryId)?.name || '';
  }, [selectedCountryId, locations]);

  const selectedStateName = useMemo(() => {
    if (!selectedStateId) return '';
    return locations.find((l) => l.id === selectedStateId)?.name || '';
  }, [selectedStateId, locations]);

  // Handle drill down click on chart/item
  const handleItemClick = (item: LocationNode) => {
    if (item.type === 'country') {
      // Check if this country has child states
      const hasChildren = states.some((s) => s.parentId === item.id);
      if (hasChildren) {
        setSelectedCountryId(item.id);
      }
    } else if (item.type === 'state') {
      const hasChildren = cities.some((c) => c.parentId === item.id);
      if (hasChildren) {
        setSelectedStateId(item.id);
      }
    }
  };

  // Move up the hierarchy
  const handleGoBack = () => {
    if (selectedStateId) {
      setSelectedStateId(null);
    } else if (selectedCountryId) {
      setSelectedCountryId(null);
    }
  };

  // Color generator for bars
  const colors = ['#38bdf8', '#818cf8', '#6366f1', '#4f46e5', '#4338ca'];

  return (
    <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 flex flex-col h-full gap-6">
      
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="text-cyan-400" size={18} />
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              LOCATION DEMAND ANALYTICS
            </span>
          </div>
          <h3 className="text-lg font-black text-white mt-1.5">
            Geographic Search Breakdown
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Drill-down from country profiles to states and local cities to identify location-specific search volumes.
          </p>
        </div>

        {/* Breadcrumbs Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800/80 p-2 rounded-xl text-xs font-mono font-bold">
          <button
            onClick={() => {
              setSelectedCountryId(null);
              setSelectedStateId(null);
            }}
            className="text-slate-400 hover:text-cyan-400 flex items-center gap-1"
          >
            <Globe size={13} />
            Global
          </button>
          {selectedCountryId && (
            <>
              <ChevronRight size={12} className="text-slate-600" />
              <button
                onClick={() => setSelectedStateId(null)}
                className={`flex items-center gap-1 ${
                  selectedStateId ? 'text-slate-400 hover:text-cyan-400' : 'text-cyan-400'
                }`}
              >
                <MapPin size={13} />
                {selectedCountryName}
              </button>
            </>
          )}
          {selectedStateId && (
            <>
              <ChevronRight size={12} className="text-slate-600" />
              <span className="text-cyan-400 flex items-center gap-1">
                <Building size={13} />
                {selectedStateName}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Drill Down Chart (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-slate-300">
              {currentLevel === 'country' && 'Search Volume by Country'}
              {currentLevel === 'state' && `States in ${selectedCountryName}`}
              {currentLevel === 'city' && `Cities in ${selectedStateName}`}
            </span>

            {(selectedCountryId || selectedStateId) && (
              <button
                onClick={handleGoBack}
                className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition-all"
              >
                <ArrowLeft size={11} />
                GO UP
              </button>
            )}
          </div>

          <div className="h-[280px] bg-slate-950/40 rounded-2xl border border-slate-900/85 p-4 flex items-center justify-center">
            {displayData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#475569"
                    fontSize={10}
                    fontFamily="JetBrains Mono, monospace"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={10}
                    fontFamily="JetBrains Mono, monospace"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(56, 189, 248, 0.04)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as LocationNode;
                        return (
                          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-xl">
                            <p className="text-xs font-bold text-slate-200">{data.name}</p>
                            <p className="text-xs font-mono font-semibold text-cyan-400 mt-1">
                              Volume: {data.volume.toLocaleString()}
                            </p>
                            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                              Percentage: {data.percentage}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="volume"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data && data.payload) {
                        handleItemClick(data.payload);
                      }
                    }}
                  >
                    {displayData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={colors[index % colors.length]}
                        className="hover:opacity-90 transition-opacity"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-500 font-mono">No data found at this level.</div>
            )}
          </div>
        </div>

        {/* Right Side: Interactive stats list (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-4">
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
            <span className="text-[10px] font-mono font-bold text-slate-500 block uppercase tracking-wider">
              Location Metrics Table
            </span>

            {displayData.map((loc) => {
              const hasChild =
                loc.type === 'country'
                  ? states.some((s) => s.parentId === loc.id)
                  : loc.type === 'state'
                  ? cities.some((c) => c.parentId === loc.id)
                  : false;

              return (
                <div
                  key={loc.id}
                  onClick={() => hasChild && handleItemClick(loc)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    hasChild
                      ? 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700 cursor-pointer'
                      : 'bg-slate-950/20 border-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-900 text-slate-400">
                      {loc.type === 'country' ? <Globe size={14} /> : loc.type === 'state' ? <MapPin size={14} /> : <Building size={14} />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{loc.name}</h4>
                      <span className="text-[9px] font-mono text-slate-500">
                        {loc.type.toUpperCase()} • {loc.percentage}% weight
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-slate-200 font-mono">
                        {loc.volume.toLocaleString()}
                      </div>
                      <span className="text-[8px] font-mono text-slate-500 block">Searches</span>
                    </div>
                    {hasChild && <ChevronRight size={12} className="text-slate-600" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Info summary */}
          <div className="bg-cyan-950/10 border border-cyan-500/20 p-4 rounded-2xl flex items-start gap-3">
            <Globe size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="text-[10px] font-mono text-cyan-300 leading-normal">
              <strong>Interactive Tip:</strong> Click any of the active columns in the bar chart or table above to drill down to child locations.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
