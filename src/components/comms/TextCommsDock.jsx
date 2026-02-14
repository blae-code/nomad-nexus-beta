/**
 * TextCommsDock — The sole implementation of text comms in the app.
 * Provides channel browsing, message display, and composition.
 * Legacy comms footer code has been fully replaced by this component.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Minimize2, Hash, Lock, AlertCircle, Search, Bell, Shield, Moon, Download, HelpCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useUnreadCounts } from '@/components/hooks/useUnreadCounts';
import { useMemberProfileMap } from '@/components/hooks/useMemberProfileMap';
import { useAuth } from '@/components/providers/AuthProvider';
import { useNotification } from '@/components/providers/NotificationContext';
import { isAdminUser } from '@/utils';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { canAccessCommsChannel } from '@/components/utils/commsAccessPolicy';
import { useTypingIndicator } from '@/components/hooks/useTypingIndicator';
import TypingIndicator from '@/components/comms/TypingIndicator';
import { usePresenceMap } from '@/components/hooks/usePresenceMap';
import MessageItem from '@/components/comms/MessageItem';
import MessageComposer from '@/components/comms/MessageComposer';
import ThreadPanel from '@/components/comms/ThreadPanel';
import PinnedMessages from '@/components/comms/PinnedMessages';
import DMChannelList from '@/components/comms/DMChannelList';
import UserPickerModal from '@/components/comms/UserPickerModal';
import GlobalMessageSearch from '@/components/comms/GlobalMessageSearch';
import MentionsView from '@/components/comms/MentionsView';
import ChannelNotificationSettings from '@/components/comms/ChannelNotificationSettings';
import ModerationPanel from '@/components/comms/ModerationPanel';
import AIModerationIndicator from '@/components/comms/AIModerationIndicator';
import CommsTemplateDialog from '@/components/comms/CommsTemplateDialog';
import { useChannelPackRecommendations } from '@/components/hooks/useChannelPackRecommendations';
import AIFeatureToggle from '@/components/ai/AIFeatureToggle';

const COMMAND_CORE_HEIGHT_KEY = 'nexus.comms.commandCoreHeight';
const DEFAULT_COMMAND_CORE_HEIGHT = 240;
const MIN_COMMAND_CORE_HEIGHT = 160;
const MAX_COMMAND_CORE_HEIGHT = 380;

const COMMAND_DEFS = [
  { id: 'help', usage: '/help', description: 'Show command list' },
  { id: 'whisper', usage: '/whisper role:Rangers <message>', description: 'Whisper to role/rank/squad/member' },
  { id: 'broadcast', usage: '/broadcast #ops,#intel <message>', description: 'Broadcast to channels or scope' },
  { id: 'sitrep', usage: '/sitrep 30', description: 'Generate a SITREP (minutes window)' },
  { id: 'orders', usage: '/orders <message>', description: 'Post an ORDERS template' },
  { id: 'status', usage: '/status <message>', description: 'Post a STATUS template' },
  { id: 'contact', usage: '/contact <message>', description: 'Post a CONTACT report' },
];

const parseCommandLine = (input) => {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return null;
  const [cmd, ...rest] = trimmed.slice(1).split(' ');
  return { command: cmd.toLowerCase(), args: rest.join(' ').trim() };
};

const parseTargetToken = (token) => {
  if (!token) return null;
  const trimmed = token.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('@')) {
    return { type: 'member', values: [trimmed.slice(1)] };
  }
  if (trimmed.includes(':')) {
    const [rawType, rawValues] = trimmed.split(':');
    const values = rawValues ? rawValues.split(',').map((v) => v.trim()).filter(Boolean) : [];
    return { type: rawType.toLowerCase(), values };
  }
  return null;
};

const formatTemplate = (label, message) => {
  const header = `[${label.toUpperCase()}]`;
  if (!message) return header;
  return `${header} ${message}`;
};
export default function TextCommsDock({ isOpen, isMinimized, onMinimize }) {
  const [activeTab, setActiveTab] = useState('comms');
  const [channels, setChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [threadPanelMessage, setThreadPanelMessage] = useState(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userPickerMode, setUserPickerMode] = useState('dm');
  const [viewMode, setViewMode] = useState('channels'); // 'channels' or 'dms'
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [polls, setPolls] = useState([]);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [riggsyPrompt, setRiggsyPrompt] = useState('');
  const [riggsyResponse, setRiggsyResponse] = useState('');
  const [riggsyLoading, setRiggsyLoading] = useState(false);
  const [dndEnabled, setDndEnabled] = useState(() => {
    try {
      return localStorage.getItem('nexus.notifications.dnd') === 'true';
    } catch {
      return false;
    }
  });
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showCommandHelp, setShowCommandHelp] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [commandCoreHeight, setCommandCoreHeight] = useState(() => {
    try {
      const stored = localStorage.getItem(COMMAND_CORE_HEIGHT_KEY);
      const parsed = stored ? Number(stored) : null;
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    } catch {
      // ignore storage errors
    }
    return DEFAULT_COMMAND_CORE_HEIGHT;
  });
  const [autoLinkPreview, setAutoLinkPreview] = useState(() => {
    try {
      const stored = localStorage.getItem('nexus.comms.autoLinkPreview');
      return stored !== 'false';
    } catch {
      return true;
    }
  });
  const [muteInfo, setMuteInfo] = useState(null);
  const [muteRemaining, setMuteRemaining] = useState(null);
  const [lastSentAt, setLastSentAt] = useState(null);
  const [slowModeRemaining, setSlowModeRemaining] = useState(0);
  const messagesEndRef = useRef(null);
  const rolesCacheRef = useRef(null);
  const squadsCacheRef = useRef(null);
  const membersCacheRef = useRef(null);
  const readReceiptRef = useRef(new Set());
  const commandCoreResizingRef = useRef(false);
  const commandCoreResizeStartRef = useRef({ y: 0, height: DEFAULT_COMMAND_CORE_HEIGHT });

  const { user: authUser, aiFeaturesEnabled } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const isAdmin = isAdminUser(authUser);
  const aiEnabled = aiFeaturesEnabled !== false;
  const { addNotification } = useNotification();
  const { unreadByChannel, unreadByTab, refreshUnreadCounts, markChannelRead } = useUnreadCounts(user?.id);
  const activeOp = useActiveOp();
  const { typingUsers, signalTyping, clearTyping } = useTypingIndicator(selectedChannelId, user?.id);
  const messageUserIds = React.useMemo(
    () => Array.from(new Set(messages.map((m) => m.user_id).filter(Boolean))),
    [messages]
  );
  const { presenceMap, lastSeenMap } = usePresenceMap(messageUserIds);
  const fallbackMemberMap = React.useMemo(() => {
    if (!user?.id) return {};
    const label = user.callsign || user.full_name || user.email || 'System Admin';
    const profile = {
      ...user,
      rank: user.rank,
      membership: user.membership,
      roles: user.roles,
    };
    return { [user.id]: { label, profile } };
  }, [user?.id, user?.callsign, user?.full_name, user?.email, user?.rank, user?.membership, user?.roles]);
  const { memberMap } = useMemberProfileMap(messageUserIds, { fallbackMap: fallbackMemberMap });
  const { recommendedChannels } = useChannelPackRecommendations(user, channels);
  const slowModeKey = React.useMemo(() => {
    if (!selectedChannelId || !user?.id) return null;
    return `nexus.comms.lastSent.${selectedChannelId}.${user.id}`;
  }, [selectedChannelId, user?.id]);

  const canViewMessage = useCallback((msg) => {
    const meta = msg?.whisper_metadata;
    if (!meta?.is_whisper) return true;
    if (isAdmin) return true;
    const recipients = meta.recipient_member_profile_ids || [];
    if (meta.sender_member_profile_id === user?.id) return true;
    return recipients.includes(user?.id);
  }, [isAdmin, user?.id]);

  const notify = useCallback((title, message, type = 'info') => {
    addNotification?.({ title, message, type, duration: 6000 });
  }, [addNotification]);

  const registerMessageAttachments = useCallback(async (message, attachments = []) => {
    if (!message?.id || !Array.isArray(attachments) || attachments.length === 0) return;
    const channelId = message.channel_id || selectedChannelId || null;
    const eventId = activeOp?.activeEventId || null;
    const normalized = attachments
      .map((entry) => {
        const fileUrl = String(entry?.url || '').trim();
        if (!fileUrl) return null;
        return {
          fileUrl,
          fileName: String(entry?.fileName || '').trim() || fileUrl.split('?')[0].split('/').pop() || 'attachment',
          contentType: String(entry?.contentType || '').trim() || 'application/octet-stream',
          sizeBytes: Number.isFinite(Number(entry?.sizeBytes)) ? Number(entry.sizeBytes) : null,
          sourceKind: String(entry?.sourceKind || 'file').trim().toLowerCase() || 'file',
        };
      })
      .filter(Boolean)
      .slice(0, 16);
    if (normalized.length === 0) return;
    await Promise.allSettled(
      normalized.map((attachment) =>
        invokeMemberFunction('updateFileAssets', {
          action: 'register',
          fileUrl: attachment.fileUrl,
          fileName: attachment.fileName,
          contentType: attachment.contentType,
          sizeBytes: attachment.sizeBytes,
          sourceType: 'MESSAGE_ATTACHMENT',
          sourceId: message.id,
          channelId,
          eventId,
          ttlHours: 24 * 90,
          attachmentKind: attachment.sourceKind,
        })
      )
    );
  }, [activeOp?.activeEventId, selectedChannelId]);

  const canAccessChannel = useCallback((channel) => {
    return canAccessCommsChannel(user, channel);
  }, [user]);

  // Load channels
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const channelList = await base44.entities.Channel.list();
        setChannels(channelList);

        const accessible = (channelList || []).filter((channel) => canAccessChannel(channel));

        // Auto-select bound channel if active op has one and user can access it
        if (activeOp?.binding?.commsChannelId) {
          const bound = (channelList || []).find((channel) => channel.id === activeOp.binding.commsChannelId);
          if (bound && canAccessChannel(bound)) {
            setSelectedChannelId(activeOp.binding.commsChannelId);
          } else if (accessible.length > 0 && !selectedChannelId) {
            setSelectedChannelId(accessible[0].id);
          }
        } else if (!selectedChannelId && accessible.length > 0) {
          setSelectedChannelId(accessible[0].id);
        }
      } catch (error) {
        console.error('Failed to load channels:', error);
      }
    };

    loadChannels();
  }, [activeOp?.binding?.commsChannelId, canAccessChannel, selectedChannelId]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus.notifications.dnd', dndEnabled ? 'true' : 'false');
    } catch {
      // ignore storage errors
    }
  }, [dndEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus.comms.autoLinkPreview', autoLinkPreview ? 'true' : 'false');
    } catch {
      // ignore storage errors
    }
  }, [autoLinkPreview]);

  useEffect(() => {
    try {
      localStorage.setItem(COMMAND_CORE_HEIGHT_KEY, String(commandCoreHeight));
    } catch {
      // ignore storage errors
    }
  }, [commandCoreHeight]);

  useEffect(() => {
    if (!slowModeKey) {
      setLastSentAt(null);
      return;
    }
    try {
      const stored = localStorage.getItem(slowModeKey);
      setLastSentAt(stored ? Number(stored) : null);
    } catch {
      setLastSentAt(null);
    }
  }, [slowModeKey]);

  useEffect(() => {
    if (!selectedChannelId || !user?.id) {
      setMuteInfo(null);
      return;
    }

    let isActive = true;

    const loadMuteStatus = async () => {
      try {
        let mutes = [];
        try {
          mutes = await base44.entities.ChannelMute.filter({
            channel_id: selectedChannelId,
            member_profile_id: user.id,
            is_active: true,
          });
        } catch {
          mutes = [];
        }

        if (!mutes || mutes.length === 0) {
          try {
            mutes = await base44.entities.ChannelMute.filter({
              channel_id: selectedChannelId,
              user_id: user.id,
              is_active: true,
            });
          } catch {
            mutes = [];
          }
        }

        const activeMute = (mutes || []).find((mute) => {
          if (!mute?.expires_at) return true;
          return new Date(mute.expires_at).getTime() > Date.now();
        }) || null;

        if (activeMute?.expires_at && new Date(activeMute.expires_at).getTime() <= Date.now()) {
          try {
            await base44.entities.ChannelMute.update(activeMute.id, { is_active: false });
          } catch {
            // ignore update failure
          }
        }

        if (isActive) {
          setMuteInfo(activeMute);
        }
      } catch (error) {
        console.error('Failed to load mute status:', error);
        if (isActive) setMuteInfo(null);
      }
    };

    loadMuteStatus();

    return () => {
      isActive = false;
    };
  }, [selectedChannelId, user?.id]);

  // Load messages for selected channel + real-time subscription
  useEffect(() => {
    if (!selectedChannelId) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const selected = channels.find((channel) => channel.id === selectedChannelId);
        if (selected && !canAccessChannel(selected)) {
          setMessages([]);
          setLoadingMessages(false);
          notify('Access Denied', 'You no longer have scope access to this channel.', 'warning');
          return;
        }

        const msgs = await base44.entities.Message.filter({ channel_id: selectedChannelId });
        const visible = (msgs || []).filter(canViewMessage);
        setMessages(visible.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
        // Mark as read (debounced)
        setTimeout(() => markChannelRead(selectedChannelId), 500);
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();

    // Subscribe to real-time message updates
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data?.channel_id === selectedChannelId) {
        const selected = channels.find((channel) => channel.id === selectedChannelId);
        if (selected && !canAccessChannel(selected)) return;
        if (!canViewMessage(event.data)) return;
        setMessages((prev) => [...prev, event.data]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [canAccessChannel, canViewMessage, channels, markChannelRead, notify, selectedChannelId]);

  useEffect(() => {
    if (!selectedChannelId) return;
    const selected = channels.find((channel) => channel.id === selectedChannelId);
    if (!selected) return;
    if (canAccessChannel(selected)) return;

    const fallback = channels.find((channel) => canAccessChannel(channel));
    if (fallback) {
      setSelectedChannelId(fallback.id);
    } else {
      setSelectedChannelId(null);
      setMessages([]);
    }
  }, [canAccessChannel, channels, selectedChannelId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user?.id || !selectedChannelId || !messages.length) return;

    const toMark = messages
      .filter((msg) => {
        if (!msg?.id) return false;
        if (msg.user_id === user.id) return false;
        if (msg.is_deleted) return false;
        const readBy = Array.isArray(msg.read_by_member_profile_ids)
          ? msg.read_by_member_profile_ids
          : Array.isArray(msg.read_by)
          ? msg.read_by
          : [];
        if (readBy.includes(user.id)) return false;
        if (readReceiptRef.current.has(msg.id)) return false;
        return true;
      })
      .slice(-20);

    if (!toMark.length) return;

    const timer = setTimeout(async () => {
      for (const msg of toMark) {
        readReceiptRef.current.add(msg.id);
        const readBy = Array.isArray(msg.read_by_member_profile_ids)
          ? msg.read_by_member_profile_ids
          : Array.isArray(msg.read_by)
          ? msg.read_by
          : [];
        const nextReadBy = Array.from(new Set([...readBy, user.id]));

        let updated = false;
        try {
          await base44.entities.Message.update(msg.id, {
            read_by_member_profile_ids: nextReadBy,
          });
          updated = true;
        } catch {
          // ignore and fallback
        }

        if (!updated) {
          try {
            await base44.entities.Message.update(msg.id, {
              read_by: nextReadBy,
            });
          } catch {
            // ignore
          }
        }

        setMessages((prev) =>
          prev.map((item) => {
            if (item.id !== msg.id) return item;
            if (Array.isArray(item.read_by_member_profile_ids)) {
              return { ...item, read_by_member_profile_ids: nextReadBy };
            }
            if (Array.isArray(item.read_by)) {
              return { ...item, read_by: nextReadBy };
            }
            return { ...item, read_by_member_profile_ids: nextReadBy };
          })
        );
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [messages, selectedChannelId, user?.id]);

  const handleCreateDM = async ({ userIds }) => {
    try {
      // Check if DM already exists
      const existingDMs = await base44.entities.Channel.filter({ is_dm: true });
      const existing = existingDMs.find(ch => {
        const participants = ch.dm_participants || [];
        return participants.length === 2 &&
          participants.includes(user.id) &&
          participants.includes(userIds[0]);
      });

      if (existing) {
        setSelectedChannelId(existing.id);
        setViewMode('dms');
        return;
      }

      // Create new DM channel
      const dmChannel = await base44.entities.Channel.create({
        name: `DM-${user.id}-${userIds[0]}`,
        type: 'text',
        category: 'direct',
        is_dm: true,
        is_group_chat: false,
        dm_participants: [user.id, userIds[0]],
      });

      setSelectedChannelId(dmChannel.id);
      setViewMode('dms');
    } catch (error) {
      console.error('Failed to create DM:', error);
    }
  };

  const handleCreateGroup = async ({ userIds, groupName }) => {
    try {
      const groupChannel = await base44.entities.Channel.create({
        name: groupName,
        type: 'text',
        category: 'direct',
        is_dm: true,
        is_group_chat: true,
        dm_participants: [user.id, ...userIds],
        group_name: groupName,
        group_owner_id: user.id,
      });

      setSelectedChannelId(groupChannel.id);
      setViewMode('dms');
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const exportHistory = async (format) => {
    if (!selectedChannelId) return;
    setExporting(true);

    try {
      const msgs = await base44.entities.Message.filter(
        { channel_id: selectedChannelId },
        'created_date',
        1000
      );

      const messagesForExport = (msgs || []).map((msg) => ({
        id: msg.id,
        created_date: msg.created_date,
        user_id: msg.user_id,
        author: memberMap[msg.user_id]?.label || msg.author_callsign || msg.display_callsign || msg.user_id,
        content: msg.content || '',
        attachments: msg.attachments || [],
        reactions: msg.reactions || [],
        is_edited: msg.is_edited || false,
        is_deleted: msg.is_deleted || false,
        parent_message_id: msg.parent_message_id || null,
      }));

      const channelLabel = selectedChannel?.name || selectedChannelId;
      const safeChannel = channelLabel.toString().replace(/[^a-z0-9_-]/gi, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      if (format === 'json') {
        const payload = {
          channel: channelLabel,
          exported_at: new Date().toISOString(),
          messages: messagesForExport,
        };
        const content = JSON.stringify(payload, null, 2);
        downloadFile(`${safeChannel}_${timestamp}.json`, content, 'application/json');
      }

      if (format === 'csv') {
        const header = [
          'id',
          'created_date',
          'user_id',
          'author',
          'content',
          'attachments',
          'reactions',
          'is_edited',
          'is_deleted',
          'parent_message_id',
        ];
        const rows = messagesForExport.map((msg) => [
          msg.id,
          msg.created_date,
          msg.user_id,
          msg.author,
          msg.content,
          JSON.stringify(msg.attachments || []),
          JSON.stringify(msg.reactions || []),
          msg.is_edited,
          msg.is_deleted,
          msg.parent_message_id || '',
        ]);
        const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
        downloadFile(`${safeChannel}_${timestamp}.csv`, csv, 'text/csv');
      }
    } catch (error) {
      console.error('Failed to export history:', error);
    } finally {
      setExporting(false);
      setShowExportDialog(false);
    }
  };

  const escapeCsv = (value) => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const downloadFile = (filename, content, type) => {
    try {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const loadPolls = useCallback(async () => {
    if (!selectedChannelId) return;
    setLoadingPolls(true);
    try {
      const pollsList = await base44.entities.Poll.filter(
        { scope: 'CHANNEL', scope_id: selectedChannelId },
        '-created_date',
        20
      );
      const pollsWithVotes = await Promise.all(
        pollsList.map(async (poll) => {
          const votes = await base44.entities.PollVote.filter({ poll_id: poll.id });
          return { ...poll, votes };
        })
      );
      setPolls(pollsWithVotes);
    } catch (error) {
      console.error('Failed to load polls:', error);
    } finally {
      setLoadingPolls(false);
    }
  }, [selectedChannelId]);

  useEffect(() => {
    if (activeTab === 'polls') {
      loadPolls();
    }
  }, [activeTab, selectedChannelId, loadPolls]);

  const createPoll = async () => {
    if (!pollQuestion.trim() || !selectedChannelId || !user?.id) return;
    const validOptions = pollOptions.filter((opt) => opt.trim());
    if (validOptions.length < 2) return;

    try {
      const formattedOptions = validOptions.map((text, idx) => ({
        id: `opt_${idx}`,
        text: text.trim(),
      }));

      await base44.entities.Poll.create({
        scope: 'CHANNEL',
        scope_id: selectedChannelId,
        question: pollQuestion.trim(),
        options: formattedOptions,
        created_by: user.id,
        closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      setPollQuestion('');
      setPollOptions(['', '']);
      setShowPollCreator(false);
      loadPolls();
    } catch (error) {
      console.error('Failed to create poll:', error);
    }
  };

  const votePoll = async (pollId, optionId) => {
    if (!user?.id) return;
    try {
      await base44.entities.PollVote.create({
        poll_id: pollId,
        user_id: user.id,
        selected_option_ids: [optionId],
      });
      loadPolls();
    } catch (error) {
      console.error('Failed to vote in poll:', error);
    }
  };

  const askRiggsy = async () => {
    if (!aiEnabled) {
      setRiggsyResponse('AI features are Disabled. Enable AI features to use Riggsy.');
      return;
    }
    if (!riggsyPrompt.trim()) return;
    setRiggsyLoading(true);
    setRiggsyResponse('');

    try {
      const channelContext = messages.slice(-10).map((m) => m.content).join('\n');
      const result = await invokeMemberFunction('commsAssistant', {
        action: 'ask_comms',
        data: {
          eventId: activeOp?.activeEventId || null,
          query: `${riggsyPrompt}\n\nRecent channel activity:\n${channelContext || '(none)'}`,
        },
      });
      const answer = result?.data?.answer || result?.data?.response?.answer || result?.data?.summary || '';
      setRiggsyResponse(String(answer || '').trim() || 'No response from Riggsy.');
    } catch (error) {
      setRiggsyResponse('Error: Unable to reach Riggsy at this time.');
    } finally {
      setRiggsyLoading(false);
    }
  };

  // Sync unread counts whenever channels change
  React.useEffect(() => {
    refreshUnreadCounts();
  }, [channels, refreshUnreadCounts]);

  // Group channels by category
   const groupedChannels = {
     casual: channels.filter((ch) => ch.category === 'casual'),
     focused: channels.filter((ch) => ch.category === 'focused'),
     temporary: channels.filter((ch) => ch.category === 'temporary'),
   };

  const ensureRoles = useCallback(async () => {
    if (rolesCacheRef.current) return rolesCacheRef.current;
    try {
      const roles = await base44.entities.Role.list();
      rolesCacheRef.current = Array.isArray(roles) ? roles : [];
    } catch {
      rolesCacheRef.current = [];
    }
    return rolesCacheRef.current;
  }, []);

  const ensureSquads = useCallback(async () => {
    if (squadsCacheRef.current) return squadsCacheRef.current;
    try {
      const squads = await base44.entities.Squad.list();
      squadsCacheRef.current = Array.isArray(squads) ? squads : [];
    } catch {
      squadsCacheRef.current = [];
    }
    return squadsCacheRef.current;
  }, []);

  const ensureMembers = useCallback(async () => {
    if (membersCacheRef.current) return membersCacheRef.current;
    try {
      const members = await base44.entities.MemberProfile.list();
      membersCacheRef.current = Array.isArray(members) ? members : [];
    } catch {
      membersCacheRef.current = [];
    }
    return membersCacheRef.current;
  }, []);

  const resolveWhisperTargets = useCallback(async (targetSpec) => {
    if (!targetSpec) return null;
    const { type, values } = targetSpec;
    if (!values || values.length === 0) return null;

    if (type === 'member') {
      const members = await ensureMembers();
      const resolved = values
        .map((value) => {
          const lower = value.toLowerCase();
          return members.find((m) =>
            [m.callsign, m.display_callsign, m.full_name, m.email]
              .filter(Boolean)
              .some((field) => field.toString().toLowerCase() === lower)
          );
        })
        .filter(Boolean);
      return { targetType: 'member', targetIds: resolved.map((m) => m.id) };
    }

    if (type === 'role') {
      const roles = await ensureRoles();
      const resolved = values.map((value) => {
        const lower = value.toLowerCase();
        const role = roles.find((r) => r.name?.toLowerCase?.() === lower || r.slug?.toLowerCase?.() === lower);
        return role?.id || value;
      });
      return { targetType: 'role', targetIds: resolved };
    }

    if (type === 'rank') {
      return { targetType: 'rank', targetIds: values.map((value) => value.toUpperCase()) };
    }

    if (type === 'squad') {
      const squads = await ensureSquads();
      const resolved = values.map((value) => {
        const lower = value.toLowerCase();
        const squad = squads.find((s) => s.name?.toLowerCase?.() === lower || s.slug?.toLowerCase?.() === lower);
        return squad?.id || value;
      });
      return { targetType: 'squad', targetIds: resolved };
    }

    return null;
  }, [ensureMembers, ensureRoles, ensureSquads]);

  const executeCommand = useCallback(async (content) => {
    const parsed = parseCommandLine(content);
    if (!parsed) return false;

    const { command, args } = parsed;
    if (command === 'help') {
      setShowCommandHelp(true);
      return true;
    }

    if (command === 'whisper') {
      const [targetToken, ...messageParts] = args.split(' ');
      const message = messageParts.join(' ').trim();
      const targetSpec = parseTargetToken(targetToken);
      if (!targetSpec || !message) {
        notify('Whisper', 'Usage: /whisper role:Rangers <message>', 'warning');
        return true;
      }
      const resolved = await resolveWhisperTargets(targetSpec);
      if (!resolved?.targetIds?.length) {
        notify('Whisper', 'No matching recipients found.', 'warning');
        return true;
      }
      try {
        await invokeMemberFunction('sendWhisper', {
          message,
          targetType: resolved.targetType,
          targetIds: resolved.targetIds,
          channelId: selectedChannelId,
          eventId: activeOp?.activeEventId || null,
        });
        notify('Whisper sent', `Delivered to ${resolved.targetIds.length} recipient(s).`, 'success');
      } catch (error) {
        console.error('Whisper failed:', error);
        notify('Whisper failed', error?.message || 'Unable to send whisper.', 'error');
      }
      return true;
    }

    if (command === 'broadcast') {
      const [targetToken, ...messageParts] = args.split(' ');
      const message = messageParts.join(' ').trim();
      if (!message) {
        notify('Broadcast', 'Usage: /broadcast #ops,#intel <message>', 'warning');
        return true;
      }
      const target = targetToken || 'fleet';
      const payload = { message, eventId: activeOp?.activeEventId || null };

      if (target.startsWith('#')) {
        payload.channelNames = target.replace('#', '').split(',').map((t) => t.trim()).filter(Boolean);
      } else if (target.includes(':')) {
        const [scope, scopeRaw] = target.split(':');
        payload.scope = scope.toLowerCase();
        payload.scopeNames = scopeRaw ? scopeRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];
      } else if (['fleet', 'wing', 'squad'].includes(target.toLowerCase())) {
        payload.scope = target.toLowerCase();
      } else {
        payload.channelNames = [target];
      }

      try {
        await invokeMemberFunction('broadcastMessage', payload);
        notify('Broadcast sent', 'Message delivered to target channels.', 'success');
      } catch (error) {
        console.error('Broadcast failed:', error);
        notify('Broadcast failed', error?.message || 'Unable to broadcast.', 'error');
      }
      return true;
    }

    if (command === 'sitrep') {
      if (!aiEnabled) {
        notify('SITREP disabled', 'AI features are Disabled for this profile.', 'warning');
        return true;
      }
      if (!selectedChannelId) {
        notify('SITREP', 'Select a channel to post the SITREP.', 'warning');
        return true;
      }
      const windowMinutes = Number.parseInt(args, 10);
      const timeWindowMinutes = Number.isFinite(windowMinutes) ? windowMinutes : 15;
      try {
        const response = await invokeMemberFunction('generateMultiChannelSummary', {
          timeWindowMinutes,
          eventId: activeOp?.activeEventId || null,
        });
        const sitrep = response?.data?.sitrep || response?.data;
        const summary = sitrep?.summary || sitrep?.operational_status || 'SITREP generated.';
        const message = `[SITREP] ${summary}`;
        const newMsg = await base44.entities.Message.create({
          channel_id: selectedChannelId,
          user_id: user?.id,
          content: message,
        });
        if (newMsg?.id && message.includes('@')) {
          invokeMemberFunction('processMessageMentions', {
            messageId: newMsg.id,
            channelId: selectedChannelId,
            content: message,
          }).catch(() => {});
        }
        if (newMsg?.id && message.includes('#')) {
          invokeMemberFunction('routeChannelMessage', {
            messageId: newMsg.id,
            channelId: selectedChannelId,
            content: message,
            isRouted: false,
          }).catch(() => {});
        }
      } catch (error) {
        console.error('SITREP failed:', error);
        notify('SITREP failed', error?.message || 'Unable to generate SITREP.', 'error');
      }
      return true;
    }

    if (['orders', 'status', 'contact'].includes(command)) {
      if (!selectedChannelId) {
        notify('Command', 'Select a channel to post this command.', 'warning');
        return true;
      }
      const message = formatTemplate(command, args);
      const newMsg = await base44.entities.Message.create({
        channel_id: selectedChannelId,
        user_id: user?.id,
        content: message,
      });
      if (newMsg?.id && message.includes('@')) {
        invokeMemberFunction('processMessageMentions', {
          messageId: newMsg.id,
          channelId: selectedChannelId,
          content: message,
        }).catch(() => {});
      }
      if (newMsg?.id && message.includes('#')) {
        invokeMemberFunction('routeChannelMessage', {
          messageId: newMsg.id,
          channelId: selectedChannelId,
          content: message,
          isRouted: false,
        }).catch(() => {});
      }
      return true;
    }

    notify('Unknown command', 'Use /help to view available commands.', 'warning');
    return true;
  }, [activeOp?.activeEventId, notify, resolveWhisperTargets, selectedChannelId, user?.id]);

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedChannelId || !user?.id) return;

    try {
      const handled = await executeCommand(messageInput);
      if (handled) {
        setMessageInput('');
        return;
      }

      const newMsg = await base44.entities.Message.create({
        channel_id: selectedChannelId,
        user_id: user.id,
        content: messageInput,
      });

      // Update channel's last_message_at
      await base44.entities.Channel.update(selectedChannelId, {
        last_message_at: new Date().toISOString(),
      });

      if (newMsg?.id && typeof messageInput === 'string' && messageInput.includes('@')) {
        invokeMemberFunction('processMessageMentions', {
          messageId: newMsg.id,
          channelId: selectedChannelId,
          content: messageInput,
        }).catch(() => {});
      }

      if (newMsg?.id && typeof messageInput === 'string' && messageInput.includes('#')) {
        invokeMemberFunction('routeChannelMessage', {
          messageId: newMsg.id,
          channelId: selectedChannelId,
          content: messageInput,
          isRouted: false,
        }).catch(() => {});
      }

      setMessages((prev) => [...prev, newMsg]);
      setMessageInput('');
      clearTyping();
      refreshUnreadCounts();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [messageInput, selectedChannelId, user?.id, refreshUnreadCounts, clearTyping, executeCommand]);

  const filteredChannels = Object.entries(groupedChannels)
    .flatMap(([, chans]) => chans)
    .filter((ch) => ch.name.toLowerCase().includes(searchInput.toLowerCase()));

  const selectedChannel = React.useMemo(
    () => channels.find((ch) => ch.id === selectedChannelId),
    [channels, selectedChannelId]
  );
  const channelDisplayName = React.useMemo(() => {
    if (!selectedChannel) return 'No channel selected';
    if (selectedChannel.is_dm) {
      return selectedChannel.group_name || 'Direct Line';
    }
    return `#${selectedChannel.name}`;
  }, [selectedChannel]);
  const channelCategoryLabel = React.useMemo(() => {
    if (!selectedChannel) return 'CHANNEL';
    if (selectedChannel.is_dm) {
      return selectedChannel.is_group_chat ? 'GROUP DM' : 'DIRECT';
    }
    return selectedChannel.category ? selectedChannel.category.toUpperCase() : 'CHANNEL';
  }, [selectedChannel]);
  const unreadTotal = unreadByTab?.comms || 0;
  const boundCommsChannel = React.useMemo(() => {
    if (!activeOp?.binding?.commsChannelId) return null;
    return channels.find((ch) => ch.id === activeOp.binding.commsChannelId) || null;
  }, [channels, activeOp?.binding?.commsChannelId]);
  const slowModeSeconds = selectedChannel?.slow_mode_seconds ? Number(selectedChannel.slow_mode_seconds) : 0;
  const isReadOnly = Boolean(selectedChannel?.is_read_only) && !isAdmin;
  const isMuted = Boolean(muteInfo);
  const composerDisabled = isReadOnly || isMuted || slowModeRemaining > 0;
  const composerDisabledReason = isReadOnly
    ? 'Read-only channel: only admins can post.'
    : isMuted
    ? `Muted${muteRemaining ? ` · ${muteRemaining}m remaining` : ''}`
    : slowModeRemaining > 0
    ? `Slow mode: wait ${slowModeRemaining}s`
    : '';
  const commsSignalLabel = dndEnabled ? 'DND' : 'ACTIVE';
  const commsSignalTone = dndEnabled
    ? 'text-orange-300 border-orange-500/40 bg-orange-500/10'
    : 'text-green-300 border-green-500/40 bg-green-500/10';
  const disciplineLabel = isReadOnly
    ? 'Read-only'
    : isMuted
    ? 'Muted'
    : slowModeSeconds > 0
    ? `Slow ${slowModeSeconds}s`
    : 'Open';
  const disciplineDetail = isMuted && muteRemaining
    ? `${muteRemaining}m remaining`
    : slowModeRemaining > 0
    ? `${slowModeRemaining}s remaining`
    : null;

  const clampCommandCoreHeight = useCallback((value) => {
    return Math.max(MIN_COMMAND_CORE_HEIGHT, Math.min(MAX_COMMAND_CORE_HEIGHT, value));
  }, []);

  const handleCommandCoreResizeMove = useCallback((event) => {
    if (!commandCoreResizingRef.current) return;
    const delta = event.clientY - commandCoreResizeStartRef.current.y;
    const nextHeight = clampCommandCoreHeight(commandCoreResizeStartRef.current.height + delta);
    setCommandCoreHeight(nextHeight);
  }, [clampCommandCoreHeight]);

  const handleCommandCoreResizeEnd = useCallback(() => {
    if (!commandCoreResizingRef.current) return;
    commandCoreResizingRef.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', handleCommandCoreResizeMove);
    window.removeEventListener('mouseup', handleCommandCoreResizeEnd);
  }, [handleCommandCoreResizeMove]);

  const handleCommandCoreResizeStart = useCallback((event) => {
    event.preventDefault();
    commandCoreResizingRef.current = true;
    commandCoreResizeStartRef.current = { y: event.clientY, height: commandCoreHeight };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
    window.addEventListener('mousemove', handleCommandCoreResizeMove);
    window.addEventListener('mouseup', handleCommandCoreResizeEnd);
  }, [commandCoreHeight, handleCommandCoreResizeEnd, handleCommandCoreResizeMove]);

  useEffect(() => {
    return () => {
      if (commandCoreResizingRef.current) {
        handleCommandCoreResizeEnd();
      }
    };
  }, [handleCommandCoreResizeEnd]);

  useEffect(() => {
    if (!slowModeSeconds || !lastSentAt || isAdmin) {
      setSlowModeRemaining(0);
      return;
    }

    const updateRemaining = () => {
      const expiresAt = lastSentAt + slowModeSeconds * 1000;
      const diff = Math.ceil((expiresAt - Date.now()) / 1000);
      setSlowModeRemaining(diff > 0 ? diff : 0);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [slowModeSeconds, lastSentAt, isAdmin]);

  useEffect(() => {
    if (!muteInfo?.expires_at) {
      setMuteRemaining(null);
      return;
    }
    const updateRemaining = () => {
      const diffMs = new Date(muteInfo.expires_at).getTime() - Date.now();
      if (diffMs <= 0) {
        setMuteRemaining(null);
        return;
      }
      const minutes = Math.ceil(diffMs / 60000);
      setMuteRemaining(minutes);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 30000);
    return () => clearInterval(interval);
  }, [muteInfo?.expires_at]);

  if (!isOpen) return null;

  return (
    <div className={`bg-zinc-950 border-t border-orange-500/20 flex flex-col flex-shrink-0 shadow-2xl z-[600] relative transition-all duration-200 ${isMinimized ? 'h-12' : 'h-96'}`}>
      {/* Header — Comms Command Core */}
      <div className="border-b border-orange-500/20 px-5 py-3 flex items-center justify-between bg-gradient-to-r from-zinc-950/80 to-transparent flex-shrink-0">
        <div className="flex items-center gap-3">
          <Hash className="w-4 h-4 text-orange-500/70" />
          {isMinimized ? (
            <h3 className="text-[11px] font-black uppercase text-zinc-300 tracking-widest">COMMS</h3>
          ) : (
            <div>
              <h3 className="text-xs font-black uppercase text-orange-400 tracking-widest">Comms Command Core</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-0.5">
                Signal Routing &amp; Text Ops
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onMinimize?.(!isMinimized)}
            aria-label={isMinimized ? 'Expand comms dock' : 'Minimize comms dock'}
            className="h-7 w-7 text-zinc-500 hover:text-orange-400 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <div
          className="border-b border-orange-500/10 bg-zinc-950/50"
          style={{ height: commandCoreHeight }}
        >
          <div className="flex flex-col h-full">
            <div className="px-4 py-2 space-y-2 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Signal Overview</div>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${commsSignalTone}`}>
                  {commsSignalLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] text-zinc-400">
                <div className="rounded border border-zinc-800/60 bg-zinc-950/40 px-2 py-1">
                  <div className="uppercase tracking-widest text-[9px] text-zinc-500">Active Channel</div>
                  <div className="text-zinc-200 font-semibold truncate">{channelDisplayName}</div>
                  <div className="text-[9px] text-zinc-500">{channelCategoryLabel}</div>
                </div>
                <div className="rounded border border-zinc-800/60 bg-zinc-950/40 px-2 py-1">
                  <div className="uppercase tracking-widest text-[9px] text-zinc-500">Unread</div>
                  <div className="text-zinc-200 font-semibold">{unreadTotal}</div>
                  <div className="text-[9px] text-zinc-500">{viewMode === 'channels' ? 'Channel Ops' : 'Direct Lines'}</div>
                </div>
                <div className="rounded border border-zinc-800/60 bg-zinc-950/40 px-2 py-1">
                  <div className="uppercase tracking-widest text-[9px] text-zinc-500">Mode</div>
                  <div className="text-zinc-200 font-semibold">{viewMode === 'channels' ? 'Channels' : 'DMs'}</div>
                  <div className="text-[9px] text-zinc-500">
                    {activeTab === 'mentions' ? 'Mentions' : activeTab === 'polls' ? 'Polls' : activeTab === 'riggsy' ? 'Riggsy' : 'Comms'}
                  </div>
                </div>
                <div className="rounded border border-zinc-800/60 bg-zinc-950/40 px-2 py-1">
                  <div className="uppercase tracking-widest text-[9px] text-zinc-500">Discipline</div>
                  <div className="text-zinc-200 font-semibold">{disciplineLabel}</div>
                  {disciplineDetail && <div className="text-[9px] text-zinc-500">{disciplineDetail}</div>}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowGlobalSearch(true)}
                  className="h-7 text-[10px] font-semibold"
                >
                  <Search className="w-3 h-3 mr-1" />
                  Search
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTemplateDialog(true)}
                  className="h-7 text-[10px] font-semibold"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Templates
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCommandHelp(true)}
                  className="h-7 text-[10px] font-semibold"
                >
                  <HelpCircle className="w-3 h-3 mr-1" />
                  Commands
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNotificationSettings(true)}
                  disabled={!selectedChannelId}
                  className="h-7 text-[10px] font-semibold"
                >
                  <Bell className="w-3 h-3 mr-1" />
                  Alerts
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowExportDialog(true)}
                  disabled={!selectedChannelId}
                  className="h-7 text-[10px] font-semibold"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
                <Button
                  size="sm"
                  variant={dndEnabled ? 'default' : 'outline'}
                  onClick={() => setDndEnabled((prev) => !prev)}
                  className="h-7 text-[10px] font-semibold"
                  title={dndEnabled ? 'Disable Do Not Disturb' : 'Enable Do Not Disturb'}
                >
                  <Moon className="w-3 h-3 mr-1" />
                  {dndEnabled ? 'DND On' : 'DND Off'}
                </Button>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowModerationPanel(true)}
                    disabled={!selectedChannelId}
                    className="h-7 text-[10px] font-semibold"
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    Moderation
                  </Button>
                )}
              </div>

              {boundCommsChannel && boundCommsChannel.id !== selectedChannelId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-[10px]"
                  onClick={() => {
                    setSelectedChannelId(boundCommsChannel.id);
                    setActiveTab('comms');
                    setViewMode(boundCommsChannel.is_dm ? 'dms' : 'channels');
                  }}
                >
                  Sync to Bound Op Channel · {boundCommsChannel.is_dm ? boundCommsChannel.group_name || 'Direct Line' : `#${boundCommsChannel.name}`}
                </Button>
              )}
            </div>

            <div
              className="h-2 border-t border-orange-500/10 bg-zinc-950/80 cursor-row-resize flex items-center justify-center"
              onMouseDown={handleCommandCoreResizeStart}
              title="Drag to resize command core"
            >
              <div className="h-1 w-10 rounded-full bg-zinc-800/80" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs — Comms active, others disabled with "coming soon" */}
      {!isMinimized && (
        <div className="flex border-b border-orange-500/10 bg-zinc-950/40 flex-shrink-0 overflow-x-auto">
          {['comms', 'dms', 'mentions', 'polls', 'riggsy', 'inbox'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                if (tab === 'comms') {
                  setActiveTab('comms');
                  setViewMode('channels');
                } else if (tab === 'dms') {
                  setActiveTab('comms');
                  setViewMode('dms');
                } else if (tab === 'mentions') {
                  setActiveTab('mentions');
                } else if (tab === 'polls') {
                  setActiveTab('polls');
                } else if (tab === 'riggsy') {
                  setActiveTab('riggsy');
                }
              }}
              disabled={tab === 'inbox'}
              className={`whitespace-nowrap text-[11px] font-semibold uppercase px-3 py-2 transition-all border-b-2 ${
                tab === 'inbox'
                  ? 'text-zinc-600 border-transparent cursor-not-allowed opacity-50'
                  : activeTab === tab || (tab === 'comms' && viewMode === 'channels' && activeTab === 'comms') || (tab === 'dms' && viewMode === 'dms' && activeTab === 'comms')
                  ? 'text-orange-400 border-orange-500'
                  : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:border-orange-500/30'
              }`}
              title={tab === 'inbox' ? 'Coming soon' : ''}
            >
              {tab === 'comms' && <>Channels {viewMode === 'channels' && unreadByTab?.comms > 0 && <span className="ml-1 text-orange-400">({unreadByTab.comms})</span>}</>}
              {tab === 'dms' && <>DMs</>}
              {tab === 'mentions' && <>@Mentions</>}
              {tab === 'polls' && <>Polls</>}
              {tab === 'riggsy' && <>Riggsy {!aiEnabled && <span className="text-[9px] text-zinc-600 ml-1">(Disabled)</span>}</>}
              {tab === 'inbox' && <>Inbox <span className="text-[9px] text-zinc-700 ml-1">(coming soon)</span></>}
            </button>
          ))}
        </div>
      )}

      {/* Content — Comms tab only */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'comms' && (
            <div className="flex-1 overflow-hidden flex">
              {/* Channel/DM List */}
              <div className="w-48 lg:w-56 border-r border-orange-500/10 flex flex-col overflow-hidden min-w-0 flex-shrink-0">
              {viewMode === 'dms' ? (
                <DMChannelList
                  currentUserId={user?.id}
                  selectedChannelId={selectedChannelId}
                  onSelectChannel={setSelectedChannelId}
                  onCreateDM={() => {
                    setUserPickerMode('dm');
                    setShowUserPicker(true);
                  }}
                  onCreateGroup={() => {
                    setUserPickerMode('group');
                    setShowUserPicker(true);
                  }}
                  unreadCounts={unreadByChannel}
                />
              ) : (
                <>
              {/* Search Input */}
              <div className="px-2 py-2 flex-shrink-0">
                <Input
                  placeholder="Find channel..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-8 text-xs bg-zinc-900/50 border-orange-500/10 placeholder:text-zinc-600 focus:border-orange-500/30 transition-colors"
                />
              </div>

              {recommendedChannels?.length > 0 && (
                <div className="px-2 pb-2">
                  <div className="text-[9px] uppercase tracking-widest text-orange-400 mb-1">Recommended</div>
                  <div className="space-y-1">
                    {recommendedChannels.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => setSelectedChannelId(ch.id)}
                        className={`w-full text-left px-2 py-1 rounded text-[11px] transition-colors ${
                          selectedChannelId === ch.id
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                        }`}
                      >
                        #{ch.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

               {/* Channel Groups */}
               <div className="flex-1 overflow-y-auto space-y-3 px-2 py-2">
                 {groupedChannels.casual.length === 0 && groupedChannels.focused.length === 0 && groupedChannels.temporary.length === 0 ? (
                   <div className="text-center text-[10px] text-zinc-600 py-4">
                     <div className="opacity-50">—</div>
                     <div className="mt-1">No channels available</div>
                   </div>
                 ) : (
                   <>
                     {/* Casual Channels */}
                     {groupedChannels.casual.length > 0 && (
                       <div>
                         <div className="text-[10px] font-black uppercase text-zinc-500 px-2 py-1 tracking-widest">Casual</div>
                         <div className="space-y-1 mt-1">
                           {groupedChannels.casual.map((ch) => (
                             <button
                               key={ch.id}
                               onClick={() => setSelectedChannelId(ch.id)}
                               className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                                 selectedChannelId === ch.id
                                   ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                   : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-300'
                               }`}
                             >
                               <Hash className="w-3 h-3 flex-shrink-0 opacity-70" />
                               <span className="truncate">{ch.name}</span>
                               {unreadByChannel?.[ch.id] > 0 && (
                                 <span className="ml-auto text-orange-400 font-semibold text-[10px]">{unreadByChannel[ch.id]}</span>
                               )}
                             </button>
                           ))}
                         </div>
                       </div>
                     )}

                     {/* Focused Channels */}
                     {groupedChannels.focused.length > 0 && (
                       <div className="pt-2 border-t border-orange-500/10">
                         <div className="text-[10px] font-black uppercase text-orange-600 px-2 py-1 tracking-widest">Focused</div>
                         <div className="space-y-1 mt-1">
                           {groupedChannels.focused.map((ch) => {
                             const canAccess = canAccessChannel(ch);
                             return (
                               <button
                                 key={ch.id}
                                 onClick={() => canAccess && setSelectedChannelId(ch.id)}
                                 disabled={!canAccess}
                                 className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors min-w-0 ${
                                   !canAccess
                                     ? 'text-zinc-600 opacity-50 cursor-not-allowed'
                                     : selectedChannelId === ch.id
                                     ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                     : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-300'
                                 }`}
                                 title={!canAccess ? 'Insufficient permissions' : ''}
                               >
                                 {!canAccess ? <Lock className="w-3 h-3 flex-shrink-0 opacity-70" /> : <Hash className="w-3 h-3 flex-shrink-0 opacity-70" />}
                                 <span className="truncate flex-1 min-w-0">{ch.name}</span>
                                 {unreadByChannel?.[ch.id] > 0 && (
                                   <span className="ml-auto text-orange-400 font-semibold text-[10px] flex-shrink-0">{unreadByChannel[ch.id]}</span>
                                 )}
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     )}

                     {/* Temporary Channels */}
                     {groupedChannels.temporary.length > 0 && (
                       <div className="pt-2 border-t border-orange-500/10">
                         <div className="text-[10px] font-black uppercase text-zinc-500 px-2 py-1 tracking-widest">Temporary</div>
                         <div className="space-y-1 mt-1">
                           {groupedChannels.temporary.map((ch) => (
                             <button
                               key={ch.id}
                               onClick={() => setSelectedChannelId(ch.id)}
                               className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                                 selectedChannelId === ch.id
                                   ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                   : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-300'
                               }`}
                             >
                               <Hash className="w-3 h-3 flex-shrink-0 opacity-70" />
                               <span className="truncate">{ch.name}</span>
                               {unreadByChannel?.[ch.id] > 0 && (
                                 <span className="ml-auto text-orange-400 font-semibold text-[10px]">{unreadByChannel[ch.id]}</span>
                               )}
                             </button>
                           ))}
                         </div>
                       </div>
                     )}
                   </>
                   )}
                   </div>
                   </>
                   )}
                   </div>

                   {/* Message Area */}
                   <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Channel Header */}
                  {selectedChannel ? (
                    <div className="border-b border-orange-500/10 px-4 py-3 bg-zinc-900/40 flex-shrink-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0">
                          {!canAccessChannel(selectedChannel) ? (
                            <Lock className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Hash className="w-3.5 h-3.5 text-orange-500/70 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <div className="text-[11px] font-black uppercase text-zinc-300 tracking-widest truncate">
                              {channelDisplayName}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-widest text-zinc-500 mt-1">
                              <span className="px-2 py-0.5 rounded border border-zinc-700/60 bg-zinc-950/40">
                                {channelCategoryLabel}
                              </span>
                              {selectedChannel?.is_read_only && (
                                <span className="px-2 py-0.5 rounded border border-zinc-700/60 text-zinc-400">
                                  Read-only
                                </span>
                              )}
                              {slowModeSeconds > 0 && (
                                <span className="px-2 py-0.5 rounded border border-orange-500/30 text-orange-300">
                                  Slow {slowModeSeconds}s
                                </span>
                              )}
                              {isMuted && (
                                <span className="px-2 py-0.5 rounded border border-orange-500/30 text-orange-300">
                                  Muted{muteRemaining ? ` · ${muteRemaining}m` : ''}
                                </span>
                              )}
                              {selectedChannel?.is_group_chat && (
                                <span className="px-2 py-0.5 rounded border border-zinc-700/60 text-zinc-400">
                                  {selectedChannel.dm_participants?.length || 0} members
                                </span>
                              )}
                            </div>
                            {selectedChannel?.description && (
                              <div className="text-[10px] text-zinc-500 mt-2 truncate">
                                {selectedChannel.description}
                              </div>
                            )}
                          </div>
                        </div>
                        {isAdmin && selectedChannel && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <AIModerationIndicator channelId={selectedChannel.id} isAdmin={true} />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border-b border-orange-500/10 px-4 py-3 bg-zinc-900/40 text-[10px] text-zinc-500">
                      Select a channel to begin.
                    </div>
                  )}

                  {/* Pinned Messages */}
                  <PinnedMessages channelId={selectedChannelId} />

                {/* Messages — Enhanced with MessageItem component */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1 text-xs flex flex-col min-h-0">
                  {loadingMessages && (
                    <div className="flex items-center justify-center h-full text-zinc-500">
                      <div className="text-xs text-center">
                        <div className="animate-pulse mb-2 text-orange-500">⟳</div>
                        <div>Loading messages...</div>
                      </div>
                    </div>
                  )}
                  {messages.length === 0 && !loadingMessages && (
                    <div className="flex items-center justify-center h-full text-zinc-600">
                      <div className="text-center">
                        <div className="text-[10px] opacity-50 mb-1">—</div>
                        <div className="text-[10px]">No messages in this channel yet</div>
                      </div>
                    </div>
                  )}
                  {messages.length > 0 && (
                    <>
                      {messages.map((msg) => {
                        const lastSeen = lastSeenMap[msg.user_id];
                        return (
                          <MessageItem
                            key={msg.id}
                            message={msg}
                            currentUserId={user?.id}
                            isAdmin={isAdmin}
                            lastSeen={lastSeen}
                            presenceRecord={presenceMap[msg.user_id]}
                            authorLabel={memberMap[msg.user_id]?.label}
                            memberProfile={memberMap[msg.user_id]?.profile}
                            autoLinkPreview={autoLinkPreview}
                            onEdit={() => {
                              // Refresh messages after edit
                              const loadMessages = async () => {
                                const msgs = await base44.entities.Message.filter({ channel_id: selectedChannelId });
                                const visible = (msgs || []).filter(canViewMessage);
                                setMessages(visible.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
                              };
                              loadMessages();
                            }}
                            onDelete={async (msgToDelete) => {
                              try {
                                await base44.entities.Message.update(msgToDelete.id, {
                                  is_deleted: true,
                                  deleted_by: user.id,
                                  deleted_at: new Date().toISOString(),
                                });
                                notify('Message Removed', 'Message was removed from the channel.', 'success');
                              } catch (error) {
                                console.error('Failed to delete message:', error);
                                notify('Delete Failed', error?.message || 'Unable to remove message.', 'error');
                              }
                            }}
                            onReply={(msg) => setThreadPanelMessage(msg)}
                            onPin={async (msg) => {
                              try {
                                // Check if already pinned
                                const existing = await base44.entities.PinnedMessage.filter({
                                  channel_id: selectedChannelId,
                                  message_id: msg.id,
                                });

                                if (existing.length > 0) {
                                  notify('Pin Skipped', 'Message is already pinned.', 'warning');
                                  return;
                                }

                                // Get current pin count for order
                                const allPinned = await base44.entities.PinnedMessage.filter({
                                  channel_id: selectedChannelId,
                                });

                                await base44.entities.PinnedMessage.create({
                                  channel_id: selectedChannelId,
                                  message_id: msg.id,
                                  pinned_by: user.id,
                                  pin_order: allPinned.length,
                                });
                              } catch (error) {
                                console.error('Failed to pin message:', error);
                              }
                            }}
                            />
                            );
                            })}
                            <div ref={messagesEndRef} />
                            </>
                            )}
                            {/* Typing Indicator */}
                            {typingUsers.length > 0 && <TypingIndicator userIds={typingUsers} />}
                            </div>

                {/* Composer — Enhanced with MessageComposer */}
                {!selectedChannel || !canAccessChannel(selectedChannel) ? (
                  <div className="border-t border-orange-500/10 p-3 bg-zinc-900/40 flex-shrink-0">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-600 px-3 py-2 bg-zinc-800/30 rounded border border-zinc-700/50">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">Cannot post to this channel</span>
                    </div>
                  </div>
                ) : (
                  <MessageComposer
                    channelId={selectedChannelId}
                    userId={user?.id}
                    draftKey={selectedChannelId ? `nexus.comms.draft.${selectedChannelId}` : ''}
                    disabled={composerDisabled}
                    disabledReason={composerDisabledReason}
                    onSendMessage={async (messageData, composerContext = {}) => {
                      if (composerDisabled) return;
                      try {
                        const handled = await executeCommand(messageData?.content || '');
                        if (handled) return;

                        const newMsg = await base44.entities.Message.create(messageData);
                        void registerMessageAttachments(newMsg, composerContext?.attachments || []);
                        if (newMsg?.id && messageData?.content && messageData.content.includes('@')) {
                          invokeMemberFunction('processMessageMentions', {
                            messageId: newMsg.id,
                            channelId: selectedChannelId,
                            content: messageData.content,
                          }).catch(() => {});
                        }
                        if (newMsg?.id && messageData?.content && messageData.content.includes('#')) {
                          invokeMemberFunction('routeChannelMessage', {
                            messageId: newMsg.id,
                            channelId: selectedChannelId,
                            content: messageData.content,
                            isRouted: false,
                          }).catch(() => {});
                        }
                        clearTyping();
                        refreshUnreadCounts();
                        if (slowModeKey) {
                          const now = Date.now();
                          setLastSentAt(now);
                          try {
                            localStorage.setItem(slowModeKey, String(now));
                          } catch {
                            // ignore storage errors
                          }
                        }
                      } catch (error) {
                        console.error('Failed to send message:', error);
                      }
                    }}
                    onTyping={signalTyping}
                  />
                )}
                </div>

                {/* Thread Panel */}
                {threadPanelMessage && (
                <ThreadPanel
                  parentMessage={threadPanelMessage}
                  onClose={() => setThreadPanelMessage(null)}
                  currentUserId={user?.id}
                  isAdmin={isAdmin}
                  composerDisabled={composerDisabled}
                  composerDisabledReason={composerDisabledReason}
                  autoLinkPreview={autoLinkPreview}
                />
                )}
                </div>
                </div>
                )}

                {activeTab === 'mentions' && (
                <MentionsView 
                user={user} 
                onJumpToMessage={(msg) => {
                  setSelectedChannelId(msg.channel_id);
                  setActiveTab('comms');
                  setViewMode('channels');
                }}
                />
                )}

                {activeTab === 'polls' && (
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {!selectedChannelId ? (
                      <div className="text-xs text-zinc-600 text-center py-4">Select a channel to view polls.</div>
                    ) : (
                      <>
                        {!showPollCreator && (
                          <Button onClick={() => setShowPollCreator(true)} variant="outline" className="w-full text-xs">
                            Create Poll
                          </Button>
                        )}

                        {showPollCreator && (
                          <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800 space-y-2">
                            <Input
                              value={pollQuestion}
                              onChange={(e) => setPollQuestion(e.target.value)}
                              placeholder="Poll question..."
                              className="h-8 text-xs"
                            />
                            {pollOptions.map((opt, idx) => (
                              <Input
                                key={idx}
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...pollOptions];
                                  updated[idx] = e.target.value;
                                  setPollOptions(updated);
                                }}
                                placeholder={`Option ${idx + 1}`}
                                className="h-8 text-xs"
                              />
                            ))}
                            <div className="flex gap-2">
                              <Button onClick={() => setPollOptions([...pollOptions, ''])} variant="outline" size="sm">
                                Add Option
                              </Button>
                              <Button onClick={createPoll} size="sm">Create</Button>
                              <Button onClick={() => setShowPollCreator(false)} variant="outline" size="sm">Cancel</Button>
                            </div>
                          </div>
                        )}

                        {loadingPolls ? (
                          <div className="text-xs text-zinc-600 text-center py-4">Loading polls...</div>
                        ) : polls.length === 0 ? (
                          <div className="text-xs text-zinc-600 text-center py-4">No polls yet.</div>
                        ) : (
                          polls.map((poll) => {
                            const userVote = poll.votes?.find((v) => v.user_id === user?.id);
                            const voteCounts = {};
                            poll.options?.forEach((opt) => (voteCounts[opt.id] = 0));
                            poll.votes?.forEach((vote) => {
                              vote.selected_option_ids?.forEach((optId) => {
                                voteCounts[optId] = (voteCounts[optId] || 0) + 1;
                              });
                            });
                            const totalVotes = poll.votes?.length || 0;

                            return (
                              <div key={poll.id} className="p-3 bg-zinc-900/40 rounded border border-zinc-800 space-y-2">
                                <div className="text-xs font-semibold text-white">{poll.question}</div>
                                <div className="space-y-1.5">
                                  {poll.options?.map((option) => {
                                    const count = voteCounts[option.id] || 0;
                                    const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                                    const hasVoted = userVote?.selected_option_ids?.includes(option.id);

                                    return (
                                      <button
                                        key={option.id}
                                        onClick={() => !userVote && votePoll(poll.id, option.id)}
                                        disabled={!!userVote}
                                        className={`w-full p-2 rounded border text-left text-xs transition-colors ${
                                          hasVoted
                                            ? 'bg-orange-500/20 border-orange-500'
                                            : userVote
                                            ? 'bg-zinc-900/30 border-zinc-700 cursor-not-allowed'
                                            : 'bg-zinc-900/30 border-zinc-700 hover:border-orange-500/50'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-zinc-200">{option.text}</span>
                                          <span className="text-[10px] text-zinc-500">{count} ({percentage}%)</span>
                                        </div>
                                        {userVote && (
                                          <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-500" style={{ width: `${percentage}%` }} />
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="text-[10px] text-zinc-600">
                                  {totalVotes} vote{totalVotes !== 1 ? 's' : ''} • Ends {poll.closes_at ? new Date(poll.closes_at).toLocaleDateString() : '—'}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'riggsy' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                      <AIFeatureToggle
                        label="Riggsy AI Access"
                        description="Toggle AI assistant access for this profile."
                      />
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                        <div className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">
                          Riggsy Tactical AI {aiEnabled ? '' : '· Disabled'}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {aiEnabled
                            ? 'Ask for comms summaries, tactical insights, or channel guidance.'
                            : 'AI assistant is disabled. Enable AI features to send prompts.'}
                        </div>
                      </div>

                      {riggsyResponse && (
                        <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded">
                          <div className="text-[10px] text-blue-400 font-semibold mb-2">RIGGSY RESPONSE</div>
                          <div className="text-xs text-zinc-300 whitespace-pre-wrap">{riggsyResponse}</div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-orange-500/10 p-3 bg-zinc-900/40">
                      <div className="flex gap-2">
                        <Input
                          value={riggsyPrompt}
                          onChange={(e) => setRiggsyPrompt(e.target.value)}
                          placeholder={aiEnabled ? 'Ask Riggsy anything...' : 'Riggsy is disabled'}
                          className="h-9 text-xs"
                          disabled={!aiEnabled}
                        />
                        <Button onClick={askRiggsy} disabled={!aiEnabled || !riggsyPrompt.trim() || riggsyLoading} className="h-9">
                          {riggsyLoading ? '...' : aiEnabled ? 'Ask' : 'Disabled'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                </div>
                )}

                {/* User Picker Modal */}
      <UserPickerModal
        isOpen={showUserPicker}
        onClose={() => setShowUserPicker(false)}
        onConfirm={userPickerMode === 'dm' ? handleCreateDM : handleCreateGroup}
        mode={userPickerMode}
        currentUserId={user?.id}
      />

      {/* Global Message Search */}
      <GlobalMessageSearch
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        onSelectMessage={(msg) => {
          setSelectedChannelId(msg.channel_id);
          setViewMode('channels');
        }}
        currentUserId={user?.id}
      />

      {/* Channel Notification Settings */}
      <ChannelNotificationSettings
        channel={selectedChannel}
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
        userId={user?.id}
        autoLinkPreview={autoLinkPreview}
        onToggleAutoLinkPreview={setAutoLinkPreview}
      />

      <CommsTemplateDialog
        isOpen={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        channels={channels}
        defaultChannelId={selectedChannelId}
        onSendTemplate={async ({ content, channelIds }) => {
          if (!content) return;
          if (!channelIds || channelIds.length === 0) {
            notify('Template', 'Select at least one channel.', 'warning');
            return;
          }

          try {
            if (channelIds.length > 1) {
              await invokeMemberFunction('broadcastMessage', {
                message: content,
                channelIds,
                eventId: activeOp?.activeEventId || null,
              });
            } else {
              const newMsg = await base44.entities.Message.create({
                channel_id: channelIds[0],
                user_id: user?.id,
                content,
              });
              if (newMsg?.id && content.includes('@')) {
                invokeMemberFunction('processMessageMentions', {
                  messageId: newMsg.id,
                  channelId: channelIds[0],
                  content,
                }).catch(() => {});
              }
              if (newMsg?.id && content.includes('#')) {
                invokeMemberFunction('routeChannelMessage', {
                  messageId: newMsg.id,
                  channelId: channelIds[0],
                  content,
                  isRouted: false,
                }).catch(() => {});
              }
            }
            setShowTemplateDialog(false);
            notify('Template sent', 'Structured message delivered.', 'success');
          } catch (error) {
            console.error('Template send failed:', error);
            notify('Template failed', error?.message || 'Unable to send template.', 'error');
          }
        }}
      />

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Channel History</DialogTitle>
            <div className="text-xs text-zinc-500">
              {selectedChannel ? `#${selectedChannel.name}` : 'Select a channel'}
            </div>
          </DialogHeader>
          <div className="space-y-3 text-xs text-zinc-400">
            <div>
              Exports the most recent 1,000 messages from this channel.
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => exportHistory('json')}
                disabled={exporting || !selectedChannelId}
              >
                {exporting ? 'Exporting...' : 'Export JSON'}
              </Button>
              <Button
                variant="outline"
                onClick={() => exportHistory('csv')}
                disabled={exporting || !selectedChannelId}
              >
                Export CSV
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCommandHelp} onOpenChange={setShowCommandHelp}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Comms Commands</DialogTitle>
            <div className="text-xs text-zinc-500">Tactical shortcuts for structured comms.</div>
          </DialogHeader>
          <div className="space-y-2 text-xs text-zinc-300">
            {COMMAND_DEFS.map((cmd) => (
              <div key={cmd.id} className="flex items-start gap-3 border border-zinc-800 rounded p-2 bg-zinc-900/40">
                <div className="font-mono text-orange-300 whitespace-nowrap">{cmd.usage}</div>
                <div className="text-zinc-400">{cmd.description}</div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommandHelp(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Moderation Panel */}
      <ModerationPanel
        channel={selectedChannel}
        isOpen={showModerationPanel}
        onClose={() => setShowModerationPanel(false)}
        currentUser={user}
      />
    </div>
  );
}
