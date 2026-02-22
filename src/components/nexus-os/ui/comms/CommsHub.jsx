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
  Plus,
  Users,
  FolderPlus,
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
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [hoveredChannel, setHoveredChannel] = useState(null);
  const [messages, setMessages] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({
    tactical: true,
    operations: true,
    social: false,
    direct: false,
  });
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [customCategories, setCustomCategories] = useState([]);
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

  const [showAiFeatures, setShowAiFeatures] = useState(false);
  const [messageAnalyses, setMessageAnalyses] = useState({});
  const [aiSearchActive, setAiSearchActive] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState(null);
  const [responseSuggestions, setResponseSuggestions] = useState([]);
  const [selectedMessageForResponse, setSelectedMessageForResponse] = useState(null);

  const aiEnabled = showAiFeatures;
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
    if (!panelFeedback) return undefined;
    const timer = window.setTimeout(() => setPanelFeedback(''), 3200);
    return () => window.clearTimeout(timer);
  }, [panelFeedback]);



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
    setChatPanelOpen(true);
  }, []);

  const createCategory = useCallback(() => {
    if (!newCategoryName.trim()) return;
    const categoryId = newCategoryName.toLowerCase().replace(/\s+/g, '-');
    setCustomCategories((prev) => [...prev, { id: categoryId, name: newCategoryName, channels: [] }]);
    setExpandedCategories((prev) => ({ ...prev, [categoryId]: true }));
    setNewCategoryName('');
    setShowCreateMenu(false);
    setPanelFeedback(`Category "${newCategoryName}" created.`);
  }, [newCategoryName]);

  const createDirectMessage = useCallback(() => {
    const dmId = `dm-${Date.now()}`;
    const dmChannel = {
      id: dmId,
      name: 'New DM',
      icon: AtSign,
      category: 'direct',
      unread: 0,
    };
    setShowCreateMenu(false);
    pickChannel(dmId);
    setPanelFeedback('Direct message started.');
  }, [pickChannel]);

  const createGroupMessage = useCallback(() => {
    const groupId = `group-${Date.now()}`;
    const groupChannel = {
      id: groupId,
      name: 'New Group',
      icon: Users,
      category: 'social',
      unread: 0,
    };
    setShowCreateMenu(false);
    pickChannel(groupId);
    setPanelFeedback('Group message created.');
  }, [pickChannel]);

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

  const renderCategory = (category, label) => {
    const items = channels[category] || [];
    if (!items.length && category !== 'operations' && !customCategories.find(c => c.id === category)) return null;

    const page = channelPages[category] || 0;
    const pageCount = categoryPageCounts[category] || 1;
    const pagedChannels = items.slice(page * CHANNEL_PAGE_SIZE, page * CHANNEL_PAGE_SIZE + CHANNEL_PAGE_SIZE);
    const categoryUnread = items.reduce((sum, ch) => sum + Number(ch.unread || 0), 0);

    return (
      <div key={category} className="mb-0.5">
        <button
          type="button"
          onClick={() => toggleCategory(category)}
          className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 rounded transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <ChevronRight className={`w-3 h-3 transition-transform ${expandedCategories[category] ? 'rotate-90' : ''}`} />
            <span className="uppercase tracking-wider">{label}</span>
            <span className="text-zinc-600 font-normal">({items.length})</span>
          </div>
          {categoryUnread > 0 ? (
            <div className="px-1.5 py-0.5 rounded-full bg-orange-500/30 text-orange-300 text-[9px] font-bold">
              {categoryUnread}
            </div>
          ) : null}
        </button>

        {expandedCategories[category] ? (
          <div className="ml-3 space-y-0.5 mt-0.5">
            {pagedChannels.length > 0 ? (
              pagedChannels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => pickChannel(channel.id)}
                  onMouseEnter={() => setHoveredChannel(channel.id)}
                  onMouseLeave={() => setHoveredChannel(null)}
                  className={`w-full text-left px-2 py-1.5 rounded transition-all flex items-center justify-between gap-2 ${
                    selectedChannel === channel.id 
                      ? 'bg-orange-500/20 border border-orange-500/40 text-orange-300' 
                      : hoveredChannel === channel.id
                        ? 'bg-zinc-800/60 text-zinc-200 border border-zinc-700/60'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash className="w-3 h-3 flex-shrink-0" />
                    <span className="text-[10px] font-medium truncate">{channel.name}</span>
                  </div>
                  {channel.unread > 0 ? (
                    <div className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-orange-500/40 text-orange-200 text-[9px] font-bold">
                      {channel.unread}
                    </div>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="px-2 py-1 text-[10px] text-zinc-600">No channels</div>
            )}

            {pageCount > 1 ? (
              <div className="flex items-center justify-end gap-2 pt-1 pr-1 text-[9px] text-zinc-500">
                <button
                  type="button"
                  onClick={() => pageCategory(category, 'prev')}
                  disabled={page === 0}
                  className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                >
                  ‹
                </button>
                <span>{page + 1}/{pageCount}</span>
                <button
                  type="button"
                  onClick={() => pageCategory(category, 'next')}
                  disabled={page >= pageCount - 1}
                  className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                >
                  ›
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className={`flex h-full bg-zinc-950/80 transition-all duration-300 ease-out overflow-hidden ${isExpanded ? 'w-full' : 'w-12'}`}>
      {!isExpanded ? (
        <div className="flex items-center justify-center py-2 border-r border-zinc-700/40">
          <button type="button" onClick={onToggleExpand} className="text-zinc-500 hover:text-orange-500 transition-colors" title="Expand">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex w-full h-full overflow-hidden">
          {/* Channel Tree Panel */}
          <div className="flex flex-col w-64 flex-shrink-0 border-r border-zinc-700/40 h-full overflow-hidden">(
            <div className="flex-shrink-0 px-2 py-1.5 border-b border-zinc-700/40 bg-zinc-900/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                <h3 className="text-[10px] font-bold text-zinc-100 uppercase tracking-wider">Channels</h3>
                {totalUnread > 0 ? (
                  <div className="px-1.5 py-0.5 rounded-full bg-orange-500/30 text-orange-300 text-[8px] font-bold">
                    {totalUnread}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateMenu((prev) => !prev)}
                  className="p-0.5 rounded text-zinc-500 hover:text-orange-500 transition-colors"
                  title="Create new"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={onToggleExpand} className="p-0.5 text-zinc-500 hover:text-orange-500 transition-colors" title="Collapse">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {showCreateMenu ? (
              <div className="flex-shrink-0 border-b border-zinc-700/40 bg-zinc-900/40 p-2 space-y-1.5">
                <div className="text-[9px] uppercase tracking-wide text-zinc-500 mb-1">Create New</div>
                <button
                  type="button"
                  onClick={createDirectMessage}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                >
                  <AtSign className="w-3.5 h-3.5 text-cyan-400" />
                  Direct Message
                </button>
                <button
                  type="button"
                  onClick={createGroupMessage}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  Group Message
                </button>
                <div className="pt-1 border-t border-zinc-800">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="Category name..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createCategory();
                        if (e.key === 'Escape') setShowCreateMenu(false);
                      }}
                      className="flex-1 bg-zinc-800/60 border border-zinc-700/40 rounded px-2 py-1 text-[10px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/40"
                    />
                    <button
                      type="button"
                      onClick={createCategory}
                      disabled={!newCategoryName.trim()}
                      className="px-2 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Create category"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              <div className="space-y-1">
                {renderCategory('tactical', 'Tactical')}
                {renderCategory('operations', 'Operations')}
                {renderCategory('social', 'Social')}
                {renderCategory('direct', 'Direct')}
                {customCategories.map((cat) => renderCategory(cat.id, cat.name))}
              </div>
            </div>
          </div>

          {/* Chat Panel - slides in when channel selected */}
          <div
            className={`flex flex-col flex-1 border-l border-zinc-700/40 bg-zinc-900/60 transition-all duration-300 overflow-hidden ${
              chatPanelOpen && selectedChannel ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 absolute inset-0 pointer-events-none'
            }`}
          >
            {selectedChannel ? (
              <>
                <div className="flex-shrink-0 px-2.5 py-2 border-b border-zinc-700/40 bg-zinc-900/40 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-200 truncate">{selectedChannelData?.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {selectedChannelUnread > 0 ? <NexusBadge tone="warning">{selectedChannelUnread}</NexusBadge> : null}
                      <button
                        type="button"
                        onClick={() => setShowAiFeatures((prev) => !prev)}
                        className={`p-0.5 rounded text-zinc-500 hover:text-orange-500 transition-colors ${showAiFeatures ? 'text-orange-400' : ''}`}
                        title={showAiFeatures ? 'Hide assistant' : 'Show assistant'}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setChatPanelOpen(false)}
                        className="p-0.5 text-zinc-500 hover:text-orange-500 transition-colors"
                        title="Close chat"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div>
                      <div className="text-[9px] uppercase tracking-wide text-zinc-500 mb-0.5">Channel Status</div>
                      <div className="text-[10px] font-semibold text-zinc-200">{commandIntent.label}</div>
                    </div>
                    <NexusBadge tone={commandIntent.tone}>Live</NexusBadge>
                  </div>
                  <p className="text-[9px] text-zinc-500 leading-snug">{commandIntent.detail}</p>
                  <button
                    type="button"
                    onClick={executeCommandIntent}
                    className="mt-2 h-6 px-2.5 rounded border border-zinc-700 text-[9px] text-zinc-400 hover:border-orange-500/50 hover:text-orange-300 transition-colors inline-flex items-center gap-1"
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
                    const showAnalysis = aiEnabled && showAiFeatures && analysis;
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

                            {aiEnabled && showAiFeatures && analysis?.requiresResponse ? (
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
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}