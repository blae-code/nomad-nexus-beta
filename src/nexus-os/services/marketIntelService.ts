/**
 * Market Intel Service (MVP repository stub)
 *
 * Doctrine:
 * - Prices are observations, not authoritative live values.
 * - All outputs include recency/confidence context and stale warnings.
 * - Missing or stale data should degrade gracefully instead of guessing.
 *
 * TODO(adapter):
 * - Connect ingestion adapters for external feeds (UEX, org reports, manual imports).
 * - Preserve source + gameVersion + importedAt metadata in adapter payloads.
 */

import type {
  BuyOrSell,
  Commodity,
  ConfidenceBand,
  PriceObservation,
  PriceSummary,
  RouteHypothesis,
  Terminal,
} from '../schemas/marketIntelSchemas';
import { clampConfidence } from '../schemas/coreSchemas';

export interface PriceObservationInput extends Omit<PriceObservation, 'id'> {
  id?: string;
}

export interface PriceObservationFilters {
  terminalId?: string;
  commodityId?: string;
  buyOrSell?: BuyOrSell;
  includeStale?: boolean;
}

export interface PriceObservationView extends PriceObservation {
  ageSeconds: number;
  stale: boolean;
  staleWarning?: string;
}

export interface RecommendationCriteria {
  commodityId: string;
  minConfidence?: number;
  maxAgeSeconds?: number;
}

export interface BuySellRecommendation {
  commodityId: string;
  buyTerminalId?: string;
  sellTerminalId?: string;
  buyPrice?: number;
  sellPrice?: number;
  spread?: number;
  confidence: number;
  confidenceBand: ConfidenceBand;
  lastSeenAt: string;
  warning?: string;
}

const TTL_PROFILE_SECONDS: Record<string, number> = {
  'TTL-MARKET-FAST': 15 * 60,
  'TTL-MARKET-STANDARD': 60 * 60,
  'TTL-MARKET-SLOW': 6 * 60 * 60,
};

let observationStore: PriceObservation[] = [];
let routeHypothesisStore: RouteHypothesis[] = [];

const TERMINALS: Terminal[] = [
  { id: 'term-a18-trade', name: 'Area18 Trade Terminal', nodeId: 'body-arccorp', kind: 'commodity' },
  { id: 'term-orison-admin', name: 'Orison Admin', nodeId: 'body-crusader', kind: 'commodity' },
  { id: 'term-new-babbage-tdd', name: 'New Babbage TDD', nodeId: 'body-microtech', kind: 'commodity' },
];

const COMMODITIES: Commodity[] = [
  { id: 'commod-laranite', name: 'Laranite', category: 'Refined Material' },
  { id: 'commod-medical-supplies', name: 'Medical Supplies', category: 'Medical' },
  { id: 'commod-quantum-fuel', name: 'Quantum Fuel', category: 'Fuel' },
];

