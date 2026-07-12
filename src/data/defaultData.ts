import { SEOData, TopicNode, KeywordNode, LocationNode, EntityEdge } from '../types';

// Let's pre-generate high-quality coordinates and hierarchies for the default datasets.

const SAAS_TOPICS: TopicNode[] = [
  {
    id: 't-inbound',
    label: 'Inbound Marketing',
    cluster: 'Inbound & Content Strategy',
    volume: 45000,
    difficulty: 65,
    intent: 'Commercial',
    description: 'Attracting prospects with highly tailored inbound content, social outreach, and branding strategies.',
    connections: ['t-content', 't-cro']
  },
  {
    id: 't-content',
    label: 'Content Optimization',
    cluster: 'Inbound & Content Strategy',
    volume: 55000,
    difficulty: 72,
    intent: 'Informational',
    description: 'Applying NLP, TF-IDF, semantic search, and structural optimizations to rank written content.',
    connections: ['t-inbound', 't-tech', 't-plg']
  },
  {
    id: 't-cro',
    label: 'Conversion Rate Optimization',
    cluster: 'Conversion & Growth',
    volume: 38000,
    difficulty: 58,
    intent: 'Transactional',
    description: 'A/B testing, user behavior analytics, heatmap tracing, and persuasive copywriting to maximize signup rates.',
    connections: ['t-inbound', 't-plg', 't-retention']
  },
  {
    id: 't-tech',
    label: 'Technical SEO & Crawlability',
    cluster: 'SEO Engineering',
    volume: 42000,
    difficulty: 80,
    intent: 'Commercial',
    description: 'Core Web Vitals, Schema markup, indexing strategies, JS rendering pipelines, and XML sitemaps.',
    connections: ['t-content', 't-plg']
  },
  {
    id: 't-plg',
    label: 'Product-Led Growth (PLG)',
    cluster: 'Conversion & Growth',
    volume: 28000,
    difficulty: 75,
    intent: 'Commercial',
    description: 'Using the product as the primary vehicle for customer acquisition, expansion, and retention.',
    connections: ['t-content', 't-cro', 't-retention', 't-tech']
  },
  {
    id: 't-retention',
    label: 'Retention & Customer LTV',
    cluster: 'Conversion & Growth',
    volume: 22000,
    difficulty: 50,
    intent: 'Informational',
    description: 'SaaS onboarding email automation, user friction reduction, customer feedback loops, and churn analytics.',
    connections: ['t-cro', 't-plg']
  }
];

