import React, { useState } from 'react';

/**
 * TailwindError - Inline-styled error screen (no Tailwind classes)
 * Shown if Tailwind CDN fails to load after timeout
 */
export default function TailwindError({ elapsedMs = 0, error }) {
  const [copied, setCopied] = useState(false);

  const handleRetry = () => {
    window.location.reload();
  };

  const collectDiagnostics = () => {
    const testHiddenUtility = () => {
      try {
        const testEl = document.createElement('div');
        testEl.className = 'hidden';
        testEl.style.position = 'absolute';
        testEl.style.visibility = 'hidden';
        document.body.appendChild(testEl);
        const computed = window.getComputedStyle(testEl);
        const result = computed.display === 'none';
        document.body.removeChild(testEl);
        return result;
      } catch {
        return false;
      }
    };

    const tailwindScript = document.querySelector('script[src*="cdn.tailwindcss.com"]');
    const tailwindScriptSrc = tailwindScript ? tailwindScript.getAttribute('src') : null;

    const stylesheets = Array.from(document.styleSheets).map((sheet) => {
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

    return {
      timestamp: new Date().toISOString(),
      waitedMs: elapsedMs,
      errorPhase: error?.phase || 'unknown',
      scriptPresent: error?.scriptPresent ?? Boolean(tailwindScript),
      hasHiddenUtility: testHiddenUtility(),
      tailwindGlobalPresent: typeof window.tailwind !== 'undefined',
      tailwindScriptSrc,
      styleTagCount: document.querySelectorAll('style').length,
      linkTagCount: document.querySelectorAll('link[rel="stylesheet"]').length,
      stylesheets,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
    };
  };

  const handleCopyDiagnostics = async () => {
    try {
      const diagnostics = collectDiagnostics();
      const text = JSON.stringify(diagnostics, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy diagnostics:', err);
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0b0b10',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#ffffff',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          width: '100%',
          textAlign: 'center',
          border: '1px solid rgba(248, 113, 113, 0.25)',
          borderRadius: '16px',
          padding: '28px',
          backgroundColor: 'rgba(12, 12, 18, 0.85)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div
          style={{
            fontSize: '42px',
            marginBottom: '16px',
            color: '#f87171',
          }}
        >
          ⛔
        </div>

        <h1
          style={{
            fontSize: '22px',
            fontWeight: '800',
            marginBottom: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          SIGNAL LOSS — UI TELEMETRY OFFLINE
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '20px',
            lineHeight: '1.6',
          }}
        >
          Nomad Nexus is online, but the styling uplink never arrived. This usually means the
          Tailwind CDN was blocked, slow, or stripped by network policy.
        </p>

        <div
          style={{
            backgroundColor: 'rgba(248, 113, 113, 0.08)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '18px',
            textAlign: 'left',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.7)',
          }}
        >
          <div>
            <strong>Waited:</strong> {(elapsedMs / 1000).toFixed(1)}s
          </div>
          <div>
            <strong>Failure Phase:</strong> {error?.phase || 'unknown'}
          </div>
          <div>
            <strong>Tailwind Script:</strong> {error?.scriptPresent ? 'present' : 'missing'}
          </div>
        </div>

        <div
          style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.75)',
            marginBottom: '16px',
            lineHeight: '1.6',
            textAlign: 'left',
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Recovery options:</div>
          <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: '0' }}>
            <li>Retry the uplink (recommended)</li>
            <li>Disable CSS/script blockers or whitelist cdn.tailwindcss.com</li>
            <li>Try a different network if you are on a restricted link</li>
          </ul>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handleRetry}
            style={{
              padding: '12px 22px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#b91c1c')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#dc2626')}
          >
            Retry Uplink
          </button>

          <button
            onClick={handleCopyDiagnostics}
            style={{
              padding: '12px 22px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
            onMouseOut={(e) => (e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
          >
            {copied ? 'Copied' : 'Copy Diagnostics'}
          </button>

          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            style={{
              padding: '12px 22px',
              backgroundColor: 'transparent',
              color: 'rgba(255, 255, 255, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.target.style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'rgba(255, 255, 255, 0.6)';
            }}
          >
            Clear Session &amp; Reload
          </button>
        </div>
      </div>
    </div>
  );
}
