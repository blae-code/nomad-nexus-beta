import React, { useEffect, useState } from 'react';

export default function CSSDebugOverlay() {
  const [diagnostics, setDiagnostics] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [timeToReady, setTimeToReady] = useState(null);

  useEffect(() => {
    // Check if debug_css=true is in URL
    const params = new URLSearchParams(window.location.search);
    const debugEnabled = params.get('debug_css') === 'true';
    
    if (!debugEnabled) {
      return;
    }

    setShowOverlay(true);
    const startTime = Date.now();

    // Run diagnostics
    const runDiagnostics = () => {
      // Test Tailwind utilities
      const testEl = document.createElement('div');
      testEl.className = 'hidden';
      testEl.style.position = 'absolute';
      testEl.style.visibility = 'hidden';
      document.body.appendChild(testEl);

      const computed = window.getComputedStyle(testEl);
      const tailwindReady = computed.display === 'none';
      
      document.body.removeChild(testEl);

      const tailwindScript = document.querySelector('script[src*="cdn.tailwindcss.com"]');
      const results = {
        tailwindReady,
        timeToReadyMs: tailwindReady ? Date.now() - startTime : null,
        styleTagsCount: document.querySelectorAll('style').length,
        tailwindScriptSrc: tailwindScript ? tailwindScript.src : null,
        hasTailwindCdnScript: !!tailwindScript,
        hasHiddenUtility: tailwindReady,
        timestamp: new Date().toISOString(),
      };

      setDiagnostics(results);
      if (tailwindReady && timeToReady === null) {
        setTimeToReady(results.timeToReadyMs);
      }

      return tailwindReady;
    };

    // Initial check
    if (!runDiagnostics()) {
      // Poll until ready
      const interval = setInterval(() => {
        if (runDiagnostics()) {
          clearInterval(interval);
        }
      }, 100);

      // Stop after 10 seconds
      setTimeout(() => clearInterval(interval), 10000);
    }
  }, []);

  if (!showOverlay || !diagnostics) {
    return null;
  }

  const bgColor = diagnostics.tailwindReady ? '#064e3b' : '#7f1d1d';
  const borderColor = diagnostics.tailwindReady ? '#10b981' : '#ef4444';
  const statusColor = diagnostics.tailwindReady ? '#34d399' : '#f87171';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9999,
        maxWidth: '320px',
        backgroundColor: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '12px',
        fontFamily: 'monospace',
        fontSize: '12px',
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#d1d5db' }}>
        <div>
          <span style={{ fontWeight: 'bold' }}>tailwindReady:</span>
          <span style={{ marginLeft: '8px', color: statusColor, fontWeight: 'bold' }}>
            {diagnostics.tailwindReady ? 'true' : 'false'}
          </span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>timeToReadyMs:</span>
          <span style={{ marginLeft: '8px' }}>
            {diagnostics.timeToReadyMs !== null ? diagnostics.timeToReadyMs : 'pending...'}
          </span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>styleTagsCount:</span>
          <span style={{ marginLeft: '8px' }}>{diagnostics.styleTagsCount}</span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>hasTailwindCdnScript:</span>
          <span style={{ marginLeft: '8px', color: diagnostics.hasTailwindCdnScript ? '#34d399' : '#f87171' }}>
            {diagnostics.hasTailwindCdnScript ? 'true' : 'false'}
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: '12px',
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