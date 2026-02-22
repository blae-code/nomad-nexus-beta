import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  AlertCircle,
  AtSign,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Hash,
  MessageSquare,
  Send,
  Settings,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { NexusBadge } from '../primitives';
import { generateResponseSuggestions, queueMessageAnalysis, smartSearch } from '../../services/commsAIService';
import RadialMenu from '../map/RadialMenu';

const CHANNEL_PAGE_SIZE = 6;
const MESSAGE_PAGE_SIZE = 6;
const STANDARD_CHANNEL_PAGE_SIZE = 7;
const TOPOLOGY_NODE_LIMIT = 9;
const ORDER_PAGE_SIZE = 5;
const CHANNEL_CATEGORIES = ['tactical', 'operations', 'social', 'direct'];
const MESSAGE_FILTERS = ['all', 'event', 'local'];

function clampPct(value) {
  return Math.max(3, Math.min(97, value));
}

/**
 * CommsHub — streamlined comms surface with Standard and Command modes.
 */
export default function CommsHub({
  operations = [],
  focusOperationId,
  activeAppId,
  online,
  bridgeId,
  actorId = '',
  eventMessagesByChannel = {},
  unreadByChannel = {},
  channelVoiceMap = {},
  voiceState = null,
  onRouteVoiceNet,
  onIssueCommsOrder,
  focusMode = '',
  isExpanded = true,
  onToggleExpand,
}) {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({
    tactical: true,
    operations: true,
    social: false,
    direct: false,
  });
  const [channelPages, setChannelPages] = useState({
    tactical: 0,
    operations: 0,
    social: 0,
    direct: 0,
  });
  const [messagePage, setMessagePage] = useState(0);
  const [standardChannelPage, setStandardChannelPage] = useState(0);
  const [messageInput, setMessageInput] = useState('');
  const [panelFeedback, setPanelFeedback] = useState('');
  const [messageFilter, setMessageFilter] = useState('all');
  const [acknowledgedUnreadByChannel, setAcknowledgedUnreadByChannel] = useState({});

  const [displayMode, setDisplayMode] = useState('standard');
  const [showAiFeatures, setShowAiFeatures] = useState(false);
  const [messageAnalyses, setMessageAnalyses] = useState({});
  const [aiSearchActive, setAiSearchActive] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState(null);
  const [responseSuggestions, setResponseSuggestions] = useState([]);
  const [selectedMessageForResponse, setSelectedMessageForResponse] = useState(null);
  const [commandSurfaceTab, setCommandSurfaceTab] = useState('topology');
  const [topologyPositionById, setTopologyPositionById] = useState({});
  const [topologyBridgeLinks, setTopologyBridgeLinks] = useState([]);
  const [selectedTopologyNodeId, setSelectedTopologyNodeId] = useState('');
  const [bridgeSourceNodeId, setBridgeSourceNodeId] = useState('');
  const [restrictedChannelById, setRestrictedChannelById] = useState({});
  const [radialOpen, setRadialOpen] = useState(false);
  const [radialAnchor, setRadialAnchor] = useState({ x: 50, y: 50 });
  const [orderFeed, setOrderFeed] = useState([]);
  const [orderPage, setOrderPage] = useState(0);
  const topologyRef = useRef(null);
  const dragRef = useRef(null);

  const aiEnabled = showAiFeatures;
  const isCommsFocus = String(focusMode || '').toLowerCase() === 'comms';
  const selectedVoiceNetId = selectedChannel ? channelVoiceMap[selectedChannel] : '';

  const channels = useMemo(() => {
    const unreadCount = (channelId, fallback = 0) => {
      const direct = Number(unreadByChannel[channelId]);
      const baseCount = Number.isFinite(direct) && direct >= 0 ? direct : fallback;
      const acknowledgedCount = Number(acknowledgedUnreadByChannel[channelId] || 0);
      return Math.max(0, baseCount - acknowledgedCount);
    };

    const tactical = [
      { id: 'command', name: 'Command Net', icon: Hash, category: 'tactical', unread: unreadCount('command', 0) },
      { id: 'alpha-squad', name: 'Alpha Squad', icon: Hash, category: 'tactical', unread: unreadCount('alpha-squad', 0) },
      { id: 'logistics', name: 'Logistics', icon: Hash, category: 'tactical', unread: unreadCount('logistics', 0) },
    ];

    const operational = operations.slice(0, 12).map((op) => ({
      id: `op-${op.id}`,
      name: op.name || 'Unnamed Op',
      icon: Hash,
      category: 'operations',
      unread: unreadCount(`op-${op.id}`, focusOperationId && focusOperationId === op.id ? 1 : 0),
    }));

    const social = [
      { id: 'general', name: 'General', icon: Hash, category: 'social', unread: unreadCount('general', 0) },
      { id: 'random', name: 'Random', icon: Hash, category: 'social', unread: unreadCount('random', 0) },
    ];

    const direct = [
      { id: 'dm-command', name: 'Command Officer', icon: AtSign, category: 'direct', unread: unreadCount('dm-command', online ? 1 : 0) },
      { id: 'dm-ops', name: `${bridgeId} Ops Desk`, icon: AtSign, category: 'direct', unread: unreadCount('dm-ops', 0) },
    ];

    return { tactical, operations: operational, social, direct };
  }, [operations, focusOperationId, online, bridgeId, unreadByChannel, acknowledgedUnreadByChannel]);

  const allChannels = useMemo(() => Object.values(channels).flat(), [channels]);

  const standardChannels = useMemo(() => {
    const selected = allChannels.find((entry) => entry.id === selectedChannel);
    const unreadPriority = allChannels.filter((entry) => entry.unread > 0 && entry.id !== selectedChannel);
    const tacticalPriority = allChannels.filter((entry) => entry.category === 'tactical' && entry.unread === 0 && entry.id !== selectedChannel);
    const operationPriority = allChannels.filter((entry) => entry.category === 'operations' && entry.unread === 0 && entry.id !== selectedChannel);
    const tail = allChannels.filter(
      (entry) =>
        entry.id !== selectedChannel &&
        !unreadPriority.some((target) => target.id === entry.id) &&
        !tacticalPriority.some((target) => target.id === entry.id) &&
        !operationPriority.some((target) => target.id === entry.id)
    );

    return [selected, ...unreadPriority, ...tacticalPriority, ...operationPriority, ...tail].filter(Boolean).slice(0, 28);
  }, [allChannels, selectedChannel]);

  const standardChannelPageCount = Math.max(1, Math.ceil(standardChannels.length / STANDARD_CHANNEL_PAGE_SIZE));
  const standardVisibleChannels = useMemo(
    () => standardChannels.slice(
      standardChannelPage * STANDARD_CHANNEL_PAGE_SIZE,
      standardChannelPage * STANDARD_CHANNEL_PAGE_SIZE + STANDARD_CHANNEL_PAGE_SIZE
    ),
    [standardChannels, standardChannelPage]
  );

  const categoryPageCounts = useMemo(() => {
    return CHANNEL_CATEGORIES.reduce((acc, category) => {
      const items = channels[category] || [];
      acc[category] = Math.max(1, Math.ceil(items.length / CHANNEL_PAGE_SIZE));
      return acc;
    }, {});
  }, [channels]);

  useEffect(() => {
    setChannelPages((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const category of CHANNEL_CATEGORIES) {
        const maxIndex = Math.max(0, (categoryPageCounts[category] || 1) - 1);
        if ((next[category] || 0) > maxIndex) {
          next[category] = maxIndex;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [categoryPageCounts]);

  useEffect(() => {
    if (selectedChannel) return;
    const fallback = channels.tactical?.[0]?.id || channels.operations?.[0]?.id || channels.social?.[0]?.id || channels.direct?.[0]?.id || null;
    if (fallback) setSelectedChannel(fallback);
  }, [selectedChannel, channels]);

  useEffect(() => {
    setStandardChannelPage((current) => Math.min(current, standardChannelPageCount - 1));
  }, [standardChannelPageCount]);

  const currentMessages = useMemo(() => {
    if (!selectedChannel) return [];
    const runtimeFeed = Array.isArray(eventMessagesByChannel[selectedChannel]) ? eventMessagesByChannel[selectedChannel] : [];
    const localFeed = Array.isArray(messages[selectedChannel]) ? messages[selectedChannel] : [];
    return [...runtimeFeed, ...localFeed]
      .sort((a, b) => Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0))
      .slice(0, 48);
  }, [selectedChannel, eventMessagesByChannel, messages]);

  const orderedMessages = useMemo(() => {
    if (messageFilter === 'all') return currentMessages;
    return currentMessages.filter((message) => message.source === messageFilter);
  }, [currentMessages, messageFilter]);
  const messagePageCount = Math.max(1, Math.ceil(orderedMessages.length / MESSAGE_PAGE_SIZE));
  const pagedMessages = useMemo(
    () => orderedMessages.slice(messagePage * MESSAGE_PAGE_SIZE, messagePage * MESSAGE_PAGE_SIZE + MESSAGE_PAGE_SIZE),
    [orderedMessages, messagePage]
  );

  useEffect(() => {
    setMessagePage((prev) => Math.min(prev, messagePageCount - 1));
  }, [messagePageCount]);

  useEffect(() => {
    setMessagePage(0);
    setAiSearchResults(null);
    setResponseSuggestions([]);
    setSelectedMessageForResponse(null);
  }, [selectedChannel]);

  const selectedChannelData = useMemo(
    () => allChannels.find((entry) => entry.id === selectedChannel),
    [allChannels, selectedChannel]
  );
  const totalUnread = useMemo(
    () => allChannels.reduce((sum, channel) => sum + Number(channel.unread || 0), 0),
    [allChannels]
  );
  const channelsWithUnread = useMemo(
    () => allChannels.filter((channel) => Number(channel.unread || 0) > 0),
    [allChannels]
  );
  const priorityChannels = useMemo(
    () =>
      [...channelsWithUnread]
        .sort((a, b) => Number(b.unread || 0) - Number(a.unread || 0))
        .slice(0, 3),
    [channelsWithUnread]
  );
  const topologyChannels = useMemo(() => {
    const selected = allChannels.find((entry) => entry.id === selectedChannel);
    const remaining = allChannels.filter((entry) => entry.id !== selectedChannel);
    return [selected, ...remaining].filter(Boolean).slice(0, TOPOLOGY_NODE_LIMIT);
  }, [allChannels, selectedChannel]);
  const topologyNodes = useMemo(() => {
    const count = topologyChannels.length;
    const radius = count > 6 ? 34 : 30;
    return topologyChannels.map((channel, index) => {
      const angle = (index / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
      const fallbackX = 50 + Math.cos(angle) * radius;
      const fallbackY = 50 + Math.sin(angle) * radius;
      const override = topologyPositionById[channel.id];
      return {
        id: channel.id,
        label: channel.name,
        unread: Number(channel.unread || 0),
        category: channel.category,
        x: override ? override.x : fallbackX,
        y: override ? override.y : fallbackY,
      };
    });
  }, [topologyChannels, topologyPositionById]);
  const topologyNodeById = useMemo(
    () => topologyNodes.reduce((acc, node) => ({ ...acc, [node.id]: node }), {}),
    [topologyNodes]
  );
  const bridgeChannelSet = useMemo(() => {
    const result = new Set();
    for (const entry of topologyBridgeLinks) {
      result.add(entry.fromId);
      result.add(entry.toId);
    }
    return result;
  }, [topologyBridgeLinks]);
  const topologyLinks = useMemo(() => {
    const links = [];
    const commandNode = topologyNodes.find((node) => node.id === 'command');
    if (commandNode) {
      const adjacent = topologyNodes
        .filter((node) => node.id !== commandNode.id)
        .slice(0, 5);
      for (const node of adjacent) {
        links.push({
          id: `base:${commandNode.id}:${node.id}`,
          fromId: commandNode.id,
          toId: node.id,
          kind: 'base',
        });
      }
    }
    for (const entry of topologyBridgeLinks) {
      links.push({
        id: entry.id,
        fromId: entry.fromId,
        toId: entry.toId,
        kind: 'bridge',
      });
    }
    return links;
  }, [topologyNodes, topologyBridgeLinks]);
  const selectedTopologyNode = useMemo(
    () => topologyNodes.find((node) => node.id === selectedTopologyNodeId) || null,
    [topologyNodes, selectedTopologyNodeId]
  );
  const orderPageCount = Math.max(1, Math.ceil(orderFeed.length / ORDER_PAGE_SIZE));
  const pagedOrders = useMemo(
    () => orderFeed.slice(orderPage * ORDER_PAGE_SIZE, orderPage * ORDER_PAGE_SIZE + ORDER_PAGE_SIZE),
    [orderFeed, orderPage]
  );
  const channelStatusById = useMemo(() => {
    const result = {};
    allChannels.forEach((channel) => {
      result[channel.id] = {
        bridged: bridgeChannelSet.has(channel.id),
        restricted: Boolean(restrictedChannelById[channel.id]),
      };
    });
    return result;
  }, [allChannels, bridgeChannelSet, restrictedChannelById]);
  const selectedChannelUnread = Number(selectedChannelData?.unread || 0);
  const commandIntent = useMemo(() => {
    if (!online) {
      return {
        tone: 'danger',
        label: 'Link Degraded',
        detail: 'Prepare contingency text burst when transport returns.',
        actionLabel: 'Prime Contingency',
        action: 'prime-contingency',
      };
    }
    if (selectedChannelUnread >= 3) {
      return {
        tone: 'warning',
        label: 'Unread Surge',
        detail: `${selectedChannelUnread} pending in ${selectedChannelData?.name || 'active channel'}.`,
        actionLabel: 'Acknowledge Queue',
        action: 'ack-channel',
      };
    }
    if (!selectedVoiceNetId && onRouteVoiceNet) {
      return {
        tone: 'active',
        label: 'Voice Link Missing',
        detail: 'Selected channel is not mapped to a live voice lane.',
        actionLabel: 'Route Voice Lane',
        action: 'route-voice',
      };
    }
    return {
      tone: 'ok',
      label: 'Channel Ready',
      detail: 'Push a short check-in to maintain cadence.',
      actionLabel: 'Prime Check-In',
      action: 'prime-checkin',
    };
  }, [online, selectedChannelUnread, selectedChannelData?.name, selectedVoiceNetId, onRouteVoiceNet]);

  useEffect(() => {
    setDisplayMode((current) => {
      if (isCommsFocus) return current === 'standard' ? 'command' : current;
      if (current === 'command') return 'standard';
      return current;
    });
  }, [isCommsFocus]);

  useEffect(() => {
    if (!topologyNodes.length) {
      setSelectedTopologyNodeId('');
      setBridgeSourceNodeId('');
      setTopologyPositionById({});
      setTopologyBridgeLinks([]);
      return;
    }
    setTopologyPositionById((prev) => {
      const next = {};
      let changed = false;
      topologyNodes.forEach((node) => {
        if (prev[node.id]) {
          next[node.id] = prev[node.id];
          return;
        }
        next[node.id] = { x: node.x, y: node.y };
        changed = true;
      });
      if (Object.keys(next).length !== Object.keys(prev).length) changed = true;
      return changed ? next : prev;
    });
    setTopologyBridgeLinks((prev) => {
      const ids = new Set(topologyNodes.map((node) => node.id));
      const filtered = prev.filter((entry) => ids.has(entry.fromId) && ids.has(entry.toId));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [topologyNodes]);

  useEffect(() => {
    if (!topologyNodes.length) return;
    if (selectedTopologyNodeId && topologyNodes.some((node) => node.id === selectedTopologyNodeId)) return;
    setSelectedTopologyNodeId(topologyNodes[0].id);
  }, [topologyNodes, selectedTopologyNodeId]);

  useEffect(() => {
    if (!panelFeedback) return undefined;
    const timer = window.setTimeout(() => setPanelFeedback(''), 3200);
    return () => window.clearTimeout(timer);
  }, [panelFeedback]);

  useEffect(() => {
    setOrderPage((current) => Math.min(current, orderPageCount - 1));
  }, [orderPageCount]);

  useEffect(() => {
    if (displayMode !== 'command' || commandSurfaceTab !== 'topology') {
      setRadialOpen(false);
    }
  }, [displayMode, commandSurfaceTab]);

  useEffect(() => {
    if (!bridgeSourceNodeId) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setBridgeSourceNodeId('');
      setPanelFeedback('Bridge target mode cleared.');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bridgeSourceNodeId]);

  const toggleCategory = useCallback((category) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  }, []);

  const pageCategory = useCallback((category, direction) => {
    setChannelPages((prev) => {
      const pageCount = categoryPageCounts[category] || 1;
      const current = prev[category] || 0;
      const nextPage = direction === 'next' ? Math.min(pageCount - 1, current + 1) : Math.max(0, current - 1);
      if (nextPage === current) return prev;
      return { ...prev, [category]: nextPage };
    });
  }, [categoryPageCounts]);

  const pickChannel = useCallback((channelId) => {
    setSelectedChannel(channelId);
  }, []);

  const acknowledgeChannel = useCallback((channelId = selectedChannel) => {
    if (!channelId) return;
    const channel = allChannels.find((entry) => entry.id === channelId);
    const pendingCount = Number(channel?.unread || 0);
    if (pendingCount <= 0) {
      setPanelFeedback(`${channel?.name || channelId} already clear.`);
      return;
    }
    setAcknowledgedUnreadByChannel((prev) => ({
      ...prev,
      [channelId]: Number(prev[channelId] || 0) + pendingCount,
    }));
    setPanelFeedback(`${channel?.name || channelId} marked reviewed.`);
  }, [selectedChannel, allChannels]);

  const primeMessage = useCallback((channelId, text, feedback) => {
    if (channelId) setSelectedChannel(channelId);
    setMessageInput(text);
    setPanelFeedback(feedback);
  }, []);

  const executeCommandIntent = useCallback(() => {
    if (!selectedChannel) return;
    if (commandIntent.action === 'route-voice') {
      onRouteVoiceNet?.(selectedChannel);
      setPanelFeedback('Voice lane route requested.');
      return;
    }
    if (commandIntent.action === 'ack-channel') {
      acknowledgeChannel(selectedChannel);
      primeMessage(
        selectedChannel,
        'Command copy. Reviewing backlog now. Stand by for updates.',
        'Acknowledgement draft primed.'
      );
      return;
    }
    if (commandIntent.action === 'prime-contingency') {
      primeMessage(
        selectedChannel,
        'Contingency broadcast: Data link degraded. Maintain radio discipline and await restore signal.',
        'Contingency draft primed.'
      );
      return;
    }
    primeMessage(
      selectedChannel,
      'Status check-in: maintain comms discipline, report anomalies immediately.',
      'Check-in draft primed.'
    );
  }, [selectedChannel, commandIntent.action, onRouteVoiceNet, acknowledgeChannel, primeMessage]);

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedChannel) return;
    const nowMs = Date.now();

    const newMessage = {
      id: Date.now(),
      text: messageInput,
      author: actorId || 'You',
      timestamp: new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMs: nowMs,
      source: 'local',
    };

    setMessages((prev) => ({
      ...prev,
      [selectedChannel]: [...(prev[selectedChannel] || []), newMessage],
    }));
    setMessageInput('');
    setMessagePage(0);

    if (aiEnabled) {
      queueMessageAnalysis(newMessage).then((analysis) => {
        setMessageAnalyses((prev) => ({ ...prev, [newMessage.id]: analysis }));
      });
    }
    setPanelFeedback(`Message sent to ${selectedChannelData?.name || selectedChannel}.`);
  }, [messageInput, selectedChannel, aiEnabled, actorId, selectedChannelData?.name]);

  const handleAiSearch = async (query) => {
    if (!query.trim() || !currentMessages.length) return;
    setAiSearchActive(true);
    try {
      const results = await smartSearch(query, currentMessages);
      setAiSearchResults(results);
    } catch (error) {
      console.error('[CommsHub] AI search failed:', error);
    } finally {
      setAiSearchActive(false);
    }
  };

  const handleGenerateSuggestions = async (message) => {
    setSelectedMessageForResponse(message.id);
    try {
      const suggestions = await generateResponseSuggestions(message, currentMessages);
      setResponseSuggestions(suggestions);
    } catch (error) {
      console.error('[CommsHub] Response suggestions failed:', error);
    }
  };

  const issueTopologyOrder = useCallback((input) => {
    const nowMs = Date.now();
    const channelId = String(input.channelId || '').trim();
    const payload = input.payload && typeof input.payload === 'object' ? input.payload : {};
    const entry = {
      id: `order:${nowMs}:${Math.floor(Math.random() * 1000)}`,
      channelId,
      summary: input.summary || 'Order issued',
      action: input.action || 'COMMAND',
      status: 'SENT',
      createdAtMs: nowMs,
    };
    setOrderFeed((prev) => [entry, ...prev].slice(0, 36));
    setOrderPage(0);
    if (channelId) setSelectedChannel(channelId);
    if (typeof onIssueCommsOrder === 'function') {
      onIssueCommsOrder(input.eventType || 'MOVE_OUT', {
        channelId,
        source: 'comms-hub-topology',
        commandAction: entry.action,
        ...payload,
      });
    }
    setPanelFeedback(entry.summary);
  }, [onIssueCommsOrder]);

  const setNodeFromClientPoint = useCallback((nodeId, clientX, clientY) => {
    const host = topologyRef.current;
    if (!host || !nodeId) return;
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = clampPct(((clientX - rect.left) / rect.width) * 100);
    const y = clampPct(((clientY - rect.top) / rect.height) * 100);
    setTopologyPositionById((prev) => ({
      ...prev,
      [nodeId]: { x, y },
    }));
  }, []);

  const completeBridgeIfArmed = useCallback((targetNodeId) => {
    if (!bridgeSourceNodeId || !targetNodeId || bridgeSourceNodeId === targetNodeId) return false;
    const sourceNode = topologyNodeById[bridgeSourceNodeId];
    const targetNode = topologyNodeById[targetNodeId];
    if (!sourceNode || !targetNode) return false;
    const id = `bridge:${bridgeSourceNodeId}->${targetNodeId}`;
    setTopologyBridgeLinks((prev) => {
      const filtered = prev.filter((entry) => entry.id !== id);
      return [{ id, fromId: bridgeSourceNodeId, toId: targetNodeId, createdAtMs: Date.now() }, ...filtered].slice(0, 24);
    });
    issueTopologyOrder({
      action: 'BRIDGE_NETS',
      channelId: bridgeSourceNodeId,
      eventType: 'MOVE_OUT',
      summary: `Bridge established ${sourceNode.label} -> ${targetNode.label}`,
      payload: {
        sourceChannelId: bridgeSourceNodeId,
        targetChannelId: targetNodeId,
        orderType: 'COMMS_BRIDGE',
      },
    });
    setBridgeSourceNodeId('');
    return true;
  }, [bridgeSourceNodeId, topologyNodeById, issueTopologyOrder]);

  const handleNodePointerDown = useCallback((event, nodeId) => {
    if (event.button !== 0) return;
    dragRef.current = {
      nodeId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    setSelectedTopologyNodeId(nodeId);
    setRadialOpen(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleNodePointerMove = useCallback((event, nodeId) => {
    const drag = dragRef.current;
    if (!drag || drag.nodeId !== nodeId || drag.pointerId !== event.pointerId) return;
    const movedX = Math.abs(event.clientX - drag.startX);
    const movedY = Math.abs(event.clientY - drag.startY);
    if (movedX > 2 || movedY > 2) {
      drag.moved = true;
      setNodeFromClientPoint(nodeId, event.clientX, event.clientY);
    }
  }, [setNodeFromClientPoint]);

  const handleNodePointerUp = useCallback((event, nodeId) => {
    const drag = dragRef.current;
    if (!drag || drag.nodeId !== nodeId || drag.pointerId !== event.pointerId) return;
    if (!drag.moved) {
      if (!completeBridgeIfArmed(nodeId)) {
        setSelectedTopologyNodeId(nodeId);
      }
    }
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, [completeBridgeIfArmed]);

  const handleNodeContextMenu = useCallback((event, nodeId) => {
    event.preventDefault();
    const host = topologyRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const x = clampPct(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPct(((event.clientY - rect.top) / rect.height) * 100);
    setSelectedTopologyNodeId(nodeId);
    setRadialAnchor({ x, y });
    setRadialOpen(true);
  }, []);

  const radialItems = useMemo(() => {
    if (!selectedTopologyNode) return [];
    const channelId = selectedTopologyNode.id;
    const isRestricted = Boolean(restrictedChannelById[channelId]);
    const items = [
      {
        id: 'route-voice',
        label: 'Route Voice',
        icon: 'request-patrol',
        disabled: typeof onRouteVoiceNet !== 'function',
        onSelect: () => {
          onRouteVoiceNet?.(channelId);
          issueTopologyOrder({
            action: 'ROUTE_VOICE',
            channelId,
            eventType: 'SET',
            summary: `Voice lane routed to ${selectedTopologyNode.label}`,
          });
          setRadialOpen(false);
        },
      },
      {
        id: 'restrict',
        label: isRestricted ? 'Clear Restrict' : 'Restrict Net',
        icon: 'challenge',
        tone: isRestricted ? 'standard' : 'warning',
        onSelect: () => {
          setRestrictedChannelById((prev) => ({ ...prev, [channelId]: !prev[channelId] }));
          issueTopologyOrder({
            action: isRestricted ? 'CLEAR_RESTRICT' : 'RESTRICT_NET',
            channelId,
            eventType: 'HOLD',
            summary: isRestricted
              ? `Restriction cleared on ${selectedTopologyNode.label}`
              : `Restriction set on ${selectedTopologyNode.label}`,
          });
          setRadialOpen(false);
        },
      },
      {
        id: 'checkin',
        label: 'Broadcast Check-In',
        icon: 'endorse',
        onSelect: () => {
          primeMessage(channelId, 'Check-in request: report status, lane quality, and blockers.', 'Check-in draft primed.');
          issueTopologyOrder({
            action: 'CHECKIN',
            channelId,
            eventType: 'SELF_CHECK',
            summary: `Check-in broadcast queued for ${selectedTopologyNode.label}`,
          });
          setRadialOpen(false);
        },
      },
      {
        id: 'bridge',
        label: bridgeSourceNodeId === channelId ? 'Cancel Bridge' : 'Bridge Target',
        icon: 'link-op',
        tone: bridgeSourceNodeId === channelId ? 'danger' : 'standard',
        onSelect: () => {
          if (bridgeSourceNodeId === channelId) {
            setBridgeSourceNodeId('');
            setPanelFeedback('Bridge target mode cleared.');
          } else {
            setBridgeSourceNodeId(channelId);
            setPanelFeedback(`Bridge target mode armed from ${selectedTopologyNode.label}. Click destination node.`);
          }
          setRadialOpen(false);
        },
      },
    ];
    if (bridgeSourceNodeId) {
      items.push({
        id: 'abort',
        label: 'Abort Target',
        icon: 'attach-intel',
        tone: 'danger',
        onSelect: () => {
          setBridgeSourceNodeId('');
          setPanelFeedback('Bridge target mode cleared.');
          setRadialOpen(false);
        },
      });
    }
    return items;
  }, [
    selectedTopologyNode,
    restrictedChannelById,
    onRouteVoiceNet,
    issueTopologyOrder,
    primeMessage,
    bridgeSourceNodeId,
  ]);

  const renderCategory = (category, label) => {
    const items = channels[category] || [];
    if (!items.length && category !== 'operations') return null;

    const page = channelPages[category] || 0;
    const pageCount = categoryPageCounts[category] || 1;
    const pagedChannels = items.slice(page * CHANNEL_PAGE_SIZE, page * CHANNEL_PAGE_SIZE + CHANNEL_PAGE_SIZE);

    return (
      <div key={category}>
        <button
          type="button"
          onClick={() => toggleCategory(category)}
          className="w-full flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-200 uppercase tracking-wider transition-colors"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${expandedCategories[category] ? '' : '-rotate-90'}`} />
          {label}
        </button>

        {expandedCategories[category] ? (
          <div className="space-y-1">
            {pagedChannels.length > 0 ? (
              pagedChannels.map((channel) => (
                <ChannelButton
                  key={channel.id}
                  channel={channel}
                  status={channelStatusById[channel.id]}
                  isSelected={selectedChannel === channel.id}
                  onClick={() => pickChannel(channel.id)}
                />
              ))
            ) : (
              <div className="px-2 py-1 text-[10px] text-zinc-600">No channels</div>
            )}

            {pageCount > 1 ? (
              <div className="flex items-center justify-end gap-2 pt-0.5 text-[9px] text-zinc-500">
                <button
                  type="button"
                  onClick={() => pageCategory(category, 'prev')}
                  disabled={page === 0}
                  className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                >
                  Prev
                </button>
                <span>{page + 1}/{pageCount}</span>
                <button
                  type="button"
                  onClick={() => pageCategory(category, 'next')}
                  disabled={page >= pageCount - 1}
                  className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-zinc-950/80 transition-all duration-300 ease-out overflow-hidden ${isExpanded ? 'w-full' : 'w-12'}`}>
      {!isExpanded ? (
        <div className="flex items-center justify-center py-2 border-b border-zinc-700/40">
          <button type="button" onClick={onToggleExpand} className="text-zinc-500 hover:text-orange-500 transition-colors" title="Expand">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex-shrink-0 px-2 py-1.5 border-b border-zinc-700/40 bg-zinc-900/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
              <h3 className="text-[10px] font-bold text-zinc-100 uppercase tracking-wider">Text Comms</h3>
              {totalUnread > 0 ? (
                <div className="px-1.5 py-0.5 rounded-full bg-orange-500/30 text-orange-300 text-[8px] font-bold">
                  {totalUnread}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setDisplayMode((prev) => prev === 'standard' ? 'command' : 'standard')}
                className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border border-zinc-700 text-zinc-400 hover:text-zinc-300"
                title={`Switch to ${displayMode === 'standard' ? 'command' : 'standard'} mode`}
              >
                {displayMode === 'standard' ? 'Std' : 'Cmd'}
              </button>
              <button
                type="button"
                onClick={() => setShowAiFeatures((prev) => !prev)}
                className={`p-0.5 rounded text-zinc-500 hover:text-orange-500 transition-colors ${showAiFeatures ? 'text-orange-400' : ''}`}
                title={showAiFeatures ? 'Hide assistant' : 'Show assistant'}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={onToggleExpand} className="p-0.5 text-zinc-500 hover:text-orange-500 transition-colors" title="Collapse">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-shrink-0 p-2 border-b border-zinc-700/40 bg-zinc-900/20">
            <div className="mb-2 p-2 rounded border border-zinc-800 bg-zinc-900/35 space-y-1.5">
              <div className="grid grid-cols-3 gap-1">
                <div className="rounded border border-zinc-800 px-2 py-1 text-center">
                  <div className="text-[9px] uppercase tracking-wide text-zinc-500">Channels</div>
                  <div className="text-[10px] font-semibold text-zinc-300">{allChannels.length}</div>
                </div>
                <div className="rounded border border-zinc-800 px-2 py-1 text-center">
                  <div className="text-[9px] uppercase tracking-wide text-zinc-500">Unread</div>
                  <div className={`text-[10px] font-semibold ${totalUnread > 0 ? 'text-orange-300' : 'text-zinc-300'}`}>{totalUnread}</div>
                </div>
                <div className="rounded border border-zinc-800 px-2 py-1 text-center">
                  <div className="text-[9px] uppercase tracking-wide text-zinc-500">Mode</div>
                  <div className="text-[10px] font-semibold text-zinc-300">{displayMode === 'command' ? 'Cmd' : 'Std'}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => acknowledgeChannel()}
                  className="h-6 px-2 rounded border border-zinc-700 text-[9px] text-zinc-400 hover:border-orange-500/50 hover:text-orange-300 transition-colors"
                >
                  Mark Reviewed
                </button>
                <button
                  type="button"
                  onClick={() => primeMessage('command', 'Command priority broadcast: report status by exception only.', 'Priority broadcast draft primed.')}
                  className="h-6 px-2 rounded border border-zinc-700 text-[9px] text-zinc-400 hover:border-orange-500/50 hover:text-orange-300 transition-colors"
                >
                  Priority Broadcast
                </button>
                {priorityChannels.length > 0 ? (
                  <span className="text-[9px] uppercase tracking-wide text-zinc-600 truncate">
                    Hot: {priorityChannels.map((channel) => channel.name).join(' / ')}
                  </span>
                ) : (
                  <span className="text-[9px] uppercase tracking-wide text-zinc-600">No hot channels</span>
                )}
              </div>
            </div>

            {displayMode === 'command' ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCommandSurfaceTab('topology')}
                    className={`h-6 px-2 rounded border text-[9px] uppercase tracking-wide ${
                      commandSurfaceTab === 'topology'
                        ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
                        : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Topology
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommandSurfaceTab('channels')}
                    className={`h-6 px-2 rounded border text-[9px] uppercase tracking-wide ${
                      commandSurfaceTab === 'channels'
                        ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
                        : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Channels
                  </button>
                  <span className="ml-auto text-[9px] uppercase tracking-wide text-zinc-600">
                    Orders {orderFeed.length}
                  </span>
                </div>

                {commandSurfaceTab === 'topology' ? (
                  <>
                    <div
                      ref={topologyRef}
                      className="relative h-36 rounded border border-zinc-800 bg-zinc-950/65 overflow-hidden"
                      onContextMenu={(event) => event.preventDefault()}
                      onClick={(event) => {
                        if (event.target === event.currentTarget) setRadialOpen(false);
                      }}
                    >
                      <div
                        className="absolute inset-0 opacity-[0.15]"
                        style={{
                          backgroundImage:
                            'linear-gradient(rgba(251,146,60,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,0.22) 1px, transparent 1px)',
                          backgroundSize: '20px 20px',
                        }}
                      />
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                        {topologyLinks.map((link) => {
                          const fromNode = topologyNodeById[link.fromId];
                          const toNode = topologyNodeById[link.toId];
                          if (!fromNode || !toNode) return null;
                          return (
                            <line
                              key={link.id}
                              x1={fromNode.x}
                              y1={fromNode.y}
                              x2={toNode.x}
                              y2={toNode.y}
                              stroke={link.kind === 'bridge' ? 'rgba(251,146,60,0.92)' : 'rgba(113,113,122,0.55)'}
                              strokeWidth={link.kind === 'bridge' ? 1.9 : 1}
                              strokeDasharray={link.kind === 'bridge' ? '3 1.3' : '1.8 2'}
                            />
                          );
                        })}
                      </svg>

                      {topologyNodes.map((node) => {
                        const selected = node.id === selectedTopologyNodeId;
                        const bridgeSource = node.id === bridgeSourceNodeId;
                        const bridgeCandidate = Boolean(bridgeSourceNodeId && bridgeSourceNodeId !== node.id);
                        return (
                          <div
                            key={node.id}
                            className="absolute"
                            style={{
                              left: `${node.x}%`,
                              top: `${node.y}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            <button
                              type="button"
                              onPointerDown={(event) => handleNodePointerDown(event, node.id)}
                              onPointerMove={(event) => handleNodePointerMove(event, node.id)}
                              onPointerUp={(event) => handleNodePointerUp(event, node.id)}
                              onPointerCancel={() => {
                                dragRef.current = null;
                              }}
                              onContextMenu={(event) => handleNodeContextMenu(event, node.id)}
                              className="min-w-[56px] px-2 py-1 rounded border text-[9px] font-semibold uppercase tracking-wide bg-zinc-900/90 text-zinc-200 cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-1 focus-visible:ring-orange-400/70"
                              style={{
                                borderColor: bridgeSource
                                  ? 'rgba(251,191,36,0.95)'
                                  : selected
                                    ? 'rgba(251,146,60,0.88)'
                                    : bridgeCandidate
                                      ? 'rgba(250,204,21,0.65)'
                                      : 'rgba(82,82,91,0.82)',
                              }}
                            >
                              <div className="truncate max-w-[90px]">{node.label}</div>
                              <div className="mt-0.5 text-[8px] text-zinc-500">
                                {node.unread > 0 ? `${node.unread} unread` : 'clear'}
                              </div>
                            </button>
                          </div>
                        );
                      })}

                      {bridgeSourceNodeId ? (
                        <div className="absolute left-1.5 top-1.5 rounded border border-amber-400/50 bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-200">
                          Bridge target mode active
                        </div>
                      ) : null}
                      {selectedTopologyNode ? (
                        <div className="absolute right-1.5 top-1.5 rounded border border-zinc-700 bg-zinc-950/85 px-1.5 py-0.5 text-[9px] text-zinc-300 max-w-[150px] truncate">
                          {selectedTopologyNode.label}
                        </div>
                      ) : null}

                      <RadialMenu
                        open={radialOpen}
                        title={selectedTopologyNode ? `${selectedTopologyNode.label} Net` : 'Comms Net'}
                        anchor={radialAnchor}
                        items={radialItems}
                        onClose={() => setRadialOpen(false)}
                      />
                    </div>

                    <div className="rounded border border-zinc-800 bg-zinc-900/40 px-1.5 py-1.5">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="text-[9px] uppercase tracking-wide text-zinc-500">Orders Feed</div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setOrderPage((prev) => Math.max(0, prev - 1))}
                            disabled={orderPage === 0}
                            className="px-1.5 py-0.5 rounded border border-zinc-700 text-[8px] text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                          >
                            Prev
                          </button>
                          <span className="text-[8px] text-zinc-500">{orderPage + 1}/{orderPageCount}</span>
                          <button
                            type="button"
                            onClick={() => setOrderPage((prev) => Math.min(orderPageCount - 1, prev + 1))}
                            disabled={orderPage >= orderPageCount - 1}
                            className="px-1.5 py-0.5 rounded border border-zinc-700 text-[8px] text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {pagedOrders.length > 0 ? (
                          pagedOrders.map((entry) => (
                            <div key={entry.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-1.5 py-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[8px] text-zinc-300 uppercase tracking-wide truncate">{entry.action}</span>
                                <span className="text-[8px] text-emerald-300">{entry.status}</span>
                              </div>
                              <div className="mt-0.5 text-[8px] text-zinc-500 truncate">{entry.summary}</div>
                            </div>
                          ))
                        ) : (
                          <div className="sm:col-span-2 rounded border border-zinc-800 bg-zinc-950/55 px-1.5 py-1 text-[8px] text-zinc-500">
                            No orders dispatched.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    {renderCategory('tactical', 'Tactical')}
                    {renderCategory('operations', 'Operations')}
                    {renderCategory('social', 'Social')}
                    {renderCategory('direct', 'Direct')}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
                  <span className="text-zinc-500 font-bold">Active Channels</span>
                  <span className="text-zinc-600">{standardChannels.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {standardVisibleChannels.map((channel) => (
                    <ChannelButton
                      key={channel.id}
                      channel={channel}
                      status={channelStatusById[channel.id]}
                      isSelected={selectedChannel === channel.id}
                      onClick={() => pickChannel(channel.id)}
                    />
                  ))}
                  {standardVisibleChannels.length === 0 ? (
                    <div className="px-2 py-1 text-[10px] text-zinc-600 border border-zinc-800 rounded">No channels</div>
                  ) : null}
                </div>
                {standardChannelPageCount > 1 ? (
                  <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
                    <button
                      type="button"
                      onClick={() => setStandardChannelPage((prev) => Math.max(0, prev - 1))}
                      disabled={standardChannelPage === 0}
                      className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                    >
                      Prev
                    </button>
                    <span>{standardChannelPage + 1}/{standardChannelPageCount}</span>
                    <button
                      type="button"
                      onClick={() => setStandardChannelPage((prev) => Math.min(standardChannelPageCount - 1, prev + 1))}
                      disabled={standardChannelPage >= standardChannelPageCount - 1}
                      className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {selectedChannel ? (
            <div className="flex-1 min-h-0 flex flex-col border-t border-zinc-700/40">
              <div className="flex-shrink-0 px-2.5 py-2 border-b border-zinc-700/40 bg-zinc-900/40 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-200 truncate">{selectedChannelData?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedChannelUnread > 0 ? <NexusBadge tone="warning">{selectedChannelUnread} unread</NexusBadge> : null}
                    {channelStatusById[selectedChannel]?.bridged ? <NexusBadge tone="active">Bridged</NexusBadge> : null}
                    {channelStatusById[selectedChannel]?.restricted ? <NexusBadge tone="danger">Restricted</NexusBadge> : null}
                    {selectedVoiceNetId ? <NexusBadge tone="neutral">{selectedVoiceNetId}</NexusBadge> : null}
                    {selectedVoiceNetId && onRouteVoiceNet ? (
                      <button
                        type="button"
                        onClick={() => onRouteVoiceNet(selectedChannel)}
                        className="h-6 px-2 rounded border border-zinc-700 text-[9px] text-zinc-400 hover:border-orange-500/50 hover:text-orange-300 transition-colors"
                      >
                        Route Voice
                      </button>
                    ) : null}
                    <button type="button" className="text-zinc-500 hover:text-orange-500 transition-colors" title="Channel notifications">
                      <Bell className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-2 rounded border border-zinc-800 bg-zinc-900/45">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[9px] uppercase tracking-wide text-zinc-500">Command Intent</div>
                      <div className="text-[10px] font-semibold text-zinc-200">{commandIntent.label}</div>
                    </div>
                    <NexusBadge tone={commandIntent.tone}>{isCommsFocus ? 'Focused' : 'Aux'}</NexusBadge>
                  </div>
                  <p className="text-[9px] text-zinc-500 mt-1">{commandIntent.detail}</p>
                  <button
                    type="button"
                    onClick={executeCommandIntent}
                    className="mt-1.5 h-6 px-2 rounded border border-zinc-700 text-[9px] text-zinc-400 hover:border-orange-500/50 hover:text-orange-300 transition-colors inline-flex items-center gap-1"
                  >
                    {commandIntent.actionLabel}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {showAiFeatures ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Assistant search (natural language)..."
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && event.currentTarget.value.trim()) {
                            handleAiSearch(event.currentTarget.value);
                          }
                        }}
                        className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded pl-7 pr-2 py-1 text-[10px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/40"
                      />
                      <Sparkles className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-orange-400" />
                      {aiSearchActive ? (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : null}
                    </div>

                    {aiSearchResults ? (
                      <div className="p-2 rounded border border-orange-500/30 bg-orange-500/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] text-orange-400 font-semibold uppercase">Assistant Results</span>
                          <button type="button" onClick={() => setAiSearchResults(null)} className="text-zinc-500 hover:text-zinc-300">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[9px] text-zinc-400 mb-1">{aiSearchResults.summary}</p>
                        {(aiSearchResults.results || []).slice(0, 3).map((result) => (
                          <div key={result.messageId} className="text-[9px] text-zinc-300 p-1 rounded hover:bg-zinc-800/50 mt-1">
                            <span className="text-orange-400">{Math.round(result.relevanceScore * 100)}%</span>
                            <span className="text-zinc-500 ml-1">{result.reasoning}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex-1 min-h-0 p-2 space-y-1 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[9px] uppercase tracking-wide text-zinc-500">Feed Filter</div>
                  <div className="flex items-center gap-1">
                    {MESSAGE_FILTERS.map((filterId) => (
                      <button
                        key={filterId}
                        type="button"
                        onClick={() => setMessageFilter(filterId)}
                        className={`h-5 px-1.5 rounded text-[8px] font-bold uppercase tracking-wide border ${
                          messageFilter === filterId
                            ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                            : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {filterId}
                      </button>
                    ))}
                  </div>
                </div>

                {pagedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                    <MessageSquare className="w-8 h-8 text-zinc-700/50" />
                    <div className="text-[10px] font-bold uppercase tracking-wider">No messages yet</div>
                    <div className="text-[9px] text-zinc-600">Send a message to initialize channel traffic</div>
                  </div>
                ) : (
                  pagedMessages.map((message) => {
                    const analysis = messageAnalyses[message.id];
                    const showAnalysis = aiEnabled && (displayMode === 'command' || showAiFeatures) && analysis;
                    return (
                      <div key={message.id} className="group px-2 py-1.5 rounded bg-zinc-900/40 border border-zinc-800 hover:border-orange-500/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="text-[10px] font-semibold text-zinc-300">{message.author}</span>
                              <span className="text-[9px] text-zinc-600">{message.timestamp}</span>
                              {message.source === 'event' ? (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-blue-500/20 text-blue-300">
                                  Feed
                                </span>
                              ) : null}
                              {showAnalysis ? (
                                <>
                                  {analysis.priority === 'critical' ? (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-red-500/20 text-red-400 flex items-center gap-0.5">
                                      <AlertCircle className="w-2.5 h-2.5" />
                                      Critical
                                    </span>
                                  ) : null}
                                  {analysis.priority === 'high' ? (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-orange-500/20 text-orange-400 flex items-center gap-0.5">
                                      <TrendingUp className="w-2.5 h-2.5" />
                                      High
                                    </span>
                                  ) : null}
                                  {analysis.urgency >= 8 ? (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-yellow-500/20 text-yellow-400 flex items-center gap-0.5">
                                      <Zap className="w-2.5 h-2.5" />
                                      Urgent
                                    </span>
                                  ) : null}
                                </>
                              ) : null}
                            </div>

                            <div className="text-[10px] text-zinc-400">{message.text}</div>

                            {aiEnabled && (displayMode === 'command' || showAiFeatures) && analysis?.requiresResponse ? (
                              <button
                                type="button"
                                onClick={() => handleGenerateSuggestions(message)}
                                className="mt-1 text-[9px] text-orange-400 hover:text-orange-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Sparkles className="w-3 h-3" />
                                Suggest responses
                              </button>
                            ) : null}

                            {selectedMessageForResponse === message.id && responseSuggestions.length > 0 ? (
                              <div className="mt-2 space-y-1">
                                {responseSuggestions.map((suggestion, index) => (
                                  <button
                                    key={`${message.id}:suggestion:${index}`}
                                    type="button"
                                    onClick={() => {
                                      setMessageInput(suggestion.text);
                                      setResponseSuggestions([]);
                                      setSelectedMessageForResponse(null);
                                    }}
                                    className="w-full text-left p-2 rounded border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/50 text-[10px] text-zinc-300 transition-colors"
                                  >
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="text-orange-400 font-semibold text-[9px] uppercase">{suggestion.tone}</span>
                                      <Sparkles className="w-2.5 h-2.5 text-orange-400" />
                                    </div>
                                    <p>{suggestion.text}</p>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <button type="button" className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all" title="Archive message preview">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {messagePageCount > 1 ? (
                <div className="flex-shrink-0 px-2 py-1 border-t border-zinc-700/30 bg-zinc-900/30 flex items-center justify-end gap-2 text-[9px] text-zinc-500">
                  <button
                    type="button"
                    onClick={() => setMessagePage((prev) => Math.max(0, prev - 1))}
                    disabled={messagePage === 0}
                    className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                  >
                    Prev
                  </button>
                  <span>{messagePage + 1}/{messagePageCount}</span>
                  <button
                    type="button"
                    onClick={() => setMessagePage((prev) => Math.min(messagePageCount - 1, prev + 1))}
                    disabled={messagePage >= messagePageCount - 1}
                    className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                  >
                    Next
                  </button>
                </div>
              ) : null}

              <div className="flex-shrink-0 flex gap-1 p-2 border-t border-zinc-700/40 bg-zinc-900/40">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && event.currentTarget.value.trim()) handleSendMessage();
                  }}
                  className="flex-1 text-[10px] bg-zinc-800/60 border border-zinc-700/40 rounded px-2 py-1.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="h-6 px-2 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="Send message (Enter)"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>

              {panelFeedback ? (
                <div className="flex-shrink-0 px-2 py-1 border-t border-zinc-700/30 bg-zinc-900/20 text-[9px] text-zinc-500">
                  {panelFeedback}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-600 text-[10px] font-bold uppercase tracking-wider">Select a channel</div>
          )}
        </>
      )}
    </div>
  );
}

function ChannelButton({ channel, status, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
        isSelected ? 'bg-orange-500/20 border border-orange-500/30 text-orange-300' : 'bg-zinc-900/40 border border-zinc-800 text-zinc-400 hover:bg-zinc-800/40'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <channel.icon className="w-3 h-3 flex-shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider truncate">{channel.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {status?.bridged ? <span className="px-1 py-0.5 rounded border border-sky-500/40 text-[8px] text-sky-300 uppercase">BR</span> : null}
          {status?.restricted ? <span className="px-1 py-0.5 rounded border border-red-500/40 text-[8px] text-red-300 uppercase">RS</span> : null}
          {channel.unread > 0 ? (
            <div className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-orange-500/30 text-orange-300 text-[9px] font-bold">
              {channel.unread}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
