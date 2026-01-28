/**
 * Voice Control Panel
 * Mic selection, test, and floor control (PTT vs open-mic)
 */
import { useState, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VoiceControlPanel({ discipline = 'casual', isMuted = false, onMuteToggle, currentEvent = null }) {
  const [selectedMic, setSelectedMic] = useState('default');
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [testLevel, setTestLevel] = useState(0);
  const audioRef = useRef(null);

  // Mock mic devices
  const mics = [
    { id: 'default', label: 'System Default' },
    { id: 'headset', label: 'Headset' },
    { id: 'builtin', label: 'Built-in' }
  ];

  const handleTestMic = async () => {
    setIsMicTesting(true);
    // Simulate mic level meter
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 50));
      setTestLevel(i);
    }
    setIsMicTesting(false);
    setTestLevel(0);
  };

  const isPTTEnabled = discipline === 'focused' && currentEvent?.event_type === 'focused';

  return (
    <div className="space-y-1.5 text-[8px]">
      {/* Mic Selection */}
      <div className="px-2 py-1 space-y-1">
        <label className="block font-bold uppercase text-zinc-500">Microphone</label>
        <select
          value={selectedMic}
          onChange={(e) => setSelectedMic(e.target.value)}
          className="w-full px-1.5 py-1 bg-zinc-900/50 border border-zinc-700 text-zinc-300 focus:outline-none focus:border-[#ea580c] rounded-none"
        >
          {mics.map(mic => (
            <option key={mic.id} value={mic.id}>{mic.label}</option>
          ))}
        </select>
      </div>

      {/* Mic Test */}
      <div className="px-2 py-1 space-y-1">
        <button
          onClick={handleTestMic}
          disabled={isMicTesting}
          className={cn(
            'w-full px-1.5 py-1 border rounded-none transition-all flex items-center justify-between gap-2',
            isMicTesting
              ? 'bg-orange-950/30 border-orange-700/40'
              : 'bg-zinc-900/40 border-zinc-700 hover:border-[#ea580c]'
          )}
        >
          <span className="flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            Test Mic
          </span>
          {isMicTesting && testLevel > 0 && (
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1 h-2 rounded-full',
                    i * 20 < testLevel ? 'bg-green-500' : 'bg-zinc-700'
                  )}
                />
              ))}
            </div>
          )}
        </button>
      </div>

      {/* Floor Control */}
      {isPTTEnabled && (
        <div className="px-2 py-1.5 border border-red-700/40 bg-red-950/20 space-y-1">
          <div className="font-bold uppercase text-red-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            PTT Enforced
          </div>
          <p className="text-[7px] text-red-200">
            This is a focused operation. Release to transmit only when necessary.
          </p>
          <button
            onClick={() => onMuteToggle?.(!isMuted)}
            className={cn(
              'w-full px-1.5 py-1 border rounded-none transition-all',
              isMuted
                ? 'bg-red-950/40 border-red-700 text-red-300'
                : 'bg-green-950/40 border-green-700 text-green-300'
            )}
          >
            {isMuted ? '🔇 Muted (Click to unmute)' : '🎤 Unmuted (Click to mute)'}
          </button>
        </div>
      )}

      {/* Open Mic Info */}
      {!isPTTEnabled && (
        <div className="px-2 py-1 text-[7px] text-zinc-600 italic">
          Open microphone mode
        </div>
      )}
    </div>
  );
}