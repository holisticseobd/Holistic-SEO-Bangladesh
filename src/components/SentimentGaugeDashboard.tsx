import React, { useState, useMemo } from 'react';
import { KeywordNode, TopicNode, SEOData } from '../types';
import {
  Smile,
  Frown,
  Meh,
  Search,
  MessageSquare,
  Globe,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Star,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface SentimentGaugeDashboardProps {
  dataset: SEOData;
}

export default function SentimentGaugeDashboard({ dataset }: SentimentGaugeDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(
    dataset.keywords.length > 0 ? dataset.keywords[0].id : null
  );

  // Filter keywords based on search
  const filteredKeywords = useMemo(() => {
    return dataset.keywords.filter((k) =>
      k.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dataset.keywords, searchTerm]);

  // Find the currently selected keyword
  const activeKeyword = useMemo(() => {
    if (!selectedKeywordId) return null;
    return dataset.keywords.find((k) => k.id === selectedKeywordId) || null;
  }, [dataset.keywords, selectedKeywordId]);

  // Overall dataset sentiment stats
  const datasetStats = useMemo(() => {
    if (dataset.keywords.length === 0) return { avg: 0, positiveCount: 0, neutralCount: 0, negativeCount: 0 };
    
    const total = dataset.keywords.reduce((acc, k) => acc + (k.sentiment || 50), 0);
    const avg = Math.round(total / dataset.keywords.length);
    
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    
    dataset.keywords.forEach((k) => {
      const s = k.sentiment || 50;
      if (s >= 70) positiveCount++;
      else if (s >= 45) neutralCount++;
      else negativeCount++;
    });

    return {
      avg,
      positiveCount,
      neutralCount,
      negativeCount,
      totalCount: dataset.keywords.length
    };
  }, [dataset.keywords]);

  // Get sentiment status metadata
  const getSentimentMeta = (score: number) => {
    if (score >= 70) {
      return {
        label: 'Highly Positive',
        color: 'text-emerald-400',
        borderColor: 'border-emerald-500/20',
        bgColor: 'bg-emerald-950/20',
        barColor: '#10b981',
        icon: Smile,
      };
    } else if (score >= 45) {
      return {
        label: 'Neutral / Mixed',
        color: 'text-amber-400',
        borderColor: 'border-amber-500/20',
        bgColor: 'bg-amber-950/20',
        barColor: '#f59e0b',
        icon: Meh,
      };
    } else {
      return {
        label: 'Negative / Skeptical',
        color: 'text-rose-400',
        borderColor: 'border-rose-500/20',
        bgColor: 'bg-rose-950/20',
        barColor: '#f43f5e',
        icon: Frown,
      };
    }
  };

  // Helper to draw SVG Semi-Circular Gauge
  const renderGauge = (score: number, size = 160) => {
    const meta = getSentimentMeta(score);
    const strokeWidth = size * 0.1;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * Math.PI * 2;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Base track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(30, 41, 59, 0.4)"
            strokeWidth={strokeWidth}
          />
          {/* Active progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={meta.barColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-black text-white font-mono leading-none">{score}%</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 ${meta.color}`}>
            {meta.label}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 flex flex-col h-full gap-5 animate-in fade-in duration-300">
      
      {/* Top Title/Metric summary */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Smile className="text-emerald-400" size={18} />
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              ORGANIC SERP SENTIMENT GAUGER
            </span>
          </div>
          <h3 className="text-lg font-black text-white mt-1.5">
            Keyword Topic Sentiment Dashboard
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated sentiment coefficients computed from real-time organic search snippets and practitioner reviews.
          </p>
        </div>

        {/* Global mini-metrics */}
        <div className="flex items-center gap-4 bg-slate-900/40 border border-slate-900/80 p-3.5 rounded-2xl">
          <div className="text-center px-3 border-r border-slate-900">
            <span className="text-[8.5px] font-mono text-slate-500 uppercase block font-bold">
              Mean Sentiment
            </span>
            <span className="text-base font-black text-cyan-400 font-mono">
              {datasetStats.avg}%
            </span>
          </div>
          <div className="text-center px-3 border-r border-slate-900">
            <span className="text-[8.5px] font-mono text-slate-500 uppercase block font-bold">
              Positive
            </span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {datasetStats.positiveCount} <span className="text-[9px] text-slate-500 font-normal">kw</span>
            </span>
          </div>
          <div className="text-center px-3 border-r border-slate-900">
            <span className="text-[8.5px] font-mono text-slate-500 uppercase block font-bold">
              Neutral
            </span>
            <span className="text-sm font-bold text-amber-400 font-mono">
              {datasetStats.neutralCount} <span className="text-[9px] text-slate-500 font-normal">kw</span>
            </span>
          </div>
          <div className="text-center px-3">
            <span className="text-[8.5px] font-mono text-slate-500 uppercase block font-bold">
              Skeptical
            </span>
            <span className="text-sm font-bold text-rose-400 font-mono">
              {datasetStats.negativeCount} <span className="text-[9px] text-slate-500 font-normal">kw</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
        
        {/* Left column: Keyword Selector List (4 cols) */}
        <div className="lg:col-span-4 bg-slate-950 rounded-2xl border border-slate-900/80 p-4 flex flex-col gap-4 max-h-[420px]">
          
          {/* Keyword Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
            <input
              type="text"
              placeholder="Filter by keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/40 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:border-cyan-500/50 transition-all font-semibold"
            />
          </div>

          {/* List area */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {filteredKeywords.map((k) => {
              const meta = getSentimentMeta(k.sentiment || 50);
              const isSelected = k.id === selectedKeywordId;
              
              return (
                <button
                  key={k.id}
                  onClick={() => setSelectedKeywordId(k.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-900 border-slate-800 shadow'
                      : 'bg-transparent border-transparent hover:bg-slate-900/20'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {k.label}
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5 uppercase tracking-wide">
                      Intent: {k.intent}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono">
                    <span className={`text-xs font-black ${meta.color}`}>
                      {k.sentiment}%
                    </span>
                    <meta.icon size={11} className={meta.color} />
                  </div>
                </button>
              );
            })}

            {filteredKeywords.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle size={20} className="mx-auto text-slate-600 mb-2" />
                <p className="text-xs font-mono font-bold text-slate-500">No keywords found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Active Sentiment Gauge Detail Area (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-5 overflow-y-auto max-h-[420px] scrollbar-thin pr-1">
          {activeKeyword ? (
            <div className="space-y-5">
              
              {/* Highlight Dashboard Info Banner */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-slate-900/20 border border-slate-900 p-5 rounded-2xl items-center">
                
                {/* SVG Gauge block */}
                <div className="md:col-span-4 flex justify-center">
                  {renderGauge(activeKeyword.sentiment || 50, 130)}
                </div>

                {/* KPI block info */}
                <div className="md:col-span-8 space-y-3">
                  <div>
                    <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                      ACTIVE SEGMENT INTEL
                    </span>
                    <h4 className="text-base font-black text-white mt-0.5">{activeKeyword.label}</h4>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-xl text-center">
                      <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Search Vol</span>
                      <span className="text-xs font-black font-mono text-slate-200">{activeKeyword.volume.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-xl text-center">
                      <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Difficulty</span>
                      <span className="text-xs font-black font-mono text-slate-200">{activeKeyword.difficulty}/100</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-xl text-center">
                      <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Authority</span>
                      <span className="text-xs font-black font-mono text-slate-200">{activeKeyword.authority}%</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-normal font-medium">
                    This sentiment index measures qualitative brand perception and snippet click trust ratios.
                    Computed from <strong>{activeKeyword.snippets?.length || 0} organic snippets</strong> and <strong>{activeKeyword.reviews?.length || 0} customer reviews</strong>.
                  </p>
                </div>
              </div>

              {/* Side by side: Snippets vs Reviews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Organic Search Snippets Card */}
                <div className="bg-slate-950 rounded-2xl border border-slate-900 p-4.5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                    <Globe className="text-cyan-400 animate-pulse" size={14} />
                    <h5 className="text-xs font-black text-slate-200">
                      Organic Search Snippets
                    </h5>
                  </div>

                  <div className="space-y-3.5 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
                    {activeKeyword.snippets?.map((snip, index) => {
                      const smeta = getSentimentMeta(snip.sentiment);
                      return (
                        <div key={index} className="bg-slate-900/30 border border-slate-900/60 p-3 rounded-xl space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[9px] font-mono font-bold text-slate-500">
                              {snip.source}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className={`text-[9.5px] font-mono font-bold ${smeta.color}`}>
                                {snip.sentiment}%
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] font-bold text-slate-200 hover:underline cursor-pointer leading-tight">
                            {snip.title}
                          </p>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            {snip.snippet}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* User Reviews Card */}
                <div className="bg-slate-950 rounded-2xl border border-slate-900 p-4.5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                    <MessageSquare className="text-indigo-400" size={14} />
                    <h5 className="text-xs font-black text-slate-200">
                      Practitioner / User Reviews
                    </h5>
                  </div>

                  <div className="space-y-3.5 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
                    {activeKeyword.reviews?.map((rev, index) => {
                      const rmeta = getSentimentMeta(rev.sentiment);
                      return (
                        <div key={index} className="bg-slate-900/30 border border-slate-900/60 p-3 rounded-xl space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[9.5px] font-bold text-slate-300">
                                {rev.author}
                              </p>
                              {/* Rating Stars */}
                              <div className="flex items-center gap-0.5 mt-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    size={8.5}
                                    className={i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className={`text-[9.5px] font-mono font-bold ${rmeta.color}`}>
                              {rev.sentiment}%
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal italic">
                            "{rev.text}"
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-900/10 border border-slate-900 rounded-2xl">
              <Smile className="text-slate-600 animate-bounce" size={28} />
              <p className="text-xs font-mono font-bold text-slate-400 mt-2">
                Select a keyword from the sidebar
              </p>
              <p className="text-[10.5px] text-slate-500 mt-1 max-w-[280px]">
                We will display the full sentiment breakdown with live SERP snippets and reviews.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
