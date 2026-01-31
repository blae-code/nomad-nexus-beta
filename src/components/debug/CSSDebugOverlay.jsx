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

    setShowOverlay(true);
    const startTime = Date.now();

    const runDiagnostics = () => {
      const testEl = document.createElement('div');
      testEl.className = 'hidden';
      testEl.style.position = 'absolute';
      testEl.style.visibility = 'hidden';
      document.body.appendChild(testEl);

      const computed = window.getComputedStyle(testEl);
      const hasHiddenUtility = computed.display === 'none';
      document.body.removeChild(testEl);

      const tailwindScript = document.querySelector('script[src*="cdn.tailwindcss.com"]');
      const styleSheets = Array.from(document.styleSheets).map((sheet) => {
        let rules = 0;
        let corsStatus = 'ok';
        try {
          rules = sheet.cssRules?.length || 0;
        } catch (err) {
          rules = 0;
          corsStatus = 'cors-blocked';
        }

        return {
          href: sheet.href || 'inline',
          rules,
          corsStatus,
        };
      });

      const results = {
        hasHiddenUtility,
        tailwindGlobalPresent: typeof window.tailwind !== 'undefined',
        tailwindScriptSrc: tailwindScript ? tailwindScript.src : null,
        styleTagCount: document.querySelectorAll('style').length,
        linkTagCount: document.querySelectorAll('link[rel="stylesheet"]').length,
        styleSheets,
        timeToReadyMs: hasHiddenUtility ? Date.now() - startTime : null,
        timestamp: new Date().toISOString(),
      };

      setDiagnostics(results);
      return hasHiddenUtility;
    };

    if (!runDiagnostics()) {
      const interval = setInterval(() => {
        if (runDiagnostics()) {
          clearInterval(interval);
        }
      }, 100);

      setTimeout(() => clearInterval(interval), 10000);
    }
  }, []);

  if (!showOverlay || !diagnostics) {
    return null;
  }

  const bgColor = diagnostics.hasHiddenUtility ? '#064e3b' : '#7f1d1d';
  const borderColor = diagnostics.hasHiddenUtility ? '#10b981' : '#ef4444';
  const statusColor = diagnostics.hasHiddenUtility ? '#34d399' : '#f87171';

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
          <span style={{ fontWeight: 'bold' }}>hasHiddenUtility:</span>
          <span style={{ marginLeft: '6px', color: statusColor, fontWeight: 'bold' }}>
            {diagnostics.hasHiddenUtility ? 'true' : 'false'}
          </span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>tailwindGlobalPresent:</span>
          <span style={{ marginLeft: '6px', color: diagnostics.tailwindGlobalPresent ? '#34d399' : '#f87171' }}>
            {diagnostics.tailwindGlobalPresent ? 'true' : 'false'}
          </span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>tailwindScriptSrc:</span>
          <span style={{ marginLeft: '6px', fontSize: '10px', wordBreak: 'break-all' }}>
            {diagnostics.tailwindScriptSrc || 'none'}
          </span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>styleTagCount:</span>
          <span style={{ marginLeft: '6px' }}>{diagnostics.styleTagCount}</span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>linkTagCount:</span>
          <span style={{ marginLeft: '6px' }}>{diagnostics.linkTagCount}</span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>timeToReadyMs:</span>
          <span style={{ marginLeft: '6px' }}>
            {diagnostics.timeToReadyMs !== null ? diagnostics.timeToReadyMs : 'pending...'}
          </span>
        </div>

        <div>
          <span style={{ fontWeight: 'bold' }}>stylesheets:</span>
          <div style={{ marginTop: '4px', maxHeight: '120px', overflowY: 'auto' }}>
            {diagnostics.styleSheets.map((sheet, index) => (
              <div key={`${sheet.href}-${index}`} style={{ marginBottom: '4px' }}>
                <div style={{ fontSize: '10px', color: '#e5e7eb', wordBreak: 'break-all' }}>
                  {sheet.href}
                </div>
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                  rules: {sheet.rules} | cors: {sheet.corsStatus}
                </div>
              </div>
            ))}
          </div>
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
