import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { DEFAULT_VOICE_NETS, VOICE_CONNECTION_STATE, VOICE_SESSION_HEARTBEAT_MS, VOICE_SPEAKING_DEBOUNCE_MS } from '@/components/constants/voiceNet';
import MockVoiceTransport from '@/components/voice/transport/MockVoiceTransport';
import { LiveKitTransport } from '@/components/voice/transport/LiveKitTransport';
import * as voiceService from '@/components/services/voiceService';
import * as presenceService from '@/components/services/presenceService';
import { canJoinVoiceNet } from '@/components/utils/voiceAccessPolicy';
import { useFocusedConfirmation } from '@/components/voice/FocusedNetConfirmation';
import { base44 } from '@/api/base44Client';

const VoiceNetContext = createContext(null);
const DISCIPLINE = { OPEN: 'OPEN', PTT: 'PTT', REQUEST_TO_SPEAK: 'REQUEST_TO_SPEAK', COMMAND_ONLY: 'COMMAND_ONLY' };
const HOTKEYS = { ptt: ['Space'], whisper: ['CapsLock'] };

const t = (v, f = '') => (String(v || '').trim() || f);

export function VoiceNetProvider({ children }) {
  const [voiceNets, setVoiceNets] = useState(DEFAULT_VOICE_NETS);
  const [activeNetId, setActiveNetId] = useState(null);
  const [transmitNetId, setTransmitNetId] = useState(null);
  const [monitoredNetIds, setMonitoredNetIds] = useState([]);
  const [localUserId, setLocalUserId] = useState(null);
  const [participantsByNet, setParticipantsByNet] = useState({});
  const [connectionByNet, setConnectionByNet] = useState({});
  const [errorByNet, setErrorByNet] = useState({});
  const [telemetryByNet, setTelemetryByNet] = useState({});
  const [transportModeByNet, setTransportModeByNet] = useState({});
  const [micEnabled, setMicEnabled] = useState(true);
  const [pttActive, setPTTActive] = useState(false);
  const [whisperState, setWhisperState] = useState({ active: false, target: null });
  const [disciplineByNet, setDisciplineByNet] = useState({});
  const [speakRequestsByNet, setSpeakRequestsByNet] = useState({});
  const [commandBusActions, setCommandBusActions] = useState([]);
  const [outputDeviceId, setOutputDeviceId] = useState(null);
  const [participantGainDb, setParticipantGainDb] = useState({});
  const [normalizationEnabled, setNormalizationEnabled] = useState(true);
  const [monitorSubmixes, setMonitorSubmixes] = useState(['COMMAND', 'SQUAD', 'LOCAL']);
  const [txSubmix, setTxSubmix] = useState('SQUAD');
  const [loadout, setLoadout] = useState({ name: 'default', codec: 'opus', bitrateKbps: 24, noiseSuppression: true, agc: true, eqProfile: {} });
  const [secureModeByNet, setSecureModeByNet] = useState({});
  const [hotkeyProfile, setHotkeyProfile] = useState({ id: 'default', label: 'Default', bindings: HOTKEYS, sideTone: false });
  const [txAuthority, setTxAuthority] = useState(null);
  const focusedConfirmation = useFocusedConfirmation();

  const userRef = useRef(null);
  const transportsRef = useRef(new Map());
  const sessionIdsRef = useRef(new Map());
  const heartbeatRef = useRef(new Map());
  const speakTimeoutRef = useRef(null);
  const pendingJoinRef = useRef(null);

  const setConn = useCallback((netId, state) => setConnectionByNet((p) => ({ ...p, [netId]: state })), []);
  const setErr = useCallback((netId, e) => setErrorByNet((p) => ({ ...p, [netId]: e || null })), []);
  const setNetParticipants = useCallback((netId, updater) => setParticipantsByNet((p) => {
    const cur = Array.isArray(p[netId]) ? p[netId] : [];
    const next = typeof updater === 'function' ? updater(cur) : updater;
    return { ...p, [netId]: next };
  }), []);

  const resolveNet = useCallback((raw) => {
    const match = t(raw).toLowerCase();
    const all = [...(Array.isArray(voiceNets) ? voiceNets : []), ...DEFAULT_VOICE_NETS];
    return all.find((n) => t(n?.id).toLowerCase() === match || t(n?.code).toLowerCase() === match) || null;
  }, [voiceNets]);

  const activeTransport = transmitNetId ? transportsRef.current.get(transmitNetId) : null;
  const connectionState = transmitNetId ? (connectionByNet[transmitNetId] || VOICE_CONNECTION_STATE.IDLE) : VOICE_CONNECTION_STATE.IDLE;
  const participants = activeNetId ? (participantsByNet[activeNetId] || []) : [];
  const error = transmitNetId ? (errorByNet[transmitNetId] || null) : null;
  const transportMode = transmitNetId ? (transportModeByNet[transmitNetId] || 'mock') : 'mock';

  const bindEvents = useCallback((netId, transport) => {
    transport.on('connected', () => { setConn(netId, VOICE_CONNECTION_STATE.CONNECTED); setErr(netId, null); });
    transport.on('disconnected', () => { setConn(netId, VOICE_CONNECTION_STATE.IDLE); setNetParticipants(netId, []); });
    transport.on('participant-joined', ({ userId, callsign, clientId }) => setNetParticipants(netId, (p) => p.some((x) => x.userId === userId) ? p : [...p, { userId, callsign, clientId, isSpeaking: false }]));
    transport.on('participant-left', ({ userId }) => setNetParticipants(netId, (p) => p.filter((x) => x.userId !== userId)));
    transport.on('speaking-changed', ({ userId, isSpeaking }) => setNetParticipants(netId, (p) => p.map((x) => x.userId === userId ? { ...x, isSpeaking } : x)));
    transport.on('reconnecting', () => setConn(netId, VOICE_CONNECTION_STATE.RECONNECTING));
    transport.on('reconnected', () => setConn(netId, VOICE_CONNECTION_STATE.CONNECTED));
    transport.on('error', ({ message }) => { setErr(netId, message); setConn(netId, VOICE_CONNECTION_STATE.ERROR); });
    transport.on('telemetry', (snap) => {
      setTelemetryByNet((p) => ({ ...p, [netId]: snap }));
      invokeMemberFunction('updateCommsConsole', { action: 'record_voice_telemetry', netId, rttMs: snap?.rttMs, jitterMs: snap?.jitterMs, packetLossPct: snap?.packetLossPct, mosProxy: snap?.mosProxy, profileHint: loadout?.name || 'default' }).catch(() => {});
    });
    transport.on('control-packet', (packet) => setCommandBusActions((p) => [packet, ...p].slice(0, 200)));
  }, [loadout?.name, setConn, setErr, setNetParticipants]);

  const updatePresence = useCallback(async (status, isTransmitting = false) => {
    const u = userRef.current; if (!u?.id) return;
    await presenceService.writePresence({ userId: u.id, status, activeNetId: transmitNetId, isTransmitting }).catch(() => {});
  }, [transmitNetId]);

  const connectNet = useCallback(async (rawNetId, user) => {
    const net = resolveNet(rawNetId); if (!net) return { success: false, error: 'Net not found' };
    const netId = t(net.id || net.code || rawNetId);
    if (transportsRef.current.get(netId)) return { success: true };
    setConn(netId, VOICE_CONNECTION_STATE.JOINING); setErr(netId, null);
    let transport = null; let mode = 'mock'; let tokenPayload = null;
    try {
      const tokenResp = await invokeMemberFunction('mintVoiceToken', { netId, userId: user.id, callsign: user.callsign || 'Unknown', clientId: `client-${user.id}-${Date.now()}`, netType: net?.type, disciplineMode: disciplineByNet[netId] || DISCIPLINE.PTT, secureMode: Boolean(secureModeByNet[netId]?.enabled), secureKeyVersion: secureModeByNet[netId]?.key_version || null, monitorSubmixes, txSubmix });
      if (tokenResp?.data?.token && tokenResp?.data?.url) tokenPayload = tokenResp.data;
    } catch {}
    if (tokenPayload) { transport = new LiveKitTransport(); mode = 'livekit'; } else transport = new MockVoiceTransport();
    bindEvents(netId, transport);
    try {
      await transport.connect(tokenPayload ? { token: tokenPayload.token, url: tokenPayload.url, netId, user } : { token: 'mock-token', url: 'mock://url', netId, user });
      transportsRef.current.set(netId, transport);
      setTransportModeByNet((p) => ({ ...p, [netId]: mode }));
      if (outputDeviceId) await transport.setOutputDevice?.(outputDeviceId);
      transport.setNormalizationEnabled?.(normalizationEnabled);
      transport.setSubmixRouting?.({ monitorSubmixes, txSubmix });
      Object.entries(participantGainDb).forEach(([id, db]) => transport.setParticipantGain?.(id, db));
      const session = await voiceService.addVoiceSession(netId, user.id, user.callsign || 'Unknown', `client-${user.id}-${Date.now()}`, { monitoredNetIds: [netId], transmitNetId: netId, disciplineMode: disciplineByNet[netId] || DISCIPLINE.PTT });
      sessionIdsRef.current.set(netId, session.id);
      const hb = setInterval(async () => {
        const sessionId = sessionIdsRef.current.get(netId); if (!sessionId) return;
        await voiceService.updateSessionHeartbeat(sessionId);
      }, VOICE_SESSION_HEARTBEAT_MS);
      heartbeatRef.current.set(netId, hb);
      const sessions = await voiceService.getNetSessions(netId);
      setNetParticipants(netId, sessions.map((s) => ({ userId: s.userId, callsign: s.callsign, clientId: s.clientId, isSpeaking: s.isSpeaking })));
      return { success: true };
    } catch (e) {
      setConn(netId, VOICE_CONNECTION_STATE.ERROR); setErr(netId, e?.message || 'Connection failed');
      return { success: false, error: e?.message || 'Connection failed' };
    }
  }, [bindEvents, disciplineByNet, monitorSubmixes, normalizationEnabled, outputDeviceId, participantGainDb, resolveNet, secureModeByNet, setConn, setErr, setNetParticipants, txSubmix]);

  const disconnectNet = useCallback(async (rawNetId) => {
    const netId = t(rawNetId); if (!netId) return;
    const hb = heartbeatRef.current.get(netId); if (hb) clearInterval(hb);
    heartbeatRef.current.delete(netId);
    const sessionId = sessionIdsRef.current.get(netId); if (sessionId) await voiceService.removeVoiceSession(sessionId);
    sessionIdsRef.current.delete(netId);
    const transport = transportsRef.current.get(netId); if (transport) await transport.disconnect().catch(() => {});
    transportsRef.current.delete(netId);
    setConn(netId, VOICE_CONNECTION_STATE.IDLE); setErr(netId, null); setNetParticipants(netId, []);
  }, [setConn, setErr, setNetParticipants]);

  const joinNet = useCallback(async (netId, user, options = {}) => {
    const net = resolveNet(netId);
    if (!net) return { success: false, error: 'Net not found', requiresConfirmation: false };
    if (!options?.skipConfirmation && focusedConfirmation.checkNeedConfirmation(net)) {
      pendingJoinRef.current = { netId: t(net.id || net.code || netId), user, options };
      focusedConfirmation.requestConfirmation(net.id || net.code || netId);
      return { success: false, requiresConfirmation: true };
    }
    if (!canJoinVoiceNet(user, net)) return { success: false, error: 'Access denied', requiresConfirmation: false };
    userRef.current = user; setLocalUserId(user.id);
    const normalized = t(net.id || net.code || netId);
    const res = await connectNet(normalized, user); if (!res.success) return { success: false, error: res.error, requiresConfirmation: false };
    setMonitoredNetIds((p) => Array.from(new Set([...p, normalized])));
    if (!options?.monitorOnly) {
      setTransmitNetId(normalized); setActiveNetId(normalized);
      await voiceService.claimTransmitAuthority(normalized, user.id, `client-${user.id}-${normalized}`);
      setTxAuthority(await voiceService.getTransmitAuthority(normalized));
      await updatePresence('in-call', false);
      await invokeMemberFunction('updateCommsConsole', { action: 'sync_op_voice_text_presence', netId: normalized, status: 'in-call', preset: 'operation-default' }).catch(() => {});
    }
    return { success: true, requiresConfirmation: false };
  }, [connectNet, focusedConfirmation, resolveNet, updatePresence]);

  const monitorNet = useCallback((netId, user) => joinNet(netId, user, { monitorOnly: true }), [joinNet]);
  const setTransmitNet = useCallback(async (netId, user = userRef.current) => {
    const normalized = t(netId); if (!normalized) return { success: false, error: 'Invalid net' };
    if (!monitoredNetIds.includes(normalized) && user) {
      const monitorResult = await monitorNet(normalized, user); if (!monitorResult.success) return monitorResult;
    }
    setTransmitNetId(normalized); setActiveNetId(normalized);
    if (user) { await voiceService.claimTransmitAuthority(normalized, user.id, `client-${user.id}-${normalized}`); setTxAuthority(await voiceService.getTransmitAuthority(normalized)); await updatePresence('in-call', false); }
    return { success: true };
  }, [monitoredNetIds, monitorNet, updatePresence]);

  const unmonitorNet = useCallback(async (netId) => {
    const normalized = t(netId);
    setMonitoredNetIds((p) => p.filter((id) => id !== normalized));
    await disconnectNet(normalized);
    if (transmitNetId === normalized) {
      const nextTx = monitoredNetIds.find((id) => id !== normalized) || null;
      setTransmitNetId(nextTx); setActiveNetId(nextTx);
    }
  }, [disconnectNet, monitoredNetIds, transmitNetId]);

  const leaveNet = useCallback(async (netId) => {
    if (!netId) {
      for (const id of [...monitoredNetIds]) await disconnectNet(id);
      setMonitoredNetIds([]); setTransmitNetId(null); setActiveNetId(null); setLocalUserId(null); setPTTActive(false); setWhisperState({ active: false, target: null }); setTxAuthority(null);
      await updatePresence('online', false);
      return;
    }
    await unmonitorNet(netId);
    if (monitoredNetIds.length <= 1) await updatePresence('online', false);
  }, [disconnectNet, monitoredNetIds, unmonitorNet, updatePresence]);

  const setPTTTransmission = useCallback(async (active) => {
    const netId = transmitNetId; const transport = netId ? transportsRef.current.get(netId) : null; const user = userRef.current;
    if (!transport || !netId || !user) return;
    const mode = disciplineByNet[netId] || DISCIPLINE.PTT;
    const commandUser = ['COMMANDER', 'PIONEER', 'FOUNDER'].includes(t(user.rank).toUpperCase()) || (Array.isArray(user.roles) && user.roles.map((r) => t(r).toLowerCase()).some((r) => r === 'admin' || r === 'command' || r === 'officer'));
    if (active && mode === DISCIPLINE.COMMAND_ONLY && !commandUser) { setErr(netId, 'Command-only net discipline active'); return; }
    if (active && mode === DISCIPLINE.REQUEST_TO_SPEAK) {
      const approved = (speakRequestsByNet[netId] || []).some((r) => r.requester_member_profile_id === user.id && t(r.status).toUpperCase() === 'APPROVED');
      if (!approved && !commandUser) { setErr(netId, 'Request-to-speak approval required'); return; }
    }
    setPTTActive(active); transport.setPTTActive(active);
    if (whisperState.active && whisperState.target) transport.publishControlPacket?.({ type: active ? 'VOICE_WHISPER_START' : 'VOICE_WHISPER_STOP', netId, payload: { target: whisperState.target } });
    if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
    speakTimeoutRef.current = setTimeout(async () => {
      const sessionId = sessionIdsRef.current.get(netId); if (sessionId) await voiceService.updateSessionSpeaking(sessionId, active);
      await updatePresence(active ? 'transmitting' : 'in-call', active);
    }, VOICE_SPEAKING_DEBOUNCE_MS);
  }, [disciplineByNet, speakRequestsByNet, transmitNetId, updatePresence, whisperState.active, whisperState.target, setErr]);

  const startPTT = useCallback(() => { if (!micEnabled || connectionState !== VOICE_CONNECTION_STATE.CONNECTED) return; setPTTTransmission(true); }, [connectionState, micEnabled, setPTTTransmission]);
  const stopPTT = useCallback(() => setPTTTransmission(false), [setPTTTransmission]);
  const togglePTT = useCallback(() => setPTTTransmission(!pttActive), [pttActive, setPTTTransmission]);

  const setMicEnabledSafe = useCallback((enabled) => {
    setMicEnabled(Boolean(enabled)); monitoredNetIds.forEach((id) => transportsRef.current.get(id)?.setMicEnabled(Boolean(enabled)));
  }, [monitoredNetIds]);

  const startWhisper = useCallback((target) => {
    if (!transmitNetId || !target) return;
    setWhisperState({ active: true, target });
    transportsRef.current.get(transmitNetId)?.publishControlPacket?.({ type: 'VOICE_WHISPER_LANE', netId: transmitNetId, payload: { target, mode: 'start' } });
  }, [transmitNetId]);

  const stopWhisper = useCallback(() => {
    if (!transmitNetId || !whisperState.active) return;
    transportsRef.current.get(transmitNetId)?.publishControlPacket?.({ type: 'VOICE_WHISPER_LANE', netId: transmitNetId, payload: { target: whisperState.target, mode: 'stop' } });
    setWhisperState({ active: false, target: null });
  }, [transmitNetId, whisperState.active, whisperState.target]);

  const publishCommandBusAction = useCallback(async (busAction, payload = {}, options = {}) => {
    const netId = options.netId || transmitNetId; if (!netId) return;
    const packet = { type: busAction, netId, payload, sentAt: new Date().toISOString() };
    transportsRef.current.get(netId)?.publishControlPacket?.(packet);
    setCommandBusActions((p) => [packet, ...p].slice(0, 200));
    await invokeMemberFunction('updateCommsConsole', { action: 'publish_command_bus_action', netId, busAction, payload }).catch(() => {});
  }, [transmitNetId]);

  const setDisciplineMode = useCallback(async (mode, netId = transmitNetId) => {
    const normalized = t(mode).toUpperCase(); if (!netId || !Object.values(DISCIPLINE).includes(normalized)) return { success: false };
    setDisciplineByNet((p) => ({ ...p, [netId]: normalized }));
    await invokeMemberFunction('updateCommsConsole', { action: 'set_voice_discipline_mode', netId, mode: normalized }).catch(() => {});
    await publishCommandBusAction('DISCIPLINE_MODE_CHANGED', { mode: normalized }, { netId });
    return { success: true };
  }, [publishCommandBusAction, transmitNetId]);

  const requestToSpeak = useCallback(async ({ netId = transmitNetId, reason = '' } = {}) => {
    if (!netId) return { success: false };
    const resp = await invokeMemberFunction('updateCommsConsole', { action: 'request_to_speak', netId, reason }).catch(() => null);
    const request = resp?.data?.request;
    if (request) setSpeakRequestsByNet((p) => ({ ...p, [netId]: [request, ...(p[netId] || [])].slice(0, 80) }));
    await publishCommandBusAction('REQUEST_TO_SPEAK', { request }, { netId });
    return { success: Boolean(request), request };
  }, [publishCommandBusAction, transmitNetId]);

  const resolveSpeakRequest = useCallback(async ({ requestId, state = 'APPROVED', netId = transmitNetId } = {}) => {
    if (!requestId || !netId) return { success: false };
    const resp = await invokeMemberFunction('updateCommsConsole', { action: 'resolve_speak_request', requestId, state, netId }).catch(() => null);
    const resolution = resp?.data?.resolution;
    if (resolution) setSpeakRequestsByNet((p) => ({ ...p, [netId]: (p[netId] || []).map((r) => r.request_id === requestId ? { ...r, status: resolution.status } : r) }));
    await publishCommandBusAction(resolution?.status === 'APPROVED' ? 'REQUEST_APPROVED' : 'REQUEST_DENIED', { requestId, status: resolution?.status }, { netId });
    return { success: Boolean(resolution), resolution };
  }, [publishCommandBusAction, transmitNetId]);

  const setOutputDevice = useCallback(async (deviceId) => {
    setOutputDeviceId(deviceId || null); for (const id of monitoredNetIds) await transportsRef.current.get(id)?.setOutputDevice?.(deviceId || null);
    await invokeMemberFunction('updateCommsConsole', { action: 'set_voice_output_profile', netId: transmitNetId || null, outputDeviceId: deviceId || null, normalizeEnabled: normalizationEnabled, perUserGainDb: participantGainDb }).catch(() => {});
  }, [monitoredNetIds, normalizationEnabled, participantGainDb, transmitNetId]);

  const setInputDevice = useCallback(async (deviceId) => {
    for (const id of monitoredNetIds) {
      const transport = transportsRef.current.get(id);
      if (!transport?.setAudioDevice) continue;
      try {
        await transport.setAudioDevice(deviceId);
      } catch {
        // ignore device switch failures per-net
      }
    }
  }, [monitoredNetIds]);

  const setParticipantVolume = useCallback((participantId, gainDb) => {
    const n = Math.max(-18, Math.min(12, Number(gainDb) || 0));
    setParticipantGainDb((p) => ({ ...p, [participantId]: n }));
    monitoredNetIds.forEach((id) => transportsRef.current.get(id)?.setParticipantGain?.(participantId, n));
  }, [monitoredNetIds]);

  const setNormalization = useCallback(async (enabled) => {
    const next = Boolean(enabled); setNormalizationEnabled(next);
    monitoredNetIds.forEach((id) => transportsRef.current.get(id)?.setNormalizationEnabled?.(next));
    await invokeMemberFunction('updateCommsConsole', { action: 'set_voice_output_profile', netId: transmitNetId || null, outputDeviceId, normalizeEnabled: next, perUserGainDb: participantGainDb }).catch(() => {});
  }, [monitoredNetIds, outputDeviceId, participantGainDb, transmitNetId]);

  const configureSubmix = useCallback(async ({ monitor = monitorSubmixes, tx = txSubmix } = {}) => {
    const nextMonitor = Array.from(new Set((Array.isArray(monitor) ? monitor : ['COMMAND', 'SQUAD', 'LOCAL']).map((x) => t(x).toUpperCase())));
    const nextTx = t(tx || 'SQUAD').toUpperCase();
    setMonitorSubmixes(nextMonitor); setTxSubmix(nextTx);
    monitoredNetIds.forEach((id) => transportsRef.current.get(id)?.setSubmixRouting?.({ monitorSubmixes: nextMonitor, txSubmix: nextTx }));
    await invokeMemberFunction('updateCommsConsole', { action: 'set_voice_submix_profile', netId: transmitNetId || null, monitorSubmixes: nextMonitor, txSubmix: nextTx }).catch(() => {});
  }, [monitorSubmixes, monitoredNetIds, transmitNetId, txSubmix]);

  const triggerPriorityOverride = useCallback(async (payload = {}) => {
    const netId = payload.netId || transmitNetId; if (!netId) return { success: false };
    await publishCommandBusAction('PRIORITY_OVERRIDE', { ...payload, duckOthers: payload.duckOthers !== false }, { netId });
    await invokeMemberFunction('updateCommsConsole', { action: 'issue_priority_callout', netId, lane: 'COMMAND', priority: payload.priority || 'CRITICAL', message: payload.message || 'Emergency priority override', requiresAck: true }).catch(() => {});
    return { success: true };
  }, [publishCommandBusAction, transmitNetId]);

  const syncOperationComms = useCallback(async ({ eventId, netId = transmitNetId, channelId, preset = 'operation-default' } = {}) => {
    if (!netId) return { success: false };
    await invokeMemberFunction('updateCommsConsole', { action: 'sync_op_voice_text_presence', eventId, netId, channelId, status: 'in-call', preset }).catch(() => {});
    await updatePresence('in-call', false); return { success: true };
  }, [transmitNetId, updatePresence]);

  const appendRadioLogEntry = useCallback(async (entry = {}) => (await invokeMemberFunction('updateCommsConsole', { action: 'append_radio_log_entry', netId: transmitNetId || null, ...entry }).catch(() => null))?.data || {}, [transmitNetId]);
  const listRadioLog = useCallback(async (params = {}) => (await invokeMemberFunction('updateCommsConsole', { action: 'list_radio_log', netId: transmitNetId || null, ...params }).catch(() => null))?.data?.entries || [], [transmitNetId]);
  const captureVoiceClip = useCallback(async (payload = {}) => (await invokeMemberFunction('updateCommsConsole', { action: 'capture_voice_clip', netId: transmitNetId || null, ...payload }).catch(() => null))?.data || {}, [transmitNetId]);
  const generateVoiceStructuredDraft = useCallback(async (payload = {}) => (await invokeMemberFunction('updateCommsConsole', { action: 'generate_voice_structured_draft', netId: transmitNetId || null, ...payload }).catch(() => null))?.data || {}, [transmitNetId]);
  const sendCommandWhisper = useCallback(async (payload = {}) => (await invokeMemberFunction('updateCommsConsole', { action: 'send_command_whisper', netId: transmitNetId || null, ...payload }).catch(() => null))?.data || {}, [transmitNetId]);
  const acknowledgeCommandWhisper = useCallback(async (payload = {}) => (await invokeMemberFunction('updateCommsConsole', { action: 'acknowledge_command_whisper', netId: transmitNetId || null, ...payload }).catch(() => null))?.data || {}, [transmitNetId]);
  const setSecureMode = useCallback(async ({ netId = transmitNetId, ...rest } = {}) => {
    const resp = (await invokeMemberFunction('updateCommsConsole', { action: 'set_voice_secure_mode', netId, ...rest }).catch(() => null))?.data || {};
    if (resp?.secureMode) setSecureModeByNet((p) => ({ ...p, [netId]: resp.secureMode }));
    return resp;
  }, [transmitNetId]);
  const linkVoiceThread = useCallback(async (payload = {}) => (await invokeMemberFunction('updateCommsConsole', { action: 'link_voice_thread', netId: transmitNetId || null, ...payload }).catch(() => null))?.data || {}, [transmitNetId]);
  const setHotkeyProfilePersisted = useCallback(async (profile = {}) => {
    const merged = { ...hotkeyProfile, ...profile, bindings: { ...HOTKEYS, ...(profile.bindings || hotkeyProfile.bindings || {}) } };
    setHotkeyProfile(merged);
    await invokeMemberFunction('updateCommsConsole', { action: 'set_voice_hotkey_profile', netId: transmitNetId || null, profileName: merged.label || merged.id || 'default', bindings: merged.bindings, sideTone: Boolean(merged.sideTone) }).catch(() => {});
  }, [hotkeyProfile, transmitNetId]);
  const setLoadoutPersisted = useCallback(async (next = {}) => {
    const merged = { ...loadout, ...next }; setLoadout(merged);
    await invokeMemberFunction('updateCommsConsole', { action: 'set_voice_loadout', netId: transmitNetId || null, loadoutName: merged.name || 'default', codec: merged.codec, bitrateKbps: merged.bitrateKbps, noiseSuppression: merged.noiseSuppression, agc: merged.agc, eqProfile: merged.eqProfile || {}, roleHint: merged.roleHint || null, environmentHint: merged.environmentHint || null }).catch(() => {});
  }, [loadout, transmitNetId]);

  const confirmFocusedJoin = useCallback(async () => {
    const pending = pendingJoinRef.current; if (!pending) return { success: false };
    focusedConfirmation.confirm(); return joinNet(pending.netId, pending.user, { ...pending.options, skipConfirmation: true });
  }, [focusedConfirmation, joinNet]);
  const cancelFocusedJoin = useCallback(() => { pendingJoinRef.current = null; focusedConfirmation.cancel(); }, [focusedConfirmation]);

  useEffect(() => {
    const loadNets = async () => {
      try { const nets = await base44.entities.VoiceNet.list('-created_date', 200); if (Array.isArray(nets) && nets.length) return setVoiceNets(nets); } catch {}
      setVoiceNets(DEFAULT_VOICE_NETS);
    };

    // Delay to avoid blocking initial render
    const loadTimeout = setTimeout(() => loadNets(), 3000);

    if (!base44.entities.VoiceNet?.subscribe) return () => clearTimeout(loadTimeout);

    // Delay subscription even more
    const subTimeout = setTimeout(() => {
      const unsub = base44.entities.VoiceNet.subscribe((event) => setVoiceNets((prev) => event.type === 'create' ? [...prev, event.data] : event.type === 'update' ? prev.map((n) => n.id === event.id ? event.data : n) : event.type === 'delete' ? prev.filter((n) => n.id !== event.id) : prev));
      return () => unsub?.();
    }, 4000);

    return () => { clearTimeout(loadTimeout); clearTimeout(subTimeout); };
  }, []);

  useEffect(() => {
    if (!transmitNetId || !localUserId) return;
    const poll = setInterval(async () => setTxAuthority(await voiceService.getTransmitAuthority(transmitNetId)), 3000);
    return () => clearInterval(poll);
  }, [transmitNetId, localUserId]);

  useEffect(() => {
    if (!transmitNetId) return undefined;
    const shouldIgnore = (target) => { const tag = String(target?.tagName || '').toLowerCase(); return target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'; };
    const ptt = Array.isArray(hotkeyProfile?.bindings?.ptt) ? hotkeyProfile.bindings.ptt : HOTKEYS.ptt;
    const whisper = Array.isArray(hotkeyProfile?.bindings?.whisper) ? hotkeyProfile.bindings.whisper : HOTKEYS.whisper;
    const onDown = (e) => { if (e.repeat || shouldIgnore(e.target)) return; if (ptt.includes(e.code)) { e.preventDefault(); startPTT(); } if (whisper.includes(e.code)) { e.preventDefault(); if (!whisperState.active) startWhisper({ type: 'role', values: ['SCOUT'], label: 'Scout Priority' }); } };
    const onUp = (e) => { if (ptt.includes(e.code)) { e.preventDefault(); stopPTT(); } if (whisper.includes(e.code)) { e.preventDefault(); stopWhisper(); } };
    const onBlur = () => { stopPTT(); stopWhisper(); };
    window.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp); window.addEventListener('blur', onBlur);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); window.removeEventListener('blur', onBlur); };
  }, [hotkeyProfile?.bindings?.ptt, hotkeyProfile?.bindings?.whisper, startPTT, startWhisper, stopPTT, stopWhisper, transmitNetId, whisperState.active]);

  useEffect(() => () => {
    if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
    for (const id of heartbeatRef.current.values()) clearInterval(id);
    heartbeatRef.current.clear();
    for (const transport of transportsRef.current.values()) transport.disconnect?.().catch?.(() => {});
    transportsRef.current.clear();
  }, []);

  const value = useMemo(() => ({
    activeNetId, transmitNetId, monitoredNetIds, localUserId, connectionState, participants, error, micEnabled, pttActive, voiceNets,
    usingLiveKit: transportMode === 'livekit', transportMode, focusedConfirmation,
    participantsByNet, connectionStateByNet: connectionByNet, errorByNet, telemetryByNet, disciplineModeByNet: disciplineByNet, requestToSpeakByNet: speakRequestsByNet, whisperState, commandBusActions,
    outputDeviceId, participantGainDb, normalizationEnabled, monitorSubmixes, txSubmix, hotkeyProfile, loadout, secureModeByNet, txAuthority,
    joinNet, leaveNet, monitorNet, unmonitorNet, setTransmitNet, togglePTT, startPTT, stopPTT, setMicEnabled: setMicEnabledSafe, startWhisper, stopWhisper,
    setDisciplineMode, requestToSpeak, resolveSpeakRequest, publishCommandBusAction, triggerPriorityOverride, setInputDevice, setOutputDevice, setParticipantVolume, setNormalization, configureSubmix,
    syncOperationComms, appendRadioLogEntry, listRadioLog, captureVoiceClip, generateVoiceStructuredDraft, sendCommandWhisper, acknowledgeCommandWhisper, setSecureMode, linkVoiceThread,
    setHotkeyProfile: setHotkeyProfilePersisted, setLoadout: setLoadoutPersisted, confirmFocusedJoin, cancelFocusedJoin,
  }), [activeNetId, appendRadioLogEntry, acknowledgeCommandWhisper, cancelFocusedJoin, captureVoiceClip, commandBusActions, confirmFocusedJoin, configureSubmix, connectionByNet, connectionState, disciplineByNet, error, errorByNet, focusedConfirmation, generateVoiceStructuredDraft, hotkeyProfile, joinNet, leaveNet, linkVoiceThread, listRadioLog, loadout, localUserId, micEnabled, monitorNet, monitorSubmixes, monitoredNetIds, normalizationEnabled, outputDeviceId, participantGainDb, participants, participantsByNet, pttActive, publishCommandBusAction, requestToSpeak, resolveSpeakRequest, secureModeByNet, sendCommandWhisper, setDisciplineMode, setHotkeyProfilePersisted, setInputDevice, setLoadoutPersisted, setMicEnabledSafe, setNormalization, setOutputDevice, setParticipantVolume, setSecureMode, setTransmitNet, speakRequestsByNet, startPTT, startWhisper, stopPTT, stopWhisper, syncOperationComms, telemetryByNet, togglePTT, transportMode, transmitNetId, triggerPriorityOverride, txAuthority, txSubmix, unmonitorNet, voiceNets, whisperState]);

  return <VoiceNetContext.Provider value={value}>{children}</VoiceNetContext.Provider>;
}

export function useVoiceNet() {
  const context = useContext(VoiceNetContext);
  if (!context) throw new Error('useVoiceNet must be used within VoiceNetProvider');
  return context;
}