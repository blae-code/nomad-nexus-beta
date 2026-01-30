import React, { useEffect, useState } from 'react';

export default function CSSDebugOverlay() {
  const [diagnostics, setDiagnostics] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    // Check if debug_css=true is in URL
    const params = new URLSearchParams(window.location.search);
    const debugEnabled = params.get('debug_css') === 'true';
    
    if (!debugEnabled) {
      return;
    }

    setShowOverlay(true);
    console.log('🔍 CSS Debug overlay enabled—checking Tailwind status...');

    // Run diagnostics
    const runDiagnostics = () => {
      const results = {
        timestamp: new Date().toISOString(),
        stylesheets: [],
        tailwindStatus: 'UNKNOWN',
        tailwindCDN: false,
        computedStyles: {},
      };

      // 1. Check stylesheets
      for (const sheet of document.styleSheets) {
        try {
          const href = sheet.href || 'inline';
          const size = sheet.cssRules?.length || 0;
          results.stylesheets.push({
            href: href,
            rules: size,
            crossOrigin: sheet.ownerNode?.getAttribute('crossorigin') || 'none',
          });

          // Check for Tailwind CDN
          if (href?.includes('cdn.tailwindcss.com')) {
            results.tailwindCDN = true;
          }
        } catch (e) {
          // CORS restricted sheets
          results.stylesheets.push({
            href: sheet.href || 'inline',
            error: 'CORS restricted (likely external)',
          });
        }
      }

      // 2. Test Tailwind utilities
      const testEl = document.createElement('div');
      testEl.className = 'hidden bg-slate-950 text-white';
      document.body.appendChild(testEl);

      const computed = window.getComputedStyle(testEl);
      const hidden = computed.display === 'none';
      const bgColor = computed.backgroundColor;

      results.computedStyles.hidden = {
        display: computed.display,
        isHidden: hidden,
      };

      results.computedStyles.bgColor = {
        backgroundColor: bgColor,
        expectedSlate950: bgColor.includes('15, 23, 42') || bgColor === 'rgb(15, 23, 42)',
      };

      // Determine Tailwind status
      if (hidden && results.computedStyles.bgColor.expectedSlate950) {
        results.tailwindStatus = 'OK';
      } else if (!hidden && !results.computedStyles.bgColor.expectedSlate950) {
        results.tailwindStatus = 'MISSING/PURGED';
      } else {
        results.tailwindStatus = 'PARTIAL';
      }

      document.body.removeChild(testEl);

      // Log to console
      console.log('=== CSS DIAGNOSTICS ===');
      console.log('Status:', results.tailwindStatus);
      console.log('Stylesheets:', results.stylesheets.length);
      console.log('Tailwind CDN:', results.tailwindCDN);
      console.log('Full diagnostics:', results);
      console.log('========================');

      setDiagnostics(results);
    };

    // Run after a small delay to ensure DOM is ready
    setTimeout(runDiagnostics, 100);
  }, []);

  if (!showOverlay || !diagnostics) {
    return null;
  }

  const statusColor = {
    OK: 'bg-green-950 border-green-500',
    MISSING: 'bg-red-950 border-red-500',
    'MISSING/PURGED': 'bg-red-950 border-red-500',
    PARTIAL: 'bg-yellow-950 border-yellow-500',
    UNKNOWN: 'bg-gray-950 border-gray-500',
  }[diagnostics.tailwindStatus];

  const statusTextColor = {
    OK: 'text-green-400',
    MISSING: 'text-red-400',
    'MISSING/PURGED': 'text-red-400',
    PARTIAL: 'text-yellow-400',
    UNKNOWN: 'text-gray-400',
  }[diagnostics.tailwindStatus];

  return (
    <div className={`fixed bottom-4 right-4 z-[9999] max-w-md ${statusColor} border-2 rounded-lg p-4 font-mono text-xs text-white shadow-2xl`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`font-bold ${statusTextColor}`}>CSS DIAGNOSTICS</span>
        <button
          onClick={() => setShowOverlay(false)}
          className="text-gray-400 hover:text-white cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-gray-300">
        {/* Status */}
        <div>
          <span className="font-bold">Tailwind Status:</span>
          <span className={`ml-2 font-bold ${statusTextColor}`}>{diagnostics.tailwindStatus}</span>
        </div>

        {/* Stylesheets */}
        <div>
          <span className="font-bold">Stylesheets Loaded: {diagnostics.stylesheets.length}</span>
          <div className="ml-2 max-h-32 overflow-y-auto text-[10px] text-gray-400">
            {diagnostics.stylesheets.map((sheet, i) => (
              <div key={i} className="truncate">
                {sheet.href.split('/').pop()} ({sheet.rules || sheet.error} rules)
              </div>
            ))}
          </div>
        </div>

        {/* CDN Check */}
        <div>
          <span className="font-bold">Tailwind CDN:</span>
          <span className="ml-2">{diagnostics.tailwindCDN ? '✓ YES' : '✗ NO'}</span>
        </div>

        {/* Computed Styles */}
        <div>
          <span className="font-bold">Utility Test (hidden class):</span>
          <div className="ml-2 text-[10px] text-gray-400">
            display: {diagnostics.computedStyles.hidden.display}
            {diagnostics.computedStyles.hidden.isHidden ? ' ✓' : ' ✗'}
          </div>
        </div>

        <div>
          <span className="font-bold">Utility Test (bg-slate-950):</span>
          <div className="ml-2 text-[10px] text-gray-400 break-all">
            {diagnostics.computedStyles.bgColor.backgroundColor}
            {diagnostics.computedStyles.bgColor.expectedSlate950 ? ' ✓' : ' ✗'}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-600 text-[10px] text-gray-500">
        Loaded at: {new Date(diagnostics.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}