import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Room, RoomEvent } from 'livekit-client';

const encoder = new TextEncoder();

const base64UrlEncode = (input) => {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const buildJwt = async ({ apiKey, apiSecret, roomName, identity }) => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: apiKey,
      sub: identity,
      name: identity,
      nbf: now - 5,
      iat: now,
      exp: now + 60 * 60,
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
      },
    }),
  );

  const data = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return `${data}.${base64UrlEncode(new Uint8Array(signature))}`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const LoadTestApp = () => {
  const [livekitUrl, setLivekitUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [roomName, setRoomName] = useState('load-test');
  const [participants, setParticipants] = useState(3);
  const [durationSeconds, setDurationSeconds] = useState(10);
  const [pttOnMs, setPttOnMs] = useState(1200);
  const [pttOffMs, setPttOffMs] = useState(1200);
  const [staggerMs, setStaggerMs] = useState(300);
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const roomsRef = useRef([]);
  const stopRef = useRef(false);

  const canStart = useMemo(() => {
    return livekitUrl && apiKey && apiSecret && roomName && participants > 0;
  }, [livekitUrl, apiKey, apiSecret, roomName, participants]);

  const addLog = (message, identity = 'LOAD-TEST') => {
    const stamp = new Date().toISOString();
    setLogs((prev) => [...prev, `[${stamp}][${identity}] ${message}`]);
  };

  const connectParticipant = async (index, stopAt) => {
    const identity = `load-test-${index}-${Math.random().toString(36).slice(2, 7)}`;
    const token = await buildJwt({ apiKey, apiSecret, roomName, identity });
    const room = new Room({ adaptiveStream: false, dynacast: false });

    roomsRef.current.push(room);

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      addLog(`participant joined: ${participant.identity}`, identity);
    });
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      addLog(`participant left: ${participant.identity}`, identity);
    });
    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      addLog(`connection state: ${state}`, identity);
    });
    room.on(RoomEvent.TrackSubscriptionFailed, (trackSid, participant, error) => {
      addLog(
        `track subscription failed for ${participant?.identity ?? 'unknown'} (${trackSid}): ${error?.message ?? error}`,
        identity,
      );
    });
    room.on(RoomEvent.Disconnected, (reason) => {
      addLog(`disconnected (${reason ?? 'no reason'})`, identity);
    });

    try {
      addLog(`connecting to ${roomName}`, identity);
      await room.connect(livekitUrl, token, { autoSubscribe: true });
      addLog('connected', identity);
    } catch (error) {
      addLog(`connect failed: ${error?.message ?? error}`, identity);
      return;
    }

    while (Date.now() < stopAt && !stopRef.current) {
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        addLog('push-to-talk ON', identity);
      } catch (error) {
        addLog(`push-to-talk ON failed: ${error?.message ?? error}`, identity);
      }

      await sleep(pttOnMs);

      try {
        await room.localParticipant.setMicrophoneEnabled(false);
        addLog('push-to-talk OFF', identity);
      } catch (error) {
        addLog(`push-to-talk OFF failed: ${error?.message ?? error}`, identity);
      }

      await sleep(pttOffMs);
    }

    room.disconnect();
    addLog('left room', identity);
  };

  const handleStart = async () => {
    if (!canStart || isRunning) return;

    setIsRunning(true);
    stopRef.current = false;
    roomsRef.current = [];
    setLogs([]);

    const stopAt = Date.now() + durationSeconds * 1000;

    addLog(`starting ${participants} participants in ${roomName}`);

    const runners = Array.from({ length: participants }, (_, index) => (async () => {
      await sleep(staggerMs * index);
      await connectParticipant(index + 1, stopAt);
    })());

    await Promise.allSettled(runners);

    addLog('completed');
    setIsRunning(false);
  };

  const handleStop = () => {
    stopRef.current = true;
    roomsRef.current.forEach((room) => room.disconnect());
    addLog('stop requested');
    setIsRunning(false);
  };

  return (
    <div style={{ padding: '32px', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>LiveKit Load Test</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>
        Configure your LiveKit credentials, then launch simulated participants that connect, toggle push-to-talk,
        and leave the room after a few seconds.
      </p>

      <div style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        marginBottom: 24,
        background: '#111827',
        padding: 16,
        borderRadius: 12,
        border: '1px solid #1f2937',
      }}>
        <label>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>LiveKit URL</div>
          <input
            type="text"
            value={livekitUrl}
            onChange={(event) => setLivekitUrl(event.target.value)}
            placeholder="wss://your-livekit-host"
            style={{ width: '100%', marginTop: 6 }}
          />
        </label>
        <label>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>API Key</div>
          <input
            type="text"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="LK_API_KEY"
            style={{ width: '100%', marginTop: 6 }}
          />
        </label>
        <label>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>API Secret</div>
          <input
            type="password"
            value={apiSecret}
            onChange={(event) => setApiSecret(event.target.value)}
            placeholder="LK_API_SECRET"
            style={{ width: '100%', marginTop: 6 }}
          />
        </label>
        <label>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Room Name</div>
          <input
            type="text"
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
            style={{ width: '100%', marginTop: 6 }}
          />
        </label>
        <label>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Participants</div>
          <input
            type="number"
            min="1"
            value={participants}
            onChange={(event) => setParticipants(Number(event.target.value))}
            style={{ width: '100%', marginTop: 6 }}
          />
        </label>
        <label>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Duration (seconds)</div>
          <input
            type="number"
            min="1"
            value={durationSeconds}
            onChange={(event) => setDurationSeconds(Number(event.target.value))}
            style={{ width: '100%', marginTop: 6 }}
          />
        </label>
        <label>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>PTT On (ms)</div>
          <input
            type="number"
            min="100"
            value={pttOnMs}
            onChange={(event) => setPttOnMs(Number(event.target.value))}
            style={{ width: '100%', marginTop: 6 }}
          />
        </label>
        <label>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>PTT Off (ms)</div>
          <input
            type="number"
            min="100"
            value={pttOffMs}
            onChange={(event) => setPttOffMs(Number(event.target.value))}
            style={{ width: '100%', marginTop: 6 }}
          />
        </label>
        <label>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Stagger (ms)</div>
          <input
            type="number"
            min="0"
            value={staggerMs}
            onChange={(event) => setStaggerMs(Number(event.target.value))}
            style={{ width: '100%', marginTop: 6 }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button
          type="button"
          onClick={handleStart}
          disabled={!canStart || isRunning}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: canStart && !isRunning ? '#22c55e' : '#334155',
            color: '#0f172a',
            fontWeight: 600,
            cursor: canStart && !isRunning ? 'pointer' : 'not-allowed',
          }}
        >
          {isRunning ? 'Running...' : 'Start Load Test'}
        </button>
        <button
          type="button"
          onClick={handleStop}
          disabled={!isRunning}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: '1px solid #475569',
            background: 'transparent',
            color: '#e2e8f0',
            cursor: isRunning ? 'pointer' : 'not-allowed',
          }}
        >
          Stop
        </button>
      </div>

      <div style={{
        background: '#0b1120',
        borderRadius: 12,
        border: '1px solid #1e293b',
        padding: 16,
        height: 320,
        overflowY: 'auto',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 12,
      }}>
        {logs.length === 0 && (
          <div style={{ color: '#64748b' }}>Logs will appear here.</div>
        )}
        {logs.map((entry, index) => (
          <div key={`${entry}-${index}`} style={{ marginBottom: 4 }}>{entry}</div>
        ))}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<LoadTestApp />);
