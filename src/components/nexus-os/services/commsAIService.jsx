import { base44 } from '@/components/base44/nexusBase44Client';

/**
 * CommsAI Service - Batched AI analysis for communication management
 * Optimizes AI usage by processing messages in batches and caching results
 */

const AI_BATCH_SIZE = 10;
const AI_BATCH_DELAY = 2000; // 2 seconds
const CACHE_TTL = 300000; // 5 minutes

let pendingAnalysis = [];
let batchTimer = null;
const analysisCache = new Map();

/**
 * Message Analysis Schema
 */
const MESSAGE_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
      enum: ['tactical', 'operational', 'social', 'administrative', 'urgent'],
      description: 'Message category'
    },
    priority: {
      type: 'string',
      enum: ['critical', 'high', 'normal', 'low'],
      description: 'Message priority level'
    },
    sentiment: {
      type: 'string',
      enum: ['positive', 'neutral', 'negative', 'concerned', 'excited'],
      description: 'Emotional tone of the message'
    },
    urgency: {
      type: 'number',
      minimum: 0,
      maximum: 10,
      description: 'Urgency score from 0-10'
    },
    keywords: {
      type: 'array',
      items: { type: 'string' },
      description: 'Key topics or terms in the message'
    },
    requiresResponse: {
      type: 'boolean',
      description: 'Whether the message requires a response'
    }
  },
  required: ['category', 'priority', 'sentiment', 'urgency', 'requiresResponse']
};

/**
 * Smart Search Schema
 */
const SEARCH_RESULTS_SCHEMA = {
  type: 'object',
  properties: {
    relevantMessages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          messageId: { type: 'string' },
          relevanceScore: { type: 'number' },
          reasoning: { type: 'string' }
        }
      }
    },
    searchSummary: {
      type: 'string',
      description: 'Brief summary of search results'
    }
  }
};

/**
 * Response Suggestions Schema
 */
const RESPONSE_SUGGESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          tone: { type: 'string', enum: ['professional', 'casual', 'urgent', 'empathetic'] },
          reasoning: { type: 'string' }
        }
      },
      maxItems: 3
    }
  }
};

/**
 * Queue message for batch analysis
 */
export function queueMessageAnalysis(message) {
  return new Promise((resolve) => {
    // Check cache first
    const cacheKey = `analysis:${message.id}`;
    const cached = analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      resolve(cached.result);
      return;
    }

    // Add to pending batch
    pendingAnalysis.push({ message, resolve });

    // Clear existing timer
    if (batchTimer) {
      clearTimeout(batchTimer);
    }

    // Process batch if full or set timer
    if (pendingAnalysis.length >= AI_BATCH_SIZE) {
      processBatch();
    } else {
      batchTimer = setTimeout(processBatch, AI_BATCH_DELAY);
    }
  });
}

/**
 * Process batch of messages
 */
async function processBatch() {
  if (pendingAnalysis.length === 0) return;

  const batch = pendingAnalysis.splice(0, AI_BATCH_SIZE);
  batchTimer = null;

  try {
    const messagesText = batch.map((item, idx) => 
      `Message ${idx + 1} (ID: ${item.message.id}):\n` +
      `From: ${item.message.member_profile_id}\n` +
      `Content: ${item.message.content}\n` +
      `Channel: ${item.message.channel_id}\n`
    ).join('\n---\n');

    const prompt = `Analyze the following messages for a tactical communications system. For each message, determine:
- Category (tactical/operational/social/administrative/urgent)
- Priority (critical/high/normal/low)
- Sentiment (positive/neutral/negative/concerned/excited)
- Urgency score (0-10)
- Key keywords
- Whether it requires a response

Messages:
${messagesText}

Return an array with one analysis object per message, in the same order.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          analyses: {
            type: 'array',
            items: MESSAGE_ANALYSIS_SCHEMA
          }
        }
      }
    });

    // Distribute results and cache
    const analyses = response.analyses || [];
    batch.forEach((item, idx) => {
      const analysis = analyses[idx] || getDefaultAnalysis();
      const cacheKey = `analysis:${item.message.id}`;
      analysisCache.set(cacheKey, {
        result: analysis,
        timestamp: Date.now()
      });
      item.resolve(analysis);
    });
  } catch (error) {
    console.error('[CommsAI] Batch analysis failed:', error);
    // Resolve with default analysis
    batch.forEach(item => item.resolve(getDefaultAnalysis()));
  }
}

/**
 * Generate response suggestions for a message
 */
export async function generateResponseSuggestions(message, conversationHistory = []) {
  try {
    const contextMessages = conversationHistory.slice(-5).map(m => 
      `${m.member_profile_id}: ${m.content}`
    ).join('\n');

    const prompt = `You are assisting with tactical communications. Generate 3 brief, appropriate response suggestions for this message.

Original Message: "${message.content}"

Recent Context:
${contextMessages || 'No prior context'}

Provide responses in different tones (professional, casual, urgent) as appropriate for the situation.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: RESPONSE_SUGGESTIONS_SCHEMA
    });

    return response.suggestions || [];
  } catch (error) {
    console.error('[CommsAI] Response suggestions failed:', error);
    return [];
  }
}

/**
 * Smart search across messages using natural language
 */
export async function smartSearch(query, messages) {
  try {
    const messagesContext = messages.slice(0, 100).map(m =>
      `[${m.id}] ${m.member_profile_id}: ${m.content}`
    ).join('\n');

    const prompt = `Search through these communications using natural language understanding.

Query: "${query}"

Messages:
${messagesContext}

Find the most relevant messages based on semantic meaning, not just keyword matching. Return message IDs with relevance scores.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: SEARCH_RESULTS_SCHEMA
    });

    return {
      results: response.relevantMessages || [],
      summary: response.searchSummary || 'No results found'
    };
  } catch (error) {
    console.error('[CommsAI] Smart search failed:', error);
    return { results: [], summary: 'Search failed' };
  }
}

/**
 * Get default analysis for fallback
 */
function getDefaultAnalysis() {
  return {
    category: 'operational',
    priority: 'normal',
    sentiment: 'neutral',
    urgency: 5,
    keywords: [],
    requiresResponse: false
  };
}

/**
 * Clear analysis cache
 */
export function clearAnalysisCache() {
  analysisCache.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  return {
    size: analysisCache.size,
    pendingBatch: pendingAnalysis.length
  };
}
