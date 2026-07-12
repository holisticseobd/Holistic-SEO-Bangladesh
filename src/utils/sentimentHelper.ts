import { SEOData, KeywordNode, TopicNode } from '../types';

/**
 * Generates realistic organic search snippets based on the keyword's query label and intent.
 */
function generateSnippetsForKeyword(keyword: string, intent: string): { title: string; snippet: string; source: string; sentiment: number }[] {
  const normalized = keyword.toLowerCase();
  
  if (intent === 'Transactional' || normalized.includes('price') || normalized.includes('agency') || normalized.includes('tool')) {
    return [
      {
        title: `10 Best ${keyword} Services & Solutions of 2026`,
        snippet: `Discover top-rated ${keyword} platforms. Real user ratings, pricing structures, and feature comparisons to maximize your enterprise yield.`,
        source: `G2 Crowd`,
        sentiment: 88,
      },
      {
        title: `Why We Switched Our ${keyword} Strategy`,
        snippet: `The direct truth about our transition. While the setup cost was high, the automated ROI of ${keyword} has been phenomenal.`,
        source: `TechCrunch`,
        sentiment: 74,
      },
      {
        title: `Is ${keyword} Worth the Money?`,
        snippet: `A critical review of ${keyword}. We found several outstanding drawbacks in scaling, but the core features are robust enough.`,
        source: `Forbes Technology`,
        sentiment: 58,
      },
    ];
  } else if (intent === 'Commercial' || normalized.includes('vs') || normalized.includes('best') || normalized.includes('framework')) {
    return [
      {
        title: `A Professional Framework for ${keyword}`,
        snippet: `A complete breakdown of ${keyword}. We tested this model with 40 B2B SaaS sites and recorded a massive 42% organic traffic lift.`,
        source: `Search Engine Land`,
        sentiment: 92,
      },
      {
        title: `The Ultimate ${keyword} Guide for Marketing Managers`,
        snippet: `Learn how to map and leverage ${keyword}. Includes step-by-step instructions, templates, and typical traps to avoid.`,
        source: `HubSpot Blog`,
        sentiment: 85,
      },
      {
        title: `Honest Comparison: Pitfalls of ${keyword}`,
        snippet: `Be careful when executing ${keyword}. Without clean structured indexes and API crawl configurations, your indexing rate might plummet.`,
        source: `Moz Insider`,
        sentiment: 42,
      },
    ];
  } else {
    // Informational or Navigational
    return [
      {
        title: `What is ${keyword}? Definition & Core Concepts`,
        snippet: `An educational primer explaining the fundamentals of ${keyword}. Perfect for beginners looking to establish semantic content authority.`,
        source: `Search Engine Journal`,
        sentiment: 78,
      },
      {
        title: `How to Optimize for ${keyword} (With Real-World Snippets)`,
        snippet: `A great walkthrough with clear explanations. Readers praised the intuitive diagrams detailing ${keyword} execution parameters.`,
        source: `Backlinko`,
        sentiment: 84,
      },
      {
        title: `Common Misconceptions About ${keyword}`,
        snippet: `Many practitioners get ${keyword} wrong. It is NOT just about keywords; you need schema models and semantic clusters to rank.`,
        source: `Ahrefs Blog`,
        sentiment: 61,
      },
    ];
  }
}

/**
 * Generates realistic user reviews or practitioner feedback based on keyword difficulty and intent.
 */
function generateReviewsForKeyword(keyword: string, difficulty: number): { author: string; text: string; rating: number; sentiment: number }[] {
  if (difficulty > 70) {
    return [
      {
        author: `Marcus Vance (SaaS Growth Lead)`,
        text: `Ranking for "${keyword}" has been an absolute battle. The SERP is dominated by heavy domain authority sites. Difficult but the conversion value makes it crucial.`,
        rating: 4,
        sentiment: 65,
      },
      {
        author: `Elena Rostova (SEO Consultant)`,
        text: `We spent 3 months optimizing for "${keyword}" and only hit page 2. The CTR is low because Google places 4 ads and a local pack at the top of this query.`,
        rating: 2,
        sentiment: 32,
      },
      {
        author: `Jordan Wu (Director of Content)`,
        text: `Incredible transactional intent, but the keyword difficulty of ${difficulty} is real. You need excellent editorial backlinks to make a dent.`,
        rating: 4,
        sentiment: 70,
      },
    ];
  } else if (difficulty < 45) {
    return [
      {
        author: `Clara Higgins (Digital Marketer)`,
        text: `This is a goldmine! We published a structured checklist for "${keyword}" and ranked in the top 3 within a week. Highly positive feedback from our users.`,
        rating: 5,
        sentiment: 95,
      },
      {
        author: `Samir Patel (Founder, Bootstrapped Co)`,
        text: `Our absolute best-performing content piece. Highly recommended for startups looking to capture low-hanging fruit with high relevance.`,
        rating: 5,
        sentiment: 92,
      },
      {
        author: `Toby Vance (SEO Intern)`,
        text: `Very easy to rank, but watch out: search volume is a bit sporadic. Still, a solid addition to our content silo.`,
        rating: 4,
        sentiment: 78,
      },
    ];
  } else {
    return [
      {
        author: `Nadia Gomez (SEO Architect)`,
        text: `A standard middle-tier keyword. If you match the user intent precisely and include a video, you can comfortably rank on page 1 without major backlink spending.`,
        rating: 4,
        sentiment: 80,
      },
      {
        author: `Chris Miller (E-com Specialist)`,
        text: `Steady traffic driver. We added product ratings schema, and our snippet click-through rate for "${keyword}" went up by 15%. Good steady performance.`,
        rating: 4,
        sentiment: 85,
      },
      {
        author: `Yuki Sato (Webmaster)`,
        text: `The search intent is slightly mixed between commercial research and transactional buy signals. A bit tricky to align our landing page layout.`,
        rating: 3,
        sentiment: 58,
      },
    ];
  }
}

/**
 * Enriches a complete SEOData dataset by populating organic search snippets,
 * reviews, and calculating precise average sentiment scores for keywords and parent topics.
 */
export function enrichDatasetWithSentiment(data: SEOData): SEOData {
  // Deep clone to avoid mutating original state directly
  const enrichedKeywords: KeywordNode[] = data.keywords.map((k) => {
    const snippets = k.snippets || generateSnippetsForKeyword(k.label, k.intent);
    const reviews = k.reviews || generateReviewsForKeyword(k.label, k.difficulty);
    
    // Calculate average sentiment
    const totalSnippetSentiment = snippets.reduce((acc, s) => acc + s.sentiment, 0);
    const avgSnippetSentiment = totalSnippetSentiment / snippets.length;
    
    const totalReviewSentiment = reviews.reduce((acc, r) => acc + r.sentiment, 0);
    const avgReviewSentiment = totalReviewSentiment / reviews.length;
    
    const sentiment = Math.round((avgSnippetSentiment + avgReviewSentiment) / 2);

    return {
      ...k,
      snippets,
      reviews,
      sentiment,
    };
  });

  const enrichedTopics: TopicNode[] = data.topics.map((t) => {
    // Find child keywords belonging to this topic
    const children = enrichedKeywords.filter((k) => k.topicId === t.id);
    
    let sentiment = 70; // fallback default
    if (children.length > 0) {
      const totalKeywordSentiment = children.reduce((acc, k) => acc + (k.sentiment || 50), 0);
      sentiment = Math.round(totalKeywordSentiment / children.length);
    }

    return {
      ...t,
      sentiment,
    };
  });

  return {
    ...data,
    topics: enrichedTopics,
    keywords: enrichedKeywords,
  };
}
