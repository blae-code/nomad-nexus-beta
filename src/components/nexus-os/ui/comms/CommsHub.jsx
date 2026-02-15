import React, { useState, useCallback, useMemo } from 'react';
import { MessageSquare, Send, Settings, Bell, Hash, AtSign, Trash2, ChevronDown, ChevronLeft, ChevronRight, Sparkles, AlertCircle, TrendingUp, Zap, Lightbulb, X } from 'lucide-react';
import { NexusButton, NexusBadge } from '../primitives';
import { queueMessageAnalysis, generateResponseSuggestions, smartSearch } from '../../services/commsAIService';

/**
 * CommsHub — Integrated text-based communications hub for NexusOS
 * Discord-like channel system with AI-powered analysis, prioritization, and smart search
 */
export default function CommsHub({ operations = [], focusOperationId, activeAppId, online, bridgeId, isExpanded = true, onToggleExpand }) {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({ tactical: true, social: true });
  const [messageInput, setMessageInput] = useState('');
  const [messagePanelHeight, setMessagePanelHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus.commsHub.messagePanelHeight');
      return saved ? Number(saved) : 320;
    } catch {
      return 320;
    }
  });
  const [isResizing, setIsResizing] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    mentions: true,
    keywords: true,
    operations: true,
  });

  // AI Features State
  const [messageAnalyses, setMessageAnalyses] = useState({});
  const [aiSearchActive, setAiSearchActive] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState(null);
  const [responseSuggestions, setResponseSuggestions] = useState([]);
  const [showAiFeatures, setShowAiFeatures] = useState(true);
  const [selectedMessageForResponse, setSelectedMessageForResponse] = useState(null);

  // Predefined channels for tactical comms
  const channels = useMemo(() => {
    const tactical = [
      { id: 'command', name: 'Command Net', icon: Hash, category: 'tactical', unread: 3 },
      { id: 'alpha-squad', name: 'Alpha Squad', icon: Hash, category: 'tactical', unread: 0 },
      { id: 'logistics', name: 'Logistics', icon: Hash, category: 'tactical', unread: 1 },
    ];

    const operational = operations.slice(0, 3).map((op) => ({
      id: `op-${op.id}`,
      name: op.name || 'Unnamed Op',
      icon: Hash,
      category: 'operations',
      unread: 0,
    }));

    const social = [
      { id: 'general', name: 'General', icon: Hash, category: 'social', unread: 0 },
      { id: 'random', name: 'Random', icon: Hash, category: 'social', unread: 0 },
    ];

    const direct = [
      { id: 'dm-command', name: 'Command Officer', icon: AtSign, category: 'direct', unread: 1 },
    ];

    return { tactical, operational, social, direct };
  }, [operations]);

  const toggleCategory = useCallback((category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
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
      [selectedChannel]: [
        ...(prev[selectedChannel] || []),
        newMessage,
      ],
    }));

    // Queue AI analysis for new message
    if (showAiFeatures) {
      queueMessageAnalysis(newMessage).then((analysis) => {
        setMessageAnalyses((prev) => ({
          ...prev,
          [newMessage.id]: analysis
        }));
      });
    }

    setMessageInput('');
  }, [messageInput, selectedChannel, showAiFeatures]);

  // Handle AI search
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

  // Generate response suggestions
  const handleGenerateSuggestions = async (message) => {
    setSelectedMessageForResponse(message.id);
    try {
      const suggestions = await generateResponseSuggestions(message, currentMessages);
      setResponseSuggestions(suggestions);
    } catch (error) {
      console.error('[CommsHub] Response suggestions failed:', error);
    }
  };

  const currentMessages = messages[selectedChannel] || [];
  const selectedChannelData = Object.values(channels)
    .flat()
    .find((ch) => ch.id === selectedChannel);

  // Persist message panel height
  React.useEffect(() => {
    try {
      localStorage.setItem('nexus.commsHub.messagePanelHeight', String(messagePanelHeight));
    } catch {}
  }, [messagePanelHeight]);

  // Handle resize
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = messagePanelHeight;

    const handleMouseMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(200, Math.min(800, startHeight + delta));
      setMessagePanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [messagePanelHeight]);

  return (
    <div className={`flex flex-col h-full bg-zinc-950/80 transition-all duration-300 ease-out overflow-hidden ${
      isExpanded ? 'w-full' : 'w-12'
    }`}>
      {/* Header */}
      <div className="nx-comms-header border-b border-zinc-700/40 p-3">
        <div className="flex items-center justify-between">
          {isExpanded ? (
            <>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Text Comms</h3>
                {showAiFeatures && (
                  <NexusBadge tone="active" className="text-[9px] px-1.5 py-0.5">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    AI
                  </NexusBadge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowAiFeatures(!showAiFeatures)}
                  className={`text-zinc-500 hover:text-orange-500 transition-colors ${
                    showAiFeatures ? 'text-orange-400' : ''
                  }`}
                  title={showAiFeatures ? 'Disable AI features' : 'Enable AI features'}
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <button type="button" className="text-zinc-500 hover:text-orange-500 transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="text-zinc-500 hover:text-orange-500 transition-colors"
                  title="Collapse"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onToggleExpand}
              className="w-full flex items-center justify-center text-zinc-500 hover:text-orange-500 transition-colors"
              title="Expand"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Channel List */}
      {isExpanded && (
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
        {/* Tactical Channels */}
        <div>
          <button
            onClick={() => toggleCategory('tactical')}
            className="w-full flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-200 uppercase tracking-wider transition-colors"
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${expandedCategories.tactical ? '' : '-rotate-90'}`}
            />
            Tactical
          </button>
          {expandedCategories.tactical && (
            <div className="space-y-1">
              {channels.tactical.map((ch) => (
                <ChannelButton
                  key={ch.id}
                  channel={ch}
                  isSelected={selectedChannel === ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Operations */}
        {channels.operational.length > 0 && (
          <div>
            <button
              onClick={() => toggleCategory('operations')}
              className="w-full flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-200 uppercase tracking-wider transition-colors"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform ${expandedCategories.operations ? '' : '-rotate-90'}`}
              />
              Operations
            </button>
            {expandedCategories.operations && (
              <div className="space-y-1">
                {channels.operational.map((ch) => (
                  <ChannelButton
                    key={ch.id}
                    channel={ch}
                    isSelected={selectedChannel === ch.id}
                    onClick={() => setSelectedChannel(ch.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Social Channels */}
        <div>
          <button
            onClick={() => toggleCategory('social')}
            className="w-full flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-200 uppercase tracking-wider transition-colors"
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${expandedCategories.social ? '' : '-rotate-90'}`}
            />
            Social
          </button>
          {expandedCategories.social && (
            <div className="space-y-1">
              {channels.social.map((ch) => (
                <ChannelButton
                  key={ch.id}
                  channel={ch}
                  isSelected={selectedChannel === ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Direct Messages */}
        {channels.direct.length > 0 && (
          <div>
            <button className="w-full flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-200 uppercase tracking-wider transition-colors">
              <ChevronDown className="w-3 h-3" />
              Direct
            </button>
            <div className="space-y-1">
              {channels.direct.map((ch) => (
                <ChannelButton
                  key={ch.id}
                  channel={ch}
                  isSelected={selectedChannel === ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Message View */}
      {isExpanded && selectedChannel && (
        <div className="flex-shrink-0 flex flex-col border-t border-zinc-700/40 relative" style={{ height: `${messagePanelHeight}px` }}>
          {/* Resize Handle */}
          <div
            className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-700/50 to-transparent cursor-ns-resize hover:via-orange-500 transition-all z-10 ${
              isResizing ? 'via-orange-500' : ''
            }`}
            onMouseDown={handleResizeStart}
            title="Drag to resize message panel"
          >
            <div className="absolute left-1/2 top-0 -translate-x-1/2 w-8 h-0.5 bg-orange-400/60 rounded-full" />
          </div>

          {/* Channel Header with AI Search */}
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

            {/* AI Smart Search */}
            {showAiFeatures && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="AI-powered search (natural language)..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      handleAiSearch(e.target.value);
                    }
                  }}
                  className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded pl-7 pr-2 py-1 text-[10px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/40"
                />
                <Sparkles className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-orange-400" />
                {aiSearchActive && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* AI Search Results */}
            {aiSearchResults && (
              <div className="p-2 rounded border border-orange-500/30 bg-orange-500/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-orange-400 font-semibold uppercase">AI Results</span>
                  <button
                    type="button"
                    onClick={() => setAiSearchResults(null)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[9px] text-zinc-400 mb-1">{aiSearchResults.summary}</p>
                {aiSearchResults.results.slice(0, 3).map((result) => (
                  <div
                    key={result.messageId}
                    className="text-[9px] text-zinc-300 p-1 rounded hover:bg-zinc-800/50 cursor-pointer mt-1"
                  >
                    <span className="text-orange-400">{Math.round(result.relevanceScore * 100)}%</span>
                    <span className="text-zinc-500 ml-1">{result.reasoning}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
            {currentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                <MessageSquare className="w-8 h-8 text-zinc-700/50" />
                <div className="text-[10px] font-bold uppercase tracking-wider">No messages yet</div>
                <div className="text-[9px] text-zinc-600">Send a message to start the conversation</div>
              </div>
            ) : (
              currentMessages.map((msg) => {
                const analysis = messageAnalyses[msg.id];
                
                return (
                  <div key={msg.id} className="group px-2 py-1.5 rounded bg-zinc-900/40 border border-zinc-800 hover:border-orange-500/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-[10px] font-semibold text-zinc-300">{msg.author}</span>
                          <span className="text-[9px] text-zinc-600">{msg.timestamp}</span>
                          
                          {/* AI Analysis Badges */}
                          {showAiFeatures && analysis && (
                            <>
                              {analysis.priority === 'critical' && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-red-500/20 text-red-400 flex items-center gap-0.5">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  Critical
                                </span>
                              )}
                              {analysis.priority === 'high' && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-orange-500/20 text-orange-400 flex items-center gap-0.5">
                                  <TrendingUp className="w-2.5 h-2.5" />
                                  High
                                </span>
                              )}
                              {analysis.urgency >= 8 && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-yellow-500/20 text-yellow-400 flex items-center gap-0.5">
                                  <Zap className="w-2.5 h-2.5" />
                                  Urgent
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                                analysis.category === 'tactical' ? 'bg-blue-500/20 text-blue-400' :
                                analysis.category === 'operational' ? 'bg-purple-500/20 text-purple-400' :
                                analysis.category === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                'bg-zinc-500/20 text-zinc-400'
                              }`}>
                                {analysis.category}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400">{msg.text}</div>
                        
                        {/* AI Response Suggestions */}
                        {showAiFeatures && analysis?.requiresResponse && (
                          <button
                            type="button"
                            onClick={() => handleGenerateSuggestions(msg)}
                            className="mt-1 text-[9px] text-orange-400 hover:text-orange-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Lightbulb className="w-3 h-3" />
                            Suggest responses
                          </button>
                        )}
                        
                        {selectedMessageForResponse === msg.id && responseSuggestions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {responseSuggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
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
                        )}
                      </div>
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input */}
          <div className="flex-shrink-0 flex gap-1 p-2 border-t border-zinc-700/40 bg-zinc-900/40">
            <input
              type="text"
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) handleSendMessage();
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
      )}
      
      {isExpanded && !selectedChannel && (
        <div className="flex-1 flex items-center justify-center text-zinc-600 text-[10px] font-bold uppercase tracking-wider">Select a channel</div>
      )}
    </div>
  );
}

function ChannelButton({ channel, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
        isSelected
          ? 'bg-orange-500/20 border border-orange-500/30 text-orange-300'
          : 'bg-zinc-900/40 border border-zinc-800 text-zinc-400 hover:bg-zinc-800/40'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <channel.icon className="w-3 h-3 flex-shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider truncate">{channel.name}</span>
        </div>
        {channel.unread > 0 && (
          <div className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-orange-500/30 text-orange-300 text-[9px] font-bold">
            {channel.unread}
          </div>
        )}
      </div>
    </button>
  );
}