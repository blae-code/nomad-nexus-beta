import { useState, useEffect } from 'react';
import { getSavedInputDeviceId, saveMicDeviceId } from '@/components/voice/utils/devicePersistence';

/**
 * Hook to manage audio input devices
 * Lists available mics and manages selection
 */
export function useAudioDevices() {
  const [inputDevices, setInputDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
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
        setInputDevices(audioInputs);

        // Load saved preference
        const savedId = getSavedInputDeviceId();
        if (savedId && audioInputs.some((d) => d.deviceId === savedId)) {
          setSelectedDeviceId(savedId);
        } else if (audioInputs.length > 0) {
          // Use first device if no saved preference
          setSelectedDeviceId(audioInputs[0].deviceId);
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

  return {
    inputDevices,
    selectedDeviceId,
    selectDevice,
    loading,
    error,
  };
}

export default useAudioDevices;