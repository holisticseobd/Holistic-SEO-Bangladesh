import { SEOData, TopicNode, KeywordNode, LocationNode, EntityEdge, SearchIntent } from '../types';

export function parseCSVToSEOData(fileName: string, csvText: string): SEOData {
  // Simple, robust quote-aware CSV line splitter
  const parseCSVLines = (text: string): string[][] => {
    const lines: string[][] = [];
    const rows = text.split(/\r?\n/);
    
    rows.forEach((row) => {
      if (!row.trim()) return;
      const cells: string[] = [];
      let cell = '';
      let insideQuote = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          cells.push(cell.trim());
          cell = '';
        } else {
          cell += char;
        }
      }
      cells.push(cell.trim());
      lines.push(cells);
    });
    
    return lines;
  };

  const rows = parseCSVLines(csvText);
  if (rows.length < 2) {
    throw new Error('CSV spreadsheet must contain a header row and at least one data row.');
  }

  const headers = rows[0].map(h => h.toLowerCase());

  // Dynamic Column Detection Indices
  let topicIdx = headers.findIndex(h => h.includes('topic') || h.includes('cluster') || h.includes('category') || h.includes('subject'));
  let keywordIdx = headers.findIndex(h => h.includes('keyword') || h.includes('query') || h.includes('search phrase') || h.includes('phrase'));
  let volumeIdx = headers.findIndex(h => h.includes('volume') || h.includes('search') || h.includes('traffic') || h.includes('clicks') || h.includes('views'));
  let difficultyIdx = headers.findIndex(h => h.includes('difficulty') || h.includes('kd') || h.includes('competition') || h.includes('score'));
  let intentIdx = headers.findIndex(h => h.includes('intent') || h.includes('type') || h.includes('funnel'));
  let cpcIdx = headers.findIndex(h => h.includes('cpc') || h.includes('cost') || h.includes('price'));
  
  // Geographics indices
  let countryIdx = headers.findIndex(h => h.includes('country') || h.includes('nation'));
  let stateIdx = headers.findIndex(h => h.includes('state') || h.includes('region') || h.includes('province'));
  let cityIdx = headers.findIndex(h => h.includes('city') || h.includes('town'));
  let latIdx = headers.findIndex(h => h.includes('lat') || h.includes('latitude') || h.includes('coordinate y'));
  let lngIdx = headers.findIndex(h => h.includes('lng') || h.includes('longitude') || h.includes('coordinate x'));

  // Fallbacks if columns aren't found
  if (topicIdx === -1) topicIdx = 0; // Assume first column is topic if nothing found
  if (keywordIdx === -1) keywordIdx = Math.min(1, headers.length - 1);

  const topicsMap: Record<string, TopicNode> = {};
  const keywords: KeywordNode[] = [];
  const locationsMap: Record<string, LocationNode> = {};
  const edges: EntityEdge[] = [];

  // Helper to normalize intent strings to standard search intents
  const normalizeIntent = (str: string): SearchIntent => {
    const clean = str.trim().toLowerCase();
    if (clean.includes('trans') || clean.includes('buy') || clean.includes('purchase')) return 'Transactional';
    if (clean.includes('comm') || clean.includes('invest') || clean.includes('shop')) return 'Commercial';
    if (clean.includes('nav') || clean.includes('brand')) return 'Navigational';
    return 'Informational'; // Default fallback
  };

  // Process rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < Math.max(topicIdx, keywordIdx) + 1) continue;

    const topicLabel = row[topicIdx] || 'General';
    const keywordLabel = keywordIdx !== -1 ? row[keywordIdx] : '';
    const rawVolume = volumeIdx !== -1 ? parseInt(row[volumeIdx]) : 2400;
    const volume = isNaN(rawVolume) ? 1000 : rawVolume;
    
    const rawDifficulty = difficultyIdx !== -1 ? parseInt(row[difficultyIdx]) : 45;
    const difficulty = isNaN(rawDifficulty) ? 30 : Math.max(0, Math.min(100, rawDifficulty));

    const intentStr = intentIdx !== -1 ? row[intentIdx] : 'Informational';
    const intent = normalizeIntent(intentStr);

    const rawCpc = cpcIdx !== -1 ? parseFloat(row[cpcIdx].replace('$', '')) : 2.5;
    const cpc = isNaN(rawCpc) ? 1.5 : rawCpc;

    const topicId = `t-${topicLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

    // 1. Accumulate or update Topic Nodes
    if (!topicsMap[topicId]) {
      topicsMap[topicId] = {
        id: topicId,
        label: topicLabel,
        cluster: topicLabel.includes('SEO') || topicLabel.includes('Marketing') ? 'SEO Focus' : 'Target Hub',
        volume: volume,
        difficulty: difficulty,
        intent: intent,
        description: `Strategic topic cluster analyzing ${topicLabel} with associated queries.`,
        connections: [],
      };
    } else {
      // aggregate volume
      topicsMap[topicId].volume += volume;
      // average difficulty
      topicsMap[topicId].difficulty = Math.round((topicsMap[topicId].difficulty + difficulty) / 2);
    }

    // 2. Accumulate Keyword Nodes
    if (keywordLabel) {
      const keywordId = `k-${i}-${keywordLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      keywords.push({
        id: keywordId,
        label: keywordLabel,
        topicId: topicId,
        volume: volume,
        difficulty: difficulty,
        cpc: cpc,
        intent: intent,
        authority: Math.round(100 - difficulty * 0.9), // logical authority proxy
      });

      edges.push({
        source: keywordId,
        target: topicId,
        type: 'belongs_to',
        weight: 8,
      });
    }

    // 3. Accumulate geographical parameters if exists
    if (countryIdx !== -1 && row[countryIdx]) {
      const countryName = row[countryIdx].trim();
      const countryId = `loc-${countryName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      
      const latVal = latIdx !== -1 ? parseFloat(row[latIdx]) : undefined;
      const lngVal = lngIdx !== -1 ? parseFloat(row[lngIdx]) : undefined;

      if (!locationsMap[countryId]) {
        locationsMap[countryId] = {
          id: countryId,
          name: countryName,
          type: 'country',
          parentId: null,
          volume: volume,
          percentage: 100,
          latitude: isNaN(latVal || NaN) ? 37.09 : latVal,
          longitude: isNaN(lngVal || NaN) ? -95.71 : lngVal,
        };
      } else {
        locationsMap[countryId].volume += volume;
      }

      // If state exists
      if (stateIdx !== -1 && row[stateIdx]) {
        const stateName = row[stateIdx].trim();
        const stateId = `${countryId}-${stateName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

        if (!locationsMap[stateId]) {
          locationsMap[stateId] = {
            id: stateId,
            name: stateName,
            type: 'state',
            parentId: countryId,
            volume: volume,
            percentage: 50,
            latitude: isNaN(latVal || NaN) ? 40.71 : latVal,
            longitude: isNaN(lngVal || NaN) ? -74.00 : lngVal,
          };
        } else {
          locationsMap[stateId].volume += volume;
        }

        // Connect location back to topic
        edges.push({
          source: countryId,
          target: topicId,
          type: 'targets_in',
          weight: 6,
        });
      }
    }
  }

  // Cross-connect topic nodes dynamically if they share similar keyword intents or clusters
  const topicList = Object.values(topicsMap);
  topicList.forEach((t, index) => {
    const nextTopic = topicList[(index + 1) % topicList.length];
    if (nextTopic && t.id !== nextTopic.id) {
      t.connections.push(nextTopic.id);
    }
  });

  // Normalize locations percentages
  const locationList = Object.values(locationsMap);
  const totalLocVol = locationList.filter(l => l.type === 'country').reduce((acc, curr) => acc + curr.volume, 0) || 1;
  locationList.forEach(loc => {
    if (loc.type === 'country') {
      loc.percentage = Math.round((loc.volume / totalLocVol) * 100);
    }
  });

  // Standard fallback coordinates mapping if lat/lng are missing entirely
  const defaultGeoCoords: Record<string, { lat: number; lng: number }> = {
    'united states': { lat: 37.0902, lng: -95.7129 },
    'united kingdom': { lat: 55.3781, lng: -3.4360 },
    'canada': { lat: 56.1304, lng: -106.3468 },
    'germany': { lat: 51.1657, lng: 10.4515 },
    'australia': { lat: -25.2744, lng: 133.7751 },
    'france': { lat: 46.2276, lng: 2.2137 },
  };

  locationList.forEach(loc => {
    if (loc.type === 'country' && (!loc.latitude || !loc.longitude)) {
      const match = defaultGeoCoords[loc.name.toLowerCase()];
      if (match) {
        loc.latitude = match.lat;
        loc.longitude = match.lng;
      }
    }
  });

  return {
    datasetName: fileName.replace(/\.[^/.]+$/, ''), // remove file extension
    topics: topicList,
    keywords,
    locations: locationList.length > 0 ? locationList : [
      { id: 'loc-default', name: 'Global Audience', type: 'country', parentId: null, volume: 150000, percentage: 100, latitude: 37.09, longitude: -95.71 }
    ],
    edges,
  };
}