const SAAS_KEYWORDS: KeywordNode[] = [
  { id: 'k-1', label: 'b2b inbound strategy', topicId: 't-inbound', volume: 8500, difficulty: 68, cpc: 12.5, intent: 'Commercial', authority: 75 },
  { id: 'k-2', label: 'how to create content hub', topicId: 't-inbound', volume: 4200, difficulty: 45, cpc: 4.2, intent: 'Informational', authority: 60 },
  { id: 'k-3', label: 'inbound marketing agencies', topicId: 't-inbound', volume: 3800, difficulty: 70, cpc: 22.0, intent: 'Transactional', authority: 80 },
  { id: 'k-4', label: 'content optimization tool', topicId: 't-content', volume: 15000, difficulty: 78, cpc: 9.8, intent: 'Commercial', authority: 85 },
  { id: 'k-5', label: 'semantic seo strategy', topicId: 't-content', volume: 3200, difficulty: 58, cpc: 7.5, intent: 'Commercial', authority: 90 },
  { id: 'k-6', label: 'how to write blog post for seo', topicId: 't-content', volume: 12000, difficulty: 42, cpc: 2.1, intent: 'Informational', authority: 50 },
  { id: 'k-7', label: 'cro tools for saas', topicId: 't-cro', volume: 5400, difficulty: 62, cpc: 15.6, intent: 'Commercial', authority: 80 },
  { id: 'k-8', label: 'how to design landing page', topicId: 't-cro', volume: 9800, difficulty: 50, cpc: 5.4, intent: 'Informational', authority: 65 },
  { id: 'k-9', label: 'increase landing page conversion', topicId: 't-cro', volume: 4100, difficulty: 55, cpc: 18.2, intent: 'Transactional', authority: 70 },
  { id: 'k-10', label: 'how to fix render blocking js', topicId: 't-tech', volume: 6200, difficulty: 75, cpc: 8.4, intent: 'Informational', authority: 85 },
  { id: 'k-11', label: 'core web vitals checklist', topicId: 't-tech', volume: 8800, difficulty: 64, cpc: 4.8, intent: 'Informational', authority: 90 },
  { id: 'k-12', label: 'technical seo audit price', topicId: 't-tech', volume: 2200, difficulty: 70, cpc: 24.5, intent: 'Transactional', authority: 75 },
  { id: 'k-13', label: 'product led growth framework', topicId: 't-plg', volume: 7200, difficulty: 74, cpc: 14.0, intent: 'Commercial', authority: 85 },
  { id: 'k-14', label: 'what is product led marketing', topicId: 't-plg', volume: 4500, difficulty: 48, cpc: 6.2, intent: 'Informational', authority: 60 },
  { id: 'k-15', label: 'saas churn rate calculator', topicId: 't-retention', volume: 5100, difficulty: 38, cpc: 8.5, intent: 'Transactional', authority: 70 },
  { id: 'k-16', label: 'how to reduce customer churn', topicId: 't-retention', volume: 3900, difficulty: 45, cpc: 11.2, intent: 'Informational', authority: 65 }
];

const SAAS_LOCATIONS: LocationNode[] = [
  // Countries
  { id: 'loc-us', name: 'United States', type: 'country', parentId: null, volume: 180000, percentage: 60.0, latitude: 37.0902, longitude: -95.7129 },
  { id: 'loc-uk', name: 'United Kingdom', type: 'country', parentId: null, volume: 54000, percentage: 18.0, latitude: 55.3781, longitude: -3.4360 },
  { id: 'loc-ca', name: 'Canada', type: 'country', parentId: null, volume: 36000, percentage: 12.0, latitude: 56.1304, longitude: -106.3468 },
  { id: 'loc-de', name: 'Germany', type: 'country', parentId: null, volume: 30000, percentage: 10.0, latitude: 51.1657, longitude: 10.4515 },

  // US States (under loc-us)
  { id: 'loc-ca-state', name: 'California', type: 'state', parentId: 'loc-us', volume: 64800, percentage: 36.0, latitude: 36.7783, longitude: -119.4179 },
  { id: 'loc-ny-state', name: 'New York', type: 'state', parentId: 'loc-us', volume: 43200, percentage: 24.0, latitude: 40.7128, longitude: -74.0060 },
  { id: 'loc-tx-state', name: 'Texas', type: 'state', parentId: 'loc-us', volume: 32400, percentage: 18.0, latitude: 31.9686, longitude: -99.9018 },
  { id: 'loc-wa-state', name: 'Washington', type: 'state', parentId: 'loc-us', volume: 16200, percentage: 9.0, latitude: 47.7511, longitude: -120.7401 },

  // UK States (under loc-uk)
  { id: 'loc-england', name: 'England', type: 'state', parentId: 'loc-uk', volume: 37800, percentage: 70.0, latitude: 52.3555, longitude: -1.1743 },
  { id: 'loc-scotland', name: 'Scotland', type: 'state', parentId: 'loc-uk', volume: 10800, percentage: 20.0, latitude: 56.4907, longitude: -4.2026 },

  // Cities in California
  { id: 'loc-sf', name: 'San Francisco', type: 'city', parentId: 'loc-ca-state', volume: 38880, percentage: 60.0, latitude: 37.7749, longitude: -122.4194 },
  { id: 'loc-la', name: 'Los Angeles', type: 'city', parentId: 'loc-ca-state', volume: 12960, percentage: 20.0, latitude: 34.0522, longitude: -118.2437 },
  { id: 'loc-sj', name: 'San Jose', type: 'city', parentId: 'loc-ca-state', volume: 6480, percentage: 10.0, latitude: 37.3382, longitude: -121.8863 },

  // Cities in New York
  { id: 'loc-nyc', name: 'New York City', type: 'city', parentId: 'loc-ny-state', volume: 34560, percentage: 80.0, latitude: 40.7128, longitude: -74.0060 },
  { id: 'loc-buffalo', name: 'Buffalo', type: 'city', parentId: 'loc-ny-state', volume: 4320, percentage: 10.0, latitude: 42.8864, longitude: -78.8784 },

  // Cities in Texas
  { id: 'loc-austin', name: 'Austin', type: 'city', parentId: 'loc-tx-state', volume: 19440, percentage: 60.0, latitude: 30.2672, longitude: -97.7431 },
  { id: 'loc-houston', name: 'Houston', type: 'city', parentId: 'loc-tx-state', volume: 9720, percentage: 30.0, latitude: 29.7604, longitude: -95.3698 },

  // Cities in England
  { id: 'loc-london', name: 'London', type: 'city', parentId: 'loc-england', volume: 26460, percentage: 70.0, latitude: 51.5074, longitude: -0.1278 },
  { id: 'loc-manchester', name: 'Manchester', type: 'city', parentId: 'loc-england', volume: 7560, percentage: 20.0, latitude: 53.4808, longitude: -2.2426 }
];

