import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SEOData, TopicNode, KeywordNode } from '../types';
import {
  Search,
  Command,
  Monitor,
  Eye,
  Database,
  TrendingUp,
  Tag,
  Folder,
  Keyboard,
  ArrowRight,
  Sparkles,
  GitCompare,
  Smile,
  X
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: SEOData[];
  activeDatasetIndex: number;
  onSelectDataset: (index: number) => void;
  onSelectTopic: (topic: TopicNode | null) => void;
  onSelectKeyword: (keyword: KeywordNode | null) => void;
  onSelectVisualizer: (tab: '3d-map' | 'neural' | 'keywords' | 'knowledge' | 'sentiment' | 'opportunities' | 'comparison') => void;
}

interface CommandItem {
  id: string;
  category: 'Views' | 'Models' | 'Entities' | 'Global Search';
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  datasets,
  activeDatasetIndex,
  onSelectDataset,
  onSelectTopic,
  onSelectKeyword,
  onSelectVisualizer
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle outside click to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Compile matching navigation and entity queries dynamically
  const filteredCommands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // 1. App Views
    const views: { label: string; tab: Parameters<typeof onSelectVisualizer>[0]; desc: string; icon: React.ReactNode }[] = [
      { label: 'Go to 3D Topic Map', tab: '3d-map', desc: 'Interact with the 3D semantic layout of topical authority clusters', icon: <Monitor className="text-cyan-400" size={13} /> },
      { label: 'Go to Neural Topic Net', tab: 'neural', desc: 'Navigate the force-directed layout mapping topic affinities', icon: <TrendingUp className="text-pink-400" size={13} /> },
      { label: 'Go to Semantic Cluster Graph', tab: 'keywords', desc: 'View granular keyword nodes linked inside active clusters', icon: <Tag className="text-indigo-400" size={13} /> },
      { label: 'Go to Entity & Schema Graph', tab: 'knowledge', desc: 'Explore automated semantic web markup connections', icon: <Database className="text-amber-400" size={13} /> },
      { label: 'Go to Sentiment Analyzer', tab: 'sentiment', desc: 'Audit opinion indicators, positive and negative scores', icon: <Smile className="text-emerald-400" size={13} /> },
      { label: 'Go to Opportunity Finder', tab: 'opportunities', desc: 'Discover high-volume gaps, under-optimized clusters', icon: <Sparkles className="text-yellow-400" size={13} /> },
      { label: 'Go to Benchmark Compare', tab: 'comparison', desc: 'Perform multi-dataset side-by-side benchmarking and metric deltas', icon: <GitCompare className="text-sky-400" size={13} /> },
    ];

    views.forEach((v) => {
      items.push({
        id: `view-${v.tab}`,
        category: 'Views',
        label: v.label,
        subtitle: v.desc,
        icon: v.icon,
        action: () => {
          onSelectVisualizer(v.tab);
          onClose();
        }
      });
    });

    // 2. Loadable Datasets
    datasets.forEach((d, idx) => {
      items.push({
        id: `model-${idx}`,
        category: 'Models',
        label: `Switch to Model: ${d.datasetName.toUpperCase()}`,
        subtitle: `Activate this dataset (${(d.topics || []).length} topics, ${(d.keywords || []).length} keywords)`,
        icon: <Eye className={activeDatasetIndex === idx ? 'text-emerald-400' : 'text-slate-500'} size={13} />,
        action: () => {
          onSelectDataset(idx);
          onClose();
        }
      });
    });

    // 3. Search matched entities across all loaded models
    if (query.trim().length >= 1) {
      const q = query.toLowerCase();

      datasets.forEach((d, dIdx) => {
        // Find matching topics
        (d.topics || []).forEach((t) => {
          if (t.label.toLowerCase().includes(q) || t.cluster.toLowerCase().includes(q)) {
            items.push({
              id: `entity-topic-${dIdx}-${t.id}`,
              category: 'Entities',
              label: t.label,
              subtitle: `Topic inside model "${d.datasetName}" (Cluster: ${t.cluster})`,
              icon: <Folder className="text-cyan-400" size={13} />,
              action: () => {
                onSelectDataset(dIdx);
                // Wait for dataset to activate and then apply select state
                setTimeout(() => {
                  onSelectTopic(t);
                  onSelectKeyword(null);
                }, 50);
                onClose();
              }
            });
          }
        });

        // Find matching keywords
        (d.keywords || []).forEach((k) => {
          if (k.label.toLowerCase().includes(q) || k.intent.toLowerCase().includes(q)) {
            items.push({
              id: `entity-kw-${dIdx}-${k.id}`,
              category: 'Entities',
              label: k.label,
              subtitle: `Keyword inside model "${d.datasetName}" (Intent: ${k.intent}, Vol: ${k.volume})`,
              icon: <Tag className="text-indigo-400" size={13} />,
              action: () => {
                onSelectDataset(dIdx);
                setTimeout(() => {
                  onSelectKeyword(k);
                  // Auto sync its topic parent if possible
                  const matchedTopic = (d.topics || []).find((t) => t.id === k.topicId);
                  if (matchedTopic) {
                    onSelectTopic(matchedTopic);
                  }
                }, 50);
                onClose();
              }
            });
          }
        });
      });
    }

