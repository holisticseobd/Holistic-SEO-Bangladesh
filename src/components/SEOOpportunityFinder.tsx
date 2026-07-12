import React, { useState, useMemo } from 'react';
import { KeywordNode, TopicNode, SEOData, SearchIntent } from '../types';
import {
  Sparkles,
  Plus,
  Check,
  TrendingUp,
  AlertTriangle,
  Zap,
  Folder,
  ArrowRight,
  Search,
  BookOpen,
  DollarSign,
  Briefcase,
  HelpCircle,
  Lightbulb
} from 'lucide-react';

interface SEOOpportunityFinderProps {
  dataset: SEOData;
  onAddKeyword?: (newKeyword: KeywordNode) => void;
}

interface CustomOpportunity {
  id: string;
  label: string;
  topicId: string;
  topicLabel: string;
  cluster: string;
  volume: number;
  difficulty: number;
  cpc: number;
  intent: SearchIntent;
  authority: number;
  reason: string;
  impact: 'High' | 'Medium' | 'Low';
}

export default function SEOOpportunityFinder({ dataset, onAddKeyword }: SEOOpportunityFinderProps) {
  const [activeTab, setActiveTab] = useState<'all-gaps' | 'quick-wins' | 'cluster-gaps'>('all-gaps');
  const [searchQuery, setSearchQuery] = useState('');
  const [targetedKeywordIds, setTargetedKeywordIds] = useState<string[]>([]);

  // 1. Calculate Cluster Gaps (Topic clusters with low keyword coverage or low average difficulty)
  const clusterMetrics = useMemo(() => {
    const metrics: Record<string, { topicCount: number; keywordCount: number; totalVolume: number; avgDifficulty: number }> = {};
    
    dataset.topics.forEach((t) => {
      if (!metrics[t.cluster]) {
        metrics[t.cluster] = { topicCount: 0, keywordCount: 0, totalVolume: 0, avgDifficulty: 0 };
      }
      metrics[t.cluster].topicCount += 1;
      metrics[t.cluster].totalVolume += t.volume;
    });

    dataset.keywords.forEach((k) => {
      // Find parent topic's cluster
      const parentTopic = dataset.topics.find((t) => t.id === k.topicId);
      if (parentTopic) {
        if (!metrics[parentTopic.cluster]) {
          metrics[parentTopic.cluster] = { topicCount: 0, keywordCount: 0, totalVolume: 0, avgDifficulty: 0 };
        }
        metrics[parentTopic.cluster].keywordCount += 1;
        metrics[parentTopic.cluster].avgDifficulty += k.difficulty;
      }
    });

    return Object.entries(metrics).map(([clusterName, data]) => {
      const avgDiff = data.keywordCount > 0 ? Math.round(data.avgDifficulty / data.keywordCount) : 50;
      // Heuristic for coverage density (keywords per topic)
      const densityRatio = data.topicCount > 0 ? Number((data.keywordCount / data.topicCount).toFixed(1)) : 0;
      
      let status: 'Under-Optimized' | 'Healthy' | 'Oversaturated' = 'Healthy';
      let statusColor = 'text-emerald-400 bg-emerald-950/20 border-emerald-500/10';
      if (densityRatio < 1.5) {
        status = 'Under-Optimized';
        statusColor = 'text-rose-400 bg-rose-950/20 border-rose-500/10';
      } else if (densityRatio > 3.5) {
        status = 'Oversaturated';
        statusColor = 'text-amber-400 bg-amber-950/20 border-amber-500/10';
      }

      return {
        cluster: clusterName,
        ...data,
        avgDifficulty: avgDiff,
        densityRatio,
        status,
        statusColor
      };
    });
  }, [dataset]);

  // 2. Identify Quick Wins (High search volume, low-to-medium difficulty keywords)
  const quickWins = useMemo(() => {
    return dataset.keywords
      .filter((k) => k.difficulty <= 50 && k.volume >= 2000)
      .sort((a, b) => b.volume - a.volume)
      .map((k) => {
        const parentTopic = dataset.topics.find((t) => t.id === k.topicId);
        return {
          ...k,
          topicLabel: parentTopic?.label || 'General Topic',
          cluster: parentTopic?.cluster || 'Uncategorized',
          roiScore: Math.round((k.volume / (k.difficulty || 1)) * 10)
        };
      })
      .sort((a, b) => b.roiScore - a.roiScore);
  }, [dataset]);

  // 3. Generate high-value "Missing Keyword Opportunities" dynamically based on dataset
  const missingOpportunities = useMemo<CustomOpportunity[]>(() => {
    const currentKeywordLabels = new Set(dataset.keywords.map((k) => k.label.toLowerCase()));
    const opportunities: CustomOpportunity[] = [];

    // Heuristics based on active topics in the dataset
    dataset.topics.forEach((t) => {
      const normalizedTopic = t.label.toLowerCase();
      
      if (normalizedTopic.includes('inbound') || normalizedTopic.includes('content')) {
        const candidates = [
          {
            label: 'inbound marketing pipeline setup templates',
            volume: 4800,
            difficulty: 38,
            cpc: 4.5,
            intent: 'Commercial' as SearchIntent,
            reason: 'High transactional readiness but currently zero content matching exact template queries in this cluster.',
            impact: 'High' as const,
          },
          {
            label: 'how to build content map for b2b saas',
            volume: 8200,
            difficulty: 42,
            cpc: 2.8,
            intent: 'Informational' as SearchIntent,
            reason: 'Massive volume spike in informational intent with relatively weak domain authority coverage on page 1.',
            impact: 'High' as const,
          },
          {
            label: 'automated product led SEO roadmap',
            volume: 3200,
            difficulty: 35,
            cpc: 6.20,
            intent: 'Transactional' as SearchIntent,
            reason: 'Combines Product Led Growth and SEO. High commercial intent for agency solutions.',
            impact: 'Medium' as const,
          }
        ];
        
        candidates.forEach((cand, idx) => {
          if (!currentKeywordLabels.has(cand.label.toLowerCase())) {
            opportunities.push({
              id: `opp-${t.id}-${idx}`,
              label: cand.label,
              topicId: t.id,
              topicLabel: t.label,
              cluster: t.cluster,
              volume: cand.volume,
              difficulty: cand.difficulty,
              cpc: cand.cpc,
              intent: cand.intent,
              authority: Math.min(100, t.difficulty - 10),
              reason: cand.reason,
              impact: cand.impact,
            });
          }
        });
      }

      if (normalizedTopic.includes('technical') || normalizedTopic.includes('crawl')) {
        const candidates = [
          {
            label: 'automated crawl budget audit checklist',
            volume: 5200,
            difficulty: 45,
            cpc: 7.80,
            intent: 'Commercial' as SearchIntent,
            reason: 'Technical searchers looking for ready-made script templates. Excellent opportunity for tools/SaaS signups.',
            impact: 'High' as const,
          },
          {
            label: 'dynamic rendering SEO nextjs middleware',
            volume: 3900,
            difficulty: 32,
            cpc: 5.50,
            intent: 'Informational' as SearchIntent,
            reason: 'Solves Javascript indexing issues for react applications. High-affinity tech audience.',
            impact: 'Medium' as const,
          }
        ];

        candidates.forEach((cand, idx) => {
          if (!currentKeywordLabels.has(cand.label.toLowerCase())) {
            opportunities.push({
              id: `opp-${t.id}-${idx + 10}`,
              label: cand.label,
              topicId: t.id,
              topicLabel: t.label,
              cluster: t.cluster,
              volume: cand.volume,
              difficulty: cand.difficulty,
              cpc: cand.cpc,
              intent: cand.intent,
              reason: cand.reason,
              impact: cand.impact,
              authority: Math.min(100, t.difficulty - 5),
            });
          }
        });
      }

      if (normalizedTopic.includes('cro') || normalizedTopic.includes('conversion') || normalizedTopic.includes('conversion rate')) {
        const candidates = [
          {
            label: 'best b2b checkout page layout templates',
            volume: 6100,
            difficulty: 39,
            cpc: 12.40,
            intent: 'Transactional' as SearchIntent,
            reason: 'High CPC transactional buyer keyword with minimal high-quality structural layout resources.',
            impact: 'High' as const,
          },
          {
            label: 'saas pricing tier interactive calculator templates',
            volume: 4500,
            difficulty: 29,
            cpc: 9.10,
            intent: 'Commercial' as SearchIntent,
            reason: 'High engagement interactive layout widget. Very low keyword difficulty compared to conversion potential.',
            impact: 'High' as const,
          }
        ];

        candidates.forEach((cand, idx) => {
          if (!currentKeywordLabels.has(cand.label.toLowerCase())) {
            opportunities.push({
              id: `opp-${t.id}-${idx + 20}`,
              label: cand.label,
              topicId: t.id,
              topicLabel: t.label,
              cluster: t.cluster,
              volume: cand.volume,
              difficulty: cand.difficulty,
              cpc: cand.cpc,
              intent: cand.intent,
              reason: cand.reason,
              impact: cand.impact,
              authority: Math.min(100, t.difficulty - 15),
            });
          }
        });
      }

      // General fallback candidate if opportunities are thin
      if (opportunities.length < 3) {
        const candidates = [
          {
            label: `${normalizedTopic} automated analysis schema`,
            volume: 3500,
            difficulty: 30,
            cpc: 5.10,
            intent: 'Commercial' as SearchIntent,
            reason: 'High relevance semantic query with easy ranking parameters due to sparse competitive layouts.',
            impact: 'Medium' as const,
          }
        ];

        candidates.forEach((cand, idx) => {
          if (!currentKeywordLabels.has(cand.label.toLowerCase())) {
            opportunities.push({
              id: `opp-${t.id}-${idx + 30}`,
              label: cand.label,
              topicId: t.id,
              topicLabel: t.label,
              cluster: t.cluster,
              volume: cand.volume,
              difficulty: cand.difficulty,
              cpc: cand.cpc,
              intent: cand.intent,
              reason: cand.reason,
              impact: cand.impact,
              authority: Math.min(100, t.difficulty),
            });
          }
        });
      }
    });

    return opportunities;
  }, [dataset]);

  // Handle triggering add to dataset target list
  const handleTargetOpportunity = (opp: CustomOpportunity) => {
    if (targetedKeywordIds.includes(opp.id)) return;
    
    // Call props to dynamically inject keyword in global state
    if (onAddKeyword) {
      const newKeyword: KeywordNode = {
        id: `kw-dyn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        label: opp.label,
        topicId: opp.topicId,
        volume: opp.volume,
        difficulty: opp.difficulty,
        cpc: opp.cpc,
        intent: opp.intent,
        authority: opp.authority,
      };
      
      onAddKeyword(newKeyword);
      setTargetedKeywordIds((prev) => [...prev, opp.id]);
    }
  };

  // Filter missing opportunities by search
  const filteredOpportunities = useMemo(() => {
    return missingOpportunities.filter((opp) =>
      opp.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.topicLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.cluster.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [missingOpportunities, searchQuery]);

  return (
    <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 flex flex-col h-full gap-5 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-cyan-400" size={18} />
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              SEMANTIC GAP FINDER
            </span>
          </div>
          <h3 className="text-lg font-black text-white mt-1.5">
            SEO Opportunity Finder
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Analyzing search metrics and topic cluster completeness to discover low-competition targets and keyword gaps.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-900/60 border border-slate-800/80 p-1 rounded-xl shrink-0 self-start">
          <button
            onClick={() => setActiveTab('all-gaps')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-mono font-bold transition-all ${
              activeTab === 'all-gaps'
                ? 'bg-slate-800 text-cyan-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lightbulb size={11} />
            High-Value Gaps ({missingOpportunities.length})
          </button>
          <button
            onClick={() => setActiveTab('quick-wins')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-mono font-bold transition-all ${
              activeTab === 'quick-wins'
                ? 'bg-slate-800 text-cyan-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap size={11} />
            Quick Wins ({quickWins.length})
          </button>
          <button
            onClick={() => setActiveTab('cluster-gaps')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-mono font-bold transition-all ${
              activeTab === 'cluster-gaps'
                ? 'bg-slate-800 text-cyan-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Folder size={11} />
            Cluster Coverage ({clusterMetrics.length})
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto max-h-[420px] scrollbar-thin pr-1">
        
        {/* TAB 1: ALL MISSING OPPORTUNITIES GAP FINDER */}
        {activeTab === 'all-gaps' && (
          <div className="space-y-4">
            
            {/* Search filter for gaps */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                <input
                  type="text"
                  placeholder="Filter semantic gaps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900/40 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:border-cyan-500/50 transition-all font-semibold"
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold hidden sm:inline">
                Suggested gaps are compiled based on {dataset.topics.length} core clusters.
              </span>
            </div>

            {/* List of high value missing opportunities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOpportunities.map((opp) => {
                const isTargeted = targetedKeywordIds.includes(opp.id);
                
                return (
                  <div
                    key={opp.id}
                    className={`bg-slate-950 rounded-2xl border p-4 flex flex-col justify-between transition-all gap-4 ${
                      isTargeted ? 'border-cyan-500/30 bg-cyan-950/5' : 'border-slate-900 hover:border-slate-800'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Topic & Impact header */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-900/60 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Folder className="text-slate-500" size={11} />
                          <span className="text-[9.5px] font-mono text-slate-400 font-bold truncate max-w-[150px]">
                            {opp.topicLabel}
                          </span>
                        </div>
                        <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${
                          opp.impact === 'High'
                            ? 'text-rose-400 bg-rose-950/20 border-rose-500/10'
                            : 'text-amber-400 bg-amber-950/20 border-amber-500/10'
                        }`}>
                          {opp.impact} Impact
                        </span>
                      </div>

                      {/* Opportunity Keyword details */}
                      <div>
                        <h4 className="text-xs font-black text-white hover:text-cyan-400 transition-colors leading-snug">
                          {opp.label}
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1.5">
                          {opp.reason}
                        </p>
                      </div>

                      {/* Intent & metrics row */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-900/25 p-2 rounded-xl">
                        <div className="text-center border-r border-slate-900/60">
                          <span className="text-[7.5px] font-mono text-slate-500 block uppercase font-bold">Est. Vol</span>
                          <span className="text-[10.5px] font-extrabold text-slate-200 font-mono">
                            {opp.volume.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-center border-r border-slate-900/60">
                          <span className="text-[7.5px] font-mono text-slate-500 block uppercase font-bold">Est. CPC</span>
                          <span className="text-[10.5px] font-extrabold text-slate-200 font-mono flex items-center justify-center">
                            <DollarSign size={8.5} className="text-slate-500" />
                            {opp.cpc.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-[7.5px] font-mono text-slate-500 block uppercase font-bold">Difficulty</span>
                          <span className="text-[10.5px] font-extrabold text-emerald-400 font-mono">
                            {opp.difficulty}/100
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action trigger button */}
                    <button
                      onClick={() => handleTargetOpportunity(opp)}
                      disabled={isTargeted}
                      className={`w-full py-2.5 rounded-xl text-[10.5px] font-mono font-extrabold transition-all border flex items-center justify-center gap-1.5 ${
                        isTargeted
                          ? 'bg-slate-900 border-slate-800 text-cyan-400/60 cursor-default'
                          : 'bg-cyan-500 hover:bg-cyan-400 border-cyan-600 text-slate-950 active:scale-[0.98]'
                      }`}
                    >
                      {isTargeted ? (
                        <>
                          <Check size={11} />
                          ADDED TO TARGET LIST
                        </>
                      ) : (
                        <>
                          <Plus size={11} />
                          INJECT TO ACTIVE TARGETS
                        </>
                      )}
                    </button>
                  </div>
                );
              })}

              {filteredOpportunities.length === 0 && (
                <div className="col-span-2 text-center py-16">
                  <AlertTriangle size={24} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-xs font-mono font-bold text-slate-500">No semantic opportunities found</p>
                  <p className="text-[10px] text-slate-600 mt-1">Try broadening your search criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: QUICK WINS LIST */}
        {activeTab === 'quick-wins' && (
          <div className="space-y-4">
            <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-2xl flex items-start gap-3">
              <Zap className="text-amber-400 shrink-0 mt-0.5" size={14} />
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-slate-200">High-Volume, Low-Difficulty Sweetspots</h4>
                <p className="text-[10px] text-slate-500 leading-normal">
                  These keywords exist in your current model and have low competitive scores with healthy volumes. 
                  Targeting these immediately requires minimal structural backlinking effort.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {quickWins.map((k) => (
                <div
                  key={k.id}
                  className="bg-slate-950 border border-slate-900/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-800 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[8.5px] font-mono font-bold text-indigo-400 px-1.5 py-0.5 bg-indigo-950/20 border border-indigo-500/10 rounded-md">
                        {k.intent}
                      </span>
                      <span className="text-[8.5px] font-mono font-bold text-slate-500">
                        {k.cluster}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-white">{k.label}</h4>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 shrink-0 font-mono">
                    <div className="text-right">
                      <span className="text-[7.5px] text-slate-500 block uppercase font-bold">Volume</span>
                      <span className="text-xs font-bold text-slate-200">{k.volume.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[7.5px] text-slate-500 block uppercase font-bold">Difficulty</span>
                      <span className="text-xs font-bold text-emerald-400">{k.difficulty}/100</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[7.5px] text-slate-500 block uppercase font-bold">CPC</span>
                      <span className="text-xs font-bold text-slate-200">${k.cpc.toFixed(2)}</span>
                    </div>
                    <div className="bg-emerald-950/20 border border-emerald-500/10 px-2 py-1.5 rounded-xl text-center shrink-0">
                      <span className="text-[7.5px] text-slate-500 block uppercase font-bold">ROI Factor</span>
                      <span className="text-xs font-black text-emerald-400">{k.roiScore}</span>
                    </div>
                  </div>
                </div>
              ))}

              {quickWins.length === 0 && (
                <div className="text-center py-16">
                  <AlertTriangle size={24} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-xs font-mono font-bold text-slate-500">No easy-win keywords identified</p>
                  <p className="text-[10px] text-slate-600 mt-1">Difficulty scores for all loaded items are high.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CLUSTER DENSITY COVERAGE ANALYZER */}
        {activeTab === 'cluster-gaps' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {clusterMetrics.map((met, index) => (
                <div
                  key={index}
                  className="bg-slate-950 border border-slate-900 rounded-2xl p-4 flex flex-col justify-between gap-4 hover:border-slate-800 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-900/60 pb-2">
                      <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${met.statusColor}`}>
                        {met.status}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-slate-500">
                        {met.keywordCount} Keywords
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-white leading-snug">
                      {met.cluster}
                    </h4>
                  </div>

                  <div className="space-y-2 font-mono">
                    {/* Progress Bar showing cluster density */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[8px] font-bold text-slate-400">
                        <span>Keyword-to-Topic Ratio</span>
                        <span className="text-cyan-400">{met.densityRatio}x</span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            met.densityRatio < 1.5
                              ? 'bg-rose-500'
                              : met.densityRatio > 3.5
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (met.densityRatio / 5) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[9px] bg-slate-900/30 p-1.5 rounded-xl text-center">
                      <div>
                        <span className="text-[7px] text-slate-500 block uppercase font-bold">Avg Diff</span>
                        <span className="text-[9.5px] font-extrabold text-slate-300">{met.avgDifficulty}</span>
                      </div>
                      <div>
                        <span className="text-[7px] text-slate-500 block uppercase font-bold">Agg Vol</span>
                        <span className="text-[9.5px] font-extrabold text-cyan-400">{met.totalVolume.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
