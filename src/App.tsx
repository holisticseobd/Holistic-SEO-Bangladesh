import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { SEOData, TopicNode, KeywordNode, SearchIntent } from './types';
import { DEFAULT_DATASETS } from './data/defaultData';
import SEOOpportunityFinder from './components/SEOOpportunityFinder';
import { parseCSVToSEOData } from './utils/csvParser';
import { enrichDatasetWithSentiment } from './utils/sentimentHelper';
import ThreeTopicMap from './components/ThreeTopicMap';
import NeuralTopicNetwork from './components/NeuralTopicNetwork';
import LocationDashboard from './components/LocationDashboard';
import LocationTypeAnalysis from './components/LocationTypeAnalysis';
import KeywordRelationshipGraph from './components/KeywordRelationshipGraph';
import SEOKnowledgeGraph from './components/SEOKnowledgeGraph';
import ExportPanel from './components/ExportPanel';
import SentimentGaugeDashboard from './components/SentimentGaugeDashboard';
import DatasetComparisonView from './components/DatasetComparisonView';
import SearchHistorySidebar from './components/SearchHistorySidebar';
import Sparkline from './components/Sparkline';
import CommandPalette from './components/CommandPalette';
import SmartClusterDashboard from './components/SmartClusterDashboard';
import {
  Compass,
  Upload,
  Globe,
  Database,
  Layers,
  Sparkles,
  RefreshCw,
  Table,
  CheckCircle2,
  TrendingUp,
  Cpu,
  BarChart,
  HelpCircle,
  Smile,
  GitCompare,
  Command,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Filter,
  ChevronDown,
} from 'lucide-react';

// Helper to generate stable mock historical trend data based on item label/ID
const getHistoricalData = (id: string, baseVolume: number) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const points = [];
  for (let m = 0; m < 6; m++) {
    // Math.sin provides volatile curves, m * 0.06 introduces progressive growth velocity
    const factor = 1 + (Math.sin(hash + m) * 0.28) + (m * 0.06);
    points.push(Math.round(baseVolume * Math.max(0.1, factor)));
  }
  return points;
};

const getIntentBadge = (intent: SearchIntent) => {
  switch (intent) {
    case 'Informational':
      return (
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-mono font-bold uppercase tracking-wider shrink-0 border border-emerald-500/10" title="Informational Intent">
          Info
        </span>
      );
    case 'Transactional':
      return (
        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[8px] font-mono font-bold uppercase tracking-wider shrink-0 border border-rose-500/10" title="Transactional Intent">
          Trans
        </span>
      );
    case 'Commercial':
      return (
        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[8px] font-mono font-bold uppercase tracking-wider shrink-0 border border-amber-500/10" title="Commercial Intent">
          Comm
        </span>
      );
    case 'Navigational':
      return (
        <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[8px] font-mono font-bold uppercase tracking-wider shrink-0 border border-indigo-500/10" title="Navigational Intent">
          Nav
        </span>
      );
    default:
      return null;
  }
};

