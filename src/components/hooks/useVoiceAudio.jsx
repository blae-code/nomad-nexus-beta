import { useState, useEffect, useRef } from 'react';

/**
 * useVoiceAudio Hook
 * Rationale: surface microphone permission blocks so UI can guide users to enable access.
 */
export function useVoiceAudio() {
  const [micEnabled, setMicEnabled] = useState(false);
  const [micVolume, setMicVolume] = useState(75);
  const [speakerVolume, setSpeakerVolume] = useState(75);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [latency, setLatency] = useState(0);
  const [signalQuality, setSignalQuality] = useState('good');
  const [noiseGate, setNoiseGate] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [autoGain, setAutoGain] = useState(true);
  const [micPermissionBlocked, setMicPermissionBlocked] = useState(false);
  const [micPermissionState, setMicPermissionState] = useState('prompt');

  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceRef = useRef(null);
  const permissionStatusRef = useRef(null);

  // Initialize audio context and analyser
  useEffect(() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    return () => {
      audioContext.close();
    };
  }, []);

  // Track mic permission state
  useEffect(() => {
    let isMounted = true;

    const updateFromPermission = (status) => {
      if (!isMounted) return;
      setMicPermissionState(status.state);
      setMicPermissionBlocked(status.state === 'denied');
    };

    if (navigator.permissions?.query) {
      const handlePermissionChange = () => {
        if (permissionStatusRef.current) {
          updateFromPermission(permissionStatusRef.current);
        }
      };
      navigator.permissions.query({ name: 'microphone' }).then((status) => {
        permissionStatusRef.current = status;
        updateFromPermission(status);
        status.addEventListener('change', handlePermissionChange);
        permissionStatusRef.current.__handler = handlePermissionChange;
      }).catch(() => {
        // No-op: permissions API not available or blocked.
      });
    }

    return () => {
      isMounted = false;
      if (permissionStatusRef.current) {
        if (permissionStatusRef.current.__handler) {
          permissionStatusRef.current.removeEventListener('change', permissionStatusRef.current.__handler);
        }
        permissionStatusRef.current = null;
      }
    };
  }, []);

  // Get microphone access
  useEffect(() => {
    if (!micEnabled) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: {
      echoCancellation,
      noiseSuppression: noiseGate,
      autoGainControl: autoGain
    }}).then(stream => {
      mediaStreamRef.current = stream;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      setMicPermissionBlocked(false);
      setMicPermissionState('granted');
    }).catch(err => {
      console.error('Mic access denied:', err);
      if (['NotAllowedError', 'SecurityError', 'PermissionDeniedError'].includes(err?.name)) {
        setMicPermissionBlocked(true);
        setMicPermissionState('denied');
      }
    });
  }, [micEnabled, echoCancellation, noiseGate, autoGain]);

  // Monitor input levels
  useEffect(() => {
    if (!micEnabled || !analyserRef.current) return;

    const interval = setInterval(() => {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
      setInputLevel(Math.round(average));
    }, 100);

    return () => clearInterval(interval);
  }, [micEnabled]);

  // Monitor signal quality based on input level and latency
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate latency (15-80ms typical)
      setLatency(Math.max(15, Math.random() * 80));
      
      // Quality based on input level and latency
      if (latency > 100) setSignalQuality('poor');
      else if (latency > 60) setSignalQuality('fair');
      else if (inputLevel > 200) setSignalQuality('excellent');
      else setSignalQuality('good');
    }, 2000);

    return () => clearInterval(interval);
  }, [inputLevel, latency]);

  return {
    micEnabled,
    setMicEnabled,
    micVolume,
    setMicVolume,
    speakerVolume,
    setSpeakerVolume,
    inputLevel,
    outputLevel,
    latency,
    signalQuality,
    noiseGate,
    setNoiseGate,
    echoCancellation,
    setEchoCancellation,
    autoGain,
    setAutoGain,
    micPermissionBlocked,
    micPermissionState,
  };
}
