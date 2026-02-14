import { afterEach, describe, expect, it } from 'vitest';
import {
  getReferenceDataAdapterHealth,
  getShipSpec,
  refreshReferenceDataFromAdapters,
  registerReferenceDataAdapter,
  resetReferenceDataServiceState,
} from '../../src/components/nexus-os/services/referenceDataService';
import {
  getMarketIntelAdapterHealth,
  getPriceObservationMetadata,
  listPriceObservations,
  refreshMarketIntelFromAdapters,
  registerMarketIntelAdapter,
  resetMarketIntelServiceState,
} from '../../src/components/nexus-os/services/marketIntelService';

afterEach(() => {
  resetReferenceDataServiceState();
  resetMarketIntelServiceState();
});

describe('referenceDataService adapters', () => {
  it('ingests adapter records and stamps provenance defaults', async () => {
    registerReferenceDataAdapter({
      id: 'fleetyards-baseline',
      priority: 20,
      fetchBaseline: () => ({
        source: 'adapter:fleetyards',
        gameVersion: '4.1.0',
        importedAt: '2026-02-11T12:00:00.000Z',
        ships: [
          {
            id: 'ship-vanguard-sentinel',
            name: 'Vanguard Sentinel',
            manufacturer: 'Aegis Dynamics',
            shipClass: 'Heavy Fighter',
            roleTags: ['combat', 'escort'],
            hardpointsSummary: { weaponMounts: 5, turretMounts: 1 },
            crewSeats: 2,
            capabilities: ['escort', 'ew'],
          },
        ],
      }),
    });

    const refresh = await refreshReferenceDataFromAdapters({
      requestedGameVersion: '4.1.0',
      includeSeedFallback: true,
      nowMs: Date.parse('2026-02-11T12:05:00.000Z'),
    });

    const match = getShipSpec('ship-vanguard-sentinel', '4.1.0');
    expect(refresh.shipCount).toBeGreaterThan(0);
    expect(match.data?.source).toBe('adapter:fleetyards');
    expect(match.data?.gameVersion).toBe('4.1.0');
    expect(match.data?.importedAt).toBe('2026-02-11T12:00:00.000Z');

    const health = getReferenceDataAdapterHealth();
    expect(health.adapters).toHaveLength(1);
    expect(health.adapters[0].importedShips).toBe(1);
    expect(health.adapters[0].warnings).toEqual([]);
  });

  it('rejects adapter records without provenance when defaults are absent', async () => {
    registerReferenceDataAdapter({
      id: 'bad-adapter',
      fetchBaseline: () => ({
        ships: [
          {
            id: 'ship-invalid',
            name: 'Invalid Ship',
            manufacturer: 'Unknown',
            shipClass: 'Test',
            roleTags: [],
            hardpointsSummary: {},
            crewSeats: 1,
            capabilities: [],
          },
        ],
      }),
    });

    await refreshReferenceDataFromAdapters({
      includeSeedFallback: false,
      nowMs: Date.parse('2026-02-11T13:00:00.000Z'),
    });

    const ship = getShipSpec('ship-invalid');
    expect(ship.data).toBeNull();

    const health = getReferenceDataAdapterHealth();
    expect(health.adapters[0].warnings.some((message) => message.includes('missing provenance'))).toBe(true);
    expect(health.warnings.some((message) => message.includes('retaining previous dataset'))).toBe(true);
  });
});

describe('marketIntelService adapters', () => {
  it('ingests adapter observations and preserves metadata', async () => {
    registerMarketIntelAdapter({
      id: 'uex-feed',
      priority: 10,
      ingest: () => ({
        source: 'adapter:uex',
        gameVersion: '4.1.0',
        importedAt: '2026-02-11T14:00:00.000Z',
        observations: [
          {
            id: 'obs-uex-1',
            terminalId: 'term-a18-trade',
            commodityId: 'commod-laranite',
            buyOrSell: 'BUY',
            price: 24.5,
            reportedAt: '2026-02-11T13:59:00.000Z',
            source: 'uex',
            confidence: 0.81,
            ttlProfileId: 'TTL-MARKET-STANDARD',
          },
        ],
      }),
    });

    const refresh = await refreshMarketIntelFromAdapters(Date.parse('2026-02-11T14:01:00.000Z'));
    expect(refresh.observationCount).toBe(1);

    const observations = listPriceObservations({ includeStale: true }, Date.parse('2026-02-11T14:01:00.000Z'));
    expect(observations).toHaveLength(1);
    expect(observations[0].metadata?.gameVersion).toBe('4.1.0');
    expect(observations[0].metadata?.importedAt).toBe('2026-02-11T14:00:00.000Z');
    expect(observations[0].metadata?.adapterId).toBe('uex-feed');

    const metadata = getPriceObservationMetadata('obs-uex-1');
    expect(metadata?.gameVersion).toBe('4.1.0');
    expect(metadata?.adapterId).toBe('uex-feed');
  });

  it('returns adapter warnings for invalid observations without crashing refresh', async () => {
    registerMarketIntelAdapter({
      id: 'broken-import',
      ingest: () => ({
        observations: [
          {
            id: 'bad-obs',
            terminalId: '',
            commodityId: 'commod-laranite',
            buyOrSell: 'BUY',
            price: 30,
            reportedAt: '2026-02-11T15:00:00.000Z',
            source: 'manual',
            confidence: 0.5,
            ttlProfileId: 'TTL-MARKET-STANDARD',
          },
        ],
      }),
    });

    const refresh = await refreshMarketIntelFromAdapters(Date.parse('2026-02-11T15:01:00.000Z'));
    expect(refresh.observationCount).toBe(0);

    const health = getMarketIntelAdapterHealth();
    expect(health.adapters).toHaveLength(1);
    expect(health.adapters[0].warnings.some((message) => message.includes('terminalId'))).toBe(true);
  });
});

