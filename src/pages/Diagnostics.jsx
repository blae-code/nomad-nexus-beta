import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Check, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { runDiagnostics } from '@/components/utils/diagnostics';

export default function DiagnosticsPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const diagResults = await runDiagnostics();
        setResults(diagResults);
      } catch (error) {
        console.error('Diagnostics load error:', error);
        setResults({ error: error.message });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCopyDiagnostics = async () => {
    const text = `DIAGNOSTICS REPORT
User: ${user?.full_name || 'Unknown'} (${user?.rank || 'N/A'})
Route: ${window.location.pathname}
Timestamp: ${new Date().toISOString()}

TESTS:
${
  Object.entries(results || {})
    .map(
      ([key, result]) =>
        `${key}: ${result.status} ${result.duration ? `(${result.duration})` : ''}\n${
          result.error ? `  Error: ${result.error}` : ''
        }`
    )
    .join('\n')
}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <div className="shrink-0 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href={createPageUrl('Hub')} className="hover:text-[#ea580c] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-white">System Diagnostics</h1>
            <p className="text-sm text-zinc-400 font-mono">Internal operational checks</p>
          </div>
        </div>
        <Button
          onClick={handleCopyDiagnostics}
          size="sm"
          className="bg-[#ea580c] hover:bg-[#c2410c] gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Report
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* User Info */}
        {user && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">User Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs font-mono text-zinc-400">
              <div>User: {user.full_name}</div>
              <div>Email: {user.email}</div>
              <div>Rank: {user.rank || 'None'}</div>
              <div>Role: {user.role}</div>
            </CardContent>
          </Card>
        )}

        {/* Diagnostics Results */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Contract Checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-sm text-zinc-500 animate-pulse">Running tests...</div>
            ) : results?.error ? (
              <div className="text-sm text-red-400">{results.error}</div>
            ) : (
              Object.entries(results || {}).map(([key, result]) => (
                <div key={key} className="flex items-start gap-3 p-2 bg-zinc-950/50 rounded border border-zinc-800">
                  <div className="shrink-0 mt-1">
                    {result.status === 'pass' ? (
                      <Badge className="bg-emerald-900/50 text-emerald-300 border-emerald-800">
                        ✓
                      </Badge>
                    ) : (
                      <Badge className="bg-red-900/50 text-red-300 border-red-800">✗</Badge>
                    )}
                  </div>
                  <div className="flex-1 text-xs font-mono">
                    <div className="font-bold text-zinc-200">{key}</div>
                    {result.duration && (
                      <div className="text-zinc-500">Duration: {result.duration}</div>
                    )}
                    {result.error && <div className="text-red-400">Error: {result.error}</div>}
                    {result.data && (
                      <div className="text-zinc-500">
                        {Object.entries(result.data)
                          .filter(([k]) => k !== 'ok')
                          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                          .join(' • ')}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="text-xs text-zinc-600 font-mono text-center py-4">
          Last check: {new Date().toISOString()}
        </div>
      </div>
    </div>
  );
}