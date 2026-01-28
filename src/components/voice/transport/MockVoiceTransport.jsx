/**
 * MockVoiceTransport — In-memory mock for voice net operations
 * No real audio; simulates connection + participant events
 */

import VoiceTransport from './VoiceTransport';
import { VOICE_CONNECTION_STATE } from '@/components/constants/voiceNet';

export class MockVoiceTransport extends VoiceTransport {
  constructor() {
    super();
    this.state = VOICE_CONNECTION_STATE.IDLE;
    this.participants = new Map(); // userId -> { userId, callsign, clientId, isSpeaking }
    this.handlers = new Map(); // event -> [handlers]
    this.currentUser = null;
    this.netId = null;
    this.micEnabled = true;
    this.pttActive = false;
  }

  async connect({ token, url, netId, user }) {
    this.state = VOICE_CONNECTION_STATE.JOINING;
    this.netId = netId;
    this.currentUser = user;

    // Simulate connection delay
    return new Promise((resolve) => {
      setTimeout(() => {
        this.state = VOICE_CONNECTION_STATE.CONNECTED;
        this.participants.set(user.id, {
          userId: user.id,
          callsign: user.callsign || 'Unknown',
          clientId: `${user.id}-client-${Date.now()}`,
          isSpeaking: false,
        });

        // Emit connected event
        this._emit('connected', { netId });
        resolve();
      }, 500);
    });
  }

  async disconnect() {
    this.state = VOICE_CONNECTION_STATE.IDLE;
    this.participants.clear();
    this._emit('disconnected');
  }

  setMicEnabled(enabled) {
    this.micEnabled = enabled;
  }

  setPTTActive(active) {
    this.pttActive = active;
    if (this.currentUser && this.participants.has(this.currentUser.id)) {
      const participant = this.participants.get(this.currentUser.id);
      participant.isSpeaking = active;
      this._emit('speaking-changed', {
        userId: this.currentUser.id,
        isSpeaking: active,
      });
    }
  }

  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(event);
      if (handlers) {
        handlers.splice(handlers.indexOf(handler), 1);
      }
    };
  }

  getParticipants() {
    return Array.from(this.participants.values());
  }

  getState() {
    return this.state;
  }

  /**
   * Internal: simulate participant join (for testing)
   */
  _simulateParticipantJoin(userId, callsign, clientId) {
    this.participants.set(userId, {
      userId,
      callsign,
      clientId,
      isSpeaking: false,
    });
    this._emit('participant-joined', { userId, callsign, clientId });
  }

  /**
   * Internal: simulate participant leave (for testing)
   */
  _simulateParticipantLeave(userId) {
    this.participants.delete(userId);
    this._emit('participant-left', { userId });
  }

  /**
   * Internal: emit event to all handlers
   */
  _emit(event, data) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }
}

export default MockVoiceTransport;