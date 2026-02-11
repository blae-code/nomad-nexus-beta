import { useState, useEffect } from 'react';
import { getSavedInputDeviceId, getSavedOutputDeviceId, saveMicDeviceId, saveOutputDeviceId } from '@/components/voice/utils/devicePersistence';

/**
 * Hook to manage audio input devices
 * Lists available mics and manages selection
 */
export function useAudioDevices() {
  const [inputDevices, setInputDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Enumerate devices on mount
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        setLoading(true);
        const devices = await navigator.mediaDevices.enumerateDevices();

        // Filter to audio input devices only
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');
        setInputDevices(audioInputs);
        setOutputDevices(audioOutputs);

        // Load saved preference
        const savedId = getSavedInputDeviceId();
        if (savedId && audioInputs.some((d) => d.deviceId === savedId)) {
          setSelectedDeviceId(savedId);
        } else if (audioInputs.length > 0) {
          // Use first device if no saved preference
          setSelectedDeviceId(audioInputs[0].deviceId);
        }

        const savedOutputId = getSavedOutputDeviceId();
        if (savedOutputId && audioOutputs.some((d) => d.deviceId === savedOutputId)) {
          setSelectedOutputDeviceId(savedOutputId);
        } else if (audioOutputs.length > 0) {
          setSelectedOutputDeviceId(audioOutputs[0].deviceId);
        }

        setError(null);
      } catch (err) {
        console.error('Failed to enumerate audio devices:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    enumerateDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  // Update device selection
  const selectDevice = (deviceId) => {
    setSelectedDeviceId(deviceId);
    saveMicDeviceId(deviceId);
  };

  const selectOutputDevice = (deviceId) => {
    setSelectedOutputDeviceId(deviceId);
    saveOutputDeviceId(deviceId);
  };

  return {
    inputDevices,
    outputDevices,
    selectedDeviceId,
    selectedOutputDeviceId,
    selectDevice,
    selectOutputDevice,
    loading,
    error,
  };
}

export default useAudioDevices;
