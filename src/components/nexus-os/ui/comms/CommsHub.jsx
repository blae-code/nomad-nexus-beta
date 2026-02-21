import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, Send, Settings, Bell, Hash, AtSign, Trash2, ChevronDown, ChevronLeft, ChevronRight, Sparkles, AlertCircle, TrendingUp, Zap, Lightbulb, X } from 'lucide-react';
import { NexusBadge } from '../primitives';
import { queueMessageAnalysis, generateResponseSuggestions, smartSearch } from '../../services/commsAIService';

const CHANNEL_PAGE_SIZE = 6;
const MESSAGE_PAGE_SIZE = 6;
const CHANNEL_CATEGORIES = ['tactical', 'operations', 'social', 'direct'];

/**
 * CommsHub — Integrated text comms panel with page-capped lists.
 */
export default function CommsHub({ operations = [], focusOperationId, activeAppId, online, bridgeId, isExpanded = true, onToggleExpand }) {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({
    tactical: true,
    operations: true,
    social: true,
    direct: true,
  });
  const [channelPages, setChannelPages] = useState({
    tactical: 0,
    operations: 0,
    social: 0,
    direct: 0,
  });
  const [messagePage, setMessagePage] = useState(0);
  const [messageInput, setMessageInput] = useState('');

  const [messageAnalyses, setMessageAnalyses] = useState({});
  const [aiSearchActive, setAiSearchActive] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState(null);
  const [responseSuggestions, setResponseSuggestions] = useState([]);
  const [showAiFeatures, setShowAiFeatures] = useState(true);
  const [selectedMessageForResponse, setSelectedMessageForResponse] = useState(null);

  const channels = useMemo(() => {
    const tactical = [
      { id: 'command', name: 'Command Net', icon: Hash, category: 'tactical', unread: 3 },
      { id: 'alpha-squad', name: 'Alpha Squad', icon: Hash, category: 'tactical', unread: 0 },
      { id: 'logistics', name: 'Logistics', icon: Hash, category: 'tactical', unread: 1 },
    ];

    const operational = operations.slice(0, 12).map((op) => ({
      id: `op-${op.id}`,
      name: op.name || 'Unnamed Op',
      icon: Hash,
      category: 'operations',
      unread: focusOperationId && focusOperationId === op.id ? 1 : 0,
    }));

    const social = [
      { id: 'general', name: 'General', icon: Hash, category: 'social', unread: 0 },
      { id: 'random', name: 'Random', icon: Hash, category: 'social', unread: 0 },
    ];

    const direct = [
      { id: 'dm-command', name: 'Command Officer', icon: AtSign, category: 'direct', unread: online ? 1 : 0 },
      { id: 'dm-ops', name: `${bridgeId} Ops Desk`, icon: AtSign, category: 'direct', unread: 0 },
    ];

    return { tactical, operations: operational, social, direct };
  }, [operations, focusOperationId, online, bridgeId]);

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

  const currentMessages = messages[selectedChannel] || [];
  const orderedMessages = useMemo(() => [...currentMessages].reverse(), [currentMessages]);
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
    () => Object.values(channels).flat().find((entry) => entry.id === selectedChannel),
    [channels, selectedChannel]
  );

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

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedChannel) return;

    const newMessage = {
      id: Date.now(),
      text: messageInput,
      author: 'You',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => ({
      ...prev,
      [selectedChannel]: [...(prev[selectedChannel] || []), newMessage],
    }));
    setMessageInput('');
    setMessagePage(0);

    if (showAiFeatures) {
      queueMessageAnalysis(newMessage).then((analysis) => {
        setMessageAnalyses((prev) => ({ ...prev, [newMessage.id]: analysis }));
      });
    }
  }, [messageInput, selectedChannel, showAiFeatures]);

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
      <div className="nx-comms-header border-b border-zinc-700/40 p-3">
        <div className="flex items-center justify-between">
          {isExpanded ? (
            <>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Text Comms</h3>
                {showAiFeatures ? (
                  <NexusBadge tone="active" className="text-[9px] px-1.5 py-0.5">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    AI
                  </NexusBadge>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowAiFeatures((prev) => !prev)}
                  className={`text-zinc-500 hover:text-orange-500 transition-colors ${showAiFeatures ? 'text-orange-400' : ''}`}
                  title={showAiFeatures ? 'Disable AI features' : 'Enable AI features'}
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <button type="button" className="text-zinc-500 hover:text-orange-500 transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
                <button type="button" onClick={onToggleExpand} className="text-zinc-500 hover:text-orange-500 transition-colors" title="Collapse">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button type="button" onClick={onToggleExpand} className="w-full flex items-center justify-center text-zinc-500 hover:text-orange-500 transition-colors" title="Expand">
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isExpanded ? (
        <>
          <div className="flex-shrink-0 p-2 space-y-1.5 border-b border-zinc-700/40">
            {renderCategory('tactical', 'Tactical')}
            {renderCategory('operations', 'Operations')}
            {renderCategory('social', 'Social')}
            {renderCategory('direct', 'Direct')}
          </div>

          {selectedChannel ? (
            <div className="flex-1 min-h-0 flex flex-col border-t border-zinc-700/40">
              <div className="flex-shrink-0 px-2.5 py-2 border-b border-zinc-700/40 bg-zinc-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-200">{selectedChannelData?.name}</span>
                  </div>
                  <button type="button" className="text-zinc-500 hover:text-orange-500 transition-colors">
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                </div>

                {showAiFeatures ? (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="AI-powered search (natural language)..."
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
                ) : null}

                {aiSearchResults ? (
                  <div className="p-2 rounded border border-orange-500/30 bg-orange-500/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-orange-400 font-semibold uppercase">AI Results</span>
                      <button type="button" onClick={() => setAiSearchResults(null)} className="text-zinc-500 hover:text-zinc-300">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[9px] text-zinc-400 mb-1">{aiSearchResults.summary}</p>
                    {(aiSearchResults.results || []).slice(0, 3).map((result) => (
                      <div key={result.messageId} className="text-[9px] text-zinc-300 p-1 rounded hover:bg-zinc-800/50 cursor-pointer mt-1">
                        <span className="text-orange-400">{Math.round(result.relevanceScore * 100)}%</span>
                        <span className="text-zinc-500 ml-1">{result.reasoning}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex-1 min-h-0 p-2 space-y-1 overflow-hidden">
                {pagedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                    <MessageSquare className="w-8 h-8 text-zinc-700/50" />
                    <div className="text-[10px] font-bold uppercase tracking-wider">No messages yet</div>
                    <div className="text-[9px] text-zinc-600">Send a message to start the conversation</div>
                  </div>
                ) : (
                  pagedMessages.map((message) => {
                    const analysis = messageAnalyses[message.id];
                    return (
                      <div key={message.id} className="group px-2 py-1.5 rounded bg-zinc-900/40 border border-zinc-800 hover:border-orange-500/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="text-[10px] font-semibold text-zinc-300">{message.author}</span>
                              <span className="text-[9px] text-zinc-600">{message.timestamp}</span>
                              {showAiFeatures && analysis ? (
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
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                                      analysis.category === 'tactical'
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : analysis.category === 'operational'
                                        ? 'bg-purple-500/20 text-purple-400'
                                        : analysis.category === 'urgent'
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-zinc-500/20 text-zinc-400'
                                    }`}
                                  >
                                    {analysis.category}
                                  </span>
                                </>
                              ) : null}
                            </div>

                            <div className="text-[10px] text-zinc-400">{message.text}</div>

                            {showAiFeatures && analysis?.requiresResponse ? (
                              <button
                                type="button"
                                onClick={() => handleGenerateSuggestions(message)}
                                className="mt-1 text-[9px] text-orange-400 hover:text-orange-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Lightbulb className="w-3 h-3" />
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
                          <button type="button" className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all">
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
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-600 text-[10px] font-bold uppercase tracking-wider">Select a channel</div>
          )}
        </>
      ) : null}
    </div>
  );
}

function ChannelButton({ channel, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
        isSelected ? 'bg-orange-500/20 border border-orange-500/30 text-orange-300' : 'bg-zinc-900/40 border border-zinc-800 text-zinc-400 hover:bg-zinc-800/40'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <channel.icon className="w-3 h-3 flex-shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider truncate">{channel.name}</span>
        </div>
        {channel.unread > 0 ? (
          <div className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-orange-500/30 text-orange-300 text-[9px] font-bold">
            {channel.unread}
          </div>
        ) : null}
      </div>
    </button>
  );
}
