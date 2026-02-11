/**
 * VoiceTransport Interface
 * Abstract adapter for voice session transport (LiveKit, WebRTC, etc.)
 * Implementers must define connect, disconnect, PTT, and event handlers
 */

/**
 * VoiceTransport Interface
 * @interface
 */
export class VoiceTransport {
  /**
   * Connect to a voice net
   * @param {Object} params - { token, url, netId, user }
   * @returns {Promise<void>}
   */
  async connect({ token, url, netId, user }) {
    throw new Error('connect() not implemented');
  }

  /**
   * Disconnect from the voice net
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() not implemented');
  }

  /**
   * Set microphone enable/disable
   * @param {boolean} enabled
   * @returns {void}
   */
  setMicEnabled(enabled) {
    throw new Error('setMicEnabled() not implemented');
  }

  /**
   * Toggle PTT (push-to-talk) / speaking state
   * @param {boolean} active
   * @returns {void}
   */
  setPTTActive(active) {
    throw new Error('setPTTActive() not implemented');
  }

  /**
   * Publish a low-latency command/control packet.
   * @param {Object} packet
   */
  publishControlPacket(packet) {
    throw new Error('publishControlPacket() not implemented');
  }

  /**
   * Configure output playback device when supported.
   * @param {string|null} deviceId
   */
  async setOutputDevice(deviceId) {
    throw new Error('setOutputDevice() not implemented');
  }

  /**
   * Configure per-participant gain trim.
   * @param {string} participantId
   * @param {number} gainDb
   */
  setParticipantGain(participantId, gainDb) {
    throw new Error('setParticipantGain() not implemented');
  }

  /**
   * Register event listener
   * Supported events:
   *   - connected: session established
   *   - disconnected: session closed
   *   - participant-joined: { userId, callsign, clientId }
   *   - participant-left: { userId }
   *   - speaking-changed: { userId, isSpeaking }
   *   - error: { message, code }
   *
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} unsubscribe function
   */
  on(event, handler) {
    throw new Error('on() not implemented');
  }

  /**
   * Get current participant list
   * @returns {Array}
   */
  getParticipants() {
    throw new Error('getParticipants() not implemented');
  }

  /**
   * Get connection state
   * @returns {string}
   */
  getState() {
    throw new Error('getState() not implemented');
  }
}

export default VoiceTransport;
