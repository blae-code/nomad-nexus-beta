import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { isAdminUser } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Bot, CalendarClock, Keyboard, Link2, Mic, Radio, RefreshCcw, Shuffle, Sparkles, Users, Volume2 } from 'lucide-react';
import { COMMS_CHANNEL_TYPES } from '@/components/constants/channelTypes';
import { useAuth } from '@/components/providers/AuthProvider';
import { canAccessFocusedComms, getAccessDenialReason } from '@/components/utils/commsAccessPolicy';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import VoiceNetCreator from '@/components/voice/VoiceNetCreator';
import VoiceNetBrowser from '@/components/voice/VoiceNetBrowser';
import VoiceNetDirector from '@/components/voice/VoiceNetDirector';
import ChannelManager from '@/components/comms/ChannelManager';
import SpeechSettings from '@/components/comms/SpeechSettings';
import CommsRosterPanel from '@/components/comms/CommsRosterPanel';
import CommsQueryPanel from '@/components/comms/CommsQueryPanel';
import OperationVoiceWorkbench from '@/components/comms/OperationVoiceWorkbench';

const SHORTCUTS = [
  { combo: 'Shift+/', action: 'Open shortcuts' },
  { combo: 'Alt+1..9', action: 'Switch tabs' },
  { combo: 'Alt+H', action: 'Join hangout voice net' },
  { combo: 'Ctrl+Shift+V', action: 'Toggle voice command capture' },
];

const POS = new Set(['good', 'great', 'secure', 'success', 'ready', 'clear']);
const NEG = new Set(['bad', 'fail', 'hostile', 'delay', 'risk', 'urgent']);

const defaultScheduleTime = () => new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16);
const text = (v, fallback = '') => (String(v || '').trim() || fallback);

const classify = (message) => {
  const ai = text(message?.sentiment).toLowerCase();
  if (ai === 'positive') return { label: 'positive', score: 1 };
  if (ai === 'negative' || ai === 'urgent') return { label: 'negative', score: -1 };
  const tokens = text(message?.content).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  let score = 0;
  for (const token of tokens) {
    if (POS.has(token)) score += 1;
    if (NEG.has(token)) score -= 1;
  }
  if (score > 0) return { label: 'positive', score };
  if (score < 0) return { label: 'negative', score };
  return { label: 'neutral', score: 0 };
};

