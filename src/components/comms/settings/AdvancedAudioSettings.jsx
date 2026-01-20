import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

export default function AdvancedAudioSettings({ preferences, setPreferences }) {
  const handleToggle = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSlider = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value[0] }));
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#ea580c]" />
            <div>
              <CardTitle>Advanced Audio Processing</CardTitle>
              <CardDescription>Fine-tune audio quality and transmission</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Echo Cancellation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-sm font-semibold">Echo Cancellation</Label>
                <p className="text-xs text-zinc-400 mt-1">Prevent audio feedback loops when using speakers</p>
              </div>
              <Switch 
                checked={preferences.echoCancellation} 
                onCheckedChange={() => handleToggle('echoCancellation')}
              />
            </div>
            {!preferences.echoCancellation && (
              <p className="text-[10px] text-amber-400 bg-amber-950/20 p-2 rounded border border-amber-900/30">
                ⚠️ Disabled: May cause feedback if using speakers
              </p>
            )}
          </div>

          {/* Noise Suppression */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-sm font-semibold">Noise Suppression</Label>
                <p className="text-xs text-zinc-400 mt-1">Reduce background noise (fans, traffic, etc.)</p>
              </div>
              <Switch 
                checked={preferences.noiseSuppression} 
                onCheckedChange={() => handleToggle('noiseSuppression')}
              />
            </div>
            {preferences.noiseSuppression && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400">Suppression Intensity</span>
                  <Badge variant="outline" className="text-xs">{preferences.noiseFloor}%</Badge>
                </div>
                <Slider
                  value={[preferences.noiseFloor]}
                  onValueChange={(value) => handleSlider('noiseFloor', value)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-[10px] text-zinc-500">0% = Minimal | 100% = Aggressive</p>
              </div>
            )}
          </div>

          {/* Voice Activity Detection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-sm font-semibold">Voice Activity Detection (VAD)</Label>
                <p className="text-xs text-zinc-400 mt-1">Only transmit when speech detected</p>
              </div>
              <Switch 
                checked={preferences.voiceActivityDetection} 
                onCheckedChange={() => handleToggle('voiceActivityDetection')}
              />
            </div>
            {preferences.voiceActivityDetection && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400">Sensitivity</span>
                  <Badge variant="outline" className="text-xs">{preferences.vadThreshold}%</Badge>
                </div>
                <Slider
                  value={[preferences.vadThreshold]}
                  onValueChange={(value) => handleSlider('vadThreshold', value)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-[10px] text-zinc-500">Low = Lenient | High = Strict</p>
              </div>
            )}
          </div>

          {/* Auto Gain Control */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-sm font-semibold">Auto Gain Control (AGC)</Label>
                <p className="text-xs text-zinc-400 mt-1">Automatically adjust microphone levels</p>
              </div>
              <Switch 
                checked={preferences.autoGainControl} 
                onCheckedChange={() => handleToggle('autoGainControl')}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded space-y-2">
            <p className="text-xs font-semibold text-zinc-300">Active Features</p>
            <div className="text-[10px] text-zinc-400 space-y-1 font-mono">
              <div>Echo Cancel: {preferences.echoCancellation ? '✓' : '✗'}</div>
              <div>Noise Suppress: {preferences.noiseSuppression ? `✓ (${preferences.noiseFloor}%)` : '✗'}</div>
              <div>VAD: {preferences.voiceActivityDetection ? `✓ (${preferences.vadThreshold}%)` : '✗'}</div>
              <div>Auto Gain: {preferences.autoGainControl ? '✓' : '✗'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}