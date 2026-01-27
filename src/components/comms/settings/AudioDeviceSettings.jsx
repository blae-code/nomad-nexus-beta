import { useState, useEffect } from 'react';
import { RefreshCw, Mic, Volume2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AudioDeviceSettings({ preferences, setPreferences }) {
  const [inputDevices, setInputDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const [loading, setLoading] = useState(false);

  const enumerateDevices = async () => {
    setLoading(true);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const inputs = devices.filter(d => d.kind === 'audioinput' && d.deviceId !== '');
      const outputs = devices.filter(d => d.kind === 'audiooutput' && d.deviceId !== '');
      
      setInputDevices(inputs);
      setOutputDevices(outputs);
    } catch (error) {
      console.error('[AUDIO] Failed to enumerate devices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    enumerateDevices();
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
  }, []);

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5 text-[#ea580c]" />
              <div>
                <CardTitle>Input Device (Microphone)</CardTitle>
                <CardDescription>Select which microphone to use for transmission</CardDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={enumerateDevices}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Select 
            value={preferences.inputDevice || 'default'}
            onValueChange={(value) => setPreferences(prev => ({
              ...prev,
              inputDevice: value
            }))}
          >
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select input device..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="default">Default Input Device</SelectItem>
              {inputDevices.map(device => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Input Device ${inputDevices.indexOf(device) + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {inputDevices.length === 0 && (
            <p className="text-xs text-zinc-500 mt-2">No input devices detected. Grant microphone permissions to see available devices.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-[#ea580c]" />
            <div>
              <CardTitle>Output Device (Speaker/Headphones)</CardTitle>
              <CardDescription>Select which speakers/headphones to use for audio playback</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Select 
            value={preferences.outputDevice || 'default'}
            onValueChange={(value) => setPreferences(prev => ({
              ...prev,
              outputDevice: value
            }))}
          >
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select output device..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="default">Default Output Device</SelectItem>
              {outputDevices.map(device => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Output Device ${outputDevices.indexOf(device) + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {outputDevices.length === 0 && (
            <p className="text-xs text-zinc-500 mt-2">No output devices detected.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}