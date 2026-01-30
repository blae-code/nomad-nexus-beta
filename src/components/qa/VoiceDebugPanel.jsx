import { useState, useEffect, useRef } from 'react';
import { Mic, Phone, PhoneOff, Volume2, Wifi, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const VoiceDebugPanel = () => {
  const [roomName, setRoomName] = useState('test-voice-room');
  const [participantName, setParticipantName] = useState('TestUser');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [participants, setParticipants] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedMic, setSelectedMic] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const [connectionQuality, setConnectionQuality] = useState(null);
  const [latency, setLatency] = useState(null);
  const [bandwidth, setBandwidth] = useState(null);
  
  const roomRef = useRef(null);
  const localParticipantRef = useRef(null);
  const analyzerRef = useRef(null);
  const animationRef = useRef(null);

  // Enumerate audio devices
  useEffect(() => {
    const getDevices = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(d => d.kind === 'audioinput');
      setAudioDevices(mics);
      if (mics.length > 0) setSelectedMic(mics[0].deviceId);
    };
    getDevices();
  }, []);

  // Join voice room
  const joinRoom = async () => {
    if (!roomName || !participantName) {
      setError('Room name and participant name required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { token } = await base44.functions.invoke('generateLiveKitToken', {
        room: roomName,
        username: participantName,
      });

      const { connect, Room, Participant } = await import('npm:livekit-client');

      const room = new Room({
        autoManageVideo: false,
        dynacast: true,
      });

      room.on('participantConnected', (participant) => {
        setParticipants((prev) => [...prev, {
          id: participant.identity,
          name: participant.name,
          audioEnabled: !participant.audioTrackSubscriptions.length === 0,
        }]);
      });

      room.on('participantDisconnected', (participant) => {
        setParticipants((prev) => prev.filter(p => p.id !== participant.identity));
      });

      room.on('connectionQualityChanged', (quality) => {
        setConnectionQuality(quality);
      });

      const url = new URL(Deno.env.get('LIVEKIT_URL') || window.location.origin);
      await room.connect(url.toString(), token);

      roomRef.current = room;
      localParticipantRef.current = room.localParticipant;

      // Enable audio track
      if (selectedMic) {
        await room.localParticipant.setAudioEnabled(true);
      }

      setConnected(true);
      startMonitoring(room);
    } catch (err) {
      setError(`Failed to join: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Leave room
  const leaveRoom = async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
      localParticipantRef.current = null;
    }
    setConnected(false);
    setParticipants([]);
    setAudioLevel(0);
    setLatency(null);
    setBandwidth(null);
    setConnectionQuality(null);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Start monitoring connection quality
  const startMonitoring = (room) => {
    const interval = setInterval(() => {
      if (room) {
        const stats = room.statistics;
        if (stats) {
          setLatency(Math.round(stats.rtt || 0));
          setBandwidth(Math.round((stats.bitrate || 0) / 1000));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  };

  // Toggle microphone
  const toggleMic = async () => {
    if (localParticipantRef.current) {
      await localParticipantRef.current.setAudioEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  // Test audio level visualization
  useEffect(() => {
    if (connected && localParticipantRef.current) {
      const updateAudioLevel = () => {
        if (analyzerRef.current) {
          const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
          analyzerRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(Math.min(100, average / 2.56));
        }
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };
      animationRef.current = requestAnimationFrame(updateAudioLevel);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [connected]);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className={`p-4 rounded-lg border-2 ${connected ? 'bg-green-900/30 border-green-600' : 'bg-zinc-800/50 border-zinc-700'}`}>
        <div className="flex items-center gap-2 mb-2">
          {connected ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-bold text-green-400">Connected</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-zinc-400" />
              <span className="font-bold text-zinc-400">Disconnected</span>
            </>
          )}
        </div>
        {connected && (
          <div className="text-xs text-zinc-300 space-y-1">
            <div>Room: <span className="text-orange-400">{roomName}</span></div>
            <div>User: <span className="text-orange-400">{participantName}</span></div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-600 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Connection Controls */}
      {!connected ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Room Name</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded text-sm"
              placeholder="test-voice-room"
            />
          </div>
          
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Participant Name</label>
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded text-sm"
              placeholder="TestUser"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Microphone</label>
            <select
              value={selectedMic || ''}
              onChange={(e) => setSelectedMic(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded text-sm"
            >
              {audioDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Mic ${device.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={joinRoom}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded font-bold text-sm transition disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Join Voice Room'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={toggleMic}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded font-bold text-sm transition ${
              isMuted
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
            {isMuted ? 'Unmute' : 'Mute'}
          </button>

          <button
            onClick={leaveRoom}
            className="w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 text-white py-2 rounded font-bold text-sm transition"
          >
            <PhoneOff className="w-4 h-4" />
            Leave Room
          </button>

          {/* Audio Level Visualization */}
          <div className="p-3 bg-zinc-800/50 rounded border border-zinc-700">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-zinc-400">Audio Level</span>
            </div>
            <div className="w-full bg-zinc-900 rounded h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-orange-500 h-full transition-all duration-75"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Connection Quality Metrics */}
      {connected && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
            <div className="text-zinc-400 mb-1">Latency</div>
            <div className="text-orange-400 font-bold">{latency ? `${latency}ms` : '--'}</div>
          </div>
          
          <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
            <div className="text-zinc-400 mb-1">Bandwidth</div>
            <div className="text-orange-400 font-bold">{bandwidth ? `${bandwidth}kbps` : '--'}</div>
          </div>

          <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
            <div className="text-zinc-400 mb-1">Quality</div>
            <div className="text-orange-400 font-bold">{connectionQuality || '--'}</div>
          </div>
        </div>
      )}

      {/* Participants List */}
      {connected && (
        <div className="p-3 bg-zinc-800/50 rounded border border-zinc-700">
          <div className="text-xs text-zinc-400 mb-2 font-bold">Participants ({participants.length + 1})</div>
          <div className="space-y-1 text-xs">
            <div className="p-2 bg-zinc-900 rounded text-orange-400 flex items-center gap-2">
              <Phone className="w-3 h-3" />
              {participantName} (You)
            </div>
            {participants.map((p) => (
              <div key={p.id} className="p-2 bg-zinc-900 rounded text-zinc-300 flex items-center gap-2">
                <Wifi className="w-3 h-3" />
                {p.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceDebugPanel;