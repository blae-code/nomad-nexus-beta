import { useState, useEffect } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DiagnosticsDrawer from '@/components/diagnostics/DiagnosticsDrawer';

export default function DiagnosticsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="h-full bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="h-full bg-zinc-950 text-zinc-100 flex flex-col">
        <div className="shrink-0 border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
          <a href={createPageUrl('Hub')} className="hover:text-[#ea580c] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <h1 className="text-2xl font-bold text-white">System Diagnostics</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Lock className="w-16 h-16 text-red-900 mx-auto opacity-50" />
            <h2 className="text-lg font-black uppercase tracking-widest text-red-800">Access Denied</h2>
            <p className="text-xs font-mono text-zinc-500">ADMIN CLEARANCE REQUIRED</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <div className="shrink-0 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href={createPageUrl('Hub')} className="hover:text-[#ea580c] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-white">System Diagnostics</h1>
            <p className="text-sm text-zinc-400 font-mono">Lightweight health checks</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Card className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white">Diagnostics</CardTitle>
            <CardDescription className="text-zinc-400 text-sm">
              System health monitoring is now available in the drawer below. Access it anytime via the command palette (Cmd+K) and search for "System Diagnostics".
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded space-y-3">
              <p className="text-xs text-zinc-400 font-mono">
                💡 <strong>Tip:</strong> Use the drawer for quick health checks without leaving your current page.
              </p>
              <p className="text-xs text-zinc-400 font-mono">
                ⌘K → "System Diagnostics" → View live status
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drawer always open on this page for inspection */}
      <DiagnosticsDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}