const SAAS_EDGES: EntityEdge[] = [
  // Belongs to
  { source: 'k-1', target: 't-inbound', type: 'belongs_to', weight: 8 },
  { source: 'k-2', target: 't-inbound', type: 'belongs_to', weight: 6 },
  { source: 'k-3', target: 't-inbound', type: 'belongs_to', weight: 9 },
  { source: 'k-4', target: 't-content', type: 'belongs_to', weight: 9 },
  { source: 'k-5', target: 't-content', type: 'belongs_to', weight: 8 },
  { source: 'k-6', target: 't-content', type: 'belongs_to', weight: 5 },
  { source: 'k-7', target: 't-cro', type: 'belongs_to', weight: 8 },
  { source: 'k-8', target: 't-cro', type: 'belongs_to', weight: 6 },
  { source: 'k-9', target: 't-cro', type: 'belongs_to', weight: 7 },
  { source: 'k-10', target: 't-tech', type: 'belongs_to', weight: 8 },
  { source: 'k-11', target: 't-tech', type: 'belongs_to', weight: 9 },
  { source: 'k-12', target: 't-tech', type: 'belongs_to', weight: 7 },
  { source: 'k-13', target: 't-plg', type: 'belongs_to', weight: 9 },
  { source: 'k-14', target: 't-plg', type: 'belongs_to', weight: 6 },
  { source: 'k-15', target: 't-retention', type: 'belongs_to', weight: 7 },
  { source: 'k-16', target: 't-retention', type: 'belongs_to', weight: 7 },

  // Targets in (Location connecting to Topics/Keywords)
  { source: 'loc-us', target: 't-inbound', type: 'targets_in', weight: 10 },
  { source: 'loc-us', target: 't-plg', type: 'targets_in', weight: 9 },
  { source: 'loc-uk', target: 't-content', type: 'targets_in', weight: 7 },
  { source: 'loc-ca', target: 't-tech', type: 'targets_in', weight: 6 },
  { source: 'loc-de', target: 't-tech', type: 'targets_in', weight: 8 }
];

