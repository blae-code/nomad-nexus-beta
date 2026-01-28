import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, Gauge, Bug, Mic2, Volume2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

import DeviceSelector from '@/components/comms/DeviceSelector';
import VoiceDiagnostics from '@/components/comms/VoiceDiagnostics';
import AICriticalAlertsMonitor from '@/components/comms/AICriticalAlertsMonitor';
import OperationalEventFeed from '@/components/comms/OperationalEventFeed';

/**
 * Advanced controls drawer.
 * Consolidates secondary comms functionality:
 * - device selection
 * - signal processing (noise gate, sidetone)
 * - diagnostics
 * - AI monitor
 * - debug/logs
 */
export default function CommsAdvancedDrawer({
  isOpen,
  onOpenChange,
  user,
  eventId,
  selectedNet,
}) {
  const [noiseGate, setNoiseGate] = React.useState([50]);
  const [sidetone, setSidetone] = React.useState([20]);
  const [monitoring, setMonitoring] = React.useState(false);
  const [whisperMode, setWhisperMode] = React.useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96 bg-zinc-950 border-zinc-800 text-zinc-100 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-zinc-800 bg-zinc-900/20">
          <SheetTitle className="flex items-center gap-2 text-base text-white">
            <Settings2 className="w-4 h-4" />
            Advanced Controls
          </SheetTitle>
          <SheetDescription className="text-zinc-500">
            Device, audio processing, diagnostics
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <Tabs defaultValue="audio" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-zinc-900 border-b border-zinc-800 rounded-none px-4 py-2 h-auto">
              <TabsTrigger
                value="audio"
                className="text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white rounded-sm"
              >
                <Mic2 className="w-3 h-3 mr-1.5" />
                Audio
              </TabsTrigger>
              <TabsTrigger
                value="diagnostics"
                className="text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white rounded-sm"
              >
                <Gauge className="w-3 h-3 mr-1.5" />
                Diag
              </TabsTrigger>
              <TabsTrigger
                value="monitor"
                className="text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-white rounded-sm"
              >
                <Bug className="w-3 h-3 mr-1.5" />
                Monitor
              </TabsTrigger>
            </TabsList>

            {/* Audio Tab */}
            <TabsContent value="audio" className="p-4 space-y-6 mt-0">
              {/* Device Selector */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Devices</h3>
                <DeviceSelector
                  onDeviceChange={(devices) => {
                    localStorage.setItem('audio_devices', JSON.stringify(devices));
                  }}
                  onTest={() => console.log('Audio test')}
                />
              </div>

              <Separator className="bg-zinc-800" />

              {/* Signal Processing */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Signal Processing</h3>

                {/* Noise Gate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-zinc-400 font-mono">NOISE_GATE</Label>
                    <span className="text-[10px] font-mono text-zinc-500">{noiseGate[0]}%</span>
                  </div>
                  <Slider
                    value={noiseGate}
                    onValueChange={setNoiseGate}
                    max={100}
                    step={1}
                    className="[&>span:first-child]:h-1.5 [&>span:first-child]:bg-zinc-800 [&_[role=slider]]:bg-zinc-400 [&_[role=slider]]:border-zinc-500 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
                  />
                </div>

                {/* Sidetone */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-zinc-400 font-mono">SIDETONE</Label>
                    <span className="text-[10px] font-mono text-zinc-500">{sidetone[0]}%</span>
                  </div>
                  <Slider
                    value={sidetone}
                    onValueChange={setSidetone}
                    max={100}
                    step={1}
                    className="[&>span:first-child]:h-1.5 [&>span:first-child]:bg-zinc-800 [&_[role=slider]]:bg-zinc-400 [&_[role=slider]]:border-zinc-500 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
                  />
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Voice Modes */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Voice Modes</h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic2 className="w-4 h-4 text-zinc-500" />
                    <div className="flex flex-col">
                      <Label className="text-xs text-zinc-300">Monitor Sub-Nets</Label>
                      <span className="text-[9px] text-zinc-600">Listen to child channels</span>
                    </div>
                  </div>
                  <Switch
                    checked={monitoring}
                    onCheckedChange={setMonitoring}
                    className="scale-75 data-[state=checked]:bg-emerald-600"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-zinc-500" />
                    <div className="flex flex-col">
                      <Label className="text-xs text-zinc-300">Whisper Mode</Label>
                      <span className="text-[9px] text-zinc-600">Direct link to commander</span>
                    </div>
                  </div>
                  <Switch
                    checked={whisperMode}
                    onCheckedChange={setWhisperMode}
                    className="scale-75 data-[state=checked]:bg-amber-600"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Diagnostics Tab */}
            <TabsContent value="diagnostics" className="p-4 mt-0">
              {user && eventId ? (
                <VoiceDiagnostics user={user} eventId={eventId} compact={true} />
              ) : (
                <div className="text-center py-8 text-zinc-600 text-xs">
                  No event selected for diagnostics
                </div>
              )}
            </TabsContent>

            {/* Monitor Tab */}
            <TabsContent value="monitor" className="p-4 space-y-4 mt-0">
              {eventId && <AICriticalAlertsMonitor eventId={eventId} compact={true} />}
              {eventId && <OperationalEventFeed eventId={eventId} compact={true} />}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}