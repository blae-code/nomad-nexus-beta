import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Radio, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

/**
 * CommsPreflight: One-time voice setup modal
 * Checks mic permission, device selection, level meter, and transmit mode
 */
export default function CommsPreflight({ isOpen, onComplete, onCancel, eventMode = 'focused' }) {
  const [step, setStep] = useState('permission');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [transmitMode, setTransmitMode] = useState(eventMode === 'focused' ? 'PTT' : 'OPEN_MIC');
  const [isChecking, setIsChecking] = useState(false);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Request microphone permission
  const requestPermission = async () => {
    setIsChecking(true);
    setPermissionError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionGranted(true);
      setStep('device');
      
      // Get available devices
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = deviceList.filter(d => d.kind === 'audioinput');
      setDevices(audioDevices);
      
      // Auto-select first device
      if (audioDevices.length > 0) {
        setSelectedDeviceId(audioDevices[0].deviceId);
      }

      // Set up audio level monitoring
      setupAudioMonitoring(stream);
    } catch (err) {
      console.error('[PREFLIGHT] Mic permission error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('denied');
      } else if (err.name === 'NotFoundError') {
        setPermissionError('no_device');
      } else {
        setPermissionError('unknown');
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Set up audio level monitoring
  const setupAudioMonitoring = (stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    
    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 512;
    
    microphone.connect(analyser);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    
    // Start level monitoring
    monitorAudioLevel();
  };

  // Monitor audio input level
  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalized = Math.min(100, (average / 128) * 100);
    
    setAudioLevel(normalized);
    
    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  };

  // Change device
  const handleDeviceChange = async (deviceId) => {
    setSelectedDeviceId(deviceId);
    
    // Stop current stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Get new stream with selected device
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } }
      });
      streamRef.current = stream;
      setupAudioMonitoring(stream);
    } catch (err) {
      console.error('[PREFLIGHT] Device change error:', err);
    }
  };

  // Save preferences and complete preflight
  const handleComplete = async () => {
    try {
      const user = await base44.auth.me();
      
      // Check if preferences exist
      const existing = await base44.entities.VoicePrefs.filter({ user_id: user.id });
      
      const prefsData = {
        user_id: user.id,
        preflight_completed: true,
        transmit_mode: transmitMode,
        selected_device_id: selectedDeviceId,
        last_updated: new Date().toISOString()
      };
      
      if (existing?.length > 0) {
        await base44.entities.VoicePrefs.update(existing[0].id, prefsData);
      } else {
        await base44.entities.VoicePrefs.create(prefsData);
      }
      
      onComplete?.(prefsData);
    } catch (err) {
      console.error('[PREFLIGHT] Save error:', err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  if (!isOpen) return null;

  const getErrorMessage = () => {
    if (permissionError === 'denied') {
      return {
        title: 'Microphone Access Denied',
        message: 'Please enable microphone access in your browser settings and try again.',
        guidance: 'Look for the camera/microphone icon in your browser\'s address bar.'
      };
    } else if (permissionError === 'no_device') {
      return {
        title: 'No Microphone Found',
        message: 'No microphone device detected. Please connect a microphone and try again.',
        guidance: 'Make sure your microphone is properly connected to your computer.'
      };
    } else {
      return {
        title: 'Permission Error',
        message: 'Unable to access microphone. Please check your browser settings.',
        guidance: 'You may need to reload the page after granting permission.'
      };
    }
  };

  const errorInfo = permissionError ? getErrorMessage() : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-zinc-950 border border-zinc-800 rounded shadow-2xl">
              {/* Header */}
              <div className="p-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <Radio className="w-5 h-5 text-[#ea580c]" />
                  <div>
                    <h2 className="text-sm font-bold uppercase">Voice Setup</h2>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      One-time configuration for voice comms
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Permission Step */}
                {step === 'permission' && !permissionGranted && (
                  <div className="space-y-4">
                    {permissionError ? (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <div className="flex items-start gap-3 p-3 bg-red-950/20 border border-red-800/30 rounded">
                          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-red-400">{errorInfo.title}</div>
                            <div className="text-xs text-zinc-400 mt-1">{errorInfo.message}</div>
                            <div className="text-[10px] text-zinc-600 mt-2 italic">{errorInfo.guidance}</div>
                          </div>
                        </div>
                        <Button
                          onClick={requestPermission}
                          disabled={isChecking}
                          className="w-full bg-[#ea580c] hover:bg-[#ea580c]/90"
                        >
                          {isChecking ? 'Checking...' : 'Try Again'}
                        </Button>
                      </motion.div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto bg-zinc-900 rounded-full flex items-center justify-center">
                          <Mic className="w-8 h-8 text-zinc-500" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">Microphone Access Required</div>
                          <div className="text-xs text-zinc-500 mt-1">
                            Click below to allow microphone access for voice comms
                          </div>
                        </div>
                        <Button
                          onClick={requestPermission}
                          disabled={isChecking}
                          className="w-full bg-[#ea580c] hover:bg-[#ea580c]/90"
                        >
                          {isChecking ? 'Requesting...' : 'Grant Microphone Access'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Device Selection Step */}
                {step === 'device' && permissionGranted && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs text-green-500">
                      <Check className="w-4 h-4" />
                      <span>Microphone access granted</span>
                    </div>

                    {/* Device Selector */}
                    <div>
                      <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">
                        Microphone Device
                      </label>
                      <Select value={selectedDeviceId} onValueChange={handleDeviceChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select device" />
                        </SelectTrigger>
                        <SelectContent>
                          {devices.map(device => (
                            <SelectItem key={device.deviceId} value={device.deviceId}>
                              {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Audio Level Meter */}
                    <div>
                      <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">
                        Input Level
                      </label>
                      <div className="space-y-2">
                        <div className="h-8 bg-zinc-900 rounded overflow-hidden relative">
                          <motion.div
                            className="h-full bg-gradient-to-r from-green-500 to-green-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${audioLevel}%` }}
                            transition={{ duration: 0.1 }}
                          />
                        </div>
                        <div className="text-[10px] text-zinc-600 text-center">
                          Speak to test your microphone
                        </div>
                      </div>
                    </div>

                    {/* Transmit Mode */}
                    <div>
                      <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">
                        Transmit Mode
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setTransmitMode('PTT')}
                          className={cn(
                            'p-3 rounded border-2 transition-all text-left',
                            transmitMode === 'PTT'
                              ? 'border-[#ea580c] bg-[#ea580c]/10'
                              : 'border-zinc-800 hover:border-zinc-700'
                          )}
                        >
                          <div className="text-xs font-bold">Push-to-Talk</div>
                          <div className="text-[10px] text-zinc-500 mt-1">
                            Press key to transmit
                          </div>
                        </button>
                        <button
                          onClick={() => setTransmitMode('OPEN_MIC')}
                          className={cn(
                            'p-3 rounded border-2 transition-all text-left',
                            transmitMode === 'OPEN_MIC'
                              ? 'border-[#ea580c] bg-[#ea580c]/10'
                              : 'border-zinc-800 hover:border-zinc-700'
                          )}
                        >
                          <div className="text-xs font-bold">Open Mic</div>
                          <div className="text-[10px] text-zinc-500 mt-1">
                            Always transmitting
                          </div>
                        </button>
                      </div>
                      <div className="text-[10px] text-zinc-600 mt-2">
                        {eventMode === 'focused' ? 'PTT recommended for ops' : 'Open mic for casual'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              {step === 'device' && permissionGranted && (
                <div className="p-4 border-t border-zinc-800 flex items-center justify-between gap-3">
                  <Button variant="outline" onClick={onCancel} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleComplete}
                    className="flex-1 bg-[#ea580c] hover:bg-[#ea580c]/90"
                  >
                    Complete Setup
                  </Button>
                </div>
              )}

              {step === 'permission' && !permissionGranted && !permissionError && (
                <div className="p-4 border-t border-zinc-800">
                  <Button variant="outline" onClick={onCancel} className="w-full">
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}