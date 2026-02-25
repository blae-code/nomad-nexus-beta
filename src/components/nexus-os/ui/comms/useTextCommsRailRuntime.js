import {
  buildDeliveryStats,
  buildDeliverySurface,
  buildPagedOrders,
  ORDER_LIST_PAGE_SIZE,
} from './commsOrderRuntime';

export const CHANNEL_CATEGORIES = ['tactical', 'operations', 'social', 'direct'];

export const TEXT_COMMS_PAGE_SIZES = Object.freeze({
  channels: 7,
  messages: 6,
  inbox: 6,
  orders: ORDER_LIST_PAGE_SIZE,
  threadPreview: 5,
  pins: 5,
});

function normalizeText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function messageTimestampMs(message) {
  const createdAtMs = toNumber(message?.createdAtMs, 0);
  if (createdAtMs > 0) return createdAtMs;
  const parsed = Date.parse(String(message?.createdAt || ''));
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function normalizeMessage(message, index = 0) {
  const createdAtMs = messageTimestampMs(message);
  const id = normalizeText(message?.id, `msg:${createdAtMs}:${index}`);
  return {
    id,
    text: normalizeText(message?.text || message?.message, 'No message body.'),
    author: normalizeText(message?.author, 'Unknown'),
    source: normalizeText(message?.source, 'event'),
    createdAtMs,
    timestamp: normalizeText(
      message?.timestamp,
      new Date(createdAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    ),
    threadCount: Math.max(0, toNumber(message?.threadCount || message?.thread_message_count, 0)),
  };
}

function unreadCount(channelId, unreadByChannel, acknowledgedUnreadByChannel, fallback = 0) {
  const base = toNumber(unreadByChannel?.[channelId], fallback);
  const acked = toNumber(acknowledgedUnreadByChannel?.[channelId], 0);
  return Math.max(0, base - acked);
}

export function buildChannelGroups({
  operations = [],
  focusOperationId,
  online = true,
  bridgeId = 'OPS',
  unreadByChannel = {},
  acknowledgedUnreadByChannel = {},
}) {
  const tactical = [
    {
      id: 'command',
      name: 'Command Net',
      category: 'tactical',
      unread: unreadCount('command', unreadByChannel, acknowledgedUnreadByChannel, 0),
    },
    {
      id: 'alpha-squad',
      name: 'Alpha Squad',
      category: 'tactical',
      unread: unreadCount('alpha-squad', unreadByChannel, acknowledgedUnreadByChannel, 0),
    },
    {
      id: 'logistics',
      name: 'Logistics',
      category: 'tactical',
      unread: unreadCount('logistics', unreadByChannel, acknowledgedUnreadByChannel, 0),
    },
  ];

  const operationChannels = (operations || []).slice(0, 16).map((operation) => {
    const opId = normalizeText(operation?.id);
    const channelId = `op-${opId}`;
    return {
      id: channelId,
      name: normalizeText(operation?.name, 'Operation'),
      category: 'operations',
      unread: unreadCount(
        channelId,
        unreadByChannel,
        acknowledgedUnreadByChannel,
        focusOperationId && focusOperationId === opId ? 1 : 0
      ),
    };
  });

  const social = [
    {
      id: 'general',
      name: 'General',
      category: 'social',
      unread: unreadCount('general', unreadByChannel, acknowledgedUnreadByChannel, 0),
    },
    {
      id: 'random',
      name: 'Random',
      category: 'social',
      unread: unreadCount('random', unreadByChannel, acknowledgedUnreadByChannel, 0),
    },
  ];

  const direct = [
    {
      id: 'dm-command',
      name: 'Command Officer',
      category: 'direct',
      unread: unreadCount('dm-command', unreadByChannel, acknowledgedUnreadByChannel, online ? 1 : 0),
    },
    {
      id: 'dm-ops',
      name: `${bridgeId} Ops Desk`,
      category: 'direct',
      unread: unreadCount('dm-ops', unreadByChannel, acknowledgedUnreadByChannel, 0),
    },
  ];

  return {
    tactical,
    operations: operationChannels,
    social,
    direct,
  };
}

export function flattenChannelGroups(channelGroups) {
  return CHANNEL_CATEGORIES.flatMap((category) => channelGroups?.[category] || []);
}

export function clampPage(page, pageCount) {
  const safePageCount = Math.max(1, toNumber(pageCount, 1));
  const safePage = Math.max(0, toNumber(page, 0));
  return Math.min(safePage, safePageCount - 1);
}

export function paginate(items, page, pageSize) {
  const safeItems = Array.isArray(items) ? items : [];
  const safePageSize = Math.max(1, toNumber(pageSize, 1));
  const pageCount = Math.max(1, Math.ceil(safeItems.length / safePageSize));
  const nextPage = clampPage(page, pageCount);
  const visible = safeItems.slice(nextPage * safePageSize, nextPage * safePageSize + safePageSize);
  return { page: nextPage, pageCount, visible };
}

export function buildCurrentMessages({ selectedChannel, eventMessagesByChannel = {}, localMessagesByChannel = {} }) {
  if (!selectedChannel) return [];
  const runtimeFeed = Array.isArray(eventMessagesByChannel?.[selectedChannel])
    ? eventMessagesByChannel[selectedChannel]
    : [];
  const localFeed = Array.isArray(localMessagesByChannel?.[selectedChannel])
    ? localMessagesByChannel[selectedChannel]
    : [];
  return [...runtimeFeed, ...localFeed]
    .map((message, index) => normalizeMessage(message, index))
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, 64);
}

export function filterMessages(messages, filterId = 'all') {
  const safeMessages = Array.isArray(messages) ? messages : [];
  if (filterId === 'event' || filterId === 'local') {
    return safeMessages.filter((message) => message.source === filterId);
  }
  return safeMessages;
}

export function buildMentionsInbox({ messages = [], actorId = '' }) {
  const actorToken = normalizeText(actorId).toLowerCase();
  return (messages || [])
    .filter((message) => {
      const text = normalizeText(message?.text || message?.message).toLowerCase();
      if (!text.includes('@')) return false;
      if (!actorToken) return true;
      return (
        text.includes(`@${actorToken}`) ||
        text.includes('@all') ||
        text.includes('@ops') ||
        text.includes('@command')
      );
    })
    .map((message, index) => normalizeMessage(message, index))
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export function buildThreadSummaries({ selectedChannel, currentMessages = [], threadsByMessageId = {} }) {
  if (!selectedChannel) return [];
  return currentMessages
    .map((message) => {
      const replies = Array.isArray(threadsByMessageId?.[message.id]) ? threadsByMessageId[message.id] : [];
      const replyCount = Math.max(toNumber(message.threadCount, 0), replies.length);
      if (replyCount <= 0) return null;
      const latestReply = replies.length > 0 ? replies[replies.length - 1] : null;
      return {
        messageId: message.id,
        channelId: selectedChannel,
        parentText: message.text,
        parentAuthor: message.author,
        replyCount,
        latestReplyText: latestReply ? normalizeText(latestReply.text, 'No reply text.') : 'Awaiting reply.',
        latestReplyAtMs: latestReply ? messageTimestampMs(latestReply) : message.createdAtMs,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.latestReplyAtMs - a.latestReplyAtMs);
}

export function buildPinsView({ selectedChannel, currentMessages = [], pinnedMessageIdsByChannel = {} }) {
  if (!selectedChannel) return [];
  const pinnedIds = Array.isArray(pinnedMessageIdsByChannel?.[selectedChannel])
    ? pinnedMessageIdsByChannel[selectedChannel]
    : [];
  if (pinnedIds.length === 0) return [];
  const byId = currentMessages.reduce((acc, message) => {
    acc[message.id] = message;
    return acc;
  }, {});
  return pinnedIds
    .map((id) => byId[id])
    .filter(Boolean)
    .map((message) => ({
      messageId: message.id,
      text: message.text,
      author: message.author,
      createdAtMs: message.createdAtMs,
      timestamp: message.timestamp,
    }))
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export function buildSearchPreview({ query = '', allMessagesByChannel = {} }) {
  const needle = normalizeText(query).toLowerCase();
  if (!needle) return [];
  const channelIds = Object.keys(allMessagesByChannel || {});
  const hits = [];
  for (const channelId of channelIds) {
    const messages = Array.isArray(allMessagesByChannel?.[channelId]) ? allMessagesByChannel[channelId] : [];
    for (const message of messages) {
      const normalized = normalizeMessage(message);
      if (normalized.text.toLowerCase().includes(needle) || normalized.author.toLowerCase().includes(needle)) {
        hits.push({
          ...normalized,
          channelId,
        });
      }
    }
  }
  return hits.sort((a, b) => b.createdAtMs - a.createdAtMs).slice(0, 48);
}

export function buildOrdersRuntime({ dispatches = [], events = [], incidents = [], nowMs = Date.now(), page = 0 }) {
  const deliverySurface = buildDeliverySurface({ dispatches, events, incidents, nowMs });
  const stats = buildDeliveryStats(deliverySurface);
  const paged = buildPagedOrders(deliverySurface, page, TEXT_COMMS_PAGE_SIZES.orders);
  return {
    deliverySurface,
    stats,
    pageCount: paged.pageCount,
    visible: paged.visible,
  };
}
