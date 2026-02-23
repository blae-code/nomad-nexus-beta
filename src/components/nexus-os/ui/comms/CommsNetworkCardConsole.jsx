import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Pin, PinOff, Radio, RefreshCcw } from 'lucide-react';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { buildCommsGraphSnapshot } from '../../services/commsGraphService';
import { DEFAULT_ACQUISITION_MODE, buildCaptureMetadata, toCaptureMetadataRecord } from '../../services/dataAcquisitionPolicyService';
import { NexusBadge, NexusButton, DegradedStateCard } from '../primitives';
import { PanelLoadingState } from '../loading';

import { tokenAssets } from '../tokens';
import {
  operatorStatusTone,
  operatorStatusTokenIcon,
  roleTokenIcon,
  squadTokenIcon,
  vehicleStatusTokenIcon,
  wingTokenIcon } from
'./commsTokenSemantics';
import { buildSchemaTree } from './commsFleetSchemaRuntime';
import {
  appendOrderDispatch,
  buildDeliveryStats,
  buildDeliverySurface,
  buildPagedOrders,
  createOrderDispatch,
  deliveryTone } from
'./commsOrderRuntime';
import {
  COMMS_CARD_CONSOLE_DEFAULT_TTL_SEC,
  COMMS_CARD_CONSOLE_MAX_TEMPLATE_SQUADS,
  COMMS_CARD_CONSOLE_TTL_PRESETS,
  buildCommsCardConsoleScopeKey,
  hydrateCommsCardConsoleState,
  isCommsCardUtilityCoreEnabled,
  loadLocalCommsCardConsoleState,
  normalizeCommsCardConsoleState,
  persistCommsCardConsoleState,
  removeBridgeTemplate,
  renameBridgeTemplate,
  toggleWatchlistSquad,
  upsertBridgeTemplate } from
'./commsCardConsoleState';
import {
  buildBridgeLifecycleRows,
  buildEscalationSuggestions,
  buildSquadSlaSnapshots,
  normalizeBridgeTtlSec,
  sortSquadCardsDeterministic } from
'./commsCardConsoleRuntime';

const SQUAD_CARD_PAGE_SIZE = 5;
const WATCHLIST_PAGE_SIZE = 5;
const ORDER_FEED_PREVIEW_SIZE = 3;
const MAX_ORDER_HISTORY = 24;
const GRAPH_REFRESH_MS = 12_000;
const MAX_BRIDGE_SESSIONS = 6;