export default function CommsConsole() {
  const { user: authUser } = useAuth();
  const currentUser = authUser?.member_profile_data || authUser;
  const voiceNet = useVoiceNet();
  const activeOp = useActiveOp();

  const [activeTab, setActiveTab] = useState('channels');
  const [showVoiceNetCreator, setShowVoiceNetCreator] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [banner, setBanner] = useState(null);
  const [channels, setChannels] = useState([]);
  const [events, setEvents] = useState([]);
  const [bridgeSessions, setBridgeSessions] = useState([]);
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [sentiment, setSentiment] = useState({ total: 0, positive: 0, neutral: 0, negative: 0, score: 0 });
  const [complianceAudit, setComplianceAudit] = useState([]);
  const [complianceMode, setComplianceMode] = useState('MANUAL_ONLY');
  const [compliancePolicyVersion, setCompliancePolicyVersion] = useState('');
  const [busy, setBusy] = useState(false);

  const [bridgeForm, setBridgeForm] = useState({ eventId: '', leftRoom: '', rightRoom: '', bridgeType: 'OP_INTERNAL', discordMessage: '', webhookUrl: '' });
  const [scheduleForm, setScheduleForm] = useState({ channelId: '', content: '', sendAt: defaultScheduleTime() });

  const [speechSettings, setSpeechSettings] = useState(() => {
    const saved = localStorage.getItem('nexus.speech.settings');
    return saved ? JSON.parse(saved) : { ttsEnabled: false, sttEnabled: false, language: 'en-US' };
  });
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceState, setVoiceState] = useState('');
  const recognitionRef = useRef(null);

  const voiceSupported = useMemo(() => typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition), []);
  const canViewComplianceAudit = useMemo(() => isAdminUser(authUser), [authUser]);
  const hangoutNet = useMemo(() => {
    const nets = Array.isArray(voiceNet.voiceNets) ? voiceNet.voiceNets : [];
    return nets.find((n) => String(n?.type || '').toLowerCase() === 'general') || null;
  }, [voiceNet.voiceNets]);

  const notify = (type, message) => setBanner({ type, message });

  const loadData = useCallback(async () => {
    try {
      const [channelRows, eventRows, bridgeRows] = await Promise.all([
        base44.entities.Channel.list('-created_date', 120),
        base44.entities.Event.list('-start_time', 120),
        base44.entities.BridgeSession.list('-created_date', 80).catch(() => []),
      ]);
      setChannels(channelRows || []);
      setEvents(eventRows || []);
      setBridgeSessions(bridgeRows || []);
      if (!bridgeForm.eventId && eventRows?.[0]?.id) setBridgeForm((p) => ({ ...p, eventId: eventRows[0].id }));
      if (!scheduleForm.channelId && channelRows?.[0]?.id) setScheduleForm((p) => ({ ...p, channelId: channelRows[0].id }));
    } catch (error) {
      notify('error', `Load failed: ${error.message}`);
    }
  }, [bridgeForm.eventId, scheduleForm.channelId]);

  const loadScheduled = useCallback(async () => {
    const response = await invokeMemberFunction('updateCommsConsole', { action: 'list_scheduled_messages' });
    if (response?.data?.success) setScheduledMessages(response.data.schedules || []);
    else notify('error', response?.data?.error || 'Unable to load scheduled messages');
  }, []);

  const loadSentiment = useCallback(async () => {
    const rows = await base44.entities.Message.list('-created_date', 300);
    let positive = 0;
    let neutral = 0;
    let negative = 0;
    let score = 0;
    for (const row of rows || []) {
      const s = classify(row);
      score += s.score;
      if (s.label === 'positive') positive += 1;
      else if (s.label === 'negative') negative += 1;
      else neutral += 1;
    }
    setSentiment({ total: (rows || []).length, positive, neutral, negative, score });
  }, []);

  const loadComplianceAudit = useCallback(async () => {
    if (!canViewComplianceAudit) return;
    const response = await invokeMemberFunction('updateCommsConsole', {
      action: 'list_compliance_audit',
      eventId: activeOp?.activeEventId || undefined,
      limit: 24,
    });
    if (response?.data?.success) {
      setComplianceAudit(Array.isArray(response.data.audit) ? response.data.audit : []);
      setComplianceMode(String(response.data.mode || 'MANUAL_ONLY'));
      setCompliancePolicyVersion(String(response.data.policyVersion || ''));
      return;
    }
    notify('error', response?.data?.error || 'Unable to load compliance audit');
  }, [activeOp?.activeEventId, canViewComplianceAudit]);

  useEffect(() => {
    loadData();
    loadScheduled();
    loadSentiment();
    loadComplianceAudit();
  }, [loadComplianceAudit, loadData, loadScheduled, loadSentiment]);

  const joinHangout = useCallback(() => {
    if (!hangoutNet || !currentUser) return;
    voiceNet.joinNet(hangoutNet.id || hangoutNet.code, currentUser);
    notify('success', `Joined ${hangoutNet.label || hangoutNet.code}`);
  }, [hangoutNet, currentUser, voiceNet]);

  const applyVoiceCommand = useCallback(async (spoken) => {
    const command = text(spoken).toLowerCase();
    if (command.includes('open bridge')) return setActiveTab('bridge');
    if (command.includes('open scheduler')) return setActiveTab('scheduler');
    if (command.includes('open sentiment')) return setActiveTab('sentiment');
    if (command.includes('open operations')) return setActiveTab('operations');
    if (command.includes('open channels')) return setActiveTab('channels');
    if (command.includes('join hangout')) return joinHangout();
    if (command.includes('dispatch scheduled')) {
      await invokeMemberFunction('updateCommsConsole', { action: 'dispatch_due_messages' });
      await loadScheduled();
      notify('success', 'Dispatched due messages.');
      return;
    }
    setVoiceState(`Command not recognized: ${spoken}`);
  }, [joinHangout, loadScheduled]);

  const stopVoiceCommands = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setVoiceListening(false);
  }, []);

  const startVoiceCommands = useCallback(() => {
    if (!voiceSupported || typeof window === 'undefined') {
      setVoiceState('Voice recognition unsupported.');
      return;
    }
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = speechSettings.language || 'en-US';
    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => setVoiceListening(false);
    recognition.onerror = (event) => setVoiceState(`Voice error: ${event?.error || 'unknown'}`);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || []).map((r) => r?.[0]?.transcript || '').join(' ').trim();
      setVoiceState(transcript ? `Heard: ${transcript}` : 'No transcript');
      if (transcript) applyVoiceCommand(transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [applyVoiceCommand, speechSettings.language, voiceSupported]);

  useEffect(() => () => stopVoiceCommands(), [stopVoiceCommands]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if (event.key === 'Escape') return setShowShortcuts(false);
      if (typing) return;
      if (event.shiftKey && event.key === '?') {
        event.preventDefault();
        return setShowShortcuts(true);
      }
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        return voiceListening ? stopVoiceCommands() : startVoiceCommands();
      }
      if (event.altKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        return joinHangout();
      }
      if (event.altKey && /^[1-9]$/.test(event.key)) {
        event.preventDefault();
        const map = { 1: 'channels', 2: 'voice', 3: 'operations', 4: 'netops', 5: 'roster', 6: 'speech', 7: 'intel', 8: 'bridge', 9: 'scheduler' };
        setActiveTab(map[event.key] || 'channels');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [joinHangout, startVoiceCommands, stopVoiceCommands, voiceListening]);

  const createBridge = async () => {
    setBusy(true);
    const response = await invokeMemberFunction('createBridgeSession', {
      eventId: bridgeForm.eventId,
      leftRoom: bridgeForm.leftRoom,
      rightRoom: bridgeForm.rightRoom,
      bridgeType: bridgeForm.bridgeType,
    });
    if (response?.data?.ok) {
      notify('success', response.data.message || 'Bridge session created.');
      setBridgeForm((p) => ({ ...p, leftRoom: '', rightRoom: '' }));
      await loadData();
    } else notify('error', response?.data?.message || response?.data?.error || 'Bridge creation failed');
    setBusy(false);
  };

  const syncDiscord = async () => {
    setBusy(true);
    const response = await invokeMemberFunction('discordBridgeSync', {
      message: bridgeForm.discordMessage,
      webhookUrl: text(bridgeForm.webhookUrl) || undefined,
    });
    if (response?.data?.success) notify('success', 'Discord sync sent.');
    else notify('error', response?.data?.error || 'Discord sync failed');
    setBusy(false);
  };

  const scheduleMessage = async () => {
    setBusy(true);
    const response = await invokeMemberFunction('updateCommsConsole', {
      action: 'schedule_message',
      channelId: scheduleForm.channelId,
      content: scheduleForm.content,
      sendAt: new Date(scheduleForm.sendAt).toISOString(),
    });
    if (response?.data?.success) {
      notify('success', 'Message scheduled.');
      setScheduleForm((p) => ({ ...p, content: '', sendAt: defaultScheduleTime() }));
      await loadScheduled();
      await loadComplianceAudit();
    } else notify('error', response?.data?.error || 'Scheduling failed');
    setBusy(false);
  };

  const dispatchDue = async () => {
    setBusy(true);
    const response = await invokeMemberFunction('updateCommsConsole', { action: 'dispatch_due_messages' });
    if (response?.data?.success) notify('success', `Dispatched ${response?.data?.dispatchedCount || 0} message(s).`);
    else notify('error', response?.data?.error || 'Dispatch failed');
    await loadScheduled();
    await loadComplianceAudit();
    setBusy(false);
  };

  const cancelSchedule = async (id) => {
    setBusy(true);
    const response = await invokeMemberFunction('updateCommsConsole', { action: 'cancel_scheduled_message', scheduleId: id });
    if (response?.data?.success) notify('success', 'Scheduled message cancelled.');
    else notify('error', response?.data?.error || 'Cancel failed');
    await loadScheduled();
    await loadComplianceAudit();
    setBusy(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">Comms Array</h1>
          <p className="text-zinc-400 text-sm">Voice operations, bridge controls, scheduled dispatch, and sentiment visibility</p>
          <p className="text-xs text-zinc-500 mt-1">Active operation: <span className="text-zinc-300">{activeOp?.activeEvent?.title || 'None'}</span></p>
          <p className="text-xs text-zinc-500">Focused access: <span className="text-zinc-300">{canAccessFocusedComms(currentUser, { type: COMMS_CHANNEL_TYPES.FOCUSED, isTemporary: false }) ? 'Authorized' : getAccessDenialReason({ isTemporary: false })}</span></p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowShortcuts(true)}><Keyboard className="w-4 h-4 mr-1" />Shortcuts</Button>
          <Button size="sm" variant={voiceListening ? 'default' : 'outline'} onClick={() => (voiceListening ? stopVoiceCommands() : startVoiceCommands())}><Bot className="w-4 h-4 mr-1" />Voice Cmd</Button>
          <Button size="sm" variant="outline" onClick={joinHangout} disabled={!hangoutNet || !currentUser}>Join Hangout</Button>
        </div>
      </div>

      {banner && (
        <div className={`mb-4 p-3 rounded border text-xs ${banner.type === 'success' ? 'border-green-500/40 bg-green-500/10 text-green-200' : 'border-red-500/40 bg-red-500/10 text-red-200'}`}>
          {banner.message}
        </div>
      )}

      {voiceState && <div className="mb-4 text-xs text-zinc-400">{voiceState}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[60vh]">
        <div className="lg:col-span-2 bg-zinc-900/50 border-2 border-zinc-800 p-4">
          <div className="flex items-start gap-3 p-3 border border-orange-500/30 bg-orange-500/10 rounded">
            <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5" />
            <div className="text-xs text-zinc-300">Comms Dock is the primary text surface. This console manages policy and automation controls.</div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList>
              <TabsTrigger value="channels"><Radio className="w-4 h-4 mr-1" />Channels</TabsTrigger>
              <TabsTrigger value="voice"><Radio className="w-4 h-4 mr-1" />Voice</TabsTrigger>
              <TabsTrigger value="operations"><Mic className="w-4 h-4 mr-1" />Ops Voice</TabsTrigger>
              <TabsTrigger value="netops"><Shuffle className="w-4 h-4 mr-1" />Net Ops</TabsTrigger>
              <TabsTrigger value="roster"><Users className="w-4 h-4 mr-1" />Roster</TabsTrigger>
              <TabsTrigger value="speech"><Volume2 className="w-4 h-4 mr-1" />Speech</TabsTrigger>
              <TabsTrigger value="intel"><Sparkles className="w-4 h-4 mr-1" />Intel</TabsTrigger>
              <TabsTrigger value="bridge"><Link2 className="w-4 h-4 mr-1" />Bridge</TabsTrigger>
              <TabsTrigger value="scheduler"><CalendarClock className="w-4 h-4 mr-1" />Scheduler</TabsTrigger>
              <TabsTrigger value="sentiment"><Sparkles className="w-4 h-4 mr-1" />Sentiment</TabsTrigger>
            </TabsList>

            <TabsContent value="channels" className="mt-4"><ChannelManager /></TabsContent>
            <TabsContent value="voice" className="mt-4">{showVoiceNetCreator ? <VoiceNetCreator onSuccess={() => setShowVoiceNetCreator(false)} onCancel={() => setShowVoiceNetCreator(false)} /> : <VoiceNetBrowser onCreateNew={() => setShowVoiceNetCreator(true)} />}</TabsContent>
            <TabsContent value="operations" className="mt-4"><OperationVoiceWorkbench channels={channels} /></TabsContent>
            <TabsContent value="netops" className="mt-4"><VoiceNetDirector /></TabsContent>
            <TabsContent value="roster" className="mt-4"><CommsRosterPanel /></TabsContent>
            <TabsContent value="speech" className="mt-4"><SpeechSettings settings={speechSettings} onUpdate={(next) => { setSpeechSettings(next); localStorage.setItem('nexus.speech.settings', JSON.stringify(next)); }} /></TabsContent>
            <TabsContent value="intel" className="mt-4"><CommsQueryPanel /></TabsContent>

            <TabsContent value="bridge" className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 border border-zinc-800 rounded p-3 bg-zinc-900/40">
                  <div className="text-xs uppercase tracking-widest text-zinc-500">Voice Bridge Session</div>
                  <select value={bridgeForm.eventId} onChange={(e) => setBridgeForm((p) => ({ ...p, eventId: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm" aria-label="Bridge event">
                    {events.map((event) => <option key={event.id} value={event.id}>{event.title || event.id}</option>)}
                  </select>
                  <Input value={bridgeForm.leftRoom} onChange={(e) => setBridgeForm((p) => ({ ...p, leftRoom: e.target.value }))} placeholder="Left room" aria-label="Left room" />
                  <Input value={bridgeForm.rightRoom} onChange={(e) => setBridgeForm((p) => ({ ...p, rightRoom: e.target.value }))} placeholder="Right room" aria-label="Right room" />
                  <Button onClick={createBridge} disabled={busy || !bridgeForm.eventId || !bridgeForm.leftRoom || !bridgeForm.rightRoom}>Create Bridge</Button>
                </div>
                <div className="space-y-2 border border-zinc-800 rounded p-3 bg-zinc-900/40">
                  <div className="text-xs uppercase tracking-widest text-zinc-500">Discord Bridge Sync</div>
                  <Textarea value={bridgeForm.discordMessage} onChange={(e) => setBridgeForm((p) => ({ ...p, discordMessage: e.target.value }))} placeholder="Discord bridge message..." aria-label="Discord bridge message" />
                  <Input value={bridgeForm.webhookUrl} onChange={(e) => setBridgeForm((p) => ({ ...p, webhookUrl: e.target.value }))} placeholder="Optional webhook override" aria-label="Discord webhook override" />
                  <Button onClick={syncDiscord} disabled={busy || !bridgeForm.discordMessage.trim()}>Sync Discord</Button>
                </div>
              </div>
              <div className="space-y-1">
                {bridgeSessions.slice(0, 6).map((row) => (
                  <div key={row.id} className="text-xs border border-zinc-800 rounded p-2 bg-zinc-900/40">
                    {row.left_room || 'left'} <span className="text-orange-300">↔</span> {row.right_room || 'right'} · {row.status || 'ACTIVE'}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="scheduler" className="mt-4 space-y-3">
              <div className="space-y-2 border border-zinc-800 rounded p-3 bg-zinc-900/40">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Schedule Message</div>
                <select value={scheduleForm.channelId} onChange={(e) => setScheduleForm((p) => ({ ...p, channelId: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm" aria-label="Scheduled channel">
                  {channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name || channel.id}</option>)}
                </select>
                <Textarea value={scheduleForm.content} onChange={(e) => setScheduleForm((p) => ({ ...p, content: e.target.value }))} placeholder="Scheduled message..." aria-label="Scheduled content" />
                <Input type="datetime-local" value={scheduleForm.sendAt} onChange={(e) => setScheduleForm((p) => ({ ...p, sendAt: e.target.value }))} aria-label="Scheduled send time" />
                <div className="flex gap-2">
                  <Button onClick={scheduleMessage} disabled={busy || !scheduleForm.channelId || !scheduleForm.content.trim() || !scheduleForm.sendAt}>Schedule</Button>
                  <Button variant="outline" onClick={dispatchDue} disabled={busy}>Dispatch Due</Button>
                  <Button variant="outline" onClick={loadScheduled} disabled={busy}><RefreshCcw className="w-3 h-3 mr-1" />Refresh</Button>
                </div>
              </div>
              <div className="space-y-2">
                {scheduledMessages.length === 0 ? <div className="text-xs text-zinc-500">No queued scheduled messages.</div> : scheduledMessages.map((entry) => (
                  <div key={entry.id} className="border border-zinc-800 rounded p-2 bg-zinc-900/40 text-xs space-y-1">
                    <div className="flex items-center justify-between"><span className="text-zinc-300">#{entry.channel_id}</span><span className="uppercase text-zinc-500">{entry.status}</span></div>
                    <div className="text-zinc-400">{entry.content}</div>
                    <div className="text-zinc-500">{entry.send_at ? new Date(entry.send_at).toLocaleString() : 'Unknown time'}</div>
                    {entry.status === 'scheduled' && <Button size="sm" variant="outline" onClick={() => cancelSchedule(entry.id)} disabled={busy}>Cancel</Button>}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="sentiment" className="mt-4 space-y-3">
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="border border-zinc-800 rounded p-2 bg-zinc-900/40"><div className="text-zinc-500 uppercase">Messages</div><div className="text-white font-semibold mt-1">{sentiment.total}</div></div>
                <div className="border border-zinc-800 rounded p-2 bg-zinc-900/40"><div className="text-zinc-500 uppercase">Positive</div><div className="text-green-300 font-semibold mt-1">{sentiment.positive}</div></div>
                <div className="border border-zinc-800 rounded p-2 bg-zinc-900/40"><div className="text-zinc-500 uppercase">Neutral</div><div className="text-zinc-300 font-semibold mt-1">{sentiment.neutral}</div></div>
                <div className="border border-zinc-800 rounded p-2 bg-zinc-900/40"><div className="text-zinc-500 uppercase">Negative</div><div className="text-red-300 font-semibold mt-1">{sentiment.negative}</div></div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={loadSentiment}><RefreshCcw className="w-3 h-3 mr-1" />Refresh Sentiment</Button>
                <div className={`text-xs ${sentiment.score >= 0 ? 'text-green-300' : 'text-red-300'}`}>Net score: {sentiment.score}</div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="bg-zinc-900/50 border-2 border-zinc-800 p-4 space-y-2">
          <div className="text-xs uppercase tracking-widest text-zinc-500">Status</div>
          <div className="text-xs text-zinc-400">Voice commands: {voiceListening ? 'Listening' : (voiceSupported ? 'Ready' : 'Unsupported')}</div>
          <div className="text-xs text-zinc-400">Queued messages: {scheduledMessages.filter((e) => e.status === 'scheduled').length}</div>
          <div className="text-xs text-zinc-400">Bridge sessions: {bridgeSessions.length}</div>
          <div className="text-xs text-zinc-400">Negative sentiment in sample: {sentiment.negative}</div>
          <div className="text-xs text-zinc-400">Focused access: {canAccessFocusedComms(currentUser, { type: COMMS_CHANNEL_TYPES.FOCUSED, isTemporary: false }) ? 'Authorized' : 'Denied'}</div>
          {canViewComplianceAudit && (
            <div className="pt-2 mt-2 border-t border-zinc-800 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Compliance Audit</div>
              <div className="text-xs text-zinc-400">
                Mode: <span className="text-zinc-200">{complianceMode}</span>
                {compliancePolicyVersion ? <span className="text-zinc-500"> · {compliancePolicyVersion}</span> : null}
              </div>
              {complianceAudit.length === 0 ? (
                <div className="text-xs text-zinc-500">No comms compliance records in scope.</div>
              ) : (
                complianceAudit.slice(0, 5).map((entry) => (
                  <div key={entry.id || `${entry.type}-${entry.created_date}`} className="rounded border border-zinc-800 bg-zinc-900/40 p-2 text-[11px]">
                    <div className="text-zinc-200 truncate">{entry.type || 'COMMS_EVENT'}</div>
                    <div className="text-zinc-500 truncate">
                      {entry.evidence_source || 'unknown'} · {entry.confirmed ? 'confirmed' : 'pending'} · {entry.actor_member_profile_id || 'n/a'}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Keyboard & Voice Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs">
            {SHORTCUTS.map((item) => (
              <div key={item.combo} className="p-2 border border-zinc-800 rounded bg-zinc-900/40 flex items-center justify-between">
                <span className="font-mono text-orange-300">{item.combo}</span>
                <span className="text-zinc-400">{item.action}</span>
              </div>
            ))}
            <div className="p-2 border border-zinc-800 rounded bg-zinc-900/40 text-zinc-400">
              Voice command phrases: "open operations", "open bridge", "open scheduler", "open sentiment", "open channels", "join hangout", "dispatch scheduled".
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShortcuts(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