export default function App() {
  const [datasets, setDatasets] = useState<SEOData[]>(() => {
    try {
      const stored = localStorage.getItem('seo_uploaded_datasets');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse stored datasets', e);
    }
    // Fallback to DEFAULT_DATASETS, unclustering a couple of topics in each to allow immediate testing!
    return DEFAULT_DATASETS.map((d) => {
      const unclusteredTopics = d.topics.map((t, idx) => {
        if (idx === 0 || idx === d.topics.length - 1) {
          return {
            ...t,
            cluster: 'Unclustered',
            description: 'This topic is currently unclustered. Trigger "Smart Cluster" to automatically group it based on semantic similarity.'
          };
        }
        return t;
      });
      return {
        ...d,
        topics: unclusteredTopics
      };
    });
  });
  const [activeDatasetIndex, setActiveDatasetIndex] = useState<number>(0);
  const [selectedTopic, setSelectedTopic] = useState<TopicNode | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<KeywordNode | null>(null);
  const [showTrendAnalysis, setShowTrendAnalysis] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  // Smart Clustering AI states
  const [isClustering, setIsClustering] = useState<boolean>(false);
  const [clusteringError, setClusteringError] = useState<string | null>(null);
  const [clusteringSuccess, setClusteringSuccess] = useState<boolean>(false);

  // Search Intent Table Filtering state
  const [selectedIntents, setSelectedIntents] = useState<SearchIntent[]>(['Informational', 'Transactional', 'Commercial', 'Navigational']);
  const [isIntentDropdownOpen, setIsIntentDropdownOpen] = useState<boolean>(false);

  // Helper to save datasets to state and localStorage
  const saveAndSetDatasets = (updated: SEOData[]) => {
    setDatasets(updated);
    try {
      localStorage.setItem('seo_uploaded_datasets', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save datasets to storage', e);
    }
  };

  // Derive active dataset
  const activeDataset = useMemo<SEOData | null>(() => {
    return datasets[activeDatasetIndex] || null;
  }, [datasets, activeDatasetIndex]);

  // Compute unclustered topics count
  const unclusteredTopicsCount = useMemo(() => {
    if (!activeDataset || !activeDataset.topics) return 0;
    return activeDataset.topics.filter((t) => {
      const clusterLower = (t.cluster || '').toLowerCase().trim();
      return (
        !clusterLower ||
        clusterLower === 'unclustered' ||
        clusterLower === 'uncategorized' ||
        clusterLower === 'none' ||
        clusterLower === 'general' ||
        clusterLower === 'target hub' ||
        clusterLower === 'seo focus'
      );
    }).length;
  }, [activeDataset]);

  // Smart cluster algorithm call
  const handleSmartCluster = async () => {
    if (!activeDataset) return;
    setIsClustering(true);
    setClusteringError(null);
    setClusteringSuccess(false);

    try {
      // Gather existing clean clusters to help model context
      const existingClusters = Array.from(new Set(
        activeDataset.topics
          .map((t) => t.cluster)
          .filter((c) => {
            const l = (c || "").toLowerCase().trim();
            return l && l !== 'unclustered' && l !== 'uncategorized' && l !== 'none' && l !== 'general' && l !== 'target hub' && l !== 'seo focus';
          })
      ));

      const response = await fetch('/api/smart-cluster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topics: activeDataset.topics,
          existingClusters,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `HTTP error ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.updatedTopics) {
        const updatedMapping = new Map<string, { cluster: string; description: string }>(
          result.updatedTopics.map((item: any) => [item.id, { cluster: item.cluster, description: item.description }])
        );

        if (updatedMapping.size === 0) {
          setClusteringError("No unclustered topics were grouped. Mark topics as unclustered to begin.");
          setIsClustering(false);
          return;
        }

        // Apply modifications to the target active dataset topics list
        const updatedDatasets = datasets.map((d, idx) => {
          if (idx === activeDatasetIndex) {
            const newTopics = d.topics.map((t) => {
              const update = updatedMapping.get(t.id);
              if (update) {
                return {
                  ...t,
                  cluster: update.cluster,
                  description: update.description,
                };
              }
              return t;
            });
            return {
              ...d,
              topics: newTopics,
            };
          }
          return d;
        });

        saveAndSetDatasets(updatedDatasets);
        setClusteringSuccess(true);
        setTimeout(() => setClusteringSuccess(false), 5000);
      } else {
        throw new Error("Invalid response format received from clustering API.");
      }
    } catch (err: any) {
      console.error('Clustering error:', err);
      setClusteringError(err.message || 'An error occurred during real-time clustering.');
    } finally {
      setIsClustering(false);
    }
  };

  // Uncluster a couple of topics to allow demo loop
  const handleResetClusters = () => {
    if (!activeDataset) return;
    const updated = datasets.map((d, idx) => {
      if (idx === activeDatasetIndex) {
        const resetTopics = d.topics.map((t, tIdx) => {
          if (tIdx === 0 || tIdx === d.topics.length - 1 || tIdx % 3 === 0) {
            return {
              ...t,
              cluster: 'Unclustered',
              description: 'This topic has been unclustered to demonstrate AI semantic clustering capabilities. Click "Smart Cluster" above to automatically group it.'
            };
          }
          return t;
        });
        return {
          ...d,
          topics: resetTopics
        };
      }
      return d;
    });
    saveAndSetDatasets(updated);
    setClusteringError(null);
    setClusteringSuccess(false);
  };

  // Keyboard Shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Active viewing visualizer tab
  const [activeVisualizer, setActiveVisualizer] = useState<'3d-map' | 'neural' | 'keywords' | 'knowledge' | 'sentiment' | 'opportunities' | 'comparison'>('3d-map');

  // File loading states
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sync selected topic to make sure it matches the current dataset when dataset changes
  const currentSelectedTopic = useMemo(() => {
    if (!selectedTopic || !activeDataset) return null;
    return (activeDataset.topics || []).find((t) => t.id === selectedTopic.id) || null;
  }, [selectedTopic, activeDataset]);

  // Sync selected keyword to make sure it matches the current dataset when dataset changes
  const currentSelectedKeyword = useMemo(() => {
    if (!selectedKeyword || !activeDataset) return null;
    return (activeDataset.keywords || []).find((k) => k.id === selectedKeyword.id) || null;
  }, [selectedKeyword, activeDataset]);

  // Outlier volume calculations for spreadsheet highlighting
  const maxTopicVolume = useMemo(() => {
    if (!activeDataset || !activeDataset.topics || activeDataset.topics.length === 0) return 1;
    return Math.max(...activeDataset.topics.map((t) => t.volume), 1);
  }, [activeDataset]);

  const maxKeywordVolume = useMemo(() => {
    if (!activeDataset || !activeDataset.keywords || activeDataset.keywords.length === 0) return 1;
    return Math.max(...activeDataset.keywords.map((k) => k.volume), 1);
  }, [activeDataset]);

  const getVolumeHighlightClass = (volume: number, isTopic: boolean) => {
    const maxVal = isTopic ? maxTopicVolume : maxKeywordVolume;
    const ratio = volume / maxVal;
    if (ratio >= 0.8) {
      return 'bg-emerald-500/10 text-emerald-300 font-extrabold border-r-2 border-emerald-500/40';
    }
    if (ratio >= 0.45) {
      return 'bg-cyan-500/5 text-cyan-300/80 font-semibold';
    }
    return 'text-slate-400';
  };

  const getSentimentHighlightClass = (sentiment: number) => {
    if (sentiment >= 75) {
      return 'bg-emerald-500/15 text-emerald-400 border-l-2 border-emerald-500/40 font-extrabold';
    }
    if (sentiment <= 40) {
      return 'bg-rose-500/15 text-rose-400 border-l-2 border-rose-500/40 font-extrabold';
    }
    return 'text-slate-300';
  };

  // Unified state for table pagination
  const [tablePage, setTablePage] = useState<number>(1);
  const rowsPerPage = 10;

  // Reset table page when dataset, search query, or selected intents change
  useEffect(() => {
    setTablePage(1);
  }, [activeDatasetIndex, tableSearchQuery, selectedIntents]);

  interface TableRowEntry {
    id: string;
    type: 'TOPIC' | 'KEYWORD';
    label: string;
    categoryOrIntent: string;
    sentiment: number;
    volume: number;
    rawItem: TopicNode | KeywordNode;
  }

  const allFilteredTableRows = useMemo<TableRowEntry[]>(() => {
    const rows: TableRowEntry[] = [];
    if (!activeDataset) return rows;
    const q = tableSearchQuery.toLowerCase().trim();

    // Process topics
    (activeDataset.topics || []).forEach((t) => {
      if (!selectedIntents.includes(t.intent)) return;
      const match = !q || t.label.toLowerCase().includes(q) || t.cluster.toLowerCase().includes(q);
      if (match) {
        rows.push({
          id: `topic-${t.id}`,
          type: 'TOPIC',
          label: t.label,
          categoryOrIntent: t.cluster,
          sentiment: t.sentiment || 70,
          volume: t.volume,
          rawItem: t,
        });
      }
    });

    // Process keywords
    (activeDataset.keywords || []).forEach((k) => {
      if (!selectedIntents.includes(k.intent)) return;
      const match = !q || k.label.toLowerCase().includes(q) || k.intent.toLowerCase().includes(q);
      if (match) {
        rows.push({
          id: `keyword-${k.id}`,
          type: 'KEYWORD',
          label: k.label,
          categoryOrIntent: `Intent: ${k.intent}`,
          sentiment: k.sentiment || 50,
          volume: k.volume,
          rawItem: k,
        });
      }
    });

    return rows;
  }, [activeDataset, tableSearchQuery, selectedIntents]);

  // Paginated subset of rows
  const paginatedTableRows = useMemo(() => {
    const startIndex = (tablePage - 1) * rowsPerPage;
    return allFilteredTableRows.slice(startIndex, startIndex + rowsPerPage);
  }, [allFilteredTableRows, tablePage]);

  const totalTablePages = useMemo(() => {
    return Math.max(1, Math.ceil(allFilteredTableRows.length / rowsPerPage));
  }, [allFilteredTableRows.length]);

  const handleDownloadCSV = () => {
    if (!activeDataset) return;
    const headers = ['Type', 'Label', 'Category or Intent', 'Sentiment %', 'Search Volume'];
    const csvRows = [headers.join(',')];

    allFilteredTableRows.forEach((row) => {
      const escape = (val: string | number) => {
        const text = String(val);
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      };

      const rowData = [
        row.type,
        escape(row.label),
        escape(row.categoryOrIntent),
        row.sentiment,
        row.volume
      ];
      csvRows.push(rowData.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const sanitizedDatasetName = activeDataset.datasetName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_+|_+$)/g, '');
    link.setAttribute('download', `${sanitizedDatasetName}_filtered_seo_data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dynamic keyword target injector for SEO Opportunity Finder
  const handleAddKeywordToActiveDataset = (newKeyword: KeywordNode) => {
    const updated = datasets.map((dataset, idx) => {
      if (idx === activeDatasetIndex) {
        // Avoid duplicate entries
        if (dataset.keywords.some((k) => k.label.toLowerCase() === newKeyword.label.toLowerCase())) {
          return dataset;
        }
        const updatedKeywords = [...dataset.keywords, newKeyword];
        const updatedDataset = {
          ...dataset,
          keywords: updatedKeywords
        };
        return enrichDatasetWithSentiment(updatedDataset);
      }
      return dataset;
    });
    saveAndSetDatasets(updated);
  };

  // Delete dataset handler
  const handleDeleteDataset = (indexToDelete: number) => {
    const updated = datasets.filter((_, idx) => idx !== indexToDelete);
    saveAndSetDatasets(updated);
    setDeleteConfirmIndex(null);

    // Automatically refresh active index and clear selections
    setSelectedTopic(null);
    setSelectedKeyword(null);

    if (updated.length === 0) {
      setActiveDatasetIndex(0);
    } else if (activeDatasetIndex === indexToDelete) {
      setActiveDatasetIndex(0);
    } else if (activeDatasetIndex > indexToDelete) {
      setActiveDatasetIndex(activeDatasetIndex - 1);
    }
  };

  // Handle manual file uploads
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = XLSX.utils.sheet_to_csv(worksheet);
          
          const parsed = parseCSVToSEOData(file.name, csvText);
          parsed.uploadDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          const enriched = enrichDatasetWithSentiment(parsed);
          const nextDatasets = [...datasets, enriched];
          saveAndSetDatasets(nextDatasets);
          setActiveDatasetIndex(nextDatasets.length - 1);
          setUploadError(null);
        } catch (err: any) {
          setUploadError(err.message || 'Error parsing Excel file.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          let parsed: SEOData;
          if (file.name.endsWith('.json')) {
            parsed = JSON.parse(text) as SEOData;
            if (!parsed.topics || !parsed.keywords) {
              throw new Error('JSON schema must contain topics and keywords array.');
            }
            parsed.datasetName = parsed.datasetName || file.name.replace('.json', '');
          } else if (file.name.endsWith('.csv')) {
            parsed = parseCSVToSEOData(file.name, text);
          } else {
            throw new Error('Unsupported format. Please upload a standard CSV, Excel, or JSON file.');
          }

          parsed.uploadDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

          const enriched = enrichDatasetWithSentiment(parsed);
          const nextDatasets = [...datasets, enriched];
          saveAndSetDatasets(nextDatasets);
          setActiveDatasetIndex(nextDatasets.length - 1);
          setUploadError(null);
        } catch (err: any) {
          setUploadError(err.message || 'Error parsing the file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative antialiased overflow-x-hidden selection:bg-cyan-500/30 selection:text-white">
      
      {/* Dynamic atmospheric glow points */}
      <div className="absolute top-0 left-1/3 w-[550px] h-[250px] bg-gradient-to-r from-cyan-500/5 to-indigo-500/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[450px] h-[450px] bg-gradient-to-r from-emerald-500/5 to-teal-500/5 rounded-full filter blur-[150px] pointer-events-none" />

      {/* Header Panel */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Compass className="text-slate-950 stroke-[2.5]" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                SEO Topic Intelligence
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest font-mono">
                Multi-Dimensional Knowledge Modeler
              </p>
            </div>
          </div>

          {/* Quick telemetry parameters & Command Trigger button */}
          <div className="flex items-center gap-4.5">
            {/* Command Palette Trigger Button */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/80 hover:border-cyan-500/30 text-[10px] font-mono font-bold text-slate-400 hover:text-cyan-400 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,0,0,0.2)]"
              title="Open global search & command palette (Ctrl+K)"
              id="header-palette-trigger"
            >
              <Command size={11} className="text-cyan-400" />
              <span>SEARCH PALETTE</span>
              <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-850 text-[8px] rounded text-slate-500 font-extrabold shadow-inner">
                Ctrl K
              </span>
            </button>

            <div className="hidden md:flex items-center gap-4 bg-slate-900/50 px-4 py-2 rounded-2xl border border-slate-800/80 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Cpu size={12} className="text-cyan-400 animate-pulse" /> 3D SPATIAL ACCELERATED
              </span>
              <span className="h-3 w-[1px] bg-slate-800" />
              <span className="flex items-center gap-1.5">
                <Database size={12} className="text-indigo-400" /> DATA ENGINE: v1.0
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        
        {/* Row 1: Top Level Config selectors */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Active Dataset selectors (8 cols) */}
          <div className="lg:col-span-8 bg-slate-900/20 border border-slate-900 rounded-3xl p-6 flex flex-col justify-between gap-5">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase block">
                SEO Intelligence Profile
              </span>
              <h2 className="text-lg font-black text-white mt-1">
                Select Active Knowledge Dataset
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Manage your loaded topic models or upload custom spreadsheet reports to begin multi-dimensional modeling.
              </p>
            </div>

            {datasets.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-2xl text-center min-h-[120px] bg-slate-950/10">
                <Database className="text-slate-600 mb-2 animate-pulse" size={24} />
                <p className="text-xs font-semibold text-slate-400">
                  No datasets uploaded yet. Upload a CSV, Excel, or JSON file to get started.
                </p>
                <p className="text-[10px] text-slate-500 mt-1.5 max-w-sm leading-normal">
                  Your workspace is currently clean. Use the report uploader on the right to compile your target taxonomy.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                {datasets.map((dataset, idx) => {
                  const isActive = idx === activeDatasetIndex;
                  const isConfirmingDelete = deleteConfirmIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (!isConfirmingDelete) {
                          setActiveDatasetIndex(idx);
                          setSelectedTopic(null);
                          setSelectedKeyword(null);
                        }
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                        isActive
                          ? 'bg-slate-900/90 border-cyan-500/80 shadow-xl shadow-cyan-500/5'
                          : 'bg-slate-950/40 hover:bg-slate-900/40 border-slate-900 hover:border-slate-800'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-indigo-500" />
                      )}

                      {/* Delete Trigger Icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmIndex(idx);
                        }}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-950/60 border border-slate-900 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 hover:border-rose-500/30 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Delete dataset"
                        id={`delete-btn-${idx}`}
                      >
                        <Trash2 size={11} />
                      </button>

                      {/* Inline Confirm Delete Dialogue */}
                      {isConfirmingDelete && (
                        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-3 text-center z-10 animate-in fade-in duration-200">
                          <p className="text-[9.5px] font-bold text-rose-400">Are you sure you want to delete this dataset?</p>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDataset(idx);
                              }}
                              className="px-2 py-0.5 bg-rose-900 hover:bg-rose-800 text-[9px] font-mono font-bold text-white rounded cursor-pointer transition-colors"
                            >
                              Yes, Delete
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmIndex(null);
                              }}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[9px] font-mono font-bold text-slate-300 rounded cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1 pr-4">
                        <span className="text-[9px] font-mono text-slate-500 font-bold block uppercase">
                          DATASET {idx + 1}
                        </span>
                        <h3 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors leading-snug truncate">
                          {dataset.datasetName}
                        </h3>
                        <div className="flex items-center gap-1.5 pt-1.5 text-[10px] font-mono text-slate-500">
                          <span>{(dataset.topics || []).length} Topics</span>
                          <span>•</span>
                          <span>{(dataset.keywords || []).length} Keywords</span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-600 pt-0.5">
                          Uploaded: {dataset.uploadDate || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drag & Drop dynamic uploader (4 cols) */}
          <div className="lg:col-span-4">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`h-full min-h-[160px] p-6 rounded-3xl border border-dashed transition-all flex flex-col items-center justify-center text-center gap-2 relative ${
                dragActive
                  ? 'border-cyan-400 bg-cyan-950/10'
                  : 'border-slate-800 bg-slate-950/40 hover:bg-slate-900/20'
              }`}
            >
              <input
                type="file"
                id="file-upload-input"
                className="hidden"
                accept=".csv,.json,.xlsx,.xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="file-upload-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2 w-full h-full"
              >
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-400">
                  <Upload size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">
                    Upload Custom Report
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] mx-auto leading-normal">
                    Drag & drop or click to upload standard spreadsheet (<strong className="text-slate-400">CSV</strong>, <strong className="text-slate-400">Excel</strong> or <strong className="text-slate-400">JSON</strong>).
                  </p>
                </div>
              </label>

              {uploadError && (
                <div className="absolute inset-x-4 bottom-3 text-center bg-red-950/50 border border-red-500/20 p-2 rounded-xl text-[9.5px] font-mono text-red-300">
                  {uploadError}
                </div>
              )}
            </div>
          </div>

        </div>

        {datasets.length === 0 ? (
          <div className="border border-slate-900 bg-slate-900/10 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 max-w-2xl mx-auto my-12 shadow-[0_0_50px_rgba(6,182,212,0.03)] animate-in fade-in slide-in-from-bottom-4 duration-500" id="empty-state-workspace-container">
            <div className="h-16 w-16 bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center shadow-inner">
              <Compass className="text-cyan-400 animate-spin-slow" size={28} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-slate-200">System Ready for Compiling</h3>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed mx-auto">
                No active topic models loaded. Drag and drop your custom keyword spreadsheets (<strong className="text-slate-400">CSV</strong>, <strong className="text-slate-400">Excel</strong>, or <strong className="text-slate-400">JSON</strong>) above to build multi-dimensional graphs, sentiment heatmaps, and search demographics in real-time.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Row 2: Visualization modules stage */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Left search & history sidebar (3 cols) */}
              <div className="lg:col-span-3 flex flex-col h-full">
                <SearchHistorySidebar
                  dataset={activeDataset}
                  selectedTopic={currentSelectedTopic}
                  selectedKeyword={currentSelectedKeyword}
                  onSelectTopic={setSelectedTopic}
                  onSelectKeyword={setSelectedKeyword}
                  onNavigateToTab={setActiveVisualizer}
                />
              </div>

              {/* Main Visualizer Stage (9 cols) */}
              <div className="lg:col-span-9 flex flex-col gap-5 h-full justify-between">
                
                {/* Navigation Bar for Visualizers */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-cyan-400" size={16} />
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Interactive Representation Modules
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center bg-slate-900/60 border border-slate-800/80 p-1 rounded-xl self-start sm:self-center">
                    <button
                      onClick={() => setActiveVisualizer('3d-map')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        activeVisualizer === '3d-map'
                          ? 'bg-slate-800 text-cyan-400 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Compass size={12} />
                      3D Topic Map
                    </button>
                    <button
                      onClick={() => setActiveVisualizer('neural')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        activeVisualizer === 'neural'
                          ? 'bg-slate-800 text-cyan-400 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Cpu size={12} />
                      Neural Topic Net
                    </button>
                    <button
                      onClick={() => setActiveVisualizer('keywords')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        activeVisualizer === 'keywords'
                          ? 'bg-slate-800 text-cyan-400 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Layers size={12} />
                      Keyword Semantics
                    </button>
                    <button
                      onClick={() => setActiveVisualizer('knowledge')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        activeVisualizer === 'knowledge'
                          ? 'bg-slate-800 text-cyan-400 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Database size={12} />
                      Knowledge Graph
                    </button>
                    <button
                      onClick={() => setActiveVisualizer('sentiment')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        activeVisualizer === 'sentiment'
                          ? 'bg-slate-800 text-cyan-400 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Smile size={12} />
                      Sentiment Analyzer
                    </button>
                    <button
                      onClick={() => setActiveVisualizer('opportunities')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        activeVisualizer === 'opportunities'
                          ? 'bg-slate-800 text-cyan-400 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sparkles size={12} />
                      Opportunity Finder
                    </button>
                    <button
                      onClick={() => setActiveVisualizer('comparison')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        activeVisualizer === 'comparison'
                          ? 'bg-slate-800 text-cyan-400 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <GitCompare size={12} />
                      Benchmark Compare
                    </button>
                  </div>
                </div>

                {/* Dynamic Component Load Stage */}
                <div className={`${(activeVisualizer === 'sentiment' || activeVisualizer === 'opportunities' || activeVisualizer === 'comparison') ? 'min-h-[480px]' : 'h-[480px]'} w-full`}>
                  {activeDataset && activeVisualizer === '3d-map' && (
                    <ThreeTopicMap
                      topics={activeDataset.topics}
                      onSelectTopic={setSelectedTopic}
                      selectedTopic={currentSelectedTopic}
                    />
                  )}
                  {activeDataset && activeVisualizer === 'neural' && (
                    <NeuralTopicNetwork
                      topics={activeDataset.topics}
                      onSelectTopic={setSelectedTopic}
                      selectedTopic={currentSelectedTopic}
                    />
                  )}
                  {activeDataset && activeVisualizer === 'keywords' && (
                    <KeywordRelationshipGraph
                      keywords={activeDataset.keywords}
                      topics={activeDataset.topics}
                    />
                  )}
                  {activeDataset && activeVisualizer === 'knowledge' && (
                    <SEOKnowledgeGraph
                      topics={activeDataset.topics}
                      keywords={activeDataset.keywords}
                      locations={activeDataset.locations}
                      edges={activeDataset.edges}
                    />
                  )}
                  {activeDataset && activeVisualizer === 'sentiment' && (
                    <SentimentGaugeDashboard dataset={activeDataset} />
                  )}
                  {activeDataset && activeVisualizer === 'opportunities' && (
                    <SEOOpportunityFinder
                      dataset={activeDataset}
                      onAddKeyword={handleAddKeywordToActiveDataset}
                    />
                  )}
                  {activeDataset && activeVisualizer === 'comparison' && (
                    <DatasetComparisonView
                      datasets={datasets}
                      defaultIndexA={activeDatasetIndex}
                    />
                  )}
                </div>

              </div>
            </div>

            {/* Row 3: Geographical location analysis layout (2-column bento grids) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <LocationDashboard locations={activeDataset ? activeDataset.locations : []} />
              <LocationTypeAnalysis locations={activeDataset ? activeDataset.locations : []} />
            </div>

            {/* Row 4: AI Semantic Smart Cluster Control Center */}
            <SmartClusterDashboard
              activeDataset={activeDataset}
              datasets={datasets}
              activeDatasetIndex={activeDatasetIndex}
              onUpdateDataset={saveAndSetDatasets}
              onSelectVisualizer={setActiveVisualizer}
            />

            {/* Row 5: Spreadsheet Raw Data Table & Active Model Export Control */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Data Table Panel (7 cols) */}
          <div className="lg:col-span-7 bg-slate-950/60 border border-slate-900 p-6 rounded-3xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
              <div className="flex items-center gap-2">
                <Table className="text-cyan-400" size={16} />
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 block uppercase">
                    RAW MODEL VIEW
                  </span>
                  <h4 className="text-sm font-black text-white">
                    Active Spreadsheet Records
                  </h4>
                </div>
              </div>
              
              {/* Conditional Highlighting Legend & Trend Analysis Toggle */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[9px] font-mono font-bold text-slate-500">
                <button
                  type="button"
                  onClick={() => setShowTrendAnalysis(!showTrendAnalysis)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all duration-300 cursor-pointer ${
                    showTrendAnalysis
                      ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-300 hover:border-slate-750'
                  }`}
                  id="trend-toggle-btn"
                  title="Toggle 6-month historical sparkline chart column"
                >
                  <TrendingUp size={11} className={showTrendAnalysis ? "text-cyan-400 animate-pulse" : "text-slate-500"} />
                  <span>Trends: {showTrendAnalysis ? 'ACTIVE' : 'OFF'}</span>
                </button>

                <div className="h-4 w-px bg-slate-900 hidden sm:block" />

                <span className="text-[8px] uppercase tracking-wider text-slate-600">Outliers:</span>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-emerald-500/10 border-l border-emerald-500/40 inline-block" />
                  <span>High (≥80% vol / ≥75% sent)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-rose-500/10 border-l border-rose-500/40 inline-block" />
                  <span>Low Sentiment (≤40%)</span>
                </div>
              </div>
            </div>

            {/* Real-time Dynamic Search Filtering Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3" id="table-filter-actions-container">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1" id="table-filters-group">
                
                {/* Search input */}
                <div className="relative flex items-center bg-slate-900/40 border border-slate-900 px-3 py-1.5 rounded-xl gap-2.5 flex-1 sm:max-w-xs md:max-w-sm" id="table-search-container">
                  <Search className="text-slate-500 shrink-0" size={13} />
                  <input
                    type="text"
                    placeholder="Filter rows by keyword or topic name..."
                    value={tableSearchQuery}
                    onChange={(e) => setTableSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-medium text-slate-200 placeholder-slate-500 focus:outline-none"
                    id="table-search-input"
                  />
                  {tableSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTableSearchQuery('')}
                      className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 cursor-pointer"
                      id="table-search-clear-btn"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Multi-select Search Intent Dropdown */}
                <div className="relative" id="search-intent-filter-dropdown-container">
                  <button
                    type="button"
                    onClick={() => setIsIntentDropdownOpen(!isIntentDropdownOpen)}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 w-full sm:w-auto rounded-xl border border-slate-800 hover:border-cyan-500/30 bg-slate-900/60 hover:bg-slate-900 text-[11px] font-mono font-bold text-slate-300 hover:text-cyan-400 cursor-pointer transition-all shadow-sm"
                    id="intent-filter-toggle-btn"
                    title="Filter table rows by Search Intent"
                  >
                    <div className="flex items-center gap-1.5">
                      <Filter size={12} className="text-cyan-400" />
                      <span>Intent:</span>
                      <span className="text-cyan-400 font-extrabold">
                        {selectedIntents.length === 4 ? 'All' : selectedIntents.length === 0 ? 'None' : `${selectedIntents.length}/4`}
                      </span>
                    </div>
                    <ChevronDown size={11} className={`text-slate-500 transition-transform ${isIntentDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                  </button>

                  {isIntentDropdownOpen && (
                    <>
                      {/* Click outside backdrop overlay */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsIntentDropdownOpen(false)} 
                      />
                      
                      {/* Dropdown list */}
                      <div className="absolute left-0 mt-2 w-56 bg-slate-950 border border-slate-900 rounded-2xl shadow-2xl p-2 z-20 animate-in fade-in slide-in-from-top-1.5 duration-150">
                        <div className="px-2 py-1.5 border-b border-slate-900/80 mb-1 flex items-center justify-between">
                          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                            Filter Intents
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedIntents(['Informational', 'Transactional', 'Commercial', 'Navigational'])}
                              className="text-[8px] font-mono text-cyan-400 hover:text-cyan-300 font-extrabold cursor-pointer"
                            >
                              ALL
                            </button>
                            <span className="text-[8px] text-slate-700">|</span>
                            <button
                              type="button"
                              onClick={() => setSelectedIntents([])}
                              className="text-[8px] font-mono text-rose-400 hover:text-rose-300 font-extrabold cursor-pointer"
                            >
                              NONE
                            </button>
                          </div>
                        </div>

                        <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
                          {(['Informational', 'Transactional', 'Commercial', 'Navigational'] as SearchIntent[]).map((intent) => {
                            const isChecked = selectedIntents.includes(intent);
                            const count = (activeDataset?.topics?.filter(t => t.intent === intent).length || 0) + 
                                          (activeDataset?.keywords?.filter(k => k.intent === intent).length || 0);

                            // Custom label color for matching intent style
                            const getIntentColorClass = (i: SearchIntent) => {
                              switch (i) {
                                case 'Transactional': return 'text-rose-400';
                                case 'Commercial': return 'text-amber-400';
                                case 'Informational': return 'text-emerald-400';
                                case 'Navigational': return 'text-indigo-400';
                                default: return 'text-slate-400';
                              }
                            };

                            return (
                              <label
                                key={intent}
                                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-900/60 cursor-pointer transition-colors text-[10.5px] font-mono"
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setSelectedIntents(selectedIntents.filter(x => x !== intent));
                                      } else {
                                        setSelectedIntents([...selectedIntents, intent]);
                                      }
                                    }}
                                    className="accent-cyan-400 rounded border-slate-800 bg-slate-900 cursor-pointer h-3 w-3 focus:ring-0 focus:ring-offset-0"
                                  />
                                  <span className={`font-bold ${getIntentColorClass(intent)}`}>
                                    {intent}
                                  </span>
                                </div>
                                <span className="text-[9px] font-extrabold text-slate-500 font-mono">
                                  ({count})
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>

              {/* Download CSV button */}
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-800 hover:border-cyan-500/30 bg-slate-900/60 hover:bg-slate-900 text-[10.5px] font-mono font-bold text-slate-400 hover:text-cyan-400 cursor-pointer transition-all shrink-0 shadow-sm"
                id="table-download-csv-btn"
                title="Download currently filtered rows as CSV"
              >
                <Download size={12} className="text-cyan-400" />
                <span>DOWNLOAD CSV ({allFilteredTableRows.length})</span>
              </button>
            </div>

            <div className="flex-1 overflow-x-auto max-h-[220px] scrollbar-thin">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900/80 text-[10px] font-mono text-slate-400 uppercase font-extrabold pb-2">
                    <th className="py-2.5 px-3">Entity Type</th>
                    <th className="py-2.5 px-3">Label / Name</th>
                    <th className="py-2.5 px-3">Category / Cluster</th>
                    <th className="py-2.5 px-3 text-center">Sentiment</th>
                    <th className="py-2.5 px-3 text-right">Search Volume</th>
                    {showTrendAnalysis && <th className="py-2.5 px-3 text-right w-[150px]">6M Trend Trendline</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-xs">
                  {/* Map out paginated list of combined topics & keywords for spreadsheet preview */}
                  {paginatedTableRows.map((row) => {
                    const isTopic = row.type === 'TOPIC';
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setActiveVisualizer('sentiment')}
                        className="hover:bg-slate-900/20 text-slate-300 cursor-pointer transition-colors"
                        title="Click to analyze sentiment breakdown"
                      >
                        <td className={`py-2.5 px-3 font-mono font-bold text-[10px] ${
                          isTopic ? 'text-cyan-400' : 'text-indigo-400'
                        }`}>
                          {row.type}
                        </td>
                        <td className={`py-2.5 px-3 text-slate-200 ${isTopic ? 'font-bold' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span>{row.label}</span>
                            {getIntentBadge(row.rawItem.intent)}
                          </div>
                        </td>
                        <td className={`py-2.5 px-3 ${isTopic ? 'text-slate-400' : 'text-slate-500 font-mono text-[10px]'}`}>
                          {row.categoryOrIntent}
                        </td>
                        <td className={`py-2.5 px-3 text-center transition-all ${getSentimentHighlightClass(row.sentiment)}`}>
                          <span className="font-mono text-[10px] font-bold">
                            {row.sentiment}%
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono transition-all ${
                          isTopic ? 'font-bold' : ''
                        } ${getVolumeHighlightClass(row.volume, isTopic)}`}>
                          {row.volume.toLocaleString()}
                        </td>
                        {showTrendAnalysis && (
                          <td className="py-2.5 px-3 text-right">
                            <Sparkline data={getHistoricalData(row.rawItem.id, row.volume)} />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {paginatedTableRows.length === 0 && (
                    <tr>
                      <td colSpan={showTrendAnalysis ? 6 : 5} className="py-8 text-center text-slate-500 font-mono text-[11px]">
                        No matching keyword or topic records found for your query or search intent filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-900/60 pt-4 mt-1 gap-3" id="table-pagination-controls">
              <span className="text-[10px] font-mono text-slate-500 font-bold" id="table-pagination-info">
                Showing {allFilteredTableRows.length === 0 ? 0 : (tablePage - 1) * rowsPerPage + 1}-{Math.min(allFilteredTableRows.length, tablePage * rowsPerPage)} of {allFilteredTableRows.length} entries
              </span>
              <div className="flex items-center gap-1.5" id="table-pagination-btns">
                <button
                  type="button"
                  disabled={tablePage === 1}
                  onClick={() => setTablePage((prev) => Math.max(1, prev - 1))}
                  className={`flex items-center justify-center p-1.5 rounded-lg border text-slate-400 hover:text-slate-200 transition-all cursor-pointer ${
                    tablePage === 1
                      ? 'opacity-30 pointer-events-none border-slate-900'
                      : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
                  id="table-prev-page-btn"
                  title="Previous Page"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-900/80" id="table-page-indicator">
                  Page {tablePage} of {totalTablePages}
                </span>
                <button
                  type="button"
                  disabled={tablePage === totalTablePages}
                  onClick={() => setTablePage((prev) => Math.min(totalTablePages, prev + 1))}
                  className={`flex items-center justify-center p-1.5 rounded-lg border text-slate-400 hover:text-slate-200 transition-all cursor-pointer ${
                    tablePage === totalTablePages
                      ? 'opacity-30 pointer-events-none border-slate-900'
                      : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
                  id="table-next-page-btn"
                  title="Next Page"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Exporter & AI Control Dashboard (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6" id="ai-exporter-dashboard-sidebar">
            
            <ExportPanel activeData={activeDataset} />
          </div>

        </div>
      </>
    )}
  </main>

      {/* Footer copyright */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-16 text-[10px] font-mono text-slate-500 text-center">
        <p>© 2026 SEO Topic Intelligence Lab • Multi-Dimensional Structural Analytics Platform</p>
      </footer>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        datasets={datasets}
        activeDatasetIndex={activeDatasetIndex}
        onSelectDataset={setActiveDatasetIndex}
        onSelectTopic={setSelectedTopic}
        onSelectKeyword={setSelectedKeyword}
        onSelectVisualizer={setActiveVisualizer}
      />

    </div>
  );
}
