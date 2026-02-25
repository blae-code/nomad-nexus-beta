/**
 * CommsHub - Text communications control center
 * 
 * DESIGN COMPLIANCE:
 * - Typography: Labels text-[9px]/[8px] uppercase, messages text-[10px]
 * - Spacing: px-2.5 py-2 (sections), gap-1/1.5
 * - Icons: w-3 h-3 (buttons), w-4 h-4 (collapse)
 * - Tokens: ✅ Uses hex tokens (channel types), number tokens (unread counts), circle tokens (voice status)
 * - Pagination: 5-6 items per section
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, ChevronLeft, ChevronRight, CornerDownRight, MessageSquare, Pin, Search, Send } from 'lucide-react';
import { NexusBadge, NexusButton, NexusTokenIcon } from '../primitives';
import RadialMenu from '../map/RadialMenu';
import {
  appendOrderDispatch,
  createOrderDispatch,
  deliveryTone,
  MAX_DISPATCH_HISTORY,
} from './commsOrderRuntime';
import CommsHubLegacy from './CommsHubLegacy';
import TextCommsExpandDrawer from './TextCommsExpandDrawer';
import {
  buildChannelGroups,
  buildCurrentMessages,
  buildMentionsInbox,
  buildOrdersRuntime,
  buildPinsView,
  buildSearchPreview,
  buildThreadSummaries,
  CHANNEL_CATEGORIES,
  clampPage,
  filterMessages,
  flattenChannelGroups,
  paginate,
  TEXT_COMMS_PAGE_SIZES,
} from './useTextCommsRailRuntime';

const MESSAGE_FILTERS = ['all', 'event', 'local'];
const PRIORITY_LEVELS = ['STANDARD', 'HIGH', 'CRITICAL'];
const CATEGORY_LABELS = { tactical: 'Tactical', operations: 'Operations', social: 'Social', direct: 'Direct' };

function t(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function age(ms, now = Date.now()) {
  const diff = Math.max(0, now - Number(ms || now));
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return `${Math.floor(diff / 3600000)}h`;
}

function ChannelGlyph({ category }) {
  if (category === 'direct') return <NexusTokenIcon family="hex" color="blue" size="sm" />;
  if (category === 'operations') return <NexusTokenIcon family="hex" color="yellow" size="sm" />;
  if (category === 'tactical') return <NexusTokenIcon family="hex" color="orange" size="sm" />;
  return <NexusTokenIcon family="hex" color="cyan" size="sm" />;
}

function UnreadIndicator({ unread = 0, tone = 'warning' }) {
  if (unread <= 0) return null;
  if (unread <= 9) {
    return <NexusTokenIcon family={`number-${unread}`} color={tone === 'danger' ? 'red' : 'yellow'} size="sm" alt={`${unread} unread`} />;
  }
  return <NexusBadge tone={tone}>{unread}</NexusBadge>;
}

export default function CommsHub({
  operations = [],
  focusOperationId,
  activeAppId,
  online,
  bridgeId,
  actorId = '',
  eventMessagesByChannel = {},
  unreadByChannel = {},
  events = [],
  channelVoiceMap = {},
  voiceState = null,
  onRouteVoiceNet,
  onIssueCommsOrder,
  focusMode = '',
  isExpanded = true,
  onToggleExpand,
  variantId = 'CQB-01',
  opId = '',
  experienceMode = 'text-rail-v2',
  featureFlags = { progressiveParity: true },
  onOpenExpandedComms,
}) {
  if (experienceMode === 'legacy') {
    return (
      <CommsHubLegacy
        operations={operations}
        focusOperationId={focusOperationId}
        activeAppId={activeAppId}
        online={online}
        bridgeId={bridgeId}
        actorId={actorId}
        eventMessagesByChannel={eventMessagesByChannel}
        unreadByChannel={unreadByChannel}
        channelVoiceMap={channelVoiceMap}
        voiceState={voiceState}
        onRouteVoiceNet={onRouteVoiceNet}
        onIssueCommsOrder={onIssueCommsOrder}
        focusMode={focusMode}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    );
  }

  const rootRef = useRef(null);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [channelPages, setChannelPages] = useState({ tactical: 0, operations: 0, social: 0, direct: 0 });
  const [messageFilter, setMessageFilter] = useState('all');
  const [messagePage, setMessagePage] = useState(0);
  const [mentionsPage, setMentionsPage] = useState(0);
  const [threadPage, setThreadPage] = useState(0);
  const [pinsPage, setPinsPage] = useState(0);
  const [ordersPage, setOrdersPage] = useState(0);
  const [searchPage, setSearchPage] = useState(0);
  const [composerPriority, setComposerPriority] = useState('STANDARD');
  const [messageInput, setMessageInput] = useState('');
  const [threadReplyInput, setThreadReplyInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickView, setActiveQuickView] = useState('mentions');
  const [localMessagesByChannel, setLocalMessagesByChannel] = useState({});
  const [threadsByMessageId, setThreadsByMessageId] = useState({});
  const [activeThreadMessageId, setActiveThreadMessageId] = useState('');
  const [pinnedMessageIdsByChannel, setPinnedMessageIdsByChannel] = useState({});
  const [ackUnreadByChannel, setAckUnreadByChannel] = useState({});
  const [dispatches, setDispatches] = useState([]);
  const [drawerView, setDrawerView] = useState('');
  const [feedback, setFeedback] = useState('');
  const [radial, setRadial] = useState({ open: false, anchor: { x: 50, y: 50 }, kind: '', channelId: '', messageId: '' });

  const channelGroups = useMemo(() => buildChannelGroups({
    operations,
    focusOperationId,
    online,
    bridgeId,
    unreadByChannel,
    acknowledgedUnreadByChannel: ackUnreadByChannel,
  }), [operations, focusOperationId, online, bridgeId, unreadByChannel, ackUnreadByChannel]);

  const channels = useMemo(() => flattenChannelGroups(channelGroups), [channelGroups]);
  const categoryPaging = useMemo(() => {
    const out = {};
    for (const category of CHANNEL_CATEGORIES) out[category] = paginate(channelGroups?.[category] || [], channelPages?.[category] || 0, TEXT_COMMS_PAGE_SIZES.channels);
    return out;
  }, [channelGroups, channelPages]);

  const mergedMessagesByChannel = useMemo(() => channels.reduce((acc, ch) => {
    acc[ch.id] = buildCurrentMessages({ selectedChannel: ch.id, eventMessagesByChannel, localMessagesByChannel });
    return acc;
  }, {}), [channels, eventMessagesByChannel, localMessagesByChannel]);

  const selectedChannelData = useMemo(() => channels.find((entry) => entry.id === selectedChannel) || null, [channels, selectedChannel]);
  const currentMessages = useMemo(() => mergedMessagesByChannel[selectedChannel] || [], [mergedMessagesByChannel, selectedChannel]);
  const filteredMessages = useMemo(() => filterMessages(currentMessages, messageFilter), [currentMessages, messageFilter]);
  const messagesPaged = useMemo(() => paginate(filteredMessages, messagePage, TEXT_COMMS_PAGE_SIZES.messages), [filteredMessages, messagePage]);

  const mentionsInbox = useMemo(() => buildMentionsInbox({ messages: Object.values(mergedMessagesByChannel).flat(), actorId }), [mergedMessagesByChannel, actorId]);
  const mentionsPaged = useMemo(() => paginate(mentionsInbox, mentionsPage, TEXT_COMMS_PAGE_SIZES.inbox), [mentionsInbox, mentionsPage]);
  const threads = useMemo(() => buildThreadSummaries({ selectedChannel, currentMessages, threadsByMessageId }), [selectedChannel, currentMessages, threadsByMessageId]);
  const threadsPaged = useMemo(() => paginate(threads, threadPage, TEXT_COMMS_PAGE_SIZES.threadPreview), [threads, threadPage]);
  const pins = useMemo(() => buildPinsView({ selectedChannel, currentMessages, pinnedMessageIdsByChannel }), [selectedChannel, currentMessages, pinnedMessageIdsByChannel]);
  const pinsPaged = useMemo(() => paginate(pins, pinsPage, TEXT_COMMS_PAGE_SIZES.pins), [pins, pinsPage]);
  const searchHits = useMemo(() => buildSearchPreview({ query: searchQuery, allMessagesByChannel: mergedMessagesByChannel }), [searchQuery, mergedMessagesByChannel]);
  const searchPaged = useMemo(() => paginate(searchHits, searchPage, TEXT_COMMS_PAGE_SIZES.inbox), [searchHits, searchPage]);
  const orders = useMemo(() => buildOrdersRuntime({ dispatches, events, incidents: [], nowMs: Date.now(), page: ordersPage }), [dispatches, events, ordersPage]);
  const activeThreadReplies = useMemo(() => Array.isArray(threadsByMessageId?.[activeThreadMessageId]) ? threadsByMessageId[activeThreadMessageId] : [], [threadsByMessageId, activeThreadMessageId]);

  const totalUnread = useMemo(() => channels.reduce((sum, channel) => sum + Number(channel.unread || 0), 0), [channels]);
  const voiceStateLabel = t(voiceState?.connectionState, 'IDLE').toUpperCase();
  const selectedVoiceNetId = selectedChannel ? t(channelVoiceMap?.[selectedChannel]) : '';

  const quickViews = {
    mentions: { rows: mentionsPaged.visible, paged: mentionsPaged, total: mentionsInbox.length },
    threads: { rows: threadsPaged.visible, paged: threadsPaged, total: threads.length },
    pins: { rows: pinsPaged.visible, paged: pinsPaged, total: pins.length },
    search: { rows: searchPaged.visible, paged: searchPaged, total: searchHits.length },
  };
  const activeQuick = quickViews[activeQuickView] || quickViews.mentions;

  useEffect(() => {
    if (selectedChannel && channels.some((entry) => entry.id === selectedChannel)) return;
    setSelectedChannel(channels.find((entry) => entry.category === 'tactical')?.id || channels[0]?.id || '');
  }, [channels, selectedChannel]);

  useEffect(() => {
    setChannelPages((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const category of CHANNEL_CATEGORIES) {
        const clamped = clampPage(next?.[category] || 0, categoryPaging?.[category]?.pageCount || 1);
        if (clamped !== (next?.[category] || 0)) {
          next[category] = clamped;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [categoryPaging]);

  useEffect(() => setMessagePage((prev) => clampPage(prev, messagesPaged.pageCount)), [messagesPaged.pageCount]);
  useEffect(() => setMentionsPage((prev) => clampPage(prev, mentionsPaged.pageCount)), [mentionsPaged.pageCount]);
  useEffect(() => setThreadPage((prev) => clampPage(prev, threadsPaged.pageCount)), [threadsPaged.pageCount]);
  useEffect(() => setPinsPage((prev) => clampPage(prev, pinsPaged.pageCount)), [pinsPaged.pageCount]);
  useEffect(() => setSearchPage((prev) => clampPage(prev, searchPaged.pageCount)), [searchPaged.pageCount]);
  useEffect(() => setOrdersPage((prev) => clampPage(prev, orders.pageCount)), [orders.pageCount]);
  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(''), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const acknowledge = useCallback((channelId = selectedChannel) => {
    if (!channelId) return;
    const channel = channels.find((entry) => entry.id === channelId);
    const pending = Number(channel?.unread || 0);
    if (pending <= 0) {
      setFeedback(`${channel?.name || channelId} already clear.`);
      return;
    }
    setAckUnreadByChannel((prev) => ({ ...prev, [channelId]: Number(prev?.[channelId] || 0) + pending }));
    setFeedback(`${channel?.name || channelId} reviewed.`);
  }, [channels, selectedChannel]);

  const issueOrder = useCallback(({ channelId, directive, eventType, detail = '' }) => {
    if (!channelId) return;
    const dispatch = createOrderDispatch({ channelId, laneId: `lane:${channelId}`, directive, eventType, nowMs: Date.now() });
    setDispatches((prev) => appendOrderDispatch(prev, dispatch, MAX_DISPATCH_HISTORY));
    setOrdersPage(0);
    onIssueCommsOrder?.(eventType, {
      channelId,
      dispatchId: dispatch.dispatchId,
      directive,
      detail,
      source: 'text-comms-rail-v2',
      variantId,
      eventId: opId || undefined,
      priority: composerPriority,
    });
    setFeedback(`${directive.replace(/_/g, ' ')} queued on ${channelId}.`);
  }, [onIssueCommsOrder, variantId, opId, composerPriority]);

  const sendMessage = useCallback(() => {
    const text = t(messageInput);
    if (!text || !selectedChannel) return;
    const nowMs = Date.now();
    setLocalMessagesByChannel((prev) => ({
      ...prev,
      [selectedChannel]: [{
        id: `local:${nowMs}`,
        text,
        author: actorId || 'You',
        source: 'local',
        createdAtMs: nowMs,
        timestamp: new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        threadCount: 0,
      }, ...(prev?.[selectedChannel] || [])].slice(0, 48),
    }));
    issueOrder({ channelId: selectedChannel, directive: 'TEXT_BROADCAST', eventType: 'SELF_CHECK', detail: text });
    setMessageInput('');
    setMessagePage(0);
  }, [messageInput, selectedChannel, actorId, issueOrder]);

  const openThread = useCallback((messageId) => {
    if (!messageId) return;
    setActiveThreadMessageId(messageId);
    setThreadsByMessageId((prev) => Array.isArray(prev?.[messageId]) ? prev : { ...prev, [messageId]: [] });
  }, []);

  const sendThreadReply = useCallback(() => {
    const text = t(threadReplyInput);
    if (!text || !activeThreadMessageId || !selectedChannel) return;
    const nowMs = Date.now();
    const reply = {
      id: `reply:${nowMs}`,
      text,
      author: actorId || 'You',
      createdAtMs: nowMs,
      timestamp: new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setThreadsByMessageId((prev) => ({ ...prev, [activeThreadMessageId]: [...(prev?.[activeThreadMessageId] || []), reply].slice(-48) }));
    setLocalMessagesByChannel((prev) => {
      const messages = Array.isArray(prev?.[selectedChannel]) ? prev[selectedChannel] : [];
      return {
        ...prev,
        [selectedChannel]: messages.map((entry) => entry.id === activeThreadMessageId ? { ...entry, threadCount: Number(entry.threadCount || 0) + 1 } : entry),
      };
    });
    issueOrder({ channelId: selectedChannel, directive: 'THREAD_REPLY', eventType: 'WILCO', detail: text });
    setThreadReplyInput('');
  }, [threadReplyInput, activeThreadMessageId, selectedChannel, actorId, issueOrder]);

  const togglePin = useCallback((messageId) => {
    if (!selectedChannel || !messageId) return;
    setPinnedMessageIdsByChannel((prev) => {
      const current = Array.isArray(prev?.[selectedChannel]) ? prev[selectedChannel] : [];
      const next = current.includes(messageId) ? current.filter((id) => id !== messageId) : [messageId, ...current].slice(0, 24);
      return { ...prev, [selectedChannel]: next };
    });
    setFeedback('Pinboard updated.');
  }, [selectedChannel]);

  const openRadialAt = useCallback((clientX, clientY, kind, channelId, messageId = '') => {
    const bounds = rootRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = ((clientX - bounds.left) / bounds.width) * 100;
    const y = ((clientY - bounds.top) / bounds.height) * 100;
    setRadial({
      open: true,
      anchor: { x: Math.max(8, Math.min(92, x)), y: Math.max(10, Math.min(90, y)) },
      kind,
      channelId,
      messageId,
    });
  }, []);

  const openRadialKeyboard = useCallback((event, kind, channelId, messageId = '') => {
    if (!(event.currentTarget instanceof HTMLElement)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    openRadialAt(rect.left + rect.width / 2, rect.top + rect.height / 2, kind, channelId, messageId);
  }, [openRadialAt]);

  const radialItems = useMemo(() => {
    if (!radial.open) return [];
    const channelId = radial.channelId || selectedChannel;
    if (!channelId) return [];
    if (radial.kind === 'message') {
      return [
        { id: 'ack', label: 'Ack Message', icon: 'ack', shortcut: '1', onSelect: () => { issueOrder({ channelId, directive: 'ACK_MESSAGE', eventType: 'ROGER' }); setRadial((prev) => ({ ...prev, open: false })); } },
        { id: 'escalate', label: 'Escalate', icon: 'danger', tone: 'warning', shortcut: '2', onSelect: () => { issueOrder({ channelId, directive: 'ESCALATE_TRAFFIC', eventType: 'MOVE_OUT' }); setRadial((prev) => ({ ...prev, open: false })); } },
        { id: 'thread', label: 'Open Thread', icon: 'message', shortcut: '3', onSelect: () => { openThread(radial.messageId); setRadial((prev) => ({ ...prev, open: false })); } },
        { id: 'pin', label: 'Pin Toggle', icon: 'objective', shortcut: '4', onSelect: () => { togglePin(radial.messageId); setRadial((prev) => ({ ...prev, open: false })); } },
      ];
    }
    return [
      { id: 'checkin', label: 'Check In', icon: 'broadcast', shortcut: '1', onSelect: () => { issueOrder({ channelId, directive: 'CHECK_IN_REQUEST', eventType: 'SELF_CHECK' }); setRadial((prev) => ({ ...prev, open: false })); } },
      { id: 'hold', label: 'Hold Lane', icon: 'hold', tone: 'warning', shortcut: '2', onSelect: () => { issueOrder({ channelId, directive: 'HOLD_CHANNEL', eventType: 'HOLD' }); setRadial((prev) => ({ ...prev, open: false })); } },
      { id: 'clear', label: 'Clear Net', icon: 'clear', tone: 'danger', shortcut: '3', onSelect: () => { issueOrder({ channelId, directive: 'CLEAR_NON_ESSENTIAL', eventType: 'CLEAR_COMMS' }); setRadial((prev) => ({ ...prev, open: false })); } },
      { id: 'voice', label: 'Route Voice', icon: 'route', shortcut: '4', onSelect: () => { onRouteVoiceNet?.(channelId); setFeedback(`Voice route requested for ${channelId}.`); setRadial((prev) => ({ ...prev, open: false })); } },
    ];
  }, [radial, selectedChannel, issueOrder, openThread, togglePin, onRouteVoiceNet]);

  const drawerRows = drawerView === 'mentions' ? mentionsInbox : drawerView === 'threads' ? threads : drawerView === 'pins' ? pins : drawerView === 'search' ? searchHits : [];

  if (!isExpanded) {
    return (
      <div className="h-full min-h-0 flex items-center justify-center">
        <button type="button" onClick={onToggleExpand} className="text-zinc-500 hover:text-orange-500 transition-colors" title="Expand text comms rail">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} data-text-comms-rail="true" className="relative h-full min-h-0 flex flex-col gap-1.5 bg-black/95 border-r border-zinc-700/40 overflow-hidden">
      <section className="rounded border border-zinc-800 bg-zinc-900/45 px-2.5 py-2 grid grid-cols-2 gap-1.5">
        <div className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1"><div className="text-[8px] uppercase tracking-wide text-zinc-500">Link</div><div className="text-[10px] text-zinc-200 uppercase tracking-wide">{online ? 'ONLINE' : 'OFFLINE'}</div></div>
        <div className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1"><div className="text-[8px] uppercase tracking-wide text-zinc-500">Voice</div><div className="text-[10px] text-zinc-200 uppercase tracking-wide truncate">{voiceStateLabel}</div></div>
        <div className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1"><div className="text-[8px] uppercase tracking-wide text-zinc-500">Unread</div><div className="text-[10px] text-zinc-200 uppercase tracking-wide">{totalUnread}</div></div>
        <div className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1"><div className="text-[8px] uppercase tracking-wide text-zinc-500">Orders</div><div className="text-[10px] text-zinc-200 uppercase tracking-wide">Q{orders.stats.queued} / A{orders.stats.acked}</div></div>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-1.5 space-y-1">
        {CHANNEL_CATEGORIES.map((category) => {
          const paged = categoryPaging?.[category];
          const catUnread = (channelGroups?.[category] || []).reduce((sum, entry) => sum + Number(entry.unread || 0), 0);
          return (
            <div key={category} className="rounded border border-zinc-800 bg-zinc-950/45 px-1.5 py-1">
              <div className="flex items-center justify-between gap-2"><span className="text-[9px] uppercase tracking-wide text-zinc-500">{CATEGORY_LABELS[category]}</span><span className="text-[9px] text-zinc-500">{catUnread > 0 ? `${catUnread} unread` : 'clear'}</span></div>
              <div className="mt-1 space-y-0.5">
                {paged.visible.map((channel) => {
                  const selected = selectedChannel === channel.id;
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      className={`w-full flex items-center justify-between gap-1.5 rounded border px-1.5 py-1 text-left ${selected ? 'border-orange-500/40 bg-orange-500/12 text-orange-200' : 'border-zinc-800 bg-zinc-950/55 text-zinc-300'}`}
                      onClick={() => setSelectedChannel(channel.id)}
                      onContextMenu={(event) => { event.preventDefault(); openRadialAt(event.clientX, event.clientY, 'channel', channel.id); }}
                      onKeyDown={(event) => { if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) { event.preventDefault(); openRadialKeyboard(event, 'channel', channel.id); } }}
                    >
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <ChannelGlyph category={channel.category} />
                        <span className="text-[10px] truncate">{channel.name}</span>
                        {channelVoiceMap?.[channel.id] ? <NexusTokenIcon family="circle" color="orange" size="sm" alt="Voice linked" /> : null}
                      </span>
                      <UnreadIndicator unread={channel.unread} tone={channel.unread >= 5 ? 'danger' : 'warning'} />
                    </button>
                  );
                })}
              </div>
              {paged.pageCount > 1 ? (
                <div className="mt-1 flex items-center justify-between gap-1 text-[8px] uppercase tracking-[0.14em] text-zinc-500">
                  <NexusButton
                    size="sm"
                    intent="subtle"
                    className="text-[8px] px-1.5 py-0.5"
                    disabled={paged.page <= 0}
                    onClick={() => setChannelPages((prev) => ({ ...prev, [category]: Math.max(0, (prev?.[category] || 0) - 1) }))}
                  >
                    Prev
                  </NexusButton>
                  <span>{paged.page + 1}/{paged.pageCount}</span>
                  <NexusButton
                    size="sm"
                    intent="subtle"
                    className="text-[8px] px-1.5 py-0.5"
                    disabled={paged.page >= paged.pageCount - 1}
                    onClick={() => setChannelPages((prev) => ({ ...prev, [category]: Math.min(paged.pageCount - 1, (prev?.[category] || 0) + 1) }))}
                  >
                    Next
                  </NexusButton>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-1.5 space-y-1">
        <div className="flex items-center justify-between gap-1.5"><div className="min-w-0"><div className="text-[9px] uppercase tracking-wide text-zinc-500">Channel</div><div className="text-[10px] text-zinc-200 uppercase tracking-wide truncate">{selectedChannelData?.name || 'None'}</div></div><div className="inline-flex items-center gap-1">{PRIORITY_LEVELS.map((priority) => <NexusButton key={priority} size="sm" intent={composerPriority === priority ? 'primary' : 'subtle'} className="text-[8px] px-1.5" onClick={() => setComposerPriority(priority)}>{priority === 'STANDARD' ? 'STD' : priority}</NexusButton>)}</div></div>
        <div className="flex items-center gap-1 flex-wrap"><NexusButton size="sm" intent="subtle" className="text-[8px]" onClick={() => acknowledge(selectedChannel)}>Ack</NexusButton><NexusButton size="sm" intent="subtle" className="text-[8px]" disabled={!selectedChannel} onClick={() => issueOrder({ channelId: selectedChannel, directive: 'CHECK_IN_REQUEST', eventType: 'SELF_CHECK' })}>Check-In</NexusButton><NexusButton size="sm" intent="subtle" className="text-[8px]" disabled={!selectedChannel} onClick={() => { if (!selectedChannel) return; onRouteVoiceNet?.(selectedChannel); setFeedback(`Voice route requested for ${selectedChannel}.`); }}>Voice</NexusButton><NexusBadge tone={selectedVoiceNetId ? 'ok' : 'warning'}>{selectedVoiceNetId ? 'Mapped' : 'Unmapped'}</NexusBadge></div>
        <div className="flex items-center gap-1">{MESSAGE_FILTERS.map((id) => <NexusButton key={id} size="sm" intent={messageFilter === id ? 'primary' : 'subtle'} className="text-[8px]" onClick={() => setMessageFilter(id)}>{id}</NexusButton>)}</div>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-1.5 space-y-1">
        <div className="flex items-center justify-between gap-1"><span className="text-[9px] uppercase tracking-wide text-zinc-500">Messages</span><span className="text-[9px] text-zinc-500">{messagesPaged.page + 1}/{messagesPaged.pageCount}</span></div>
        <div className="space-y-1">
          {messagesPaged.visible.length > 0 ? messagesPaged.visible.map((message) => (
            <div key={message.id} className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1" onContextMenu={(event) => { event.preventDefault(); openRadialAt(event.clientX, event.clientY, 'message', selectedChannel, message.id); }} onKeyDown={(event) => { if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) { event.preventDefault(); openRadialKeyboard(event, 'message', selectedChannel, message.id); } }} tabIndex={0}>
              <div className="flex items-center justify-between gap-1"><span className="text-[9px] text-zinc-300 truncate">{message.author}</span><span className="text-[8px] text-zinc-500">{message.timestamp}</span></div>
              <div className="text-[10px] text-zinc-200 truncate">{message.text}</div>
              <div className="mt-0.5 flex items-center gap-1"><NexusButton size="sm" intent="subtle" className="text-[8px]" onClick={() => openThread(message.id)}><CornerDownRight className="w-3 h-3" />Thread</NexusButton><NexusButton size="sm" intent="subtle" className="text-[8px]" onClick={() => togglePin(message.id)}><Pin className="w-3 h-3" />Pin</NexusButton></div>
            </div>
          )) : <div className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[10px] text-zinc-500">No messages in current filter.</div>}
        </div>
      </section>

      {activeThreadMessageId ? <section className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-1.5 space-y-1"><div className="flex items-center justify-between gap-1"><span className="text-[9px] uppercase tracking-wide text-zinc-500">Thread Reply</span><NexusButton size="sm" intent="subtle" className="text-[8px]" onClick={() => setActiveThreadMessageId('')}>Close</NexusButton></div><div className="space-y-0.5">{activeThreadReplies.slice(-5).map((reply) => <div key={reply.id} className="rounded border border-zinc-800 bg-zinc-950/60 px-1.5 py-0.5 text-[9px] text-zinc-300 truncate">{reply.author}: {reply.text}</div>)}{activeThreadReplies.length === 0 ? <div className="rounded border border-zinc-800 bg-zinc-950/60 px-1.5 py-0.5 text-[9px] text-zinc-500">No replies yet.</div> : null}</div><div className="flex items-center gap-1"><input value={threadReplyInput} onChange={(event) => setThreadReplyInput(event.target.value)} onKeyDown={(event) => { if (event.key !== 'Enter') return; event.preventDefault(); sendThreadReply(); }} className="flex-1 min-w-0 rounded border border-zinc-800 bg-zinc-950/80 px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-zinc-600" placeholder="Reply to thread..." /><NexusButton size="sm" intent="primary" className="text-[8px]" disabled={!t(threadReplyInput)} onClick={sendThreadReply}>Reply</NexusButton></div></section> : null}

      <section className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-1.5 space-y-1"><div className="flex items-center gap-1"><input value={messageInput} onChange={(event) => setMessageInput(event.target.value)} onKeyDown={(event) => { if (event.key !== 'Enter') return; event.preventDefault(); sendMessage(); }} className="flex-1 min-w-0 rounded border border-zinc-800 bg-zinc-950/80 px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-zinc-600" placeholder="Transmit text update..." /><NexusButton size="sm" intent="primary" className="text-[8px]" disabled={!t(messageInput)} onClick={sendMessage}><Send className="w-3 h-3" />Send</NexusButton></div></section>

      <section className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-1.5 space-y-1">
        <div className="flex items-center justify-between gap-1"><div className="flex items-center gap-1 flex-wrap"><NexusButton size="sm" intent={activeQuickView === 'mentions' ? 'primary' : 'subtle'} className="text-[8px]" onClick={() => setActiveQuickView('mentions')}><BellRing className="w-3 h-3" />Mentions</NexusButton><NexusButton size="sm" intent={activeQuickView === 'threads' ? 'primary' : 'subtle'} className="text-[8px]" onClick={() => setActiveQuickView('threads')}><MessageSquare className="w-3 h-3" />Threads</NexusButton><NexusButton size="sm" intent={activeQuickView === 'pins' ? 'primary' : 'subtle'} className="text-[8px]" onClick={() => setActiveQuickView('pins')}><Pin className="w-3 h-3" />Pins</NexusButton><NexusButton size="sm" intent={activeQuickView === 'search' ? 'primary' : 'subtle'} className="text-[8px]" onClick={() => setActiveQuickView('search')}><Search className="w-3 h-3" />Search</NexusButton></div><NexusButton size="sm" intent="subtle" className="text-[8px]" onClick={() => { setDrawerView(activeQuickView); onOpenExpandedComms?.(activeQuickView); }}>Expand</NexusButton></div>
        {activeQuickView === 'search' ? <div className="flex items-center gap-1"><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="flex-1 min-w-0 rounded border border-zinc-800 bg-zinc-950/80 px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-zinc-600" placeholder="Search channel text..." /></div> : null}
        <div className="space-y-0.5">{activeQuick.rows.length > 0 ? activeQuick.rows.map((entry) => <div key={`${activeQuickView}:${entry.messageId || entry.id}`} className="rounded border border-zinc-800 bg-zinc-950/60 px-1.5 py-1 text-[9px] text-zinc-300 truncate">{activeQuickView === 'threads' ? `${entry.parentAuthor}: ${entry.parentText}` : `${entry.author}: ${entry.text}`}</div>) : <div className="rounded border border-zinc-800 bg-zinc-950/60 px-1.5 py-1 text-[9px] text-zinc-500">{featureFlags?.progressiveParity ? 'No items in this view for current runtime scope.' : 'Unavailable in current runtime mode.'}</div>}</div>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/35 px-2 py-1.5 space-y-1"><div className="flex items-center justify-between gap-1"><span className="text-[9px] uppercase tracking-wide text-zinc-500">Orders Feed</span><span className="text-[9px] text-zinc-500">{ordersPage + 1}/{orders.pageCount}</span></div><div className="flex items-center gap-1 flex-wrap"><NexusBadge tone={orders.stats.queued > 0 ? 'warning' : 'neutral'}>Queued {orders.stats.queued}</NexusBadge><NexusBadge tone={orders.stats.persisted > 0 ? 'active' : 'neutral'}>Persisted {orders.stats.persisted}</NexusBadge><NexusBadge tone={orders.stats.acked > 0 ? 'ok' : 'neutral'}>Acked {orders.stats.acked}</NexusBadge></div><div className="space-y-0.5">{orders.visible.length > 0 ? orders.visible.map((entry) => <div key={entry.dispatchId} className="rounded border border-zinc-800 bg-zinc-950/60 px-1.5 py-1"><div className="flex items-center justify-between gap-1"><span className="text-[9px] text-zinc-200 uppercase tracking-wide truncate">{entry.directive}</span><NexusBadge tone={deliveryTone(entry.status)}>{entry.status}</NexusBadge></div><div className="text-[9px] text-zinc-500 truncate">{entry.channelId} · {age(entry.issuedAtMs)} ago</div></div>) : <div className="rounded border border-zinc-800 bg-zinc-950/60 px-1.5 py-1 text-[9px] text-zinc-500">No dispatched orders yet.</div>}</div></section>

      {feedback ? <div className="px-2 py-1 text-[9px] text-orange-300 truncate">{feedback}</div> : null}
      <div className="flex-shrink-0 flex items-center justify-between gap-1 px-2 pb-1"><span className="text-[8px] text-zinc-500 uppercase tracking-wide">{activeAppId || focusMode || 'comms'} • v2</span><button type="button" onClick={onToggleExpand} className="text-zinc-500 hover:text-orange-500 transition-colors" title="Collapse rail"><ChevronLeft className="w-4 h-4" /></button></div>

      <RadialMenu open={radial.open} title={radial.kind === 'message' ? 'Message Action' : 'Channel Action'} anchor={radial.anchor} items={radialItems} onClose={() => setRadial((prev) => ({ ...prev, open: false }))} />
      <TextCommsExpandDrawer open={Boolean(drawerView)} title={`${t(drawerView, 'view').toUpperCase()} EXPANDED`} subtitle="Deep detail view" count={drawerRows.length} onClose={() => setDrawerView('')}>
        {drawerRows.length > 0 ? drawerRows.map((entry) => <div key={`drawer:${entry.id || entry.messageId}`} className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1.5"><div className="text-[10px] text-zinc-200 truncate">{t(entry.text || entry.parentText, 'No content.')}</div><div className="mt-0.5 text-[9px] text-zinc-500 uppercase tracking-wide">{t(entry.author || entry.parentAuthor || entry.channelId, 'runtime')}</div></div>) : <div className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1.5 text-[10px] text-zinc-500">No records available for expanded view.</div>}
      </TextCommsExpandDrawer>
    </div>
  );
}