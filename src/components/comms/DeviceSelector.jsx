import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Mic, Volume2, TestTube } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function DeviceSelector({ onDeviceChange, onTest }) {
  const [audioInputs, setAudioInputs] = React.useState([]);
  const [audioOutputs, setAudioOutputs] = React.useState([]);
  const [selectedInput, setSelectedInput] = React.useState('default');
  const [selectedOutput, setSelectedOutput] = React.useState('default');
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    // Enumerate devices
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(devices.filter(d => d.kind === 'audioinput'));
        setAudioOutputs(devices.filter(d => d.kind === 'audiooutput'));
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
      }
    };

    getDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, []);

  const handleTest = async () => {
    setTesting(true);
    // Test microphone by recording a short clip and playing it back
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { deviceId: selectedInput } 
      });
      
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const audio = new Audio(URL.createObjectURL(blob));
        if (selectedOutput !== 'default') {
          audio.setSinkId && audio.setSinkId(selectedOutput);
        }
        audio.play();
        stream.getTracks().forEach(t => t.stop());
      };
      
      recorder.start();
      setTimeout(() => {
        recorder.stop();
        setTesting(false);
      }, 2000);
      
      onTest && onTest({ input: selectedInput, output: selectedOutput });
    } catch (err) {
      console.error('Test failed:', err);
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm">
      <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Audio Devices</div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Mic className="w-3 h-3 text-zinc-500" />
          <div className="text-[10px] text-zinc-500 uppercase w-20">Input</div>
          <Select value={selectedInput ?? "default"} onValueChange={(val) => {
            setSelectedInput(val);
            onDeviceChange && onDeviceChange({ input: val, output: selectedOutput });
          }}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-300 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <SelectItem value="default">System Default</SelectItem>
              {audioInputs?.map(d => (
                d?.deviceId && <SelectItem key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0,8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Volume2 className="w-3 h-3 text-zinc-500" />
          <div className="text-[10px] text-zinc-500 uppercase w-20">Output</div>
          <Select value={selectedOutput ?? "default"} onValueChange={(val) => {
            setSelectedOutput(val);
            onDeviceChange && onDeviceChange({ input: selectedInput, output: val });
          }}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-300 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <SelectItem value="default">System Default</SelectItem>
              {audioOutputs?.map(d => (
                d?.deviceId && <SelectItem key={d.deviceId} value={d.deviceId}>
                  {d.label || `Speaker ${d.deviceId.slice(0,8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleTest}
        disabled={testing}
        className="w-full gap-2 h-7 text-xs bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
      >
        <TestTube className={cn("w-3 h-3", testing && "animate-pulse")} />
        {testing ? 'Recording...' : 'Test Audio (2s)'}
      </Button>
    </div>
  );
}