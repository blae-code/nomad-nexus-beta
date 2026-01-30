import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, Radio, AlertCircle, Lock, Unlock, BarChart3, Bot, Plus, CheckCircle, Volume2, Mic, Settings } from 'lucide-react';
import PermissionGuard from '@/components/PermissionGuard';
import { COMMS_CHANNEL_TYPES } from '@/components/constants/channelTypes';
import { useCurrentUser } from '@/components/useCurrentUser';
import { canAccessFocusedComms, getAccessDenialReason } from '@/components/utils/commsAccessPolicy';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VoiceNetCreator from '@/components/voice/VoiceNetCreator';
import VoiceNetBrowser from '@/components/voice/VoiceNetBrowser';
import ChannelManager from '@/components/comms/ChannelManager';
import SpeechSettings from '@/components/comms/SpeechSettings';
import { getSpeechEngine } from '@/components/comms/SpeechEngine';

export default function CommsConsole() {
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showTempFocused, setShowTempFocused] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');
  
  // Poll state
  const [polls, setPolls] = useState([]);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  
  // AI Assistant state
  const [riggsyPrompt, setRiggsyPrompt] = useState('');
  const [riggsyResponse, setRiggsyResponse] = useState('');
  const [riggsyLoading, setRiggsyLoading] = useState(false);

  // Voice Net state
  const [showVoiceNetCreator, setShowVoiceNetCreator] = useState(false);

  // Speech settings
  const [speechSettings, setSpeechSettings] = useState(() => {
    const saved = localStorage.getItem('nexus.speech.settings');
    return saved ? JSON.parse(saved) : {
      ttsEnabled: false,
      sttEnabled: false,
      ttsVoice: '',
      ttsRate: 1.0,
      ttsPitch: 1.0,
      ttsVolume: 0.8,
      language: 'en-US',
      autoReadNew: false,
    };
  });
  const [isListening, setIsListening] = useState(false);
  const speechEngine = getSpeechEngine();

  useEffect(() => {
    const init = async () => {
      const channelsList = await base44.entities.Channel.list('name', 50);
      setChannels(channelsList);
      if (channelsList.length > 0) {
        setSelectedChannel(channelsList[0]);
        loadMessages(channelsList[0].id);
        loadPolls(channelsList[0].id);
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadMessages = async (channelId) => {
    const msgs = await base44.entities.Message.filter({ channel_id: channelId }, '-created_date', 50);
    setMessages(msgs.reverse());
  };

  const loadPolls = async (channelId) => {
    const pollsList = await base44.entities.Poll.filter({ scope: 'CHANNEL', scope_id: channelId }, '-created_date', 20);
    const pollsWithVotes = await Promise.all(
      pollsList.map(async (poll) => {
        const votes = await base44.entities.PollVote.filter({ poll_id: poll.id });
        return { ...poll, votes };
      })
    );
    setPolls(pollsWithVotes);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return;
    
    const user = await base44.auth.me();
    await base44.entities.Message.create({
      channel_id: selectedChannel.id,
      user_id: user.id,
      content: newMessage.trim(),
    });
    
    setNewMessage('');
    loadMessages(selectedChannel.id);
  };

  const createPoll = async () => {
    if (!pollQuestion.trim() || !selectedChannel) return;
    const validOptions = pollOptions.filter(opt => opt.trim());
    if (validOptions.length < 2) return;

    const user = await base44.auth.me();
    const formattedOptions = validOptions.map((text, idx) => ({
      id: `opt_${idx}`,
      text: text
    }));

    await base44.entities.Poll.create({
      scope: 'CHANNEL',
      scope_id: selectedChannel.id,
      question: pollQuestion.trim(),
      options: formattedOptions,
      created_by: user.id,
      closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

    setPollQuestion('');
    setPollOptions(['', '']);
    setShowPollCreator(false);
    loadPolls(selectedChannel.id);
  };

  const votePoll = async (pollId, optionId) => {
    const user = await base44.auth.me();
    await base44.entities.PollVote.create({
      poll_id: pollId,
      user_id: user.id,
      selected_option_ids: [optionId],
    });
    loadPolls(selectedChannel.id);
  };

  const askRiggsy = async () => {
    if (!riggsyPrompt.trim()) return;
    setRiggsyLoading(true);
    setRiggsyResponse('');

    try {
      const channelContext = messages.slice(-10).map(m => m.content).join('\n');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Riggsy, a tactical AI assistant for the Nomad Nexus communication system. 
        
Recent channel activity:
${channelContext}

User question: ${riggsyPrompt}

Provide a helpful, concise response with tactical awareness.`,
      });

      setRiggsyResponse(result);
    } catch (error) {
      setRiggsyResponse('Error: Unable to reach Riggsy at this time.');
    } finally {
      setRiggsyLoading(false);
    }
  };

  const { user: currentUser } = useCurrentUser();

  const updateSpeechSettings = (newSettings) => {
    setSpeechSettings(newSettings);
    localStorage.setItem('nexus.speech.settings', JSON.stringify(newSettings));
  };

  const speakMessage = (text) => {
    if (!speechSettings.ttsEnabled) return;
    speechEngine.speak(text, {
      voice: speechSettings.ttsVoice,
      rate: speechSettings.ttsRate,
      pitch: speechSettings.ttsPitch,
      volume: speechSettings.ttsVolume,
      lang: speechSettings.language,
    });
  };

  const startDictation = () => {
    if (!speechSettings.sttEnabled) return;
    
    speechEngine.startListening(
      (transcript) => {
        setNewMessage(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      },
      (error) => {
        console.error('Speech recognition error:', error);
        setIsListening(false);
      }
    );
    setIsListening(true);
  };

  const stopDictation = () => {
    speechEngine.stopListening();
    setIsListening(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-orange-500">LOADING...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Comms Array</h1>
        <p className="text-zinc-400 text-sm">Communication channels and intelligence</p>
        {currentUser && (
          <p className="text-xs text-zinc-500 mt-2">
            Logged in as: <span className="text-orange-400">{currentUser.callsign}</span> ({currentUser.rank})
          </p>
        )}
      </div>

      {/* Focused Comms Gate Demo — Canon Policy */}
      <div className="mb-6 space-y-2">
        {/* Standard Focused */}
        <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {canAccessFocusedComms(currentUser, { type: COMMS_CHANNEL_TYPES.FOCUSED, isTemporary: false }) ? (
                <Unlock className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Lock className="w-5 h-5 text-zinc-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Focused Comms</h3>
                {canAccessFocusedComms(currentUser, { type: COMMS_CHANNEL_TYPES.FOCUSED, isTemporary: false }) ? (
                  <p className="text-xs text-green-400">✓ Authorized ({currentUser?.membership})</p>
                ) : (
                  <p className="text-xs text-zinc-500">{getAccessDenialReason({ isTemporary: false })}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Temporary Focused Toggle Demo */}
        <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <Unlock className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Temporary Focused Demo</h3>
                <p className="text-xs text-zinc-400 mb-2">
                  {showTempFocused 
                    ? '✓ Open to all (demo mode)' 
                    : 'Click to simulate temporary Focused access'}
                </p>
                <Button 
                  size="sm" 
                  variant={showTempFocused ? 'default' : 'outline'}
                  onClick={() => setShowTempFocused(!showTempFocused)}
                  className="text-xs"
                >
                  {showTempFocused ? 'Disable Demo' : 'Enable Demo'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-200px)]">
            <div className="col-span-1 bg-zinc-900/50 border-2 border-zinc-800 p-4 overflow-y-auto">
              <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Channels</h3>
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => {
                    setSelectedChannel(channel);
                    loadMessages(channel.id);
                  }}
                  className={`w-full text-left p-3 mb-2 transition-all ${
                    selectedChannel?.id === channel.id
                      ? 'bg-orange-500/20 border-l-4 border-orange-500 text-white'
                      : 'hover:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    <span className="font-mono text-sm uppercase">{channel.name}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="col-span-3 bg-zinc-900/50 border-2 border-zinc-800 flex flex-col">
              <div className="p-4 border-b border-zinc-800">
                <h2 className="text-lg font-bold text-white uppercase">
                  {selectedChannel?.name || 'No Channel Selected'}
                </h2>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-4">
                  <TabsTrigger value="messages">
                    <Send className="w-4 h-4 mr-2" />
                    Messages
                  </TabsTrigger>
                  <TabsTrigger value="polls">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Polls
                  </TabsTrigger>
                  <TabsTrigger value="channels">
                    <Radio className="w-4 h-4 mr-2" />
                    Channels
                  </TabsTrigger>
                  <TabsTrigger value="voice">
                    <Radio className="w-4 h-4 mr-2" />
                    Voice Nets
                  </TabsTrigger>
                  <TabsTrigger value="speech">
                    <Volume2 className="w-4 h-4 mr-2" />
                    Speech
                  </TabsTrigger>
                  <TabsTrigger value="riggsy">
                    <Bot className="w-4 h-4 mr-2" />
                    Riggsy AI
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="messages" className="flex-1 flex flex-col">
                  <div className="flex-1 p-4 overflow-y-auto">
                    {messages.map((msg) => (
                      <div key={msg.id} className="mb-4 group">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-zinc-500 mb-1">
                            {new Date(msg.created_date).toLocaleTimeString()}
                          </div>
                          {speechSettings.ttsEnabled && (
                            <button
                              onClick={() => speakMessage(msg.content)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-800 rounded"
                            >
                              <Volume2 className="w-3 h-3 text-blue-400" />
                            </button>
                          )}
                        </div>
                        <div className="text-zinc-300">{msg.content}</div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 border-t border-zinc-800">
                    <div className="flex gap-2">
                      {speechSettings.sttEnabled && (
                        <Button
                          onClick={isListening ? stopDictation : startDictation}
                          variant={isListening ? 'default' : 'outline'}
                          size="icon"
                          className={isListening ? 'animate-pulse' : ''}
                        >
                          <Mic className="w-4 h-4" />
                        </Button>
                      )}
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder={isListening ? 'Listening...' : 'Type message...'}
                        className="flex-1"
                      />
                      <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="polls" className="flex-1 flex flex-col">
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {!showPollCreator && (
                      <Button onClick={() => setShowPollCreator(true)} variant="outline" className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Poll
                      </Button>
                    )}

                    {showPollCreator && (
                      <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-3">
                        <Input
                          value={pollQuestion}
                          onChange={(e) => setPollQuestion(e.target.value)}
                          placeholder="Poll question..."
                          className="mb-2"
                        />
                        {pollOptions.map((opt, idx) => (
                          <Input
                            key={idx}
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...pollOptions];
                              newOpts[idx] = e.target.value;
                              setPollOptions(newOpts);
                            }}
                            placeholder={`Option ${idx + 1}`}
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

                    {polls.map((poll) => {
                      const userVote = poll.votes.find(v => v.user_id === currentUser?.id);
                      const voteCounts = {};
                      poll.options.forEach(opt => voteCounts[opt.id] = 0);
                      poll.votes.forEach(v => {
                        v.selected_option_ids.forEach(optId => {
                          voteCounts[optId] = (voteCounts[optId] || 0) + 1;
                        });
                      });
                      const totalVotes = poll.votes.length;

                      return (
                        <div key={poll.id} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                          <h3 className="text-white font-semibold mb-3">{poll.question}</h3>
                          <div className="space-y-2">
                            {poll.options.map((option) => {
                              const count = voteCounts[option.id] || 0;
                              const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                              const hasVoted = userVote?.selected_option_ids?.includes(option.id);

                              return (
                                <button
                                  key={option.id}
                                  onClick={() => !userVote && votePoll(poll.id, option.id)}
                                  disabled={!!userVote}
                                  className={`w-full p-3 rounded border transition-all text-left ${
                                    hasVoted
                                      ? 'bg-orange-500/20 border-orange-500'
                                      : userVote
                                      ? 'bg-zinc-900/50 border-zinc-700 cursor-not-allowed'
                                      : 'bg-zinc-900/50 border-zinc-700 hover:border-orange-500/50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {hasVoted && <CheckCircle className="w-4 h-4 text-orange-400" />}
                                      <span className="text-white text-sm">{option.text}</span>
                                    </div>
                                    <span className="text-xs text-zinc-400">{count} ({percentage}%)</span>
                                  </div>
                                  {userVote && (
                                    <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-orange-500" style={{ width: `${percentage}%` }} />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-3 text-xs text-zinc-500">
                            {totalVotes} vote{totalVotes !== 1 ? 's' : ''} • Ends {new Date(poll.closes_at).toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="channels" className="flex-1 flex flex-col">
                  <div className="flex-1 p-4 overflow-y-auto">
                    <ChannelManager />
                  </div>
                </TabsContent>

                <TabsContent value="voice" className="flex-1 flex flex-col">
                  <div className="flex-1 p-4 overflow-y-auto">
                    {showVoiceNetCreator ? (
                      <VoiceNetCreator
                        onSuccess={() => {
                          setShowVoiceNetCreator(false);
                        }}
                        onCancel={() => setShowVoiceNetCreator(false)}
                      />
                    ) : (
                      <VoiceNetBrowser
                        onCreateNew={() => setShowVoiceNetCreator(true)}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="speech" className="flex-1 flex flex-col">
                  <div className="flex-1 p-4 overflow-y-auto">
                    <SpeechSettings
                      settings={speechSettings}
                      onUpdate={updateSpeechSettings}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="riggsy" className="flex-1 flex flex-col">
                  <div className="flex-1 p-4 overflow-y-auto">
                    <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-5 h-5 text-blue-400" />
                        <h3 className="text-sm font-bold text-blue-400">Riggsy - Tactical AI Assistant</h3>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Ask Riggsy about channel activity, tactical advice, or operational guidance.
                      </p>
                    </div>

                    {riggsyResponse && (
                      <div className="mb-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                        <div className="text-xs text-blue-400 font-semibold mb-2">RIGGSY RESPONSE:</div>
                        <div className="text-sm text-zinc-300 whitespace-pre-wrap">{riggsyResponse}</div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-zinc-800">
                    <div className="flex gap-2">
                      <Textarea
                        value={riggsyPrompt}
                        onChange={(e) => setRiggsyPrompt(e.target.value)}
                        placeholder="Ask Riggsy anything..."
                        className="flex-1 min-h-[80px]"
                      />
                      <Button onClick={askRiggsy} disabled={!riggsyPrompt.trim() || riggsyLoading}>
                        <Bot className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
                  </div>
                  </div>
                  </div>
                  );
                  }