function createObservationId(nowMs = Date.now()): string {
  return `price_obs_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function ttlSecondsForProfile(profileId: string): number {
  return TTL_PROFILE_SECONDS[profileId] || TTL_PROFILE_SECONDS['TTL-MARKET-STANDARD'];
}

function isStale(observation: PriceObservation, nowMs: number): boolean {
  const reportedMs = new Date(observation.reportedAt).getTime();
  if (!Number.isFinite(reportedMs)) return true;
  return reportedMs + ttlSecondsForProfile(observation.ttlProfileId) * 1000 <= nowMs;
}

function confidenceBandFromScore(score: number): ConfidenceBand {
  if (score >= 0.72) return 'HIGH';
  if (score >= 0.45) return 'MED';
  return 'LOW';
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
}

function normalizeRecords(nowMs: number): PriceObservationView[] {
  return observationStore
    .map((record) => {
      const reportedMs = new Date(record.reportedAt).getTime();
      const ageSeconds = Number.isFinite(reportedMs) ? Math.max(0, Math.floor((nowMs - reportedMs) / 1000)) : 0;
      const stale = isStale(record, nowMs);
      return {
        ...record,
        confidence: clampConfidence(record.confidence),
        ageSeconds,
        stale,
        staleWarning: stale ? 'Observation is stale by TTL profile.' : undefined,
      };
    })
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
}

export function listTerminals(): Terminal[] {
  return [...TERMINALS];
}

export function listCommodities(): Commodity[] {
  return [...COMMODITIES];
}

export function recordPriceObservation(input: PriceObservationInput, nowMs = Date.now()): PriceObservation {
  const record: PriceObservation = {
    id: input.id || createObservationId(nowMs),
    terminalId: input.terminalId,
    commodityId: input.commodityId,
    buyOrSell: input.buyOrSell,
    price: Number(input.price),
    reportedAt: input.reportedAt || new Date(nowMs).toISOString(),
    source: input.source || 'unknown_source',
    confidence: clampConfidence(input.confidence),
    ttlProfileId: input.ttlProfileId || 'TTL-MARKET-STANDARD',
  };
  observationStore = [record, ...observationStore].sort(
    (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
  );
  return record;
}

export function listPriceObservations(filters: PriceObservationFilters = {}, nowMs = Date.now()): PriceObservationView[] {
  return normalizeRecords(nowMs).filter((record) => {
    if (filters.terminalId && record.terminalId !== filters.terminalId) return false;
    if (filters.commodityId && record.commodityId !== filters.commodityId) return false;
    if (filters.buyOrSell && record.buyOrSell !== filters.buyOrSell) return false;
    if (!filters.includeStale && record.stale) return false;
    return true;
  });
}

export function computePriceSummaries(nowMs = Date.now()): PriceSummary[] {
  const records = normalizeRecords(nowMs);
  const grouped = new Map<string, PriceObservationView[]>();
  for (const record of records) {
    const key = `${record.terminalId}:${record.commodityId}`;
    const bucket = grouped.get(key) || [];
    bucket.push(record);
    grouped.set(key, bucket);
  }

  const summaries: PriceSummary[] = [];
  for (const [key, bucket] of grouped.entries()) {
    const [terminalId, commodityId] = key.split(':');
    const buyValues = bucket.filter((entry) => entry.buyOrSell === 'BUY').map((entry) => entry.price);
    const sellValues = bucket.filter((entry) => entry.buyOrSell === 'SELL').map((entry) => entry.price);
    const avgConfidence =
      bucket.reduce((acc, entry) => acc + entry.confidence * (entry.stale ? 0.65 : 1), 0) / Math.max(1, bucket.length);
    const staleCount = bucket.filter((entry) => entry.stale).length;
    const staleRatio = staleCount / Math.max(1, bucket.length);
    const confidenceScore = Math.max(0, avgConfidence - staleRatio * 0.25 + Math.min(0.15, bucket.length * 0.015));
    const latest = bucket[0];
    const staleWarning =
      staleRatio >= 0.5 ? 'Summary confidence reduced: majority of observations are stale.' : undefined;

    summaries.push({
      terminalId,
      commodityId,
      buyMedian: median(buyValues),
      sellMedian: median(sellValues),
      sampleCount: bucket.length,
      lastSeenAt: latest?.reportedAt || new Date(nowMs).toISOString(),
      confidenceBand: confidenceBandFromScore(confidenceScore),
      staleWarning,
    });
  }

  return summaries.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
}

export function getBuySellRecommendations(
  criteria: RecommendationCriteria,
  nowMs = Date.now()
): BuySellRecommendation[] {
  const records = listPriceObservations({ commodityId: criteria.commodityId, includeStale: true }, nowMs).filter(
    (record) => {
      if (typeof criteria.maxAgeSeconds === 'number' && record.ageSeconds > criteria.maxAgeSeconds) return false;
      if (typeof criteria.minConfidence === 'number' && record.confidence < criteria.minConfidence) return false;
      return true;
    }
  );

  const buys = records.filter((entry) => entry.buyOrSell === 'BUY' && !entry.stale);
  const sells = records.filter((entry) => entry.buyOrSell === 'SELL' && !entry.stale);

  if (!buys.length || !sells.length) {
    const lastSeenAt = records[0]?.reportedAt || new Date(nowMs).toISOString();
    return [
      {
        commodityId: criteria.commodityId,
        confidence: 0.2,
        confidenceBand: 'LOW',
        lastSeenAt,
        warning: 'Insufficient fresh buy/sell observations for recommendation.',
      },
    ];
  }

  const bestBuy = [...buys].sort((a, b) => a.price - b.price)[0];
  const bestSell = [...sells].sort((a, b) => b.price - a.price)[0];
  const spread = Number((bestSell.price - bestBuy.price).toFixed(2));
  const confidence = clampConfidence((bestBuy.confidence + bestSell.confidence) / 2);
  const confidenceBand = confidenceBandFromScore(confidence);
  const lastSeenAt =
    new Date(bestBuy.reportedAt).getTime() >= new Date(bestSell.reportedAt).getTime()
      ? bestBuy.reportedAt
      : bestSell.reportedAt;

  return [
    {
      commodityId: criteria.commodityId,
      buyTerminalId: bestBuy.terminalId,
      sellTerminalId: bestSell.terminalId,
      buyPrice: bestBuy.price,
      sellPrice: bestSell.price,
      spread,
      confidence,
      confidenceBand,
      lastSeenAt,
      warning: confidenceBand === 'LOW' ? 'Low confidence recommendation; validate before committing.' : undefined,
    },
  ];
}

export function upsertRouteHypothesis(route: RouteHypothesis): RouteHypothesis {
  const existingIndex = routeHypothesisStore.findIndex(
    (entry) => entry.fromNodeId === route.fromNodeId && entry.toNodeId === route.toNodeId
  );
  if (existingIndex >= 0) {
    routeHypothesisStore[existingIndex] = route;
    return route;
  }
  routeHypothesisStore = [route, ...routeHypothesisStore];
  return route;
}

export function listRouteHypotheses(): RouteHypothesis[] {
  return [...routeHypothesisStore];
}

export function resetMarketIntelServiceState() {
  observationStore = [];
  routeHypothesisStore = [];
}

