import React, { useState, useMemo } from 'react';
import { SEOData, SearchIntent } from '../types';
import {
  GitCompare,
  TrendingUp,
  BarChart3,
  Database,
  Smile,
  ShieldAlert,
  ArrowRightLeft,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface DatasetComparisonViewProps {
  datasets: SEOData[];
  defaultIndexA?: number;
}

export default function DatasetComparisonView({ datasets, defaultIndexA = 0 }: DatasetComparisonViewProps) {
  const [indexA, setIndexA] = useState<number>(defaultIndexA);
  const [indexB, setIndexB] = useState<number>(datasets.length > 1 ? (defaultIndexA === 0 ? 1 : 0) : defaultIndexA);
  const [comparisonTab, setComparisonTab] = useState<'metrics' | 'clusters' | 'intents'>('metrics');

  const datasetA = useMemo(() => datasets[indexA] || datasets[0], [datasets, indexA]);
  const datasetB = useMemo(() => datasets[indexB] || datasets[indexB] === undefined ? datasets[1] || datasets[0] : datasets[0], [datasets, indexB]);

  // Sync index A when defaultIndexA changes
  React.useEffect(() => {
    setIndexA(defaultIndexA);
  }, [defaultIndexA]);

  // 1. Core Summary metrics calculations
  const metricsA = useMemo(() => {
    if (!datasetA) return null;
    const totalVol = datasetA.topics.reduce((acc, t) => acc + t.volume, 0) + datasetA.keywords.reduce((acc, k) => acc + k.volume, 0);
    const avgDiff = datasetA.keywords.length > 0
      ? Math.round(datasetA.keywords.reduce((acc, k) => acc + k.difficulty, 0) / datasetA.keywords.length)
      : 50;
    const avgSentiment = datasetA.keywords.length > 0
      ? Math.round(datasetA.keywords.reduce((acc, k) => acc + (k.sentiment || 50), 0) / datasetA.keywords.length)
      : 50;
    
    // Top Cluster by volume
    const clusterMap: Record<string, number> = {};
    datasetA.topics.forEach((t) => {
      clusterMap[t.cluster] = (clusterMap[t.cluster] || 0) + t.volume;
    });
    const topClusterEntry = Object.entries(clusterMap).sort((a, b) => b[1] - a[1])[0];

    return {
      totalVolume: totalVol,
      topicsCount: datasetA.topics.length,
      keywordsCount: datasetA.keywords.length,
      avgDifficulty: avgDiff,
      avgSentiment: avgSentiment,
      topCluster: topClusterEntry ? topClusterEntry[0] : 'None',
      topClusterVolume: topClusterEntry ? topClusterEntry[1] : 0
    };
  }, [datasetA]);

  const metricsB = useMemo(() => {
    if (!datasetB) return null;
    const totalVol = datasetB.topics.reduce((acc, t) => acc + t.volume, 0) + datasetB.keywords.reduce((acc, k) => acc + k.volume, 0);
    const avgDiff = datasetB.keywords.length > 0
      ? Math.round(datasetB.keywords.reduce((acc, k) => acc + k.difficulty, 0) / datasetB.keywords.length)
      : 50;
    const avgSentiment = datasetB.keywords.length > 0
      ? Math.round(datasetB.keywords.reduce((acc, k) => acc + (k.sentiment || 50), 0) / datasetB.keywords.length)
      : 50;

    const clusterMap: Record<string, number> = {};
    datasetB.topics.forEach((t) => {
      clusterMap[t.cluster] = (clusterMap[t.cluster] || 0) + t.volume;
    });
    const topClusterEntry = Object.entries(clusterMap).sort((a, b) => b[1] - a[1])[0];

    return {
      totalVolume: totalVol,
      topicsCount: datasetB.topics.length,
      keywordsCount: datasetB.keywords.length,
      avgDifficulty: avgDiff,
      avgSentiment: avgSentiment,
      topCluster: topClusterEntry ? topClusterEntry[0] : 'None',
      topClusterVolume: topClusterEntry ? topClusterEntry[1] : 0
    };
  }, [datasetB]);

  // 2. Chart data for intent comparison
  const intentChartData = useMemo(() => {
    if (!datasetA || !datasetB) return [];

    const intents: SearchIntent[] = ['Transactional', 'Commercial', 'Informational', 'Navigational'];
    
    return intents.map((intent) => {
      const volA = datasetA.keywords
        .filter((k) => k.intent === intent)
        .reduce((sum, k) => sum + k.volume, 0);

      const volB = datasetB.keywords
        .filter((k) => k.intent === intent)
        .reduce((sum, k) => sum + k.volume, 0);

      return {
        name: intent,
        [datasetA.datasetName]: volA,
        [datasetB.datasetName]: volB,
      };
    });
  }, [datasetA, datasetB]);

  // 3. Cluster share comparison (top 5 clusters comparison)
  const clusterChartData = useMemo(() => {
    if (!datasetA || !datasetB) return [];

    const clustersA: Record<string, number> = {};
    datasetA.topics.forEach((t) => {
      clustersA[t.cluster] = (clustersA[t.cluster] || 0) + t.volume;
    });

    const clustersB: Record<string, number> = {};
    datasetB.topics.forEach((t) => {
      clustersB[t.cluster] = (clustersB[t.cluster] || 0) + t.volume;
    });

    // Unique clusters from both
    const allClusters = Array.from(new Set([...Object.keys(clustersA), ...Object.keys(clustersB)])).slice(0, 6);

    return allClusters.map((cluster) => ({
      name: cluster.length > 18 ? cluster.substring(0, 15) + '...' : cluster,
      [datasetA.datasetName]: clustersA[cluster] || 0,
      [datasetB.datasetName]: clustersB[cluster] || 0,
    }));
  }, [datasetA, datasetB]);

  if (!datasetA || !datasetB) {
    return (
      <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-8 text-center flex flex-col items-center justify-center h-full min-h-[350px]">
        <GitCompare className="text-slate-600 animate-pulse mb-3" size={28} />
        <p className="text-xs font-mono font-bold text-slate-400">Comparison mode requires active datasets</p>
        <p className="text-[10px] text-slate-600 mt-1 max-w-sm">Please make sure you have loaded at least one dataset model to begin benchmarking.</p>
      </div>
    );
  }

  // Visual helper to calculate delta percent
  const renderDelta = (valA: number, valB: number, isLowerBetter = false) => {
    if (valA === valB) return <span className="text-[10px] font-mono text-slate-500">0%</span>;
    const pct = (((valB - valA) / (valA || 1)) * 100).toFixed(0);
    const numericPct = parseInt(pct);
    const isPositive = numericPct > 0;
    
    let color = 'text-slate-400';
    if (isPositive) {
      color = isLowerBetter ? 'text-rose-400' : 'text-emerald-400';
    } else {
      color = isLowerBetter ? 'text-emerald-400' : 'text-rose-400';
    }

    return (
      <span className={`text-[10px] font-mono font-bold ${color}`}>
        {isPositive ? `+${pct}%` : `${pct}%`}
      </span>
    );
  };

  const isBEqualA = indexA === indexB;

  return (
    <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 flex flex-col h-full gap-5 animate-in fade-in duration-300">
      
      {/* Upper Selectors */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="text-cyan-400" size={18} />
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              BENCHMARK COMPARISON ENGINE
            </span>
          </div>
          <h3 className="text-lg font-black text-white mt-1.5">
            Side-by-Side Dataset Benchmarking
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Compare volumes, competitive keyword difficulty, search intents, and cluster splits between two models.
          </p>
        </div>

        {/* Dataset Selectors */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900/30 border border-slate-900 p-2.5 rounded-2xl shrink-0">
          {/* Dropdown A */}
          <div className="flex flex-col gap-0.5 min-w-[160px]">
            <span className="text-[8px] font-mono font-bold text-slate-500 uppercase px-1">MODEL A (Baseline)</span>
            <select
              value={indexA}
              onChange={(e) => setIndexA(parseInt(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              {datasets.map((d, idx) => (
                <option key={idx} value={idx}>
                  {idx + 1}. {d.datasetName.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center text-slate-600 self-center">
            <ArrowRightLeft size={14} className="rotate-90 sm:rotate-0" />
          </div>

          {/* Dropdown B */}
          <div className="flex flex-col gap-0.5 min-w-[160px]">
            <span className="text-[8px] font-mono font-bold text-slate-500 uppercase px-1">MODEL B (Target)</span>
            <select
              value={indexB}
              onChange={(e) => setIndexB(parseInt(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold text-indigo-400 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              {datasets.map((d, idx) => (
                <option key={idx} value={idx}>
                  {idx + 1}. {d.datasetName.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isBEqualA && datasets.length > 1 && (
        <div className="bg-amber-950/20 border border-amber-500/10 rounded-xl px-4 py-2 text-[10px] text-amber-400 font-mono flex items-center gap-2">
          <AlertCircle size={12} />
          <span>You are currently comparing Model A to itself. Change "MODEL B" above to contrast two different datasets.</span>
        </div>
      )}

      {/* Main Benchmarking Metrics Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Core Side-by-Side Comparison Metric Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Core Metric Benchmarks
            </span>

            {/* Metric Comparison Stack */}
            <div className="space-y-2.5">
              
              {/* Total Search Volume */}
              <div className="bg-slate-950 border border-slate-900/80 p-3.5 rounded-2xl flex flex-col justify-between gap-1.5 hover:border-slate-800 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Agg. Search Volume</span>
                  {metricsA && metricsB && renderDelta(metricsA.totalVolume, metricsB.totalVolume)}
                </div>
                <div className="grid grid-cols-2 gap-3 items-center pt-0.5">
                  <div>
                    <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Model A</span>
                    <span className="text-xs font-black text-cyan-400 font-mono">
                      {metricsA?.totalVolume.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="border-l border-slate-900 pl-3">
                    <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Model B</span>
                    <span className="text-xs font-black text-indigo-400 font-mono">
                      {metricsB?.totalVolume.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Keyword Count */}
              <div className="bg-slate-950 border border-slate-900/80 p-3.5 rounded-2xl flex flex-col justify-between gap-1.5 hover:border-slate-800 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Keyword Scope</span>
                  {metricsA && metricsB && renderDelta(metricsA.keywordsCount, metricsB.keywordsCount)}
                </div>
                <div className="grid grid-cols-2 gap-3 items-center pt-0.5">
                  <div>
                    <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Model A</span>
                    <span className="text-xs font-black text-cyan-400 font-mono">
                      {metricsA?.keywordsCount || 0} keywords
                    </span>
                  </div>
                  <div className="border-l border-slate-900 pl-3">
                    <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Model B</span>
                    <span className="text-xs font-black text-indigo-400 font-mono">
                      {metricsB?.keywordsCount || 0} keywords
                    </span>
                  </div>
                </div>
              </div>

              {/* Competitive Difficulty */}
              <div className="bg-slate-950 border border-slate-900/80 p-3.5 rounded-2xl flex flex-col justify-between gap-1.5 hover:border-slate-800 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Avg. Keyword Difficulty</span>
                  {metricsA && metricsB && renderDelta(metricsA.avgDifficulty, metricsB.avgDifficulty, true)}
                </div>
                <div className="grid grid-cols-2 gap-3 items-center pt-0.5">
                  <div>
                    <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Model A</span>
                    <span className="text-xs font-black text-cyan-400 font-mono">
                      {metricsA?.avgDifficulty || 0}/100
                    </span>
                  </div>
                  <div className="border-l border-slate-900 pl-3">
                    <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Model B</span>
                    <span className="text-xs font-black text-indigo-400 font-mono">
                      {metricsB?.avgDifficulty || 0}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Sentiment Averages */}
              <div className="bg-slate-950 border border-slate-900/80 p-3.5 rounded-2xl flex flex-col justify-between gap-1.5 hover:border-slate-800 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Average Sentiment Factor</span>
                  {metricsA && metricsB && renderDelta(metricsA.avgSentiment, metricsB.avgSentiment)}
                </div>
                <div className="grid grid-cols-2 gap-3 items-center pt-0.5">
                  <div>
                    <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Model A</span>
                    <span className="text-xs font-black text-cyan-400 font-mono flex items-center gap-1">
                      <Smile size={11} /> {metricsA?.avgSentiment || 0}%
                    </span>
                  </div>
                  <div className="border-l border-slate-900 pl-3">
                    <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Model B</span>
                    <span className="text-xs font-black text-indigo-400 font-mono flex items-center gap-1">
                      <Smile size={11} /> {metricsB?.avgSentiment || 0}%
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="bg-slate-900/20 border border-slate-900 p-3 rounded-xl text-[9px] text-slate-500 font-mono leading-relaxed">
            <strong>Benchmark Insights:</strong> Delta rates show targeted Model B's comparison metrics relative to Baseline Model A. <span className="text-emerald-400">Green</span> values indicate positive improvements (or lower difficulty).
          </div>
        </div>

        {/* Charts and Visual comparison split (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/10 border border-slate-900 p-5 rounded-3xl flex flex-col gap-4">
          
          {/* Sub Navigation */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="text-cyan-400" size={13} />
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Benchmarking Charts
              </span>
            </div>

            <div className="flex items-center bg-slate-950 border border-slate-800 p-0.5 rounded-lg">
              <button
                onClick={() => setComparisonTab('metrics')}
                className={`px-2.5 py-1 rounded text-[9.5px] font-mono font-bold transition-all ${
                  comparisonTab === 'metrics' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Top Clusters
              </button>
              <button
                onClick={() => setComparisonTab('intents')}
                className={`px-2.5 py-1 rounded text-[9.5px] font-mono font-bold transition-all ${
                  comparisonTab === 'intents' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Intent Split
              </button>
            </div>
          </div>

          {/* Render Active Comparison Tab Chart */}
          <div className="h-[240px] w-full flex items-center justify-center">
            {comparisonTab === 'metrics' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={clusterChartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#64748b', fontSize: 8, fontWeight: 600, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 8, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#22d3ee', fontSize: '10px' }}
                    itemStyle={{ fontSize: '10px', color: '#f1f5f9' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace', paddingTop: '10px' }}
                  />
                  <Bar dataKey={datasetA.datasetName} fill="#22d3ee" name={`A: ${datasetA.datasetName.substring(0, 15)}`} radius={[4, 4, 0, 0]} />
                  <Bar dataKey={datasetB.datasetName} fill="#6366f1" name={`B: ${datasetB.datasetName.substring(0, 15)}`} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {comparisonTab === 'intents' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={intentChartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#64748b', fontSize: 8, fontWeight: 600, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 8, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#22d3ee', fontSize: '10px' }}
                    itemStyle={{ fontSize: '10px', color: '#f1f5f9' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace', paddingTop: '10px' }}
                  />
                  <Bar dataKey={datasetA.datasetName} fill="#06b6d4" name={`A: ${datasetA.datasetName.substring(0, 15)}`} radius={[4, 4, 0, 0]} />
                  <Bar dataKey={datasetB.datasetName} fill="#4f46e5" name={`B: ${datasetB.datasetName.substring(0, 15)}`} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick breakdown stats summary block below the chart */}
          <div className="grid grid-cols-2 gap-3.5 pt-1.5 border-t border-slate-900/60 text-[10px] font-mono text-slate-400">
            <div>
              <span className="font-bold text-cyan-400">Baseline Top Cluster:</span>
              <p className="text-slate-300 mt-0.5 truncate uppercase">
                {metricsA?.topCluster} ({metricsA?.topClusterVolume.toLocaleString()} Vol)
              </p>
            </div>
            <div className="border-l border-slate-900/80 pl-3.5">
              <span className="font-bold text-indigo-400">Target Top Cluster:</span>
              <p className="text-slate-300 mt-0.5 truncate uppercase">
                {metricsB?.topCluster} ({metricsB?.topClusterVolume.toLocaleString()} Vol)
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
