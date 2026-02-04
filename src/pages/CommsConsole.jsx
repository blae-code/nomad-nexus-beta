import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lock, Unlock, Radio, Volume2, Mic, Users, Shuffle, Sparkles } from 'lucide-react';
import { COMMS_CHANNEL_TYPES } from '@/components/constants/channelTypes';
import { useAuth } from '@/components/providers/AuthProvider';
import { canAccessFocusedComms, getAccessDenialReason } from '@/components/utils/commsAccessPolicy';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VoiceNetCreator from '@/components/voice/VoiceNetCreator';
import VoiceNetBrowser from '@/components/voice/VoiceNetBrowser';
import VoiceNetDirector from '@/components/voice/VoiceNetDirector';
import ChannelManager from '@/components/comms/ChannelManager';
import SpeechSettings from '@/components/comms/SpeechSettings';
import { getSpeechEngine } from '@/components/comms/SpeechEngine';
import CommsRosterPanel from '@/components/comms/CommsRosterPanel';
import CommsQueryPanel from '@/components/comms/CommsQueryPanel';

export default function CommsConsole() {
  const [showTempFocused, setShowTempFocused] = useState(false);
  const [activeTab, setActiveTab] = useState('channels');

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

  const { user: authUser } = useAuth();
  const currentUser = authUser?.member_profile_data || authUser;

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[60vh]">
        <div className="lg:col-span-2 bg-zinc-900/50 border-2 border-zinc-800 p-4">
          <div className="flex items-start gap-3 p-3 border border-orange-500/30 bg-orange-500/10 rounded">
            <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-orange-200 uppercase tracking-wider">Comms Dock Primary</div>
              <div className="text-xs text-zinc-400 mt-1">
                Messaging, polls, and Riggsy AI now live in the Comms Dock (bottom bar). Use this console for channel
                configuration, voice net control, and speech settings.
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList>
              <TabsTrigger value="channels">
                <Radio className="w-4 h-4 mr-2" />
                Channels
              </TabsTrigger>
              <TabsTrigger value="voice">
                <Radio className="w-4 h-4 mr-2" />
                Voice Nets
              </TabsTrigger>
              <TabsTrigger value="netops">
                <Shuffle className="w-4 h-4 mr-2" />
                Net Ops
              </TabsTrigger>
              <TabsTrigger value="roster">
                <Users className="w-4 h-4 mr-2" />
                Roster
              </TabsTrigger>
              <TabsTrigger value="speech">
                <Volume2 className="w-4 h-4 mr-2" />
                Speech
              </TabsTrigger>
              <TabsTrigger value="intel">
                <Sparkles className="w-4 h-4 mr-2" />
                Comms Intel
              </TabsTrigger>
            </TabsList>

            <TabsContent value="channels" className="mt-4">
              <ChannelManager />
            </TabsContent>

            <TabsContent value="voice" className="mt-4">
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
            </TabsContent>

            <TabsContent value="netops" className="mt-4">
              <VoiceNetDirector />
            </TabsContent>

            <TabsContent value="roster" className="mt-4">
              <CommsRosterPanel />
            </TabsContent>

            <TabsContent value="speech" className="mt-4">
              <SpeechSettings
                settings={speechSettings}
                onUpdate={updateSpeechSettings}
              />
              <div className="mt-4 p-3 border border-zinc-800 bg-zinc-900/40 rounded flex items-center gap-2 text-xs text-zinc-400">
                <Mic className="w-3 h-3" />
                Speech controls are available in the Comms Dock message composer.
              </div>
            </TabsContent>

            <TabsContent value="intel" className="mt-4">
              <CommsQueryPanel />
            </TabsContent>
          </Tabs>
        </div>

        <div className="bg-zinc-900/50 border-2 border-zinc-800 p-4 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500">Status</div>
          <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded">
            <div className="text-sm font-semibold text-white">Focused Access</div>
            <div className="text-xs text-zinc-400 mt-1">
              {canAccessFocusedComms(currentUser, { type: COMMS_CHANNEL_TYPES.FOCUSED, isTemporary: false })
                ? 'Authorized for Focused channels.'
                : getAccessDenialReason({ isTemporary: false })}
            </div>
          </div>
          <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded">
            <div className="text-sm font-semibold text-white">Comms Dock</div>
            <div className="text-xs text-zinc-400 mt-1">
              Use the bottom dock for messaging, polls, mentions, and Riggsy AI.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
