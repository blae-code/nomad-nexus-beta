import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, CheckCircle2, Loader2, Lock } from 'lucide-react';

export default function UserSettingsPage() {
  const [user, setUser] = useState(null);
  const [memberProfile, setMemberProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  // Load user and profile
  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        if (!u) {
          window.location.href = '/hub';
          return;
        }
        setUser(u);

        const profiles = await base44.entities.MemberProfile.filter({ user_id: u.id });
        setMemberProfile(profiles?.[0] || null);
      } catch (err) {
        console.error('Load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // AI Consent Mutation
  const aiConsentMutation = useMutation({
    mutationFn: async (enabled) => {
      if (!memberProfile) return;
      await base44.entities.MemberProfile.update(memberProfile.id, {
        ai_consent: enabled
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-profile'] });
      setSuccess('AI consent preference saved');
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err) => {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    }
  });

  // Clear Onboarding Cache
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem('nexus_onboarding_cache');
      localStorage.removeItem('nexus_boot_shown');
    },
    onSuccess: () => {
      setSuccess('Local cache cleared');
      setTimeout(() => setSuccess(null), 3000);
    }
  });

  const handleAiConsentChange = (enabled) => {
    aiConsentMutation.mutate(enabled);
  };

  const handleClearCache = () => {
    if (window.confirm('Clear local onboarding cache? Your membership is not affected.')) {
      clearCacheMutation.mutate();
    }
  };

  if (loading) {
    return (
      <PageLayout title="Settings">
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#ea580c] animate-spin" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="User Settings">
      <div className="overflow-auto h-full">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Account Section */}
          <div className="border border-zinc-800 bg-zinc-950 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-tight mb-1">Account</h3>
              <p className="text-xs text-zinc-500">Your operational identity in Nexus</p>
            </div>

            <div className="space-y-3">
              {/* Callsign */}
              <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded">
                <p className="text-[10px] font-mono text-zinc-400 uppercase mb-1">Callsign</p>
                <p className="text-sm font-bold text-white">{memberProfile?.callsign || 'N/A'}</p>
              </div>

              {/* Rank */}
              {memberProfile?.rank && (
                <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded">
                  <p className="text-[10px] font-mono text-zinc-400 uppercase mb-1">Rank</p>
                  <p className="text-sm font-bold text-[#ea580c]">{memberProfile.rank}</p>
                </div>
              )}
            </div>
          </div>

          {/* Privacy & AI Section */}
          <div className="border border-zinc-800 bg-zinc-950 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-tight mb-1">Privacy & AI</h3>
              <p className="text-xs text-zinc-500">Control your data and feature preferences</p>
            </div>

            <div className="space-y-4">
              {/* Privacy Commitment */}
              <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded text-[10px] space-y-1 text-zinc-400 font-mono">
                <p className="text-zinc-500 font-bold mb-2">OUR COMMITMENT</p>
                <p>• No mailing list</p>
                <p>• No marketing email</p>
                <p>• Operational comms stay inside the Dock</p>
              </div>

              {/* AI Consent Toggle */}
              <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                <div>
                  <p className="text-sm font-bold text-white">AI-Powered Features</p>
                  <p className="text-xs text-zinc-500">Summaries, analytics, suggestions</p>
                </div>
                <Switch
                  checked={memberProfile?.ai_consent || false}
                  onCheckedChange={handleAiConsentChange}
                  disabled={aiConsentMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Cache Management */}
          <div className="border border-zinc-800 bg-zinc-950 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-tight mb-1">Local Cache</h3>
              <p className="text-xs text-zinc-500">Manage browser-stored onboarding data</p>
            </div>

            <Button
              onClick={handleClearCache}
              disabled={clearCacheMutation.isPending}
              variant="outline"
              className="w-full justify-start border-zinc-800 text-xs"
            >
              {clearCacheMutation.isPending ? (
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <Lock className="w-3 h-3 mr-2" />
              )}
              Clear Local Onboarding Cache
            </Button>
            <p className="text-[10px] text-zinc-500">Your membership is not affected</p>
          </div>

          {/* Feedback */}
          {success && (
            <div className="bg-green-950/40 border border-green-800/60 p-3 rounded flex gap-2 items-start text-[12px]">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <p className="text-green-300">{success}</p>
            </div>
          )}
          {error && (
            <div className="bg-red-950/40 border border-red-800/60 p-3 rounded flex gap-2 items-start text-[12px]">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300">{error}</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}