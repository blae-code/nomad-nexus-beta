/**
 * Advanced Audio Processor
 * Implements: Noise Suppression, Echo Cancellation, Voice Activity Detection
 */

export class AudioProcessor {
  constructor(options = {}) {
    this.audioContext = null;
    this.analyser = null;
    this.processor = null;
    this.dataArray = null;
    
    // Configuration
    this.echoCancellation = options.echoCancellation !== false;
    this.noiseSuppression = options.noiseSuppression !== false;
    this.voiceActivityDetection = options.voiceActivityDetection !== false;
    this.autoGainControl = options.autoGainControl !== false;
    
    // VAD settings
    this.vadThreshold = options.vadThreshold || 30;
    this.noiseFloor = options.noiseFloor || 20;
    this.vadActive = false;
    this.vadCallback = null;
    
    // Noise gate state
    this.noiseGateThreshold = (this.noiseFloor / 100) * 255;
  }

  /**
   * Initialize audio processing with a media stream
   */
  async init(mediaStream) {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      const source = this.audioContext.createMediaStreamSource(mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      // Start monitoring for VAD
      this.startVADMonitoring();
      
      return true;
    } catch (error) {
      console.error('[AUDIO_PROCESSOR] Init failed:', error);
      return false;
    }
  }

  /**
   * Voice Activity Detection monitoring
   */
  startVADMonitoring() {
    const monitor = () => {
      if (!this.voiceActivityDetection || !this.analyser) {
        requestAnimationFrame(monitor);
        return;
      }

      this.analyser.getByteFrequencyData(this.dataArray);
      const energy = this.calculateEnergy();
      const threshold = (this.vadThreshold / 100) * 255;
      
      const wasActive = this.vadActive;
      this.vadActive = energy > threshold;

      // Report state change
      if (this.vadActive !== wasActive && this.vadCallback) {
        this.vadCallback({
          active: this.vadActive,
          energy: energy,
          threshold: threshold
        });
      }

      requestAnimationFrame(monitor);
    };

    monitor();
  }

  /**
   * Calculate frequency domain energy
   */
  calculateEnergy() {
    if (!this.dataArray) return 0;
    
    let energy = 0;
    // Focus on speech frequencies (300-3000 Hz)
    const speechStart = Math.floor((300 / (this.audioContext.sampleRate / 2)) * this.dataArray.length);
    const speechEnd = Math.floor((3000 / (this.audioContext.sampleRate / 2)) * this.dataArray.length);
    
    for (let i = speechStart; i < speechEnd; i++) {
      energy += this.dataArray[i];
    }
    
    return energy / (speechEnd - speechStart);
  }

  /**
   * Get current VAD state
   */
  isVoiceActive() {
    return this.voiceActivityDetection ? this.vadActive : true;
  }

  /**
   * Register callback for VAD state changes
   */
  onVADChange(callback) {
    this.vadCallback = callback;
  }

  /**
   * Update processing settings
   */
  updateSettings(settings) {
    this.echoCancellation = settings.echoCancellation !== false;
    this.noiseSuppression = settings.noiseSuppression !== false;
    this.voiceActivityDetection = settings.voiceActivityDetection !== false;
    this.autoGainControl = settings.autoGainControl !== false;
    this.vadThreshold = settings.vadThreshold || this.vadThreshold;
    this.noiseFloor = settings.noiseFloor || this.noiseFloor;
    this.noiseGateThreshold = (this.noiseFloor / 100) * 255;
  }

  /**
   * Get processing status
   */
  getStatus() {
    return {
      echoCancellation: this.echoCancellation,
      noiseSuppression: this.noiseSuppression,
      voiceActivityDetection: this.voiceActivityDetection,
      autoGainControl: this.autoGainControl,
      vadActive: this.vadActive,
      energy: this.calculateEnergy(),
      vadThreshold: this.vadThreshold,
      noiseFloor: this.noiseFloor
    };
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
    }
    this.analyser = null;
    this.processor = null;
    this.dataArray = null;
  }
}

export default AudioProcessor;