/**
 * Market and Location Intelligence Schemas
 *
 * Doctrine:
 * - Market entries are observations, never guaranteed live truth.
 * - Recency + source + confidence are mandatory for every observation.
 * - Derived summaries must preserve uncertainty and stale-state warnings.
 */

export type TerminalKind = 'commodity' | 'ship_shop' | 'component_shop';
export type BuyOrSell = 'BUY' | 'SELL';
export type ConfidenceBand = 'LOW' | 'MED' | 'HIGH';

export interface Terminal {
  id: string;
  name: string;
  nodeId: string;
  kind: TerminalKind;
}

export interface Commodity {
  id: string;
  name: string;
  category: string;
}

export interface PriceObservation {
  id: string;
  terminalId: string;
  commodityId: string;
  buyOrSell: BuyOrSell;
  price: number;
  reportedAt: string;
  source: string;
  confidence: number;
  ttlProfileId: string;
}

/**
 * Derived read model; never user-authored.
 */
export interface PriceSummary {
  terminalId: string;
  commodityId: string;
  buyMedian?: number;
  sellMedian?: number;
  sampleCount: number;
  lastSeenAt: string;
  confidenceBand: ConfidenceBand;
  staleWarning?: string;
}

export interface RouteHypothesis {
  fromNodeId: string;
  toNodeId: string;
  riskTags?: string[];
  notes?: string;
  derivedFrom: Array<{ kind: 'price_observation' | 'intel_object' | 'other'; id: string }>;
}

