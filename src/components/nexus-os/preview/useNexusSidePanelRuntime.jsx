import { useEffect, useMemo, useRef, useState } from 'react';

const HISTORY_KEYS = ['Channels', 'Unread', 'Ping', 'Nets', 'Users', 'Quality'];
const HISTORY_LIMIT = 20;

const toText = (value, fallback = '') => {
  const normalized = String(value || '').trim();
  return normalized || fallback;
};

const toTimestampMs = (value, fallbackMs = Date.now()) => {
  const parsed = Date.parse(String(value || ''));
  return Number.isNaN(parsed) ? fallbackMs : parsed;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const formatEventType = (eventType) => toText(eventType, 'EVENT').replace(/_/g, ' ');

function deriveChannelId(event) {
  const direct = toText(event?.channelId || event?.channel_id);
  if (direct) return direct;
  const opId = toText(event?.opId || event?.op_id);
  if (opId) return `op-${opId}`;
  return 'command';
}

function deriveEventMessage(event, fallbackNowMs, roster = []) {
  const createdAtMs = toTimestampMs(event?.createdAt || event?.created_date || event?.createdAtMs, fallbackNowMs);
  const payload = event?.payload && typeof event.payload === 'object' ? event.payload : {};
  const detail = toText(
    payload.summary || payload.directive || payload.note || payload.message || payload.recommendedAction || payload.incidentId || ''
  );
  const headline = formatEventType(event?.eventType || event?.event_type);
  const text = detail ? `${headline} · ${detail}` : headline;
  
  const authorId = toText(event?.authorId || event?.author_id, 'system');
  const member = roster.find((m) => m?.id === authorId);
  const authorDisplay = member?.callsign || authorId;
  
  return {
    id: toText(event?.id, `evt:${createdAtMs}:${Math.random().toString(36).slice(2, 7)}`),
    text,
    author: authorDisplay,
    timestamp: new Date(createdAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAtMs,
    source: 'event',
  };
}

function appendSampleHistory(prev, sample) {
  const next = {};
  for (const key of HISTORY_KEYS) {
    const baseline = Array.isArray(prev?.[key]) ? prev[key] : [];
    const stream = [...baseline, { value: Number(sample[key] || 0) }];
    next[key] = stream.slice(-HISTORY_LIMIT);
  }
  return next;
}

function seedSampleHistory(sample) {
  const seed = {};
  for (const key of HISTORY_KEYS) {
    seed[key] = Array.from({ length: HISTORY_LIMIT }, () => ({ value: Number(sample[key] || 0) }));
  }
  return seed;
}

function headerSignalTone(pct) {
  if (pct >= 85) return 'ok';
  if (pct >= 60) return 'warning';
  if (pct >= 1) return 'neutral';
  return 'danger';
}

export default function useNexusSidePanelRuntime({
  events = [],
  operations = [],
  online = true,
  bridgeId = 'OPS',
  clockNowMs = Date.now(),
  actorId = '',
  effectiveVoiceNets = [],
  effectiveVoiceParticipants = [],
  voiceNet = {},
  roster = [],
}) {
  const activeTelemetry = useMemo(() => {
    const txNetId = toText(voiceNet?.transmitNetId || voiceNet?.activeNetId);
    if (!txNetId) return null;
    const byNet = voiceNet?.telemetryByNet && typeof voiceNet.telemetryByNet === 'object' ? voiceNet.telemetryByNet : {};
    return byNet[txNetId] || null;
  }, [voiceNet?.telemetryByNet, voiceNet?.transmitNetId, voiceNet?.activeNetId]);

  const pingMs = useMemo(() => {
    if (!online) return 0;
    const telemetryPing = Number(activeTelemetry?.rttMs || 0);
    if (telemetryPing > 0) return Math.round(telemetryPing);
    return Math.max(18, 20 + Math.min(65, Math.round(events.length / 2)));
  }, [online, activeTelemetry?.rttMs, events.length]);

  const qualityPct = useMemo(() => {
    if (!online) return 0;
    const packetLoss = Number(activeTelemetry?.packetLossPct || 0);
    const jitter = Number(activeTelemetry?.jitterMs || 0);
    const latencyPenalty = Math.max(0, pingMs - 120) / 8;
    const quality = 100 - packetLoss * 4 - jitter * 0.5 - latencyPenalty;
    return clamp(Math.round(quality), 55, 100);
  }, [online, activeTelemetry?.packetLossPct, activeTelemetry?.jitterMs, pingMs]);

  const recentUnread = useMemo(
    () =>
      events.filter((event) => {
        const ageMs = clockNowMs - toTimestampMs(event?.createdAt || event?.created_date, 0);
        return ageMs <= 10 * 60 * 1000 && toText(event?.authorId || event?.author_id) !== toText(actorId);
      }).length,
    [events, clockNowMs, actorId]
  );

  const leftPanelMetrics = useMemo(() => {
    const channelCount = 6 + Math.min(10, operations.length);
    return [
      { label: 'Channels', value: String(channelCount) },
      { label: 'Unread', value: String(recentUnread) },
      { label: 'Ping', value: online ? `${pingMs}ms` : '--' },
    ];
  }, [operations.length, recentUnread, online, pingMs]);

  const rightPanelMetrics = useMemo(
    () => [
      { label: 'Nets', value: String(effectiveVoiceNets.length) },
      { label: 'Users', value: String(effectiveVoiceParticipants.length) },
      { label: 'Quality', value: online ? `${qualityPct}%` : '--' },
    ],
    [effectiveVoiceNets.length, effectiveVoiceParticipants.length, online, qualityPct]
  );

  const metricSample = useMemo(
    () => ({
      Channels: Number(leftPanelMetrics[0]?.value || 0),
      Unread: Number(leftPanelMetrics[1]?.value || 0),
      Ping: online ? pingMs : 0,
      Nets: Number(rightPanelMetrics[0]?.value || 0),
      Users: Number(rightPanelMetrics[1]?.value || 0),
      Quality: online ? qualityPct : 0,
    }),
    [leftPanelMetrics, rightPanelMetrics, online, pingMs, qualityPct]
  );

  const sampleRef = useRef(metricSample);
  useEffect(() => {
    sampleRef.current = metricSample;
  }, [metricSample]);

  const [metricHistory, setMetricHistory] = useState(() => seedSampleHistory(metricSample));

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setMetricHistory((prev) => appendSampleHistory(prev, sampleRef.current));
    }, 5000);
    return () => window.clearInterval(timerId);
  }, []);

  const leftSignalPct = useMemo(() => {
    if (!online) return 0;
    const noisePenalty = recentUnread * 2;
    const pingPenalty = Math.max(0, pingMs - 20) / 1.5;
    return clamp(Math.round(100 - noisePenalty - pingPenalty), 20, 100);
  }, [online, recentUnread, pingMs]);

  const rightSignalPct = useMemo(() => (online ? qualityPct : 0), [online, qualityPct]);

  const leftPanelHeader = useMemo(() => {
    if (!online) return { label: 'OFFLINE', tone: 'danger', signal: '0%', signalTone: 'danger' };
    if (recentUnread >= 14) return { label: 'SATURATED', tone: 'warning', signal: `${leftSignalPct}%`, signalTone: headerSignalTone(leftSignalPct) };
    return { label: 'ACTIVE', tone: 'ok', signal: `${leftSignalPct}%`, signalTone: headerSignalTone(leftSignalPct) };
  }, [online, recentUnread, leftSignalPct]);

  const rightPanelHeader = useMemo(() => {
    const state = toText(voiceNet?.connectionState, 'IDLE').toUpperCase();
    if (!online) return { label: 'OFFLINE', tone: 'danger', signal: '0%', signalTone: 'danger' };
    if (state === 'ERROR') return { label: 'FAULT', tone: 'danger', signal: `${rightSignalPct}%`, signalTone: 'danger' };
    if (state === 'CONNECTED') return { label: 'LIVE', tone: 'ok', signal: `${rightSignalPct}%`, signalTone: headerSignalTone(rightSignalPct) };
    if (state === 'JOINING' || state === 'RECONNECTING') return { label: 'SYNC', tone: 'warning', signal: `${rightSignalPct}%`, signalTone: 'warning' };
    return { label: 'STANDBY', tone: 'neutral', signal: `${rightSignalPct}%`, signalTone: 'neutral' };
  }, [online, voiceNet?.connectionState, rightSignalPct]);

  const eventMessagesByChannel = useMemo(() => {
    const bucket = {};
    for (const event of events.slice(-160)) {
      const channelId = deriveChannelId(event);
      const message = deriveEventMessage(event, clockNowMs, roster);
      if (!bucket[channelId]) bucket[channelId] = [];
      bucket[channelId].push(message);
    }
    for (const channelId of Object.keys(bucket)) {
      bucket[channelId] = bucket[channelId]
        .sort((a, b) => b.createdAtMs - a.createdAtMs)
        .slice(0, 36);
    }
    return bucket;
  }, [events, clockNowMs, roster]);

  const unreadByChannel = useMemo(() => {
    const map = {};
    for (const event of events) {
      const ageMs = clockNowMs - toTimestampMs(event?.createdAt || event?.created_date, 0);
      if (ageMs > 10 * 60 * 1000) continue;
      if (toText(event?.authorId || event?.author_id) === toText(actorId)) continue;
      const channelId = deriveChannelId(event);
      map[channelId] = (map[channelId] || 0) + 1;
    }
    return map;
  }, [events, clockNowMs, actorId]);

  const panelLogEntries = useMemo(() => {
    const levelForEvent = (eventTypeRaw) => {
      const eventType = toText(eventTypeRaw).toUpperCase();
      if (eventType.includes('ERROR') || eventType.includes('ABORT')) return 'error';
      if (eventType.includes('WARN') || eventType.includes('HOLD') || eventType.includes('DEGRADE')) return 'warning';
      if (eventType.includes('ACK') || eventType.includes('COMPLETE') || eventType.includes('CONFIRM')) return 'success';
      return 'info';
    };

    const operationLogs = operations.slice(0, 6).map((operation) => ({
      timestamp: toTimestampMs(operation.updatedAt || operation.createdAt, clockNowMs),
      level: operation.status === 'ACTIVE' ? 'success' : operation.status === 'WRAPPING' ? 'warning' : 'info',
      message: `${operation.name || 'Operation'} · ${operation.status}`,
    }));

    const eventLogs = events.slice(-16).map((event) => ({
      timestamp: toTimestampMs(event.createdAt || event.created_date, clockNowMs),
      level: levelForEvent(event.eventType || event.event_type),
      message: `${formatEventType(event.eventType || event.event_type)} · ${toText(event.authorId || event.author_id, 'unknown')}`,
    }));

    const voiceBusLogs = (Array.isArray(voiceNet?.commandBusActions) ? voiceNet.commandBusActions : [])
      .slice(0, 8)
      .map((packet) => {
        const action = toText(packet?.type, 'VOICE_EVENT').replace(/_/g, ' ');
        const level = action.includes('OVERRIDE') ? 'warning' : action.includes('ERROR') ? 'error' : 'info';
        return {
          timestamp: toTimestampMs(packet?.sentAt, clockNowMs),
          level,
          message: `${action} · ${toText(packet?.netId || packet?.payload?.netId, 'net')}`,
        };
      });

    const connectionLog = {
      timestamp: clockNowMs,
      level: online ? 'success' : 'warning',
      message: online ? `${bridgeId} uplink stable` : `${bridgeId} uplink degraded`,
    };

    return [connectionLog, ...voiceBusLogs, ...eventLogs, ...operationLogs]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 28);
  }, [events, operations, voiceNet?.commandBusActions, online, bridgeId, clockNowMs]);

  const voiceState = useMemo(
    () => ({
      connectionState: toText(voiceNet?.connectionState, 'IDLE'),
      activeNetId: toText(voiceNet?.activeNetId),
      transmitNetId: toText(voiceNet?.transmitNetId),
      monitoredCount: Array.isArray(voiceNet?.monitoredNetIds) ? voiceNet.monitoredNetIds.length : 0,
    }),
    [voiceNet?.connectionState, voiceNet?.activeNetId, voiceNet?.transmitNetId, voiceNet?.monitoredNetIds]
  );

  return {
    leftPanelMetrics,
    rightPanelMetrics,
    metricHistory,
    panelLogEntries,
    leftPanelHeader,
    rightPanelHeader,
    eventMessagesByChannel,
    unreadByChannel,
    voiceState,
  };
}