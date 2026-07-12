import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TopicNode, KeywordNode, SEOData, SearchIntent } from '../types';
import {
  Search,
  Clock,
  X,
  Trash2,
  Folder,
  Tag,
  ArrowRight,
  TrendingUp,
  Smile,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface SearchHistorySidebarProps {
  dataset: SEOData | null;
  selectedTopic: TopicNode | null;
  selectedKeyword: KeywordNode | null;
  onSelectTopic: (topic: TopicNode | null) => void;
  onSelectKeyword: (keyword: KeywordNode | null) => void;
  onNavigateToTab?: (tab: '3d-map' | 'neural' | 'keywords' | 'knowledge' | 'sentiment' | 'opportunities' | 'comparison') => void;
}

export interface HistoryItem {
  id: string;
  label: string;
  type: 'topic' | 'keyword' | 'text';
  timestamp: number;
}

export default function SearchHistorySidebar({
  dataset,
  selectedTopic,
  selectedKeyword,
  onSelectTopic,
  onSelectKeyword,
  onNavigateToTab
}: SearchHistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('seo_search_history_v1');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load search history', e);
    }
  }, []);

  // Save history to localStorage on change
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem('seo_search_history_v1', JSON.stringify(newHistory));
    } catch (e) {
      console.error('Failed to save search history', e);
    }
  };

  // Close suggestions if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute matched topics and keywords for autocomplete suggestions (max 5 each)
  const suggestions = useMemo(() => {
    if (!dataset || !searchQuery.trim()) return { topics: [], keywords: [] };
    const query = searchQuery.toLowerCase();
    
    const matchedTopics = (dataset.topics || [])
      .filter((t) => t.label.toLowerCase().includes(query))
      .slice(0, 5);

    const matchedKeywords = (dataset.keywords || [])
      .filter((k) => k.label.toLowerCase().includes(query))
      .slice(0, 5);

    return { topics: matchedTopics, keywords: matchedKeywords };
  }, [dataset, searchQuery]);

  // Handle addition of a searched item to the history list (limit to 5)
  const addToHistory = (label: string, type: 'topic' | 'keyword' | 'text', id: string) => {
    const newItem: HistoryItem = {
      id: `${type}-${id}-${Date.now()}`,
      label,
      type,
      timestamp: Date.now()
    };

    // Filter out existing duplicates with same label
    const filtered = history.filter((item) => item.label.toLowerCase() !== label.toLowerCase());
    const updated = [newItem, ...filtered].slice(0, 5);
    saveHistory(updated);
  };

  // Perform search actions when a suggestion or search query is confirmed
  const handleSearchConfirm = (label: string, type: 'topic' | 'keyword', id: string) => {
    if (!dataset) return;
    setSearchQuery('');
    setShowSuggestions(false);
    addToHistory(label, type, id);

    if (type === 'topic') {
      const topic = (dataset.topics || []).find((t) => t.id === id);
      if (topic) {
        onSelectTopic(topic);
        onSelectKeyword(null);
      }
    } else {
      const keyword = (dataset.keywords || []).find((k) => k.id === id);
      if (keyword) {
        onSelectKeyword(keyword);
        // Automatically select its parent topic to sync visual maps
        const parentTopic = (dataset.topics || []).find((t) => t.id === keyword.topicId);
        if (parentTopic) {
          onSelectTopic(parentTopic);
        }
      }
    }
  };

  // When general query is entered (not clicked from suggestions)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataset || !searchQuery.trim()) return;

    const query = searchQuery.trim();
    // Try to find exact match in dataset
    const exactTopic = (dataset.topics || []).find((t) => t.label.toLowerCase() === query.toLowerCase());
    if (exactTopic) {
      handleSearchConfirm(exactTopic.label, 'topic', exactTopic.id);
      return;
    }

    const exactKeyword = (dataset.keywords || []).find((k) => k.label.toLowerCase() === query.toLowerCase());
    if (exactKeyword) {
      handleSearchConfirm(exactKeyword.label, 'keyword', exactKeyword.id);
      return;
    }

    // If no exact match, find closest partial match
    const partialTopic = (dataset.topics || []).find((t) => t.label.toLowerCase().includes(query.toLowerCase()));
    if (partialTopic) {
      handleSearchConfirm(partialTopic.label, 'topic', partialTopic.id);
      return;
    }

    const partialKeyword = (dataset.keywords || []).find((k) => k.label.toLowerCase().includes(query.toLowerCase()));
    if (partialKeyword) {
      handleSearchConfirm(partialKeyword.label, 'keyword', partialKeyword.id);
      return;
    }

    // Save as generic text query if absolutely nothing matches
    addToHistory(query, 'text', 'generic');
    setSearchQuery('');
    setShowSuggestions(false);
  };

  // Clicking a history item re-selects it
  const handleHistoryClick = (item: HistoryItem) => {
    if (!dataset) {
      setSearchQuery(item.label);
      return;
    }
    // Attempt lookup in the current active dataset by label
    const matchedTopic = (dataset.topics || []).find((t) => t.label.toLowerCase() === item.label.toLowerCase());
    if (matchedTopic) {
      onSelectTopic(matchedTopic);
      onSelectKeyword(null);
      // Put at top of history
      addToHistory(matchedTopic.label, 'topic', matchedTopic.id);
      return;
    }

    const matchedKeyword = (dataset.keywords || []).find((k) => k.label.toLowerCase() === item.label.toLowerCase());
    if (matchedKeyword) {
      onSelectKeyword(matchedKeyword);
      const parentTopic = (dataset.topics || []).find((t) => t.id === matchedKeyword.topicId);
      if (parentTopic) {
        onSelectTopic(parentTopic);
      }
      addToHistory(matchedKeyword.label, 'keyword', matchedKeyword.id);
      return;
    }

    // If no strict lookup, save as generic search filter
    setSearchQuery(item.label);
    setShowSuggestions(true);
  };

  // Delete a history item
  const handleDeleteHistoryItem = (e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation();
    const updated = history.filter((item) => item.id !== idToDelete);
    saveHistory(updated);
  };

  // Clear entire history
  const handleClearAllHistory = () => {
    saveHistory([]);
  };

  // Helper info for selected topic
  const selectedTopicDetails = useMemo(() => {
    if (!dataset || !selectedTopic) return null;
    // Get its keywords
    const keywords = (dataset.keywords || []).filter((k) => k.topicId === selectedTopic.id);
    return {
      keywordsCount: keywords.length,
      avgDifficulty: keywords.length > 0
        ? Math.round(keywords.reduce((sum, k) => sum + k.difficulty, 0) / keywords.length)
        : selectedTopic.difficulty,
    };
  }, [selectedTopic, dataset]);

  return (
    <div className="bg-slate-950/60 border border-slate-900 rounded-3xl p-5 flex flex-col gap-4 h-full animate-in fade-in duration-300">
      
      {/* Search Bar section */}
      <div className="space-y-1.5 relative" ref={containerRef}>
        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase block">
          SEARCH LAB
        </span>
        <h4 className="text-xs font-black text-slate-200">
          Keyword & Topic Search
        </h4>
        
        <form onSubmit={handleFormSubmit} className="relative mt-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
          <input
            type="text"
            placeholder={dataset ? "Search active model..." : "No active dataset loaded"}
            disabled={!dataset}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className={`w-full pl-9 pr-8 py-2.5 bg-slate-900/40 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:border-cyan-500/50 focus:bg-slate-900/80 transition-all font-semibold ${!dataset ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowSuggestions(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </form>

        {/* Suggestion autocomplete panel */}
        {showSuggestions && (suggestions.topics.length > 0 || suggestions.keywords.length > 0) && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-slate-950 border border-slate-850 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-900 max-h-[250px] scrollbar-thin">
            
            {/* Topic suggestions */}
            {suggestions.topics.length > 0 && (
              <div className="p-2 space-y-1">
                <span className="text-[8px] font-mono font-bold text-slate-500 px-2 uppercase tracking-wider block">
                  Topics ({suggestions.topics.length})
                </span>
                {suggestions.topics.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSearchConfirm(t.label, 'topic', t.id)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-900/60 transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="truncate font-medium">{t.label}</span>
                    <span className="text-[8px] font-mono text-slate-500 shrink-0">Vol: {t.volume.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Keyword suggestions */}
            {suggestions.keywords.length > 0 && (
              <div className="p-2 space-y-1">
                <span className="text-[8px] font-mono font-bold text-indigo-400 px-2 uppercase tracking-wider block">
                  Keywords ({suggestions.keywords.length})
                </span>
                {suggestions.keywords.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => handleSearchConfirm(k.label, 'keyword', k.id)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:text-indigo-400 hover:bg-slate-900/60 transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="truncate font-medium">{k.label}</span>
                    <span className="text-[8px] font-mono text-slate-500 shrink-0">Diff: {k.difficulty}/100</span>
                  </button>
                ))}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Search History Panel */}
      <div className="flex-1 flex flex-col gap-2 border-t border-slate-900 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-slate-400">
            <Clock size={11} />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">
              SEARCH HISTORY
            </span>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClearAllHistory}
              className="text-[8.5px] font-mono font-bold text-slate-500 hover:text-rose-400 transition-colors uppercase"
            >
              Clear All
            </button>
          )}
        </div>

        {/* History items container */}
        <div className="space-y-1.5 flex-1 min-h-[120px] max-h-[180px] overflow-y-auto scrollbar-thin pr-0.5">
          {history.map((item) => {
            const isTopic = item.type === 'topic';
            const isKeyword = item.type === 'keyword';
            const isActive = 
              (isTopic && selectedTopic?.label.toLowerCase() === item.label.toLowerCase()) ||
              (isKeyword && selectedKeyword?.label.toLowerCase() === item.label.toLowerCase());

            return (
              <div
                key={item.id}
                onClick={() => handleHistoryClick(item)}
                className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer border transition-all ${
                  isActive
                    ? 'bg-slate-900 border-cyan-500/20 text-cyan-400 shadow'
                    : 'bg-slate-900/20 border-slate-900 text-slate-400 hover:bg-slate-900/40 hover:text-slate-200 hover:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-1">
                  {isTopic ? (
                    <Folder size={11} className={isActive ? 'text-cyan-400' : 'text-slate-500'} />
                  ) : isKeyword ? (
                    <Tag size={11} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
                  ) : (
                    <Clock size={11} className="text-slate-500" />
                  )}
                  <span className="truncate font-semibold text-[11px]">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[8px] font-mono px-1 py-0.5 rounded-md font-bold ${
                    isTopic
                      ? 'text-cyan-400 bg-cyan-950/20 border border-cyan-500/10'
                      : isKeyword
                      ? 'text-indigo-400 bg-indigo-950/20 border border-indigo-500/10'
                      : 'text-slate-400 bg-slate-900 border border-slate-800'
                  }`}>
                    {isTopic ? 'TOPIC' : isKeyword ? 'KEYWORD' : 'TEXT'}
                  </span>
                  
                  <button
                    onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                    className="text-slate-600 hover:text-rose-400 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove item"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            );
          })}

          {history.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-6 text-slate-600 border border-dashed border-slate-900 rounded-2xl px-3">
              <Clock size={16} className="mb-1.5 opacity-50" />
              <p className="text-[9.5px] font-mono font-semibold">History is empty</p>
              <p className="text-[8px] text-slate-700 mt-0.5">Your last 5 queries will be cataloged here for quick retrieval.</p>
            </div>
          )}
        </div>
      </div>

      {/* Selected Entity Details Panel */}
      {(selectedTopic || selectedKeyword) && (
        <div className="border-t border-slate-900 pt-3.5 mt-auto space-y-2.5 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase">
              FOCUS DETAILS
            </span>
            <button
              onClick={() => {
                onSelectTopic(null);
                onSelectKeyword(null);
              }}
              className="text-[8.5px] font-mono text-slate-500 hover:text-slate-300 transition-colors uppercase"
            >
              Clear Focus
            </button>
          </div>

          {/* Topic selection card details */}
          {selectedTopic && !selectedKeyword && (
            <div className="bg-cyan-950/5 border border-cyan-500/10 rounded-2xl p-3.5 space-y-3">
              <div>
                <span className="text-[8px] font-mono font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-500/10 px-1.5 py-0.5 rounded-md uppercase">
                  ACTIVE TOPIC
                </span>
                <h5 className="text-xs font-black text-white mt-1.5 leading-snug truncate">
                  {selectedTopic.label}
                </h5>
                <p className="text-[10px] font-mono font-bold text-slate-500 mt-0.5">
                  Cluster: {selectedTopic.cluster}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono bg-slate-900/30 p-2 rounded-xl border border-slate-900/60">
                <div className="border-r border-slate-900">
                  <span className="text-[8px] text-slate-500 block uppercase font-bold">Aggregate Vol</span>
                  <span className="text-xs font-bold text-slate-200">{selectedTopic.volume.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-500 block uppercase font-bold">Difficulty</span>
                  <span className="text-xs font-bold text-cyan-400">{selectedTopic.difficulty}/100</span>
                </div>
              </div>

              {selectedTopicDetails && (
                <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-mono">
                  <span>Linked Keywords:</span>
                  <span className="font-bold text-slate-200">{selectedTopicDetails.keywordsCount} items</span>
                </div>
              )}

              {/* Quick links to visuals */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => onNavigateToTab?.('3d-map')}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-mono font-bold text-slate-300 rounded-lg text-center transition-all flex items-center justify-center gap-1"
                >
                  <TrendingUp size={9.5} /> Map Focus
                </button>
                <button
                  onClick={() => onNavigateToTab?.('sentiment')}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-mono font-bold text-slate-300 rounded-lg text-center transition-all flex items-center justify-center gap-1"
                >
                  <Smile size={9.5} /> Sentiment
                </button>
              </div>
            </div>
          )}

          {/* Keyword selection card details */}
          {selectedKeyword && (
            <div className="bg-indigo-950/5 border border-indigo-500/10 rounded-2xl p-3.5 space-y-3">
              <div>
                <span className="text-[8px] font-mono font-bold text-indigo-400 bg-indigo-950/30 border border-indigo-500/10 px-1.5 py-0.5 rounded-md uppercase">
                  ACTIVE KEYWORD
                </span>
                <h5 className="text-xs font-black text-white mt-1.5 leading-snug">
                  {selectedKeyword.label}
                </h5>
                <span className="text-[8px] font-mono font-bold text-amber-400 px-1.5 py-0.5 bg-amber-950/20 border border-amber-500/10 rounded-md inline-block mt-1">
                  Intent: {selectedKeyword.intent}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono bg-slate-900/30 p-1.5 rounded-xl border border-slate-900/60">
                <div>
                  <span className="text-[7.5px] text-slate-500 block uppercase font-bold">Volume</span>
                  <span className="text-[10.5px] font-extrabold text-slate-200">{selectedKeyword.volume.toLocaleString()}</span>
                </div>
                <div className="border-x border-slate-900">
                  <span className="text-[7.5px] text-slate-500 block uppercase font-bold">Diff</span>
                  <span className="text-[10.5px] font-extrabold text-indigo-400">{selectedKeyword.difficulty}</span>
                </div>
                <div>
                  <span className="text-[7.5px] text-slate-500 block uppercase font-bold">CPC</span>
                  <span className="text-[10.5px] font-extrabold text-slate-200">${selectedKeyword.cpc.toFixed(1)}</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 leading-normal font-mono border-t border-slate-900/60 pt-2 flex items-center justify-between">
                <span>Domain Auth Limit:</span>
                <span className="text-emerald-400 font-bold">{selectedKeyword.authority}/100</span>
              </div>

              <div className="pt-0.5">
                <button
                  onClick={() => onNavigateToTab?.('keywords')}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-mono font-bold text-slate-300 rounded-lg text-center transition-all flex items-center justify-center gap-1"
                >
                  View Semantic Cluster Graph
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
