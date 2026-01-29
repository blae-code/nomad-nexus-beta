import { connect, RoomEvent } from 'livekit-client';

/**
 * LiveKitTransport — Real voice transport via LiveKit
 * Implements the VoiceTransport interface for production audio
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
  }

  /**
   * Connect to LiveKit room for voice net
   * @param {Object} options - { token, url, netId, user }
   */
  async connect(options) {
    const { token, url, netId, user } = options;

    if (!token || !url) {
      throw new Error('Token and URL required for LiveKit connection');
    }

    try {
      this.state = 'JOINING';

      // Connect to LiveKit (returns Room instance)
      this.room = await connect(url, token, {
        audio: true,
        video: false,
        adaptiveStream: true,
        dynacast: true,
        autoSubscribe: true,
      });

      // Wire event handlers after connecting
      this._wireRoomEvents();

      this.state = 'CONNECTED';
      this.reconnectAttempts = 0;
      this.localParticipant = this.room.localParticipant;

      // Enable audio by default
      await this.localParticipant.setMicrophoneEnabled(true);

      // Emit success
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
    if (this.room) {
      try {
        // Stop all local tracks
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
        message: `Failed to toggle PTT`,
        code: 'PTT_CONTROL_FAILED',
      });
    }
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);

    // Return unsubscribe function
    return () => {
      this.handlers[event] = this.handlers[event].filter((h) => h !== handler);
    };
  }

  /**
   * Get current participants
   */
  getParticipants() {
    if (!this.room) return [];

    const participants = Array.from(this.room.participants.values()).map((p) => ({
      userId: p.identity,
      callsign: this._extractCallsign(p),
      clientId: this._extractClientId(p),
      isSpeaking: p.isSpeaking,
    }));

    return participants;
  }

  /**
   * Get connection state
   */
  getState() {
    return this.state;
  }

  /**
   * Set audio device (mic input)
   */
  async setAudioDevice(deviceId) {
    if (!this.localParticipant) return;

    try {
      await this.localParticipant.setMicrophoneEnabled(false);

      // Update audio input device
      const audioOptions = {
        deviceId: deviceId ? { ideal: deviceId } : undefined,
      };

      const audioTrack = await navigator.mediaDevices.getUserMedia({
        audio: audioOptions,
      });

      // Replace local audio track
      await this.localParticipant.publishAudioTrack(audioTrack);

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
   * Private: Wire room events to adapter events
   */
  _wireRoomEvents() {
    if (!this.room) return;

    // Participant joined
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      this._emit('participant-joined', {
        userId: participant.identity,
        callsign: this._extractCallsign(participant),
        clientId: this._extractClientId(participant),
      });
    });

    // Participant left
    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      this._emit('participant-left', {
        userId: participant.identity,
      });
    });

    // Speaking changed (via active speaker detection)
    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const speakerIds = speakers.map((s) => s.identity);

      // Emit for each participant change
      this.room.participants.forEach((participant) => {
        const wasSpeaking = participant.isSpeaking;
        const isSpeaking = speakerIds.includes(participant.identity);

        if (wasSpeaking !== isSpeaking) {
          this._emit('speaking-changed', {
            userId: participant.identity,
            isSpeaking,
          });
        }
      });
    });

    // Connection state changes
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

    // Room disconnect
    this.room.on(RoomEvent.Disconnected, () => {
      this.state = 'IDLE';
      this._emit('disconnected', {});
    });

    // Error
    this.room.on(RoomEvent.ConnectionLost, () => {
      this.state = 'ERROR';
      this._emit('error', {
        message: 'Connection lost',
        code: 'CONNECTION_LOST',
      });
    });
  }

  /**
   * Private: Emit adapter event
   */
  _emit(event, data) {
    if (!this.handlers[event]) return;
    this.handlers[event].forEach((handler) => handler(data));
  }

  /**
   * Private: Build participant list from room
   */
  _buildParticipantList() {
    return this.getParticipants();
  }

  /**
   * Private: Extract callsign from participant metadata
   */
  _extractCallsign(participant) {
    try {
      if (participant.metadata) {
        const meta = JSON.parse(participant.metadata);
        return meta.callsign || participant.identity;
      }
    } catch (e) {
      // ignore
    }
    return participant.identity;
  }

  /**
   * Private: Extract clientId from participant metadata
   */
  _extractClientId(participant) {
    try {
      if (participant.metadata) {
        const meta = JSON.parse(participant.metadata);
        return meta.clientId || '';
      }
    } catch (e) {
      // ignore
    }
    return '';
  }
}

export default LiveKitTransport;