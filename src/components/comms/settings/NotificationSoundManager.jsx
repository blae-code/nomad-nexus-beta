import React, { useState } from 'react';
import { Volume2, Play, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const SOUND_OPTIONS = {
  chime: 'Chime',
  beep: 'Beep',
  ping: 'Ping',
  alert: 'Alert',
  tone: 'Tone',
  bell: 'Bell',
  none: 'None (Silent)'
};

export default function NotificationSoundManager({ preferences, setPreferences }) {
  const [playing, setPlaying] = useState(null);

  const playSound = async (soundType) => {
    if (soundType === 'none') return;
    
    setPlaying(soundType);
    try {
      // Using Web Audio API to generate sounds
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      const duration = 0.5;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const frequencies = {
        chime: [1046, 1319],    // C6, E6
        beep: [800],             // Single beep
        ping: [1200],            // High ping
        alert: [400, 800],       // Low to high
        tone: [440],             // A4 standard
        bell: [640, 800]         // Bell tone
      };

      const freqs = frequencies[soundType] || [440];
      oscillator.frequency.setValueAtTime(freqs[0], now);
      
      if (freqs.length > 1) {
        oscillator.frequency.setValueAtTime(freqs[1], now + duration / 2);
      }

      gainNode.gain.setValueAtTime((preferences.notificationVolume / 100) * 0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);

      setTimeout(() => setPlaying(null), duration * 1000);
    } catch (error) {
      console.error('[AUDIO] Failed to play sound:', error);
      setPlaying(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#ea580c]" />
              <div>
                <CardTitle>Notification Sounds</CardTitle>
                <CardDescription>Enable/disable audio notifications for comms events</CardDescription>
              </div>
            </div>
            <Switch
              checked={preferences.soundEnabled}
              onCheckedChange={(checked) => setPreferences(prev => ({
                ...prev,
                soundEnabled: checked
              }))}
            />
          </div>
        </CardHeader>
      </Card>

      {preferences.soundEnabled && (
        <>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-[#ea580c]" />
                  <div>
                    <CardTitle>Notification Volume</CardTitle>
                    <CardDescription>Master volume for all notification sounds</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-lg font-mono">
                  {preferences.notificationVolume}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Slider
                value={[preferences.notificationVolume]}
                onValueChange={(value) => setPreferences(prev => ({
                  ...prev,
                  notificationVolume: value[0]
                }))}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Mention Notification Sound</CardTitle>
              <CardDescription>Sound when someone mentions you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select 
                value={preferences.mentionSound}
                onValueChange={(value) => setPreferences(prev => ({
                  ...prev,
                  mentionSound: value
                }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {Object.entries(SOUND_OPTIONS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => playSound(preferences.mentionSound)}
                disabled={preferences.mentionSound === 'none' || playing === 'mention'}
                className="gap-2 w-full"
              >
                <Play className="w-4 h-4" />
                {playing === 'mention' ? 'Playing...' : 'Preview'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Net Join Notification Sound</CardTitle>
              <CardDescription>Sound when users join or leave the net</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select 
                value={preferences.netJoinSound}
                onValueChange={(value) => setPreferences(prev => ({
                  ...prev,
                  netJoinSound: value
                }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {Object.entries(SOUND_OPTIONS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => playSound(preferences.netJoinSound)}
                disabled={preferences.netJoinSound === 'none' || playing === 'join'}
                className="gap-2 w-full"
              >
                <Play className="w-4 h-4" />
                {playing === 'join' ? 'Playing...' : 'Preview'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Transmit Start Sound</CardTitle>
              <CardDescription>Sound when you begin transmitting (PTT)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select 
                value={preferences.transmitSound}
                onValueChange={(value) => setPreferences(prev => ({
                  ...prev,
                  transmitSound: value
                }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {Object.entries(SOUND_OPTIONS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => playSound(preferences.transmitSound)}
                disabled={preferences.transmitSound === 'none' || playing === 'transmit'}
                className="gap-2 w-full"
              >
                <Play className="w-4 h-4" />
                {playing === 'transmit' ? 'Playing...' : 'Preview'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}