function formatAge(nowMs, createdAtMs) {
  const seconds = Math.max(0, Math.round((nowMs - createdAtMs) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function formatSlaAge(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = Math.floor(seconds % 60);
  return `${minutes}m ${String(rem).padStart(2, '0')}s`;
}

function roleToken(role) {
  return String(role || '').trim().toLowerCase();
}

function slaTone(status) {
  if (status === 'red') return 'danger';
  if (status === 'amber') return 'warning';
  return 'ok';
}

function slaTokenIcon(status) {
  if (status === 'red') return tokenAssets.comms.operatorStatus.offNet;
  if (status === 'amber') return tokenAssets.comms.operatorStatus.tx;
  return tokenAssets.comms.operatorStatus.onNet;
}

function buildSquadCards(schemaTree, edges) {
  const cards = [];
  const squadByChannelId = new Map();

  for (const wing of schemaTree || []) {
    for (const squad of wing.squads || []) {
      const channels = (squad.channels || []).map((channel) => {
        squadByChannelId.set(channel.id, squad.id);
        return {
          id: channel.id,
          label: channel.label,
          status: channel.status,
          membershipCount: Number(channel.membershipCount || 0)
        };
      });

      const vehicles = [];
      const operators = [];

      for (const channel of squad.channels || []) {
        for (const vehicle of channel.vehicles || []) {
          vehicles.push({
            id: vehicle.id,
            label: vehicle.label,
            status: vehicle.basicStatus,
            crewCount: Number(vehicle.crewCount || vehicle.operators?.length || 0)
          });

          for (const operator of vehicle.operators || []) {
            operators.push({
              id: operator.id,
              callsign: operator.callsign || operator.id,
              role: operator.role || 'Member',
              status: operator.status || 'OFF-NET'
            });
          }
        }
      }

      const pilotCount = operators.filter((entry) => {
        const token = roleToken(entry.role);
        return token.includes('pilot') || token.includes('flight') || token.includes('gunship');
      }).length;
      const medicCount = operators.filter((entry) => {
        const token = roleToken(entry.role);
        return token.includes('medic') || token.includes('medical');
      }).length;
      const leadCount = operators.filter((entry) => {
        const token = roleToken(entry.role);
        return token.includes('lead') || token.includes('command') || token.includes('signal');
      }).length;
      const txCount = operators.filter((entry) => entry.status === 'TX').length;
      const onlineCount = operators.filter((entry) => entry.status === 'TX' || entry.status === 'ON-NET').length;
      const offNetCount = operators.filter((entry) => entry.status === 'OFF-NET').length;

      cards.push({
        id: squad.id,
        wingId: wing.id,
        wingLabel: wing.label,
        squadLabel: squad.label,
        channels,
        vehicles,
        operators: operators.slice(0, 12),
        primaryChannelId: channels[0]?.id || '',
        pilotCount,
        medicCount,
        leadCount,
        txCount,
        onlineCount,
        offNetCount,
        linkedSquadIds: []
      });
    }
  }

  const linkedBySquadId = new Map();
  for (const edge of edges || []) {
    const sourceId = String(edge?.sourceId || '');
    const targetId = String(edge?.targetId || '');
    if (!sourceId.startsWith('channel:') || !targetId.startsWith('channel:')) continue;
    const sourceChannelId = sourceId.replace('channel:', '');
    const targetChannelId = targetId.replace('channel:', '');
    const sourceSquadId = squadByChannelId.get(sourceChannelId);
    const targetSquadId = squadByChannelId.get(targetChannelId);
    if (!sourceSquadId || !targetSquadId || sourceSquadId === targetSquadId) continue;
    const sourceSet = linkedBySquadId.get(sourceSquadId) || new Set();
    sourceSet.add(targetSquadId);
    linkedBySquadId.set(sourceSquadId, sourceSet);
    const targetSet = linkedBySquadId.get(targetSquadId) || new Set();
    targetSet.add(sourceSquadId);
    linkedBySquadId.set(targetSquadId, targetSet);
  }

  return sortSquadCardsDeterministic(
    cards.map((card) => ({
      ...card,
      linkedSquadIds: [...(linkedBySquadId.get(card.id) || new Set())]
    }))
  );
}

function onTemplateNameInput(defaultValue) {
  if (typeof window === 'undefined') return defaultValue;
  const response = window.prompt('Bridge template name', defaultValue) || '';
  return response.trim();
}

function confirmAction(message) {
  if (typeof window === 'undefined') return false;
  return Boolean(window.confirm(message));
}

export default function CommsNetworkCardConsole({
  variantId = 'CQB-01',
  bridgeId,
  opId,
  roster = [],
  events = [],
  actorId = '',
  onCreateMacroEvent
}) {
  const voiceNet = useVoiceNet();
  const scopeInput = useMemo(
    () => ({
      sessionScopeKey: `${String(bridgeId || 'OPS')}:${String(actorId || 'operator')}`,
      variantId,
      opId
    }),
    [actorId, bridgeId, opId, variantId]
  );
  const scopeKey = useMemo(() => buildCommsCardConsoleScopeKey(scopeInput), [scopeInput]);
  const utilityCoreEnabled = useMemo(() => isCommsCardUtilityCoreEnabled(), []);

  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schemaChannelPage, setSchemaChannelPage] = useState(0);
  const [squadCardPage, setSquadCardPage] = useState(0);
  const [watchlistPage, setWatchlistPage] = useState(0);
  const [selectedSquadId, setSelectedSquadId] = useState('');
  const [bridgeDraftSquadIds, setBridgeDraftSquadIds] = useState([]);
  const [bridgeSessions, setBridgeSessions] = useState([]);
  const [bridgeTtlSec, setBridgeTtlSec] = useState(COMMS_CARD_CONSOLE_DEFAULT_TTL_SEC);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [directiveDispatches, setDirectiveDispatches] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [consoleState, setConsoleState] = useState(() => loadLocalCommsCardConsoleState(scopeInput));
  const [remoteSynced, setRemoteSynced] = useState(false);

  const offNetSinceByOperatorRef = useRef({});

  const loadGraph = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const next = await buildCommsGraphSnapshot({
          variantId,
          opId,
          includeUserNodes: true,
          roster
        });
        setSnapshot(next);
      } catch (err) {
        setError(err?.message || 'Failed to load comms graph.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [variantId, opId, roster]
  );

  useEffect(() => {
    loadGraph(false);
  }, [loadGraph]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      void loadGraph(true);
      setNowMs(Date.now());
    }, GRAPH_REFRESH_MS);
    return () => window.clearInterval(timerId);
  }, [loadGraph]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timerId = window.setTimeout(() => setFeedback(''), 4200);
    return () => window.clearTimeout(timerId);
  }, [feedback]);

  useEffect(() => {
    setConsoleState(loadLocalCommsCardConsoleState(scopeInput));
    setRemoteSynced(false);
  }, [scopeInput]);

  useEffect(() => {
    let cancelled = false;
    const local = loadLocalCommsCardConsoleState(scopeInput);
    void hydrateCommsCardConsoleState(scopeInput, local).
    then((hydrated) => {
      if (cancelled) return;
      setConsoleState(hydrated);
      setRemoteSynced(true);
    }).
    catch(() => {
      if (cancelled) return;
      setRemoteSynced(true);
    });
    return () => {
      cancelled = true;
    };
  }, [scopeInput, scopeKey]);

  useEffect(() => {
    persistCommsCardConsoleState(scopeInput, consoleState);
  }, [consoleState, scopeInput, scopeKey]);

  const channels = snapshot?.channels || [];
  const edges = snapshot?.edges || [];
  const voiceParticipants = useMemo(
    () => Array.isArray(voiceNet?.participants) ? voiceNet.participants : [],
    [voiceNet?.participants]
  );

  const { schemaTree, schemaChannelPageCount } = useMemo(
    () =>
    buildSchemaTree({
      channels,
      edges,
      roster,
      voiceParticipants,
      schemaChannelPage
    }),
    [channels, edges, roster, voiceParticipants, schemaChannelPage]
  );

  const squadCards = useMemo(() => buildSquadCards(schemaTree, edges), [schemaTree, edges]);
  const squadById = useMemo(
    () => squadCards.reduce((acc, card) => ({ ...acc, [card.id]: card }), {}),
    [squadCards]
  );

  const watchlistSet = useMemo(() => new Set(consoleState.watchlistSquadIds), [consoleState.watchlistSquadIds]);
  const watchlistCards = useMemo(
    () =>
    consoleState.watchlistSquadIds.
    map((squadId) => squadById[squadId]).
    filter((card) => Boolean(card)),
    [consoleState.watchlistSquadIds, squadById]
  );

  const cardsForPaging = useMemo(
    () => consoleState.uiPrefs.compactMode ? watchlistCards : squadCards,
    [consoleState.uiPrefs.compactMode, squadCards, watchlistCards]
  );

  const squadCardPageCount = Math.max(1, Math.ceil(cardsForPaging.length / SQUAD_CARD_PAGE_SIZE));
  const visibleSquadCards = useMemo(
    () => cardsForPaging.slice(squadCardPage * SQUAD_CARD_PAGE_SIZE, squadCardPage * SQUAD_CARD_PAGE_SIZE + SQUAD_CARD_PAGE_SIZE),
    [cardsForPaging, squadCardPage]
  );

  const watchlistPageCount = Math.max(1, Math.ceil(watchlistCards.length / WATCHLIST_PAGE_SIZE));
  const visibleWatchlistCards = useMemo(
    () => watchlistCards.slice(watchlistPage * WATCHLIST_PAGE_SIZE, watchlistPage * WATCHLIST_PAGE_SIZE + WATCHLIST_PAGE_SIZE),
    [watchlistCards, watchlistPage]
  );

  useEffect(() => {
    setSchemaChannelPage((current) => Math.min(current, schemaChannelPageCount - 1));
  }, [schemaChannelPageCount]);

  useEffect(() => {
    setSquadCardPage((current) => Math.min(current, squadCardPageCount - 1));
  }, [squadCardPageCount]);

  useEffect(() => {
    setWatchlistPage((current) => Math.min(current, watchlistPageCount - 1));
  }, [watchlistPageCount]);

  useEffect(() => {
    if (!squadCards.length) {
      setSelectedSquadId('');
      return;
    }
    if (selectedSquadId && squadCards.some((card) => card.id === selectedSquadId)) return;
    setSelectedSquadId(squadCards[0].id);
  }, [squadCards, selectedSquadId]);

  const selectedSquad = useMemo(
    () => squadCards.find((card) => card.id === selectedSquadId) || null,
    [squadCards, selectedSquadId]
  );

  const squadSlaSnapshots = useMemo(() => {
    const offNetSinceByOperatorId = offNetSinceByOperatorRef.current;
    const liveOperatorIds = new Set();

    for (const squad of squadCards) {
      for (const operator of squad.operators) {
        liveOperatorIds.add(operator.id);
        const isOffNet = String(operator.status || '').trim().toUpperCase() === 'OFF-NET';
        if (isOffNet && !Number.isFinite(offNetSinceByOperatorId[operator.id])) {
          offNetSinceByOperatorId[operator.id] = nowMs;
        }
        if (!isOffNet && Number.isFinite(offNetSinceByOperatorId[operator.id])) {
          delete offNetSinceByOperatorId[operator.id];
        }
      }
    }

    for (const operatorId of Object.keys(offNetSinceByOperatorId)) {
      if (!liveOperatorIds.has(operatorId)) {
        delete offNetSinceByOperatorId[operatorId];
      }
    }

    return buildSquadSlaSnapshots({
      squadCards,
      events,
      nowMs,
      slaPolicy: consoleState.slaPolicy,
      offNetSinceByOperatorId
    });
  }, [consoleState.slaPolicy, events, nowMs, squadCards]);

  const slaBySquadId = useMemo(
    () =>
    squadSlaSnapshots.reduce((acc, snapshot) => {
      acc[snapshot.squadId] = snapshot;
      return acc;
    }, {}),
    [squadSlaSnapshots]
  );

  const escalationBySquadId = useMemo(() => {
    const suggestions = buildEscalationSuggestions({ snapshots: squadSlaSnapshots });
    return suggestions.reduce((acc, suggestion) => {
      acc[suggestion.squadId] = suggestion;
      return acc;
    }, {});
  }, [squadSlaSnapshots]);

  const bridgedSquadIdSet = useMemo(
    () => new Set(bridgeSessions.flatMap((session) => session.squadIds)),
    [bridgeSessions]
  );

  const bridgeLifecycleRows = useMemo(
    () => buildBridgeLifecycleRows({ sessions: bridgeSessions, nowMs }),
    [bridgeSessions, nowMs]
  );

  const deliverySurface = useMemo(
    () => buildDeliverySurface({ dispatches: directiveDispatches, events, incidents: [], nowMs }),
    [directiveDispatches, events, nowMs]
  );
  const deliveryStats = useMemo(() => buildDeliveryStats(deliverySurface), [deliverySurface]);
  const feedPage = useMemo(() => buildPagedOrders(deliverySurface, 0, ORDER_FEED_PREVIEW_SIZE), [deliverySurface]);

  const fleetSummary = useMemo(() => {
    const wingMap = new Map();
    for (const card of squadCards) {
      const row = wingMap.get(card.wingId) || {
        wingLabel: card.wingLabel,
        squadCount: 0,
        online: 0,
        tx: 0,
        redSlaCount: 0,
        squadIds: []
      };
      row.squadCount += 1;
      row.online += card.onlineCount;
      row.tx += card.txCount;
      if (!row.squadIds.includes(card.id)) row.squadIds.push(card.id);
      if (slaBySquadId[card.id]?.overallStatus === 'red') row.redSlaCount += 1;
      wingMap.set(card.wingId, row);
    }
    return [...wingMap.entries()].map(([wingId, row]) => ({ wingId, ...row }));
  }, [slaBySquadId, squadCards]);

  const templateById = useMemo(
    () =>
    consoleState.bridgeTemplates.reduce((acc, template) => {
      acc[template.id] = template;
      return acc;
    }, {}),
    [consoleState.bridgeTemplates]
  );

  useEffect(() => {
    const preferred = consoleState.uiPrefs.lastTemplateId;
    if (preferred && templateById[preferred]) {
      setSelectedTemplateId((current) => current || preferred);
      return;
    }
    if (selectedTemplateId && !templateById[selectedTemplateId]) {
      setSelectedTemplateId('');
    }
  }, [consoleState.uiPrefs.lastTemplateId, selectedTemplateId, templateById]);

  const patchUiPrefs = useCallback((patch) => {
    setConsoleState((prev) =>
    normalizeCommsCardConsoleState(
      {
        ...prev,
        uiPrefs: {
          ...prev.uiPrefs,
          ...patch
        },
        updatedAt: new Date().toISOString()
      },
      prev
    )
    );
  }, []);

  const issueOrder = useCallback(
    (input) => {
      if (!input.channelId) return;
      const dispatch = createOrderDispatch({
        channelId: input.channelId,
        laneId: `lane:${input.channelId}`,
        directive: input.directive,
        eventType: input.eventType,
        nowMs
      });
      setDirectiveDispatches((prev) => appendOrderDispatch(prev, dispatch, MAX_ORDER_HISTORY));
      if (onCreateMacroEvent) {
        onCreateMacroEvent(input.eventType, {
          channelId: input.channelId,
          dispatchId: dispatch.dispatchId,
          directive: input.directive,
          source: 'comms-card-console',
          actorId,
          ...input.payload,
          ...toCaptureMetadataRecord(
            buildCaptureMetadata({
              mode: DEFAULT_ACQUISITION_MODE,
              source: 'RADIAL_ACTION',
              commandSource: 'comms_card_console',
              confirmed: true
            })
          )
        });
      }
      setFeedback(onCreateMacroEvent ? input.success : `${input.success} (preview)`);
    },
    [actorId, nowMs, onCreateMacroEvent]
  );

  const issueRoleHail = useCallback(
    (input) => {
      const targetSquads = input.squadIds.
      map((squadId) => squadById[squadId]).
      filter((card) => Boolean(card) && Boolean(card.primaryChannelId));
      if (!targetSquads.length) return;
      const channelIds = targetSquads.map((card) => card.primaryChannelId);
      const directive = `HAIL_${input.targetRole}_${input.scope}`;

      for (const squad of targetSquads) {
        issueOrder({
          channelId: squad.primaryChannelId,
          directive,
          eventType: 'SELF_CHECK',
          payload: {
            scope: input.scope,
            targetRole: input.targetRole,
            squadIds: targetSquads.map((card) => card.id),
            wingId: input.wingId || squad.wingId,
            channelIds
          },
          success: `Hail ${input.targetRole.toLowerCase()} ${input.scope.toLowerCase()} queued`
        });
      }
    },
    [issueOrder, squadById]
  );

  const hailSquad = useCallback(
    (card, targetRole) => {
      if (!card) return;
      issueRoleHail({ scope: 'SQUAD', targetRole, squadIds: [card.id], wingId: card.wingId });
    },
    [issueRoleHail]
  );

  const createBridgeSession = useCallback(() => {
    const selectedCards = bridgeDraftSquadIds.map((id) => squadById[id]).filter((card) => Boolean(card));
    if (selectedCards.length < 2) return;

    const anchor = selectedCards[0];
    const bridgeSquadIds = selectedCards.map((card) => card.id);
    const ttlSec = normalizeBridgeTtlSec(bridgeTtlSec);

    for (const card of selectedCards.slice(1)) {
      issueOrder({
        channelId: anchor.primaryChannelId,
        directive: 'BRIDGE_BRIEFING',
        eventType: 'MOVE_OUT',
        payload: {
          scope: 'SQUAD',
          sourceSquadId: anchor.id,
          targetSquadId: card.id,
          bridgeSquadIds,
          targetChannelId: card.primaryChannelId,
          bridgeTtlSec: ttlSec
        },
        success: `Bridge briefing ${anchor.squadLabel} -> ${card.squadLabel}`
      });
    }

    const sessionId = `bridge:${Date.now()}:${bridgeSquadIds.join(':')}`;
    setBridgeSessions((prev) => [{ id: sessionId, squadIds: bridgeSquadIds, createdAtMs: Date.now(), ttlSec }, ...prev].slice(0, MAX_BRIDGE_SESSIONS));
    setBridgeDraftSquadIds([]);
  }, [bridgeDraftSquadIds, bridgeTtlSec, issueOrder, squadById]);

  const splitBridgeSession = useCallback(
    (session, fromSuggestion = false) => {
      for (const squadId of session.squadIds) {
        const squad = squadById[squadId];
        if (!squad?.primaryChannelId) continue;
        issueOrder({
          channelId: squad.primaryChannelId,
          directive: 'SPLIT_BRIEFING',
          eventType: 'CLEAR_COMMS',
          payload: {
            scope: 'SQUAD',
            bridgeSessionId: session.id,
            squadIds: session.squadIds,
            bridgeTtlSec: session.ttlSec,
            splitSuggested: fromSuggestion
          },
          success: `Split briefing for ${squad.squadLabel}`
        });
      }
      setBridgeSessions((prev) => prev.filter((entry) => entry.id !== session.id));
    },
    [issueOrder, squadById]
  );

  const applyTemplate = useCallback(
    (templateId) => {
      const template = templateById[templateId];
      if (!template) return;
      setBridgeDraftSquadIds(template.squadIds.slice(0, COMMS_CARD_CONSOLE_MAX_TEMPLATE_SQUADS));
      setBridgeTtlSec(normalizeBridgeTtlSec(template.defaultTtlSec));
      setSelectedTemplateId(template.id);
      patchUiPrefs({ lastTemplateId: template.id });
      setFeedback(`Template ${template.name} loaded`);
    },
    [patchUiPrefs, templateById]
  );

  const saveBridgeTemplate = useCallback(() => {
    if (bridgeDraftSquadIds.length === 0) {
      setFeedback('Select squads before saving a template');
      return;
    }
    const defaultName = `Bridge ${consoleState.bridgeTemplates.length + 1}`;
    const name = onTemplateNameInput(defaultName);
    if (!name) return;
    setConsoleState((prev) => upsertBridgeTemplate(prev, { name, squadIds: bridgeDraftSquadIds, defaultTtlSec: bridgeTtlSec }));
  }, [bridgeDraftSquadIds, bridgeTtlSec, consoleState.bridgeTemplates.length]);

  const renameSelectedTemplate = useCallback(() => {
    if (!selectedTemplateId) return;
    const template = templateById[selectedTemplateId];
    if (!template) return;
    const nextName = onTemplateNameInput(template.name);
    if (!nextName || nextName === template.name) return;
    setConsoleState((prev) => renameBridgeTemplate(prev, template.id, nextName));
  }, [selectedTemplateId, templateById]);

  const deleteSelectedTemplate = useCallback(() => {
    if (!selectedTemplateId) return;
    const template = templateById[selectedTemplateId];
    if (!template) return;
    if (!confirmAction(`Delete template "${template.name}"?`)) return;
    setConsoleState((prev) => removeBridgeTemplate(prev, template.id));
    setSelectedTemplateId('');
  }, [selectedTemplateId, templateById]);

  const triggerEscalation = useCallback(
    (card, suggestion) => {
      if (!card.primaryChannelId) return;
      issueOrder({
        channelId: card.primaryChannelId,
        directive: suggestion.directive,
        eventType: suggestion.eventType,
        payload: {
          scope: 'SQUAD',
          squadId: card.id,
          squadLabel: card.squadLabel,
          wingId: card.wingId,
          escalationTarget: suggestion.target,
          channelIds: [card.primaryChannelId]
        },
        success: `${suggestion.label} queued for ${card.squadLabel}`
      });
    },
    [issueOrder]
  );

  if (loading) return <PanelLoadingState label="Loading comms cards..." />;
  if (error || !snapshot) {
    return (
      <DegradedStateCard
        state="OFFLINE"
        reason={error || 'Comms graph data unavailable.'}
        actionLabel="Retry"
        onAction={() => void loadGraph(false)} />);


  }

  return (
    <div className="relative h-full min-h-0 grid grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100 truncate">Comms Network Cards</h3>
          <p className="text-xs text-zinc-500 truncate">Bird-eye comms relation view with role hails, bridge templates, SLA cues, and watchlist pinboard.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <NexusButton size="sm" intent="subtle" onClick={() => setSchemaChannelPage((prev) => Math.max(0, prev - 1))} disabled={schemaChannelPage === 0}>Lane Prev</NexusButton>
          <NexusBadge tone="neutral">{schemaChannelPage + 1}/{schemaChannelPageCount}</NexusBadge>
          <NexusButton size="sm" intent="subtle" onClick={() => setSchemaChannelPage((prev) => Math.min(schemaChannelPageCount - 1, prev + 1))} disabled={schemaChannelPage >= schemaChannelPageCount - 1}>Lane Next</NexusButton>
          <NexusButton
            size="sm"
            intent="subtle"
            onClick={() => {
              setNowMs(Date.now());
              void loadGraph(false);
            }}>

            <RefreshCcw className="w-3.5 h-3.5 mr-1" />Refresh
          </NexusButton>
        </div>
      </div>

      








































































      <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-500">
        <NexusBadge tone="active">Fleet Command</NexusBadge>
        <NexusBadge tone="neutral">Squads {squadCards.length}</NexusBadge>
        <NexusBadge tone="neutral">Channels {channels.length}</NexusBadge>
        <NexusBadge tone={bridgeSessions.length > 0 ? 'warning' : 'neutral'}>Bridges {bridgeSessions.length}</NexusBadge>
        
      </div>

      <div className="min-h-0 grid gap-2 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="min-h-0 rounded border border-zinc-800 bg-zinc-900/40 p-2 flex flex-col gap-2">
          {watchlistCards.length > 0 ?
          <div data-comms-watchlist-pinboard="true" className="rounded border border-zinc-800 bg-zinc-950/50 px-2 py-1.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-[10px] uppercase tracking-wide text-zinc-300">Watchlist Pinboard</div>
                <div className="flex items-center gap-1.5">
                  <NexusButton size="sm" intent="subtle" onClick={() => setWatchlistPage((prev) => Math.max(0, prev - 1))} disabled={watchlistPage === 0}>Prev</NexusButton>
                  <NexusBadge tone="neutral">{watchlistPage + 1}/{watchlistPageCount}</NexusBadge>
                  <NexusButton size="sm" intent="subtle" onClick={() => setWatchlistPage((prev) => Math.min(watchlistPageCount - 1, prev + 1))} disabled={watchlistPage >= watchlistPageCount - 1}>Next</NexusButton>
                </div>
              </div>
              <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-5">
                {visibleWatchlistCards.map((card) =>
              <button
                key={`watch:${card.id}`}
                type="button"
                className="rounded border border-orange-500/30 bg-zinc-950/70 px-1.5 py-1 text-left"
                onClick={() => setSelectedSquadId(card.id)}>

                    <div className="inline-flex items-center gap-1 min-w-0">
                      <img src={squadTokenIcon(card.squadLabel, 'ready')} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                      <span className="text-[9px] text-zinc-100 uppercase tracking-wide truncate">{card.squadLabel}</span>
                    </div>
                    <div className="mt-0.5 text-[8px] text-zinc-500 uppercase tracking-wide">Wing {card.wingLabel}</div>
                  </button>
              )}
              </div>
            </div> :
          null}

          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-zinc-300 uppercase tracking-wide">Squad Cards</div>
            <div className="flex items-center gap-1.5">
              <NexusButton size="sm" intent="subtle" onClick={() => setSquadCardPage((prev) => Math.max(0, prev - 1))} disabled={squadCardPage === 0}>Prev</NexusButton>
              <NexusBadge tone="neutral">{squadCardPage + 1}/{squadCardPageCount}</NexusBadge>
              <NexusButton size="sm" intent="subtle" onClick={() => setSquadCardPage((prev) => Math.min(squadCardPageCount - 1, prev + 1))} disabled={squadCardPage >= squadCardPageCount - 1}>Next</NexusButton>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {visibleSquadCards.map((card) => {
              const sla = slaBySquadId[card.id];
              const escalation = escalationBySquadId[card.id];
              return (
                <article key={card.id} data-comms-squad-card="true" className={`rounded border px-2 py-1.5 ${selectedSquadId === card.id ? 'border-orange-500/60 bg-zinc-950/80' : 'border-zinc-800 bg-zinc-950/60'}`}>
                  <button type="button" onClick={() => setSelectedSquadId(card.id)} className="w-full text-left">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="min-w-0 inline-flex items-center gap-1.5">
                        <img src={wingTokenIcon(card.wingId, 'ready')} alt="" className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                        <span className="text-[10px] text-zinc-100 uppercase tracking-wide truncate">{card.squadLabel}</span>
                        <span className="text-[8px] text-zinc-500 uppercase tracking-wide truncate">{card.wingLabel}</span>
                      </div>
                      <div className="inline-flex items-center gap-1 shrink-0">
                        {bridgedSquadIdSet.has(card.id) ? <NexusBadge tone="active">BR</NexusBadge> : null}
                        <NexusBadge tone={card.txCount > 0 ? 'warning' : card.offNetCount > 0 ? 'danger' : 'ok'}>TX {card.txCount}</NexusBadge>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1 text-[8px] text-zinc-500 uppercase tracking-wide">
                      <span>Ships {card.vehicles.length}</span>
                      <span>Crew {card.operators.length}</span>
                      <span>Links {card.linkedSquadIds.length}</span>
                    </div>
                  </button>

                  {sla ?
                  <div className="mt-1 rounded border border-zinc-800 bg-zinc-900/30 px-1.5 py-1 grid grid-cols-3 gap-1 text-[8px] uppercase tracking-wide">
                      <span className="inline-flex items-center gap-1 text-zinc-400">
                        <img src={slaTokenIcon(sla.checkinStatus)} alt="" className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                        CI {formatSlaAge(sla.last_checkin_age_s)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-zinc-400">
                        <img src={slaTokenIcon(sla.ackStatus)} alt="" className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                        ACK {formatSlaAge(sla.last_ack_age_s)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-zinc-400">
                        <img src={slaTokenIcon(sla.offNetStatus)} alt="" className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                        OFF {formatSlaAge(sla.off_net_duration_s)}
                      </span>
                    </div> :
                  null}

                  <div className="mt-1 flex items-center gap-1 flex-wrap">
                    <NexusButton size="sm" intent="subtle" onClick={() => hailSquad(card, 'PILOT')} disabled={card.pilotCount === 0}>Hail Pilot</NexusButton>
                    <NexusButton size="sm" intent="subtle" onClick={() => hailSquad(card, 'MEDIC')} disabled={card.medicCount === 0}>Hail Medics</NexusButton>
                    <NexusButton size="sm" intent="subtle" onClick={() => hailSquad(card, 'ALL_HANDS')}>Hail Squad</NexusButton>
                    <NexusButton size="sm" intent={bridgeDraftSquadIds.includes(card.id) ? 'primary' : 'subtle'} onClick={() => setBridgeDraftSquadIds((prev) => prev.includes(card.id) ? prev.filter((id) => id !== card.id) : [...prev, card.id].slice(0, COMMS_CARD_CONSOLE_MAX_TEMPLATE_SQUADS))}>Bridge</NexusButton>
                    <NexusButton size="sm" intent="subtle" onClick={() => setConsoleState((prev) => toggleWatchlistSquad(prev, card.id))}>
                      {watchlistSet.has(card.id) ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    </NexusButton>
                    {escalation ?
                    <NexusButton size="sm" intent={slaTone(sla?.overallStatus || 'green')} onClick={() => triggerEscalation(card, escalation)}>
                        {escalation.label}
                      </NexusButton> :
                    null}
                  </div>
                </article>);

            })}
            {visibleSquadCards.length === 0 ? <div className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-2 text-[10px] text-zinc-500">No squad cards available for this lane page.</div> : null}
          </div>
        </section>

        <section className="min-h-0 rounded border border-zinc-800 bg-zinc-900/40 p-2 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-zinc-300 uppercase tracking-wide">Squad Detail</div>
            <NexusButton size="sm" intent="primary" disabled={bridgeDraftSquadIds.length < 2} onClick={createBridgeSession}>Bridge Selected</NexusButton>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5">
            <div className="text-[9px] text-zinc-400 uppercase tracking-wide mb-1">Wing Hails</div>
            <div className="grid grid-cols-1 gap-1">
              {fleetSummary.slice(0, 3).map((wing) =>
              <div key={wing.wingId} className="flex items-center justify-between gap-1 rounded border border-zinc-800 bg-zinc-900/35 px-1.5 py-1">
                  <span className="inline-flex items-center gap-1 text-[9px] text-zinc-300 uppercase tracking-wide truncate">
                    <img src={wingTokenIcon(wing.wingId, wing.redSlaCount > 0 ? 'busy' : 'ready')} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                    {wing.wingLabel} · {wing.squadCount}
                  </span>
                  <div className="inline-flex items-center gap-1 shrink-0">
                    <NexusButton size="sm" intent="subtle" onClick={() => issueRoleHail({ scope: 'WING', targetRole: 'PILOT', wingId: wing.wingId, squadIds: wing.squadIds })}>Pilots</NexusButton>
                    <NexusButton size="sm" intent="subtle" onClick={() => issueRoleHail({ scope: 'WING', targetRole: 'MEDIC', wingId: wing.wingId, squadIds: wing.squadIds })}>Medics</NexusButton>
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedSquad ?
          <>
              <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="min-w-0 inline-flex items-center gap-1.5">
                    <img src={squadTokenIcon(selectedSquad.squadLabel, 'ready')} alt="" className="w-4 h-4 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                    <div className="text-[10px] text-zinc-100 uppercase tracking-wide truncate">{selectedSquad.squadLabel}</div>
                  </div>
                  <NexusBadge tone={bridgedSquadIdSet.has(selectedSquad.id) ? 'active' : 'neutral'}>{bridgedSquadIdSet.has(selectedSquad.id) ? 'BRIDGED' : 'STANDALONE'}</NexusBadge>
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1 text-[8px] text-zinc-500 uppercase tracking-wide">
                  <span>Pilots {selectedSquad.pilotCount}</span>
                  <span>Medics {selectedSquad.medicCount}</span>
                  <span>Online {selectedSquad.onlineCount}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                <NexusButton size="sm" intent="subtle" onClick={() => hailSquad(selectedSquad, 'PILOT')} disabled={selectedSquad.pilotCount === 0}>Hail Pilot</NexusButton>
                <NexusButton size="sm" intent="subtle" onClick={() => hailSquad(selectedSquad, 'MEDIC')} disabled={selectedSquad.medicCount === 0}>Hail Medics</NexusButton>
                <NexusButton size="sm" intent="subtle" onClick={() => hailSquad(selectedSquad, 'ALL_HANDS')}>Hail Squad</NexusButton>
              </div>

              {bridgeLifecycleRows.length > 0 ?
            <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5">
                  <div className="text-[9px] text-zinc-400 uppercase tracking-wide mb-1">Bridge Sessions</div>
                  <div className="space-y-1">
                    {bridgeLifecycleRows.slice(0, 3).map((session) =>
                <div key={session.id} data-comms-bridge-session="true" className="flex items-center justify-between gap-1 rounded border border-zinc-800 bg-zinc-900/35 px-1.5 py-0.5">
                        <span className="text-[8px] text-zinc-500 uppercase tracking-wide truncate">
                          {session.squadIds.map((id) => squadById[id]?.squadLabel || id).join(' + ')} · {formatAge(nowMs, session.createdAtMs)} · {session.ttlLabel}
                        </span>
                        <div className="inline-flex items-center gap-1">
                          {session.splitSuggested ?
                    <NexusBadge tone="warning" data-comms-split-suggested="true">Split Suggested</NexusBadge> :
                    null}
                          <NexusButton size="sm" intent={session.splitSuggested ? 'primary' : 'subtle'} onClick={() => splitBridgeSession(session, session.splitSuggested)}>
                            {session.splitSuggested ? 'Confirm Split' : 'Split'}
                          </NexusButton>
                        </div>
                      </div>
                )}
                  </div>
                </div> :
            null}

              <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5">
                <div className="text-[9px] text-zinc-400 uppercase tracking-wide mb-1">Ships + Crew</div>
                <div className="space-y-1">
                  {selectedSquad.vehicles.slice(0, 4).map((vehicle) =>
                <div key={vehicle.id} className="flex items-center justify-between gap-1 rounded border border-zinc-800 bg-zinc-900/35 px-1.5 py-0.5">
                      <div className="min-w-0 inline-flex items-center gap-1 text-[9px] text-zinc-300">
                        <img src={tokenAssets.comms.vehicle} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                        <span className="truncate">{vehicle.label}</span>
                      </div>
                      <div className="inline-flex items-center gap-1 shrink-0">
                        <img src={vehicleStatusTokenIcon(vehicle.status)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                        <span className="text-[8px] text-zinc-500 uppercase tracking-wide">Crew {vehicle.crewCount}</span>
                      </div>
                    </div>
                )}
                  {selectedSquad.operators.slice(0, 5).map((operator) =>
                <div key={operator.id} className="flex items-center justify-between gap-1 rounded border border-zinc-800 bg-zinc-900/35 px-1.5 py-0.5">
                      <div className="min-w-0 inline-flex items-center gap-1 text-[9px] text-zinc-300">
                        <img src={roleTokenIcon(operator.role)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                        <span className="truncate">{operator.callsign}</span>
                      </div>
                      <div className="inline-flex items-center gap-1 shrink-0">
                        <img src={operatorStatusTokenIcon(operator.status)} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                        <NexusBadge tone={operatorStatusTone(operator.status)}>{operator.status}</NexusBadge>
                      </div>
                    </div>
                )}
                </div>
              </div>
            </> :

          <div className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-2 text-[10px] text-zinc-500">Select a squad card to view details.</div>
          }
        </section>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <NexusBadge tone={deliveryStats.queued > 0 ? 'warning' : 'neutral'}>Queued {deliveryStats.queued}</NexusBadge>
            <NexusBadge tone={deliveryStats.persisted > 0 ? 'active' : 'neutral'}>Persisted {deliveryStats.persisted}</NexusBadge>
            <NexusBadge tone={deliveryStats.acked > 0 ? 'ok' : 'neutral'}>Acked {deliveryStats.acked}</NexusBadge>
            <NexusBadge tone={deliveryStats.confidencePct >= 70 ? 'ok' : 'warning'}>Confidence {deliveryStats.confidencePct}%</NexusBadge>
            {fleetSummary.slice(0, 3).map((wing) =>
            <span key={wing.wingId} className="inline-flex items-center gap-1 text-[9px] text-zinc-500 uppercase tracking-wide">
                <img src={wingTokenIcon(wing.wingId, wing.redSlaCount > 0 ? 'busy' : 'ready')} alt="" className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60" />
                {wing.wingLabel} {wing.squadCount}
              </span>
            )}
          </div>
          <div className="text-[10px] text-zinc-500">Showing {feedPage.visible.length} tactical echoes</div>
        </div>

        {feedPage.visible.length > 0 ?
        <div className="mt-1.5 grid grid-cols-1 md:grid-cols-3 gap-1.5">
            {feedPage.visible.map((dispatch) =>
          <div key={dispatch.dispatchId} className="rounded border border-zinc-800 bg-zinc-950/65 px-2 py-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] text-zinc-200 uppercase tracking-wide truncate">{dispatch.directive}</span>
                  <NexusBadge tone={deliveryTone(dispatch.status)}>{dispatch.status}</NexusBadge>
                </div>
                <div className="mt-0.5 text-[9px] text-zinc-500 truncate">{dispatch.channelId} · {formatAge(nowMs, dispatch.issuedAtMs)} ago</div>
              </div>
          )}
          </div> :
        null}

        {feedback ?
        <div className="mt-1 text-[10px] text-orange-300 inline-flex items-center gap-1">
            {feedback.toLowerCase().includes('escalate') ? <AlertTriangle className="w-3 h-3" /> : <Radio className="w-3 h-3" />}
            {feedback}
          </div> :
        null}
      </div>
    </div>);

}