// DATASET 2: E-commerce & Retail SEO
const ECOM_TOPICS: TopicNode[] = [
  {
    id: 't-ecom-cat',
    label: 'Category Page Structure',
    cluster: 'On-Page Architecture',
    volume: 85000,
    difficulty: 60,
    intent: 'Commercial',
    description: 'Structuring product categories, faceted navigations, internal linking breadcrumbs, and crawl budget optimizations.',
    connections: ['t-ecom-prod', 't-ecom-schema']
  },
  {
    id: 't-ecom-prod',
    label: 'Product Details Optimization',
    cluster: 'Conversion & Content',
    volume: 95000,
    difficulty: 55,
    intent: 'Transactional',
    description: 'Unique product descriptions, dynamic image alt optimizations, video content, and user reviews aggregation.',
    connections: ['t-ecom-cat', 't-ecom-schema', 't-ecom-merchant']
  },
  {
    id: 't-ecom-schema',
    label: 'Product & Merchant Schema',
    cluster: 'Technical Structured Data',
    volume: 62000,
    difficulty: 68,
    intent: 'Commercial',
    description: 'Rich snippets implementation for pricing, aggregate ratings, stock availability, and shipping metrics.',
    connections: ['t-ecom-cat', 't-ecom-prod', 't-ecom-merchant']
  },
  {
    id: 't-ecom-merchant',
    label: 'Merchant Center & Free Listings',
    cluster: 'Shopping Feed & Distribution',
    volume: 48000,
    difficulty: 64,
    intent: 'Transactional',
    description: 'XML feeds, Google Shopping optimization, auto-update of stock/pricing via API, and local inventory ads.',
    connections: ['t-ecom-prod', 't-ecom-schema', 't-ecom-speed']
  },
  {
    id: 't-ecom-speed',
    label: 'Site Speed & Core Web Vitals',
    cluster: 'Performance Engineering',
    volume: 70000,
    difficulty: 72,
    intent: 'Informational',
    description: 'Image compression, modern formats (WebP/AVIF), edge CDN caching, and lazy-loading heavy media scripts.',
    connections: ['t-ecom-merchant', 't-ecom-cat']
  }
];

const ECOM_KEYWORDS: KeywordNode[] = [
  { id: 'k-ec-1', label: 'ecommerce category page best practices', topicId: 't-ecom-cat', volume: 5400, difficulty: 52, cpc: 6.40, intent: 'Informational', authority: 80 },
  { id: 'k-ec-2', label: 'faceted navigation seo', topicId: 't-ecom-cat', volume: 3200, difficulty: 65, cpc: 8.50, intent: 'Commercial', authority: 75 },
  { id: 'k-ec-3', label: 'how to write product description ecommerce', topicId: 't-ecom-prod', volume: 8800, difficulty: 38, cpc: 3.20, intent: 'Informational', authority: 60 },
  { id: 'k-ec-4', label: 'best product page design', topicId: 't-ecom-prod', volume: 12000, difficulty: 50, cpc: 7.10, intent: 'Commercial', authority: 65 },
  { id: 'k-ec-5', label: 'product schema generator', topicId: 't-ecom-schema', volume: 9200, difficulty: 45, cpc: 4.80, intent: 'Transactional', authority: 85 },
  { id: 'k-ec-6', label: 'google shopping feed guidelines', topicId: 't-ecom-merchant', volume: 6100, difficulty: 58, cpc: 9.50, intent: 'Informational', authority: 70 },
  { id: 'k-ec-7', label: 'how to speed up shopify site', topicId: 't-ecom-speed', volume: 14500, difficulty: 60, cpc: 11.20, intent: 'Transactional', authority: 80 }
];

