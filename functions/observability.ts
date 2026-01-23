/**
 * Client-side observability: error collection, health tracking, network monitoring
 * Real-time diagnostics for in-app troubleshooting (admin-only visibility)
 * Exported as a singleton for use throughout the app
 */

class ObservabilityCollector {
  constructor() {
    this.errors = [];
    this.networkRequests = [];
    this.subscriptionHeartbeats = [];
    this.seedWipeLog = null;
    this.commsMode = null;
    this.liveKitEnv = null;
    this.maxErrors = 50;
    this.maxRequests = 100;
    
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
      
      return originalFetch.apply(window, args).then(response => {
        const duration = Math.round(performance.now() - startTime);
        this.recordNetworkRequest({
          url,
          status: response.status,
          duration,
          timestamp: new Date().toISOString()
        });
        return response;
      }).catch(error => {
        const duration = Math.round(performance.now() - startTime);
        this.recordNetworkRequest({
          url,
          status: 0,
          error: error.message,
          duration,
          timestamp: new Date().toISOString()
        });
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

    return {
      healthStatus,
      lastHeartbeat,
      lastSeedWipe,
      recentErrors,
      requestsPerMin,
      commsMode: this.commsMode,
      liveKitEnv: this.liveKitEnv,
      totalErrors: this.errors.length,
      totalRequests: this.networkRequests.length
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
  }
}

// Singleton instance
if (typeof window !== 'undefined' && !window.__observability) {
  window.__observability = new ObservabilityCollector();
}

const observability = typeof window !== 'undefined' ? window.__observability : null;

export { observability };