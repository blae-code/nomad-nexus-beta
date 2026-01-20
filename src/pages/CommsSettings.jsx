import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPageUrl } from '@/utils';
import AudioDeviceSettings from '@/components/comms/settings/AudioDeviceSettings';
import AudioLevelControls from '@/components/comms/settings/AudioLevelControls';
import PTTKeybindConfig from '@/components/comms/settings/PTTKeybindConfig';
import NotificationSoundManager from '@/components/comms/settings/NotificationSoundManager';

export default function CommsSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [preferences, setPreferences] = useState({
    inputDevice: '',
    outputDevice: '',
    inputLevel: 100,
    outputLevel: 100,
    pttKey: 'Space',
    pttToggle: false,
    notificationVolume: 100,
    soundEnabled: true,
    mentionSound: 'chime',
    netJoinSound: 'beep',
    transmitSound: 'click'
  });

  // Fetch user's current preferences
  const { data: user } = useQuery({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      if (userData?.commsPreferences) {
        setPreferences(prev => ({ ...prev, ...userData.commsPreferences }));
      }
      return userData;
    }
  });

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await base44.auth.updateMe({
        commsPreferences: preferences
      });
      setSaveStatus({ type: 'success', message: 'Settings saved successfully' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setSaveStatus({ type: 'error', message: error.message || 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href={createPageUrl('CommsConsole')} className="hover:text-[#ea580c] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-white">Communications Settings</h1>
            <p className="text-sm text-zinc-400">Configure your audio devices, push-to-talk, and notifications</p>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-[#ea580c] hover:bg-[#c2410c] gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Status Messages */}
      {saveStatus && (
        <div className={`mx-6 mt-4 p-3 rounded flex items-center gap-2 ${
          saveStatus.type === 'success' 
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {saveStatus.message}
        </div>
      )}

      {/* Settings Tabs */}
      <div className="flex-1 overflow-hidden px-6 py-6">
        <Tabs defaultValue="audio" className="h-full flex flex-col">
          <TabsList className="bg-zinc-900 border border-zinc-800 grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="audio">Audio Devices</TabsTrigger>
            <TabsTrigger value="levels">Audio Levels</TabsTrigger>
            <TabsTrigger value="ptt">Push-to-Talk</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto space-y-6">
            <TabsContent value="audio" className="m-0">
              <AudioDeviceSettings preferences={preferences} setPreferences={setPreferences} />
            </TabsContent>

            <TabsContent value="levels" className="m-0">
              <AudioLevelControls preferences={preferences} setPreferences={setPreferences} />
            </TabsContent>

            <TabsContent value="ptt" className="m-0">
              <PTTKeybindConfig preferences={preferences} setPreferences={setPreferences} />
            </TabsContent>

            <TabsContent value="notifications" className="m-0">
              <NotificationSoundManager preferences={preferences} setPreferences={setPreferences} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}