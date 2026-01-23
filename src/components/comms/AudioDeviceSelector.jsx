import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Settings, TestTube } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

/**
 * Audio Device Selector & Test Mic Panel
 * Allows users to select input/output devices and test mic with meter
 */
export default function AudioDeviceSelector({ onDeviceChange }) {
  const [selectedMic, setSelectedMic] = useState('default');
  const [selectedSpeaker, setSelectedSpeaker] = useState('default');
  const [micDevices, setMicDevices] = useState([]);
  const [speakerDevices, setSpeakerDevices] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  // Simulate device enumeration
  useEffect(() => {
    // In real implementation, would use navigator.mediaDevices.enumerateDevices()
    const mockMics = [
      { id: 'default', label: 'Default Microphone' },
      { id: 'headset', label: 'Headset Microphone' },
      { id: 'usb', label: 'USB Audio Device' }
    ];

    const mockSpeakers = [
      { id: 'default', label: 'Default Speaker' },
      { id: 'headphones', label: 'Headphones' },
      { id: 'usb-out', label: 'USB Audio Out' }
    ];

    setMicDevices(mockMics);
    setSpeakerDevices(mockSpeakers);
  }, []);

  const handleMicChange = (deviceId) => {
    setSelectedMic(deviceId);
    onDeviceChange?.({ mic: deviceId, speaker: selectedSpeaker });
  };

  const handleSpeakerChange = (deviceId) => {
    setSelectedSpeaker(deviceId);
    onDeviceChange?.({ mic: selectedMic, speaker: deviceId });
  };

  const handleTestMic = () => {
    setIsTesting(!isTesting);

    if (!isTesting) {
      // Simulate mic level animation
      let level = 0;
      const testInterval = setInterval(() => {
        level = Math.floor(Math.random() * 100);
        setMicLevel(level);

        if (level > 80) {
          setTimeout(() => clearInterval(testInterval), 100);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(testInterval);
        setIsTesting(false);
        setMicLevel(0);
      }, 2000);
    }
  };

  return (
    <div className="border border-zinc-800/50 bg-zinc-950/50 rounded-sm">
      <div className="p-2 space-y-2">
        <div className="flex items-center gap-2">
          <Settings className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">AUDIO SETUP</span>
        </div>

        {/* Microphone Selection */}
        <div className="space-y-1">
          <label className="text-[8px] text-zinc-500 uppercase font-bold">Microphone</label>
          <select
            value={selectedMic}
            onChange={(e) => handleMicChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-sm px-2 py-1 text-[8px] text-zinc-200 focus:outline-none focus:border-cyan-400"
          >
            {micDevices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.label}
              </option>
            ))}
          </select>
        </div>

        {/* Speaker Selection */}
        <div className="space-y-1">
          <label className="text-[8px] text-zinc-500 uppercase font-bold">Speaker</label>
          <select
            value={selectedSpeaker}
            onChange={(e) => handleSpeakerChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-sm px-2 py-1 text-[8px] text-zinc-200 focus:outline-none focus:border-cyan-400"
          >
            {speakerDevices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.label}
              </option>
            ))}
          </select>
        </div>

        {/* Test Mic */}
        <div className="border-t border-zinc-800 pt-2 mt-2 space-y-1.5">
          <button
            onClick={handleTestMic}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-2 py-1 text-[8px] font-bold uppercase transition-all border',
              isTesting
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-400 hover:border-cyan-500/30'
            )}
          >
            <TestTube className="w-2.5 h-2.5" />
            {isTesting ? 'Testing...' : 'Test Microphone'}
          </button>

          {/* Mic Level Meter */}
          {(isTesting || micLevel > 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-[7px] text-zinc-600">Input Level</span>
                <span className="text-[7px] font-mono text-zinc-500">{micLevel}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-900 border border-zinc-700 rounded-sm overflow-hidden">
                <motion.div
                  className={cn(
                    'h-full',
                    micLevel < 30
                      ? 'bg-emerald-500'
                      : micLevel < 70
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${micLevel}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <div className="flex gap-0.5 text-[6px] text-zinc-600">
                <span>Too quiet</span>
                <span className="flex-1 text-center">Good</span>
                <span>Too loud</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}