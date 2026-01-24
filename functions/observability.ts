/**
 * Client-side observability: error collection, health tracking, network monitoring
 * Real-time diagnostics for in-app troubleshooting (admin-only visibility)
 * Exported as a singleton for use throughout the app
 */

if (typeof window === 'undefined') {
  var window = {};
}

class ObservabilityCollector {
  constructor() {
    this.errors = [];
    this.networkRequests = [];
    this.subscriptionHeartbeats = [];
    this.seedWipeLog = null;
    this.commsMode = null;
    this.liveKitEnv = null;
    this.liveKitMetrics = {};
    this.liveKitConnectionStarts = {};
    this.maxErrors = 50;
    this.maxRequests = 100;
    this.maxLiveKitSamples = 20;
    this.enableVerboseRequests = Boolean(
      typeof import.meta !== 'undefined' && import.meta.env?.DEV
    );
    
    this.initErrorHandler();
    this.initNetworkMonitor();
  }

  /**
   * Initialize global error handler
   */
  initErrorHandler() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('error', (event) => {
      this.recordError({
        type: 'uncaught',
        message: event.message,
        source: event.filename,
        line: event.lineno,
        col: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        type: 'unhandled-promise',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Monitor network activity via performance API
   */
  initNetworkMonitor() {
    if (typeof window === 'undefined') return;
    
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const shouldLog = this.shouldLogRequest(url);
      
      return originalFetch.apply(window, args).then(response => {
        const duration = Math.round(performance.now() - startTime);
        if (shouldLog) {
          this.recordNetworkRequest({
            url: this.sanitizeUrl(url),
            status: response.status,
            duration,
            timestamp: new Date().toISOString()
          });
        }
        return response;
      }).catch(error => {
        const duration = Math.round(performance.now() - startTime);
        if (shouldLog) {
          this.recordNetworkRequest({
            url: this.sanitizeUrl(url),
            status: 0,
            error: error.message,
            duration,
            timestamp: new Date().toISOString()
          });
        }
        throw error;
      });
    };
  }

  recordError(errorData) {
    this.errors.unshift(errorData);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('observability:error', { detail: errorData }));
    }
  }

  recordNetworkRequest(requestData) {
    this.networkRequests.unshift(requestData);
    if (this.networkRequests.length > this.maxRequests) {
      this.networkRequests.pop();
    }
  }

  getRecentCommsRequests(limit = 10) {
    return this.networkRequests
      .filter((request) => this.isCommsRequest(request.url))
      .slice(0, limit);
  }

  setVerboseRequests(enabled) {
    this.enableVerboseRequests = Boolean(enabled);
  }

  getVerboseRequestsEnabled() {
    return this.enableVerboseRequests;
  }

  sanitizeUrl(rawUrl = '') {
    if (!rawUrl) return rawUrl;

    try {
      const parsed = new URL(rawUrl, window.location.origin);
      return `${parsed.origin}${parsed.pathname}`;
    } catch (error) {
      return rawUrl.split('?')[0];
    }
  }

  shouldLogRequest(rawUrl = '') {
    if (this.enableVerboseRequests) return true;
    return this.isCommsRequest(rawUrl);
  }

  isCommsRequest(rawUrl = '') {
    const safeUrl = this.sanitizeUrl(rawUrl);
    return [
      '/generateLiveKitToken',
      '/getLiveKitRoomStatus',
      '/verifyCommsReadiness'
    ].some((segment) => safeUrl.includes(segment));
  }

  recordSubscriptionHeartbeat(netId, eventId, status) {
    this.subscriptionHeartbeats.unshift({
      netId,
      eventId,
      status,
      timestamp: new Date().toISOString()
    });
    if (this.subscriptionHeartbeats.length > 20) {
      this.subscriptionHeartbeats.pop();
    }
  }

  recordSeedWipeRun(step, action, status, duration, results) {
    this.seedWipeLog = {
      step,
      action,
      status,
      duration,
      results,
      timestamp: new Date().toISOString()
    };
  }

  setCommsMode(mode) {
    this.commsMode = { mode, timestamp: new Date().toISOString() };
  }

  setLiveKitEnv(env) {
    this.liveKitEnv = { env, timestamp: new Date().toISOString() };
  }

  getLiveKitMetrics(netId, netCode) {
    if (!netId) return null;
    if (!this.liveKitMetrics[netId]) {
      this.liveKitMetrics[netId] = {
        netId,
        netCode: netCode || netId,
        connectionTimes: [],
        reconnectAttempts: 0,
        latencySamples: [],
        jitterSamples: [],
        lastLatency: null
      };
    }
    if (netCode) {
      this.liveKitMetrics[netId].netCode = netCode;
    }
    return this.liveKitMetrics[netId];
  }

  recordLiveKitConnectionStart(netId, netCode) {
    const metrics = this.getLiveKitMetrics(netId, netCode);
    if (!metrics) return;
    this.liveKitConnectionStarts[netId] = Date.now();
  }

  recordLiveKitConnectionSuccess(netId) {
    const metrics = this.getLiveKitMetrics(netId);
    if (!metrics) return;
    const startTime = this.liveKitConnectionStarts[netId];
    if (!startTime) return;
    const duration = Date.now() - startTime;
    metrics.connectionTimes.unshift(duration);
    if (metrics.connectionTimes.length > this.maxLiveKitSamples) {
      metrics.connectionTimes.pop();
    }
    delete this.liveKitConnectionStarts[netId];
  }

  recordLiveKitReconnectAttempt(netId, netCode) {
    const metrics = this.getLiveKitMetrics(netId, netCode);
    if (!metrics) return;
    metrics.reconnectAttempts += 1;
  }

  recordLiveKitLatencySample(netId, latencyMs, netCode) {
    const metrics = this.getLiveKitMetrics(netId, netCode);
    if (!metrics || typeof latencyMs !== 'number' || Number.isNaN(latencyMs)) return;
    metrics.latencySamples.unshift(latencyMs);
    if (metrics.latencySamples.length > this.maxLiveKitSamples) {
      metrics.latencySamples.pop();
    }
    if (metrics.lastLatency !== null) {
      const jitter = Math.abs(latencyMs - metrics.lastLatency);
      metrics.jitterSamples.unshift(jitter);
      if (metrics.jitterSamples.length > this.maxLiveKitSamples) {
        metrics.jitterSamples.pop();
      }
    }
    metrics.lastLatency = latencyMs;
  }

  getAverage(values = []) {
    if (!values.length) return null;
    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
  }

  getLiveKitNetSummaries() {
    return Object.values(this.liveKitMetrics).map((metrics) => ({
      netId: metrics.netId,
      netCode: metrics.netCode,
      avgConnectionTime: this.getAverage(metrics.connectionTimes),
      avgJitter: this.getAverage(metrics.jitterSamples),
      reconnectAttempts: metrics.reconnectAttempts,
      samples: metrics.connectionTimes.length
    }));
  }

  /**
   * Calculate health status (green/amber/red)
   */
  getHealthStatus() {
    const recentErrors = this.errors.filter(e => {
      const age = Date.now() - new Date(e.timestamp).getTime();
      return age < 5 * 60 * 1000; // Last 5 minutes
    });

    const errorRate = recentErrors.length;
    const networkFailures = this.networkRequests.filter(r => r.status === 0 || r.status >= 500).length;
    const recentRequests = this.networkRequests.filter(r => {
      const age = Date.now() - new Date(r.timestamp).getTime();
      return age < 1 * 60 * 1000; // Last minute
    });

    // Green: <1 error/5min, <20% network failures
    if (errorRate === 0 && networkFailures < 2) {
      return 'green';
    }
    // Amber: 1-3 errors, or 20-50% failures
    if (errorRate <= 3 || (networkFailures > 2 && networkFailures < recentRequests.length * 0.5)) {
      return 'amber';
    }
    // Red: >3 errors or >50% failures
    return 'red';
  }

  /**
   * Get recent errors (last 5 minutes)
   */
  getRecentErrors(limit = 10) {
    return this.errors
      .filter(e => {
        const age = Date.now() - new Date(e.timestamp).getTime();
        return age < 5 * 60 * 1000;
      })
      .slice(0, limit);
  }

  /**
   * Get request count per minute
   */
  getRequestsPerMinute() {
    const oneMinuteAgo = Date.now() - 60 * 1000;
    return this.networkRequests.filter(r => {
      const time = new Date(r.timestamp).getTime();
      return time > oneMinuteAgo;
    }).length;
  }

  /**
   * Get health summary for diagnostics drawer
   */
  getDiagnosticsSummary() {
    const lastHeartbeat = this.subscriptionHeartbeats[0];
    const lastSeedWipe = this.seedWipeLog;
    const recentErrors = this.getRecentErrors(5);
    const requestsPerMin = this.getRequestsPerMinute();
    const healthStatus = this.getHealthStatus();
    const commsRequests = this.getRecentCommsRequests(10);
    const liveKitNets = this.getLiveKitNetSummaries();

    return {
      healthStatus,
      lastHeartbeat,
      lastSeedWipe,
      recentErrors,
      requestsPerMin,
      commsMode: this.commsMode,
      liveKitEnv: this.liveKitEnv,
      totalErrors: this.errors.length,
      totalRequests: this.networkRequests.length,
      commsRequests,
      liveKitNets,
      verboseRequestsEnabled: this.enableVerboseRequests
    };
  }

  /**
   * Reset diagnostics (for testing)
   */
  reset() {
    this.errors = [];
    this.networkRequests = [];
    this.subscriptionHeartbeats = [];
    this.seedWipeLog = null;
    this.liveKitMetrics = {};
    this.liveKitConnectionStarts = {};
  }
}

// Singleton instance
const getObservability = () => {
  if (typeof window === 'undefined') return null;
  if (!window.__observability) {
    window.__observability = new ObservabilityCollector();
  }
  return window.__observability;
};

const observability = getObservability() || {
  getHealthStatus: () => 'green',
  getDiagnosticsSummary: () => ({
    healthStatus: 'green',
    lastHeartbeat: null,
    lastSeedWipe: null,
    recentErrors: [],
    requestsPerMin: 0,
    commsMode: null,
    liveKitEnv: null,
    totalErrors: 0,
    totalRequests: 0,
    commsRequests: [],
    liveKitNets: [],
    verboseRequestsEnabled: false
  }),
  getRecentErrors: () => [],
  recordError: () => {},
  recordNetworkRequest: () => {},
  getRecentCommsRequests: () => [],
  setVerboseRequests: () => {},
  getVerboseRequestsEnabled: () => false,
  recordSubscriptionHeartbeat: () => {},
  recordSeedWipeRun: () => {},
  setCommsMode: () => {},
  setLiveKitEnv: () => {},
  recordLiveKitConnectionStart: () => {},
  recordLiveKitConnectionSuccess: () => {},
  recordLiveKitReconnectAttempt: () => {},
  recordLiveKitLatencySample: () => {},
  getLiveKitNetSummaries: () => [],
  reset: () => {}
};

export { observability, getObservability };
