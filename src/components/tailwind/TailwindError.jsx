import React, { useState } from 'react';

/**
 * TailwindError - Inline-styled error screen (no Tailwind classes)
 * Shown if Tailwind CDN fails to load after timeout
 */
export default function TailwindError({ elapsed, error }) {
  const [copied, setCopied] = useState(false);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleCopyDiagnostics = async () => {
    try {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        timeWaited: `${elapsed}ms`,
        userAgent: navigator.userAgent,
        pageUrl: window.location.href,
        stylesheets: Array.from(document.styleSheets).map((s) => ({
          href: s.href || 'inline',
          rules: s.cssRules?.length || 0,
          crossOrigin: s.ownerNode?.getAttribute('crossorigin') || 'none',
        })),
        tailwindScriptPresent: !!document.querySelector(
          'script[src*="cdn.tailwindcss.com"]'
        ),
        styleTagCount: document.querySelectorAll('style').length,
        linkTagCount: document.querySelectorAll('link[rel="stylesheet"]').length,
      };

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
        backgroundColor: '#09090b',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#ffffff',
        padding: '16px',
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          textAlign: 'center',
        }}
      >
        {/* Error icon */}
        <div
          style={{
            fontSize: '48px',
            marginBottom: '24px',
            opacity: 0.7,
          }}
        >
          ⚠
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '12px',
            letterSpacing: '0.025em',
            textTransform: 'uppercase',
          }}
        >
          Signal Loss — UI Telemetry Offline
        </h1>

        {/* Error message */}
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '24px',
            lineHeight: '1.5',
          }}
        >
          Nomad Nexus is online, but your interface package didn't arrive.
          This usually happens when the styling uplink is blocked or delayed.
        </p>

        {/* What you can do */}
        <div
          style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '16px',
            lineHeight: '1.6',
            textAlign: 'left',
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>What you can do:</div>
          <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: '0' }}>
            <li>Retry the uplink (recommended)</li>
            <li>If you're on a restricted network, try a different connection</li>
            <li>If the issue persists, send diagnostics to a Ranger or Systems lead</li>
          </ul>
        </div>

        {/* Diagnostics label */}
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.5)',
            marginBottom: '8px',
            fontWeight: '500',
          }}
        >
          Diagnostics Packet — includes URL, browser signature, wait time, and style beacon status
        </div>

        {/* Diagnostics box */}
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '24px',
            fontSize: '12px',
            fontFamily: 'monospace',
            textAlign: 'left',
            color: 'rgba(255, 255, 255, 0.6)',
            maxHeight: '120px',
            overflowY: 'auto',
          }}
        >
          <div>
            <strong>Wait Time:</strong> {(elapsed / 1000).toFixed(1)}s
          </div>
          <div>
            <strong>Style Beacons:</strong> {document.styleSheets.length}
          </div>
          <div>
            <strong>Script Tags:</strong>{' '}
            {document.querySelectorAll('script').length}
          </div>
          <div>
            <strong>Styling CDN:</strong>{' '}
            {document.querySelector('script[src*="cdn.tailwindcss.com"]')
              ? '✓ Present'
              : '✗ Missing'}
          </div>
          <div>
            <strong>Uplink Status:</strong>{' '}
            {typeof window.tailwind !== 'undefined' ? '✓ Active' : '✗ Offline'}
          </div>
        </div>

        {/* Action buttons */}
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
              padding: '12px 24px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'background-color 200ms',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#b91c1c')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#dc2626')}
          >
            Retry Uplink
          </button>

          <button
            onClick={handleCopyDiagnostics}
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'background-color 200ms',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            onMouseOver={(e) => (
              (e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')
            )}
            onMouseOut={(e) => (
              (e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')
            )}
          >
            {copied ? '✓ Copied' : 'Copy Diagnostics'}
          </button>
        </div>

        {/* Clear session button */}
        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: 'rgba(255, 255, 255, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 200ms',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.target.style.color = 'rgba(255, 255, 255, 0.7)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'rgba(255, 255, 255, 0.5)';
            }}
          >
            Clear Session & Reload
          </button>
        </div>

        {/* Help text */}
        <div
          style={{
            marginTop: '24px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.4)',
            lineHeight: '1.5',
          }}
        >
          <p>
            If this persists, check your internet connection or contact support
            with the diagnostics above.
          </p>
        </div>
      </div>
    </div>
  );
}