    // Filter results matching search input
    if (!query.trim()) {
      // Return default views and model switches on initial focus
      return items.filter(item => item.category === 'Views' || item.category === 'Models');
    }

    const qLower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(qLower) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(qLower)) ||
        item.category.toLowerCase().includes(qLower)
    );
  }, [query, datasets, activeDatasetIndex, onSelectDataset, onSelectTopic, onSelectKeyword, onSelectVisualizer, onClose]);

  // Handle Keyboard Navigations inside palette list
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          selected.action();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Scroll to active index
  useEffect(() => {
    const activeEl = scrollContainerRef.current?.children[selectedIndex] as HTMLElement;
    if (activeEl && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const elementTop = activeEl.offsetTop;
      const elementHeight = activeEl.offsetHeight;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      if (elementTop < containerScrollTop) {
        container.scrollTop = elementTop;
      } else if (elementTop + elementHeight > containerScrollTop + containerHeight) {
        container.scrollTop = elementTop + elementHeight - containerHeight;
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-200"
      id="command-palette-modal"
    >
      <div className="w-full max-w-2xl bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[500px]">
        
        {/* Search header with shortcut hints */}
        <div className="relative flex items-center border-b border-slate-800/80 p-4">
          <Search className="text-slate-500 mr-3" size={16} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, active view, model tab or keyword search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none font-medium"
          />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded shadow-inner uppercase">
              ESC TO CLOSE
            </span>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Dynamic results scroll viewport */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-2.5 divide-y divide-slate-800/30 scrollbar-thin max-h-[380px]"
          id="command-palette-results"
        >
          {filteredCommands.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex items-start justify-between p-3 rounded-xl cursor-pointer transition-all gap-4 ${
                  isSelected
                    ? 'bg-slate-800/80 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.04)] border-l-2 border-cyan-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-start gap-3.5 truncate">
                  <div className={`p-2 rounded-lg ${
                    isSelected ? 'bg-cyan-950/40 text-cyan-400' : 'bg-slate-950 text-slate-500'
                  }`}>
                    {item.icon}
                  </div>
                  <div className="truncate">
                    <span className={`text-[10.5px] font-mono font-bold uppercase tracking-wide block ${
                      isSelected ? 'text-cyan-500/80' : 'text-slate-500'
                    }`}>
                      {item.category}
                    </span>
                    <h5 className={`text-xs font-bold leading-normal mt-0.5 ${
                      isSelected ? 'text-white' : 'text-slate-200'
                    }`}>
                      {item.label}
                    </h5>
                    {item.subtitle && (
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5 truncate">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="flex items-center gap-1 text-[9px] font-mono text-cyan-400 font-bold self-center shrink-0">
                    <span>EXECUTE</span>
                    <ArrowRight size={10} />
                  </div>
                )}
              </div>
            );
          })}

          {filteredCommands.length === 0 && (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Keyboard className="text-slate-700 animate-bounce" size={24} />
              <p className="text-xs font-mono font-bold text-slate-400">No matching search query found</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Try searching for other clusters, domains, intents, or active views.</p>
            </div>
          )}
        </div>

        {/* Action shortcut footer panel */}
        <div className="bg-slate-950/80 px-4 py-2.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono font-semibold text-slate-500 select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded">↑↓</span> Move Selection
            </span>
            <span className="flex items-center gap-1.5">
              <span className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded">Enter</span> Run Command
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command size={9.5} /> + K (Trigger)
          </span>
        </div>

      </div>
    </div>
  );
}
