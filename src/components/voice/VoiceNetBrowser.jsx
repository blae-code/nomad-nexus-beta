import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Radio, Plus, XCircle, Power, Lock, Shield } from 'lucide-react';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { canJoinVoiceNet } from '@/components/utils/voiceAccessPolicy';
import { EmptyState, LoadingState } from '@/components/common/UIStates';
import { isAdminUser } from '@/utils';
import { FocusedNetConfirmationSheet } from '@/components/voice/FocusedNetConfirmation';
import { closeManagedVoiceNet, listManagedVoiceNets } from '@/components/voice/voiceNetGovernanceClient';

export default function VoiceNetBrowser({ onCreateNew }) {
  const [voiceNets, setVoiceNets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user: authUser } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const isAdmin = isAdminUser(authUser);
  const voiceNet = useVoiceNet();

  useEffect(() => {
    loadVoiceNets();
  }, []);

  const loadVoiceNets = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listManagedVoiceNets();
      const activeRows = (result?.nets || []).filter((entry) => String(entry.status || '').toLowerCase() === 'active');
      setVoiceNets(activeRows);
      if (result?.error && !result?.success) {
        setError(result.error);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load voice nets');
    } finally {
      setLoading(false);
    }
  };

  const closeVoiceNet = async (netId) => {
    if (!confirm('Close this voice net? This cannot be undone.')) return;

    try {
      await closeManagedVoiceNet(netId, 'browser_close');
      loadVoiceNets();
    } catch (err) {
      alert(`Failed to close voice net: ${err?.message || 'Unknown error'}`);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      command: 'text-red-400 border-red-500/50',
      squad: 'text-blue-400 border-blue-500/50',
      support: 'text-yellow-400 border-yellow-500/50',
      general: 'text-green-400 border-green-500/50',
    };
    return colors[type] || 'text-zinc-400 border-zinc-600';
  };

  const getDisciplineIcon = (discipline) => {
    return discipline === 'focused' ? <Shield className="w-4 h-4 text-orange-400" /> : null;
  };

  if (loading) {
    return <LoadingState label="Loading Voice Nets" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-bold text-white uppercase">Voice Networks</h3>
        </div>
        {onCreateNew && (
          <Button onClick={onCreateNew} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Net
          </Button>
        )}
      </div>

      {error ? (
        <div className="text-xs text-amber-300 border border-amber-500/30 bg-amber-500/10 rounded px-2 py-1.5">{error}</div>
      ) : null}

      {voiceNets.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No voice nets available"
          message="Create your first voice network to enable voice communications"
        />
      ) : (
        <div className="grid gap-3">
          {voiceNets.map((net) => {
            const hasAccess = canJoinVoiceNet(user, net);
            const identity = net.id || net.code;
            const isActive = voiceNet.activeNetId === identity || voiceNet.activeNetId === net.code;

            return (
              <div
                key={identity}
                className={`p-4 border transition-all ${
                  isActive ? 'bg-orange-500/20 border-orange-500' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-bold text-white uppercase">{net.label}</h4>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${getTypeColor(net.type)}`}>
                        {net.code}
                      </span>
                      {getDisciplineIcon(net.discipline)}
                      {net.lifecycle_scope ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase border border-zinc-700 text-zinc-400">
                          {String(net.lifecycle_scope).replace('_', ' ')}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <span className="capitalize">{net.type}</span>
                      </div>
                      <div className="flex items-center gap-1">Priority {net.priority}</div>
                      {net.discipline === 'focused' && (
                        <div className="flex items-center gap-1 text-orange-400">
                          <Lock className="w-3 h-3" />
                          Focused
                        </div>
                      )}
                    </div>

                    {!hasAccess && (
                      <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Access restricted: {net.discipline === 'focused' ? 'Member+ required' : `Min rank: ${net.min_rank_to_rx}`}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {hasAccess && (
                      <Button
                        size="sm"
                        variant={isActive ? 'default' : 'outline'}
                        onClick={() => {
                          if (isActive) {
                            voiceNet.leaveNet();
                          } else {
                            voiceNet.joinNet(identity, user);
                          }
                        }}
                      >
                        <Power className="w-3 h-3 mr-1" />
                        {isActive ? 'Connected' : 'Join'}
                      </Button>
                    )}

                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => closeVoiceNet(net.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <XCircle className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 text-xs text-blue-300">
        <strong>Voice Net Types:</strong> Command (priority comms), Squad (team channels), Support (medic/rescue), General (casual hangout)
      </div>

      {voiceNet.focusedConfirmation?.needsConfirmation && (
        <FocusedNetConfirmationSheet onConfirm={() => voiceNet.confirmFocusedJoin?.()} onCancel={() => voiceNet.cancelFocusedJoin?.()} />
      )}
    </div>
  );
}
