import { Room, RoomEvent } from 'livekit-client';

/**
 * LiveKitTransport — Production voice transport with command-bus and telemetry hooks.
 * The model remains backwards-compatible with legacy VoiceNetProvider events.
 */
export class LiveKitTransport {
  constructor() {
    this.room = null;
    this.localParticipant = null;
    this.handlers = {};
    this.state = 'IDLE';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelayMs = 1000;

    this.remoteAudioByParticipant = new Map(); // participantId -> HTMLAudioElement
    this.outputDeviceId = null;
    this.participantGainDb = new Map();
    this.normalizationEnabled = true;
    this.monitorSubmixes = ['COMMAND', 'SQUAD', 'LOCAL'];
    this.txSubmix = 'SQUAD';
    this.telemetryTimer = null;
    this.controlTopic = 'nexus.control';
  }

  /**
   * Connect to LiveKit room for voice net
   * @param {Object} options - { token, url, netId, user }
   */
  async connect(options) {
    const { token, url, netId } = options;

    if (!token || !url) {
      throw new Error('Token and URL required for LiveKit connection');
    }

    try {
      this.state = 'JOINING';

      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      this._wireRoomEvents();
      await this.room.connect(url, token);

      this.state = 'CONNECTED';
      this.reconnectAttempts = 0;
      this.localParticipant = this.room.localParticipant;
      await this.localParticipant.setMicrophoneEnabled(true);
      this._startTelemetryTicker(netId);

      this._emit('connected', {
        netId,
        roomName: this.room.name,
        participants: this._buildParticipantList(),
      });
    } catch (error) {
      this.state = 'ERROR';
      console.error('[LiveKitTransport] Connection failed:', error);
      this._emit('error', {
        message: error.message,
        code: 'CONNECTION_FAILED',
      });
      throw error;
    }
  }

  /**
   * Disconnect from room
   */
  async disconnect() {
    this._stopTelemetryTicker();
    for (const audio of this.remoteAudioByParticipant.values()) {
      try {
        audio.pause?.();
      } catch {
        // ignore
      }
      try {
        audio.remove?.();
      } catch {
        // ignore
      }
    }
    this.remoteAudioByParticipant.clear();

    if (this.room) {
      try {
        await this.localParticipant?.setMicrophoneEnabled(false);
        await this.room.disconnect(true);
      } catch (error) {
        console.error('[LiveKitTransport] Disconnect error:', error);
      }
    }

    this.state = 'IDLE';
    this.room = null;
    this.localParticipant = null;
    this._emit('disconnected', {});
  }

  /**
   * Enable/disable microphone
   */
  async setMicEnabled(enabled) {
    if (!this.localParticipant) return;

    try {
      await this.localParticipant.setMicrophoneEnabled(enabled);
      this._emit('mic-enabled', { enabled });
    } catch (error) {
      console.error('[LiveKitTransport] Mic control failed:', error);
      this._emit('error', {
        message: `Failed to ${enabled ? 'enable' : 'disable'} microphone`,
        code: 'MIC_CONTROL_FAILED',
      });
    }
  }

  /**
   * Push-to-talk: enable/disable audio track publish
   */
  async setPTTActive(active) {
    if (!this.localParticipant) return;

    try {
      await this.localParticipant.setMicrophoneEnabled(active);
      this._emit('ptt-active', { active });
    } catch (error) {
      console.error('[LiveKitTransport] PTT control failed:', error);
      this._emit('error', {
        message: 'Failed to toggle PTT',
        code: 'PTT_CONTROL_FAILED',
      });
    }
  }

  /**
   * Publish command/control packet over LiveKit data channel.
   */
  async publishControlPacket(packet = {}) {
    if (!this.localParticipant) return;
    try {
      const body = {
        id: packet.id || `control-${Date.now()}`,
        type: packet.type || 'CONTROL',
        sentAt: packet.sentAt || new Date().toISOString(),
        ...packet,
      };
      const encoded = new TextEncoder().encode(JSON.stringify(body));
      await this.localParticipant.publishData(encoded, {
        reliable: true,
        topic: this.controlTopic,
      });
      this._emit('control-packet-local', body);
    } catch (error) {
      console.error('[LiveKitTransport] publishControlPacket failed:', error);
      this._emit('error', {
        message: 'Failed to publish control packet',
        code: 'CONTROL_PACKET_FAILED',
      });
    }
  }

