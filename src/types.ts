export type SearchIntent = 'Informational' | 'Transactional' | 'Commercial' | 'Navigational';

export interface TopicNode {
  id: string;
  label: string;
  cluster: string;
  volume: number;
  difficulty: number; // 0 - 100
  intent: SearchIntent;
  description: string;
  x?: number;
  y?: number;
  z?: number;
  connections: string[]; // List of connected topic IDs
  sentiment?: number; // Optional average sentiment calculated from keywords (0 - 100)
}

export interface KeywordNode {
  id: string;
  label: string;
  topicId: string; // Parent topic ID
  volume: number;
  difficulty: number;
  cpc: number;
  intent: SearchIntent;
  authority: number; // 0 - 100 representing topic authority
  sentiment?: number; // Optional average sentiment score (0 - 100)
  snippets?: { title: string; snippet: string; source: string; sentiment: number }[];
  reviews?: { author: string; text: string; rating: number; sentiment: number }[];
}

export interface LocationNode {
  id: string;
  name: string;
  type: 'country' | 'state' | 'city';
  parentId: string | null; // e.g. state's parent is country, city's is state
  volume: number;
  percentage: number;
  latitude?: number;
  longitude?: number;
}

export interface EntityEdge {
  source: string;
  target: string;
  type: 'belongs_to' | 'searches_for' | 'targets_in' | 'related_to';
  weight?: number;
}

export interface SEOData {
  datasetName: string;
  topics: TopicNode[];
  keywords: KeywordNode[];
  locations: LocationNode[];
  edges: EntityEdge[];
  uploadDate?: string;
}