const ECOM_LOCATIONS: LocationNode[] = [
  { id: 'loc-ec-us', name: 'United States', type: 'country', parentId: null, volume: 450000, percentage: 65.0, latitude: 37.0902, longitude: -95.7129 },
  { id: 'loc-ec-uk', name: 'United Kingdom', type: 'country', parentId: null, volume: 103000, percentage: 15.0, latitude: 55.3781, longitude: -3.4360 },
  { id: 'loc-ec-de', name: 'Germany', type: 'country', parentId: null, volume: 69000, percentage: 10.0, latitude: 51.1657, longitude: 10.4515 },
  { id: 'loc-ec-fr', name: 'France', type: 'country', parentId: null, volume: 69000, percentage: 10.0, latitude: 46.2276, longitude: 2.2137 },

  // US States (under loc-ec-us)
  { id: 'loc-ec-ny', name: 'New York', type: 'state', parentId: 'loc-ec-us', volume: 112500, percentage: 25.0, latitude: 40.7128, longitude: -74.0060 },
  { id: 'loc-ec-tx', name: 'Texas', type: 'state', parentId: 'loc-ec-us', volume: 90000, percentage: 20.0, latitude: 31.9686, longitude: -99.9018 },
  { id: 'loc-ec-ca', name: 'California', type: 'state', parentId: 'loc-ec-us', volume: 135000, percentage: 30.0, latitude: 36.7783, longitude: -119.4179 },

  // Cities in New York
  { id: 'loc-ec-nyc', name: 'New York City', type: 'city', parentId: 'loc-ec-ny', volume: 90000, percentage: 80.0, latitude: 40.7128, longitude: -74.0060 },
  { id: 'loc-ec-albany', name: 'Albany', type: 'city', parentId: 'loc-ec-ny', volume: 11250, percentage: 10.0, latitude: 42.6526, longitude: -73.7562 }
];

const ECOM_EDGES: EntityEdge[] = [
  { source: 'k-ec-1', target: 't-ecom-cat', type: 'belongs_to', weight: 8 },
  { source: 'k-ec-2', target: 't-ecom-cat', type: 'belongs_to', weight: 9 },
  { source: 'k-ec-3', target: 't-ecom-prod', type: 'belongs_to', weight: 7 },
  { source: 'k-ec-4', target: 't-ecom-prod', type: 'belongs_to', weight: 6 },
  { source: 'k-ec-5', target: 't-ecom-schema', type: 'belongs_to', weight: 9 },
  { source: 'k-ec-6', target: 't-ecom-merchant', type: 'belongs_to', weight: 8 },
  { source: 'k-ec-7', target: 't-ecom-speed', type: 'belongs_to', weight: 9 }
];

// DATASET 3: Local Services & Healthcare SEO
const LOCAL_TOPICS: TopicNode[] = [
  {
    id: 't-loc-gbp',
    label: 'Google Business Profile',
    cluster: 'Local Search Dominance',
    volume: 120000,
    difficulty: 45,
    intent: 'Transactional',
    description: 'Setting up Google Map listings, optimizing categories, acquiring local reviews, and posting regular GBP updates.',
    connections: ['t-loc-cit', 't-loc-geomap']
  },
  {
    id: 't-loc-cit',
    label: 'NAP Citations & Directories',
    cluster: 'Local Signal Optimization',
    volume: 55000,
    difficulty: 35,
    intent: 'Commercial',
    description: 'Ensuring Name, Address, and Phone (NAP) consistency across Yelp, YellowPages, Bing Places, and local directories.',
    connections: ['t-loc-gbp', 't-loc-pages']
  },
  {
    id: 't-loc-pages',
    label: 'Local Landing Pages',
    cluster: 'Local Content Structure',
    volume: 68000,
    difficulty: 48,
    intent: 'Commercial',
    description: 'Designing dedicated service pages for specific zip codes, neighborhoods, and regions with localized keywords.',
    connections: ['t-loc-cit', 't-loc-schema']
  },
  {
    id: 't-loc-schema',
    label: 'LocalBusiness Schema',
    cluster: 'Local Signal Optimization',
    volume: 34000,
    difficulty: 50,
    intent: 'Commercial',
    description: 'Injecting custom LocalBusiness, Physician, or Lawyer structured data scripts into index headers.',
    connections: ['t-loc-pages', 't-loc-gbp']
  },
  {
    id: 't-loc-geomap',
    label: 'Map Pack Tracking & Audit',
    cluster: 'Local Search Dominance',
    volume: 42000,
    difficulty: 55,
    intent: 'Transactional',
    description: 'Auditing 3-Pack rankings via geogrid coordinates, tracking local search visibility coefficients.',
    connections: ['t-loc-gbp', 't-loc-schema']
  }
];