  /**
   * Set input microphone device.
   */
  async setAudioDevice(deviceId) {
    if (!this.localParticipant) return;

    try {
      await this.localParticipant.setMicrophoneEnabled(false);
      const audioOptions = {
        deviceId: deviceId ? { ideal: deviceId } : undefined,
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioOptions,
      });
      const tracks = stream.getAudioTracks();
      if (tracks?.[0]) {
        await this.localParticipant.publishTrack(tracks[0], { source: 'microphone' });
      }
      this._emit('device-changed', { deviceId });
    } catch (error) {
      console.error('[LiveKitTransport] Device change failed:', error);
      this._emit('error', {
        message: 'Failed to change audio device',
        code: 'DEVICE_CHANGE_FAILED',
      });
    }
  }

  /**
   * Set output playback device for all remote audio elements.
   */
  async setOutputDevice(deviceId) {
    this.outputDeviceId = deviceId || null;
    const tasks = [];
    for (const audio of this.remoteAudioByParticipant.values()) {
      if (audio && typeof audio.setSinkId === 'function') {
        tasks.push(audio.setSinkId(this.outputDeviceId || 'default').catch(() => {}));
      }
    }
    await Promise.all(tasks);
    this._emit('output-device-changed', { deviceId: this.outputDeviceId });
  }

  /**
   * Set per-user gain trim in dB.
   */
  setParticipantGain(participantId, gainDb) {
    if (!participantId) return;
    this.participantGainDb.set(participantId, gainDb);
    const audio = this.remoteAudioByParticipant.get(participantId);
    if (audio) {
      audio.volume = this._gainDbToLinear(gainDb);
    }
    this._emit('participant-gain-changed', { participantId, gainDb });
  }

  setNormalizationEnabled(enabled) {
    this.normalizationEnabled = Boolean(enabled);
    this._emit('normalization-changed', { enabled: this.normalizationEnabled });
  }

  setSubmixRouting({ monitorSubmixes, txSubmix } = {}) {
    if (Array.isArray(monitorSubmixes)) this.monitorSubmixes = monitorSubmixes;
    if (txSubmix) this.txSubmix = String(txSubmix).toUpperCase();
    this._emit('submix-routing-changed', {
      monitorSubmixes: [...this.monitorSubmixes],
      txSubmix: this.txSubmix,
    });
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);

    return () => {
      this.handlers[event] = this.handlers[event].filter((h) => h !== handler);
    };
  }

  /**
   * Get current participants
   */
  getParticipants() {
    if (!this.room) return [];

    return Array.from(this.room.participants.values()).map((p) => ({
      userId: p.identity,
      callsign: this._extractCallsign(p),
      clientId: this._extractClientId(p),
      isSpeaking: p.isSpeaking,
    }));
  }

  /**
   * Get connection state
   */
  getState() {
    return this.state;
  }

  _wireRoomEvents() {
    if (!this.room) return;

    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      this._emit('participant-joined', {
        userId: participant.identity,
        callsign: this._extractCallsign(participant),
        clientId: this._extractClientId(participant),
      });
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      const audio = this.remoteAudioByParticipant.get(participant.identity);
      if (audio) {
        try {
          audio.pause?.();
          audio.remove?.();
        } catch {
          // ignore
        }
      }
      this.remoteAudioByParticipant.delete(participant.identity);

      this._emit('participant-left', {
        userId: participant.identity,
      });
    });

    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const speakerIds = speakers.map((s) => s.identity);
      this.room.participants.forEach((participant) => {
        this._emit('speaking-changed', {
          userId: participant.identity,
          isSpeaking: speakerIds.includes(participant.identity),
        });
      });
    });

    this.room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      try {
        if (!track || track.kind !== 'audio') return;
        const audio = track.attach?.();
        if (!audio) return;
        audio.autoplay = true;
        audio.muted = false;
        if (typeof audio.setSinkId === 'function' && this.outputDeviceId) {
          audio.setSinkId(this.outputDeviceId).catch(() => {});
        }
        const gainDb = this.participantGainDb.get(participant.identity) || 0;
        audio.volume = this._gainDbToLinear(gainDb);
        this.remoteAudioByParticipant.set(participant.identity, audio);
      } catch (error) {
        console.debug('[LiveKitTransport] TrackSubscribed handling failed:', error?.message);
      }
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
      try {
        track?.detach?.();
      } catch {
        // ignore
      }
      const audio = this.remoteAudioByParticipant.get(participant.identity);
      if (audio) {
        try {
          audio.pause?.();
          audio.remove?.();
        } catch {
          // ignore
        }
      }
      this.remoteAudioByParticipant.delete(participant.identity);
    });

    this.room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
      try {
        const parsed = JSON.parse(new TextDecoder().decode(payload));
        this._emit('control-packet', {
          ...parsed,
          fromUserId: participant?.identity || null,
          topic: topic || this.controlTopic,
          kind: kind || null,
          receivedAt: new Date().toISOString(),
        });
      } catch {
        this._emit('control-packet', {
          fromUserId: participant?.identity || null,
          rawPayload: payload,
          topic: topic || this.controlTopic,
          kind: kind || null,
          receivedAt: new Date().toISOString(),
        });
      }
    });

    this.room.on(RoomEvent.Reconnecting, () => {
      this.state = 'RECONNECTING';
      this._emit('reconnecting', {});
    });

    this.room.on(RoomEvent.Reconnected, () => {
      this.state = 'CONNECTED';
      this._emit('reconnected', {
        participants: this._buildParticipantList(),
      });
    });

    this.room.on(RoomEvent.Disconnected, () => {
      this.state = 'IDLE';
      this._emit('disconnected', {});
    });

    this.room.on(RoomEvent.ConnectionLost, () => {
      this.state = 'ERROR';
      this._emit('error', {
        message: 'Connection lost',
        code: 'CONNECTION_LOST',
      });
    });
  }

  _startTelemetryTicker(netId) {
    this._stopTelemetryTicker();
    this.telemetryTimer = setInterval(() => {
      const snapshot = this._sampleTelemetry(netId);
      this._emit('telemetry', snapshot);
    }, 4000);
    this._emit('telemetry', this._sampleTelemetry(netId));
  }

  _stopTelemetryTicker() {
    if (this.telemetryTimer) {
      clearInterval(this.telemetryTimer);
      this.telemetryTimer = null;
    }
  }

  _sampleTelemetry(netId) {
    const quality = this.localParticipant?.connectionQuality ?? 2;
    const mapped = {
      0: { rttMs: 260, jitterMs: 45, packetLossPct: 12, mosProxy: 2.2 },
      1: { rttMs: 130, jitterMs: 18, packetLossPct: 4, mosProxy: 3.4 },
      2: { rttMs: 52, jitterMs: 7, packetLossPct: 1, mosProxy: 4.3 },
    }[Number(quality)] || { rttMs: 90, jitterMs: 12, packetLossPct: 2, mosProxy: 3.9 };

    return {
      netId: netId || this.room?.name || null,
      participantCount: this.room?.participants?.size || 0,
      ...mapped,
      sampledAt: new Date().toISOString(),
    };
  }

  _emit(event, data) {
    if (!this.handlers[event]) return;
    this.handlers[event].forEach((handler) => handler(data));
  }

  _buildParticipantList() {
    return this.getParticipants();
  }

  _extractCallsign(participant) {
    try {
      if (participant.metadata) {
        const meta = JSON.parse(participant.metadata);
        return meta.callsign || participant.identity;
      }
    } catch {
      // ignore
    }
    return participant.identity;
  }

  _extractClientId(participant) {
    try {
      if (participant.metadata) {
        const meta = JSON.parse(participant.metadata);
        return meta.clientId || '';
      }
    } catch {
      // ignore
    }
    return '';
  }

  _gainDbToLinear(gainDb = 0) {
    const value = Number(gainDb);
    if (!Number.isFinite(value)) return 1;
    const linear = Math.pow(10, value / 20);
    return Math.min(2, Math.max(0, linear));
  }
}

export default LiveKitTransport;
