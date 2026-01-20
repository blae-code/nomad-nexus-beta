import { useState, useEffect, useRef } from 'react';

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

  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const oscillatorRef = useRef(null);

  const { localParticipant } = useLocalParticipant();

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
    }).catch(err => console.error('Mic access denied:', err));
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

  // Simulate latency from LocalParticipant (in real scenario, this comes from LiveKit stats)
  useEffect(() => {
    if (!localParticipant) return;

    const interval = setInterval(() => {
      // In production: get actual RTT from localParticipant.audioTrackPublications stats
      setLatency(Math.max(15, Math.random() * 80));
      
      // Quality based on input level and latency
      if (latency > 100) setSignalQuality('poor');
      else if (latency > 60) setSignalQuality('fair');
      else if (inputLevel > 200) setSignalQuality('excellent');
      else setSignalQuality('good');
    }, 2000);

    return () => clearInterval(interval);
  }, [localParticipant]);

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
  };
}