const LOCAL_KEYWORDS: KeywordNode[] = [
  { id: 'k-lo-1', label: 'how to rank in google map pack', topicId: 't-loc-gbp', volume: 15400, difficulty: 42, cpc: 9.80, intent: 'Transactional', authority: 80 },
  { id: 'k-lo-2', label: 'google business profile optimization checklist', topicId: 't-loc-gbp', volume: 9200, difficulty: 32, cpc: 5.60, intent: 'Informational', authority: 75 },
  { id: 'k-lo-3', label: 'local citation services for seo', topicId: 't-loc-cit', volume: 4300, difficulty: 35, cpc: 12.10, intent: 'Commercial', authority: 65 },
  { id: 'k-lo-4', label: 'local landing page template b2c', topicId: 't-loc-pages', volume: 3800, difficulty: 40, cpc: 6.80, intent: 'Commercial', authority: 70 },
  { id: 'k-lo-5', label: 'localbusiness schema json generator', topicId: 't-loc-schema', volume: 4900, difficulty: 38, cpc: 4.50, intent: 'Transactional', authority: 85 }
];

const LOCAL_LOCATIONS: LocationNode[] = [
  { id: 'loc-lo-us', name: 'United States', type: 'country', parentId: null, volume: 320000, percentage: 100.0, latitude: 37.0902, longitude: -95.7129 },

  // States
  { id: 'loc-lo-tx', name: 'Texas', type: 'state', parentId: 'loc-lo-us', volume: 160000, percentage: 50.0, latitude: 31.9686, longitude: -99.9018 },
  { id: 'loc-lo-fl', name: 'Florida', type: 'state', parentId: 'loc-lo-us', volume: 160000, percentage: 50.0, latitude: 27.6648, longitude: -81.5158 },

  // Texas Cities
  { id: 'loc-lo-houston', name: 'Houston', type: 'city', parentId: 'loc-lo-tx', volume: 96000, percentage: 60.0, latitude: 29.7604, longitude: -95.3698 },
  { id: 'loc-lo-dallas', name: 'Dallas', type: 'city', parentId: 'loc-lo-tx', volume: 48000, percentage: 30.0, latitude: 32.7767, longitude: -96.7970 },

  // Florida Cities
  { id: 'loc-lo-miami', name: 'Miami', type: 'city', parentId: 'loc-lo-fl', volume: 112000, percentage: 70.0, latitude: 25.7617, longitude: -80.1918 },
  { id: 'loc-lo-tampa', name: 'Tampa', type: 'city', parentId: 'loc-lo-fl', volume: 32000, percentage: 20.0, latitude: 27.9506, longitude: -82.4572 }
];

const LOCAL_EDGES: EntityEdge[] = [
  { source: 'k-lo-1', target: 't-loc-gbp', type: 'belongs_to', weight: 9 },
  { source: 'k-lo-2', target: 't-loc-gbp', type: 'belongs_to', weight: 8 },
  { source: 'k-lo-3', target: 't-loc-cit', type: 'belongs_to', weight: 7 },
  { source: 'k-lo-4', target: 't-loc-pages', type: 'belongs_to', weight: 6 },
  { source: 'k-lo-5', target: 't-loc-schema', type: 'belongs_to', weight: 9 }
];

export const DEFAULT_DATASETS: SEOData[] = [
  {
    datasetName: 'SaaS Marketing Hub',
    topics: SAAS_TOPICS,
    keywords: SAAS_KEYWORDS,
    locations: SAAS_LOCATIONS,
    edges: SAAS_EDGES
  },
  {
    datasetName: 'E-commerce & Retail SEO',
    topics: ECOM_TOPICS,
    keywords: ECOM_KEYWORDS,
    locations: ECOM_LOCATIONS,
    edges: ECOM_EDGES
  },
  {
    datasetName: 'Local Services & Healthcare SEO',
    topics: LOCAL_TOPICS,
    keywords: LOCAL_KEYWORDS,
    locations: LOCAL_LOCATIONS,
    edges: LOCAL_EDGES
  }
];
