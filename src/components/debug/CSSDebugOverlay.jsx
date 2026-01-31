import React, { useEffect, useState } from 'react';

export default function CSSDebugOverlay() {
  const [diagnostics, setDiagnostics] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const debugEnabled = params.get('debug_css') === 'true';

    if (!debugEnabled) {
      return;
    }

    console.log('[NN] CSSDebugOverlay initialized');
    setShowOverlay(true);
    const startTime = window.__NN_BOOT_TIME__ || Date.now();

    const runDiagnostics = () => {
      // Tier A: DOM-ready check (O(1))
      const domReady = document.readyState === 'complete' || document.readyState === 'interactive';
      const rootExists = Boolean(document.getElementById('root'));
      
      // Tier B: App-ready check (beacon or fallback)
      const beacon = document.getElementById('nn-ready');
      const rootMounted = rootExists && document.getElementById('root').children.length > 0;
      const appReady = beacon || rootMounted;

      // O(1) Tailwind detection (no CSS enumeration)
      const tailwindScript = document.querySelector('script[src*="cdn.tailwindcss.com"]');
      const tailwindGlobal = typeof window.tailwind !== 'undefined';

      const results = {
        bootstrapPresent: Boolean(window.__NN_BOOTED__),
        domReady,
        rootExists,
        rootMounted,
        beaconPresent: Boolean(beacon),
        beaconState: beacon?.dataset?.state || null,
        appReady,
        tailwindScriptPresent: Boolean(tailwindScript),
        tailwindScriptSrc: tailwindScript?.src || null,
        tailwindGlobalPresent: tailwindGlobal,
        timeToReadyMs: appReady ? Date.now() - startTime : null,
        timestamp: new Date().toISOString(),
      };

      console.log('[NN] Diagnostics run:', results);
      setDiagnostics(results);
      return appReady;
    };

    // Check for fatal bootstrap failure first
    if (!window.__NN_BOOTED__) {
      console.error('[NN] BOOTSTRAP_MISSING - App entry did not execute');
      setDiagnostics({
        bootstrapPresent: false,
        fatalError: 'BOOTSTRAP_MISSING',
        message: 'App bundle did not load or execute. Check network, CSP, and console for errors.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!runDiagnostics()) {
      const interval = setInterval(() => {
        if (runDiagnostics()) {
          clearInterval(interval);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(interval);
        if (!diagnostics || !diagnostics.appReady) {
          console.warn('[NN] App readiness timeout after 5s');
        }
      }, 5000);
    }
  }, []);

  if (!showOverlay || !diagnostics) {
    return null;
  }

  // Fatal error styling
  if (diagnostics.fatalError) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 9999,
          maxWidth: '360px',
          backgroundColor: '#7f1d1d',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#ffffff',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ fontWeight: 'bold', color: '#f87171', marginBottom: '12px', fontSize: '14px' }}>
          ⚠ {diagnostics.fatalError}
        </div>
        <div style={{ color: '#fca5a5', marginBottom: '8px' }}>
          {diagnostics.message}
        </div>
        <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
          {new Date(diagnostics.timestamp).toLocaleTimeString()}
        </div>
      </div>
    );
  }

  const bgColor = diagnostics.appReady ? '#064e3b' : '#7f1d1d';
  const borderColor = diagnostics.appReady ? '#10b981' : '#ef4444';
  const statusColor = diagnostics.appReady ? '#34d399' : '#f87171';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9999,
        maxWidth: '360px',
        backgroundColor: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '12px',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontWeight: 'bold', color: statusColor }}>CSS DEBUG</span>
        <button
          onClick={() => setShowOverlay(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '0',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#d1d5db' }}>
        <div>
          <span style={{ fontWeight: 'bold' }}>bootstrapPresent:</span>
          <span style={{ marginLeft: '6px', color: diagnostics.bootstrapPresent ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
            {diagnostics.bootstrapPresent ? 'true' : 'false'}
          </span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>appReady:</span>
          <span style={{ marginLeft: '6px', color: statusColor, fontWeight: 'bold' }}>
            {diagnostics.appReady ? 'true' : 'false'}
          </span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>domReady:</span>
          <span style={{ marginLeft: '6px', color: diagnostics.domReady ? '#34d399' : '#f87171' }}>
            {diagnostics.domReady ? 'true' : 'false'}
          </span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>rootExists:</span>
          <span style={{ marginLeft: '6px', color: diagnostics.rootExists ? '#34d399' : '#f87171' }}>
            {diagnostics.rootExists ? 'true' : 'false'}
          </span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>rootMounted:</span>
          <span style={{ marginLeft: '6px', color: diagnostics.rootMounted ? '#34d399' : '#f87171' }}>
            {diagnostics.rootMounted ? 'true' : 'false'}
          </span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>beaconPresent:</span>
          <span style={{ marginLeft: '6px', color: diagnostics.beaconPresent ? '#34d399' : '#f87171' }}>
            {diagnostics.beaconPresent ? 'true' : 'false'}
          </span>
        </div>

        {diagnostics.beaconState && (
          <div>
            <span style={{ fontWeight: 'bold' }}>beaconState:</span>
            <span style={{ marginLeft: '6px', color: '#34d399' }}>
              {diagnostics.beaconState}
            </span>
          </div>
        )}

        <div>
          <span style={{ fontWeight: 'bold' }}>tailwindScriptPresent:</span>
          <span style={{ marginLeft: '6px', color: diagnostics.tailwindScriptPresent ? '#34d399' : '#f87171' }}>
            {diagnostics.tailwindScriptPresent ? 'true' : 'false'}
          </span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>tailwindGlobalPresent:</span>
          <span style={{ marginLeft: '6px', color: diagnostics.tailwindGlobalPresent ? '#34d399' : '#f87171' }}>
            {diagnostics.tailwindGlobalPresent ? 'true' : 'false'}
          </span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>timeToReadyMs:</span>
          <span style={{ marginLeft: '6px' }}>
            {diagnostics.timeToReadyMs !== null ? diagnostics.timeToReadyMs : 'pending...'}
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: '10px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          fontSize: '10px',
          color: '#9ca3af',
        }}
      >
        {new Date(diagnostics.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}