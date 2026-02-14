/**
 * Market Intel Service
 *
 * Doctrine:
 * - Prices are observations, not authoritative live values.
 * - All outputs include recency/confidence context and stale warnings.
 * - Missing or stale data should degrade gracefully instead of guessing.
 * - Adapter ingestion must preserve source + gameVersion + importedAt metadata.
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

export interface ObservationIngestMetadata {
  gameVersion?: string;
  importedAt?: string;
  adapterId?: string;
}

export interface PriceObservationInput extends Omit<PriceObservation, 'id'> {
  id?: string;
  metadata?: ObservationIngestMetadata;
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
  metadata?: ObservationIngestMetadata;
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

export interface MarketIntelAdapterContext {
  nowMs: number;
}

export interface MarketIntelAdapterPayload {
  source?: string;
  gameVersion?: string;
  importedAt?: string;
  observations?: PriceObservationInput[];
  routeHypotheses?: RouteHypothesis[];
}

export interface MarketIntelAdapter {
  id: string;
  priority?: number;
  ingest:
    | ((context: MarketIntelAdapterContext) => MarketIntelAdapterPayload | Promise<MarketIntelAdapterPayload>);
}

export interface MarketIntelAdapterStatus {
  adapterId: string;
  importedObservations: number;
  importedRoutes: number;
  warnings: string[];
  error?: string;
}

export interface MarketIntelAdapterRefreshResult {
  refreshedAt: string;
  observationCount: number;
  routeCount: number;
  warnings: string[];
  adapters: MarketIntelAdapterStatus[];
}

export interface MarketIntelAdapterHealth {
  lastRefreshedAt: string | null;
  warnings: string[];
  adapters: MarketIntelAdapterStatus[];
  observationCount: number;
  routeCount: number;
}

const TTL_PROFILE_SECONDS: Record<string, number> = {
  'TTL-MARKET-FAST': 15 * 60,
  'TTL-MARKET-STANDARD': 60 * 60,
  'TTL-MARKET-SLOW': 6 * 60 * 60,
};

let observationStore: PriceObservation[] = [];
let routeHypothesisStore: RouteHypothesis[] = [];
const observationMetadataStore = new Map<string, ObservationIngestMetadata>();
const marketIntelAdapterStore = new Map<string, MarketIntelAdapter>();
let marketIntelAdapterStatuses: MarketIntelAdapterStatus[] = [];
let marketIntelLastRefreshAt: string | null = null;
let marketIntelRefreshWarnings: string[] = [];

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

function normalizeIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
}

function normalizeObservationMetadata(
  metadata: ObservationIngestMetadata | undefined,
  defaults: ObservationIngestMetadata
): ObservationIngestMetadata | undefined {
  const merged: ObservationIngestMetadata = {
    gameVersion: metadata?.gameVersion || defaults.gameVersion,
    importedAt: normalizeIso(metadata?.importedAt || defaults.importedAt),
    adapterId: metadata?.adapterId || defaults.adapterId,
  };
  const hasAny = Boolean(merged.gameVersion || merged.importedAt || merged.adapterId);
  return hasAny ? merged : undefined;
}

function sortAdapters(adapters: MarketIntelAdapter[]): MarketIntelAdapter[] {
  return [...adapters].sort((a, b) => {
    const priorityDelta = (b.priority || 0) - (a.priority || 0);
    if (priorityDelta !== 0) return priorityDelta;
    return a.id.localeCompare(b.id);
  });
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
        metadata: observationMetadataStore.get(record.id),
      };
    })
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
}

function validateObservationInput(input: PriceObservationInput): void {
  if (!input.terminalId) throw new Error('Price observation requires terminalId.');
  if (!input.commodityId) throw new Error('Price observation requires commodityId.');
  if (input.buyOrSell !== 'BUY' && input.buyOrSell !== 'SELL') {
    throw new Error('Price observation requires buyOrSell as BUY or SELL.');
  }
  if (!Number.isFinite(Number(input.price))) throw new Error('Price observation price must be numeric.');
}

export function listTerminals(): Terminal[] {
  return [...TERMINALS];
}

export function listCommodities(): Commodity[] {
  return [...COMMODITIES];
}

export function recordPriceObservation(input: PriceObservationInput, nowMs = Date.now()): PriceObservation {
  validateObservationInput(input);
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

  const existingIndex = observationStore.findIndex((entry) => entry.id === record.id);
  if (existingIndex >= 0) {
    observationStore[existingIndex] = record;
  } else {
    observationStore = [record, ...observationStore];
  }
  observationStore = observationStore.sort(
    (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
  );

  const metadata = normalizeObservationMetadata(input.metadata, {});
  if (metadata) observationMetadataStore.set(record.id, metadata);
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

export function getPriceObservationMetadata(observationId: string): ObservationIngestMetadata | null {
  return observationMetadataStore.get(observationId) || null;
}

export function registerMarketIntelAdapter(adapter: MarketIntelAdapter): void {
  const id = String(adapter.id || '').trim();
  if (!id) throw new Error('MarketIntelAdapter id is required.');
  if (typeof adapter.ingest !== 'function') throw new Error(`MarketIntelAdapter ${id} must provide ingest(context).`);
  marketIntelAdapterStore.set(id, { ...adapter, id });
}

export function unregisterMarketIntelAdapter(adapterId: string): boolean {
  return marketIntelAdapterStore.delete(String(adapterId || '').trim());
}

export function listMarketIntelAdapters(): MarketIntelAdapter[] {
  return sortAdapters([...marketIntelAdapterStore.values()]);
}

export function getMarketIntelAdapterHealth(): MarketIntelAdapterHealth {
  return {
    lastRefreshedAt: marketIntelLastRefreshAt,
    warnings: [...marketIntelRefreshWarnings],
    adapters: marketIntelAdapterStatuses.map((status) => ({
      ...status,
      warnings: [...status.warnings],
    })),
    observationCount: observationStore.length,
    routeCount: routeHypothesisStore.length,
  };
}

export async function refreshMarketIntelFromAdapters(nowMs = Date.now()): Promise<MarketIntelAdapterRefreshResult> {
  const refreshedAt = new Date(nowMs).toISOString();
  const adapters = listMarketIntelAdapters();
  const statuses: MarketIntelAdapterStatus[] = [];
  const warnings: string[] = [];

  for (const adapter of adapters) {
    const adapterWarnings: string[] = [];
    let importedObservations = 0;
    let importedRoutes = 0;
    try {
      const payload = await adapter.ingest({ nowMs });
      const defaults: ObservationIngestMetadata = {
        gameVersion: payload.gameVersion,
        importedAt: payload.importedAt || refreshedAt,
        adapterId: adapter.id,
      };
      for (const observation of payload.observations || []) {
        try {
          recordPriceObservation(
            {
              ...observation,
              source: observation.source || payload.source || `adapter:${adapter.id}`,
              metadata: normalizeObservationMetadata(observation.metadata, defaults),
            },
            nowMs
          );
          importedObservations += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          adapterWarnings.push(`observation rejected: ${message}`);
        }
      }
      for (const route of payload.routeHypotheses || []) {
        upsertRouteHypothesis(route);
        importedRoutes += 1;
      }
      statuses.push({
        adapterId: adapter.id,
        importedObservations,
        importedRoutes,
        warnings: adapterWarnings,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      statuses.push({
        adapterId: adapter.id,
        importedObservations,
        importedRoutes,
        warnings: adapterWarnings,
        error: message,
      });
      warnings.push(`${adapter.id} ingestion failed: ${message}`);
    }
  }

  marketIntelAdapterStatuses = statuses;
  marketIntelLastRefreshAt = refreshedAt;
  marketIntelRefreshWarnings = [...warnings];
  return {
    refreshedAt,
    observationCount: observationStore.length,
    routeCount: routeHypothesisStore.length,
    warnings,
    adapters: statuses,
  };
}

export function resetMarketIntelServiceState() {
  observationStore = [];
  routeHypothesisStore = [];
  observationMetadataStore.clear();
  marketIntelAdapterStore.clear();
  marketIntelAdapterStatuses = [];
  marketIntelLastRefreshAt = null;
  marketIntelRefreshWarnings = [];
}
