/**
 * AccessKeyManager — Manage access codes for membership tiers
 * Create, revoke, and track access key redemptions
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { createPageUrl, getDisplayCallsign } from '@/utils';
import { MEMBERSHIP_LIST, getDefaultMembershipForRank } from '@/components/constants/membership';
import { getMembershipLabel } from '@/components/constants/labels';
import { useAuth } from '@/components/providers/AuthProvider';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Copy, Trash2, Key, Plus, Search, CheckCircle2, Lock, AlertCircle, MessageSquare, X, ChevronDown, History } from 'lucide-react';
import GrantsSelector from './GrantsSelector';
import AccessKeyAuditLog from './AccessKeyAuditLog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const RANK_OPTIONS = ['VAGRANT', 'SCOUT', 'VOYAGER', 'PIONEER', 'FOUNDER'];

const RANK_GRANTS_CONFIG = {
  'VAGRANT': ['read_only'],
  'SCOUT': ['read_only', 'comms_access'],
  'VOYAGER': ['read_only', 'comms_access', 'event_creation'],
  'PIONEER': ['read_only', 'comms_access', 'event_creation', 'fleet_management', 'voice_net_control'],
  'FOUNDER': ['admin_access'],
};

export default function AccessKeyManager() {
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);
  const [formData, setFormData] = useState({
    grantsRank: 'VAGRANT',
    grantsPermissions: RANK_GRANTS_CONFIG['VAGRANT'],
    grantsMembership: getDefaultMembershipForRank('VAGRANT'),
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recipientCallsign, setRecipientCallsign] = useState('');
  const [adminCallsign, setAdminCallsign] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [filterRank, setFilterRank] = useState('ALL');
  const { user: authUser } = useAuth();
  const adminProfile = authUser?.member_profile_data || authUser;

  // Load keys and admin callsign
  useEffect(() => {
    loadKeys();
  }, []);

  useEffect(() => {
    if (!adminProfile) return;
    const display = getDisplayCallsign(adminProfile);
    setAdminCallsign(display || adminProfile.full_name || adminProfile.callsign || '');
  }, [adminProfile]);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const keyList = await base44.entities.AccessKey.list();
      setKeys(keyList || []);
      setError(null);
    } catch (err) {
      setError(`Failed to load keys: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateKeys = async (e) => {
    e.preventDefault();

    if (!recipientCallsign.trim()) {
      setError('Please enter the recipient\'s callsign');
      return;
    }

    try {
      const response = await invokeMemberFunction('createAccessKey', {
        grantsRank: formData.grantsRank,
        grantsPermissions: formData.grantsPermissions,
        grantsMembership: formData.grantsMembership,
      });

      const key = response.data.key;

      // Generate immersive Discord message
      const message = generateDiscordMessage(
        adminCallsign,
        recipientCallsign,
        key.code,
        formData.grantsRank,
        formData.grantsPermissions,
        formData.grantsMembership
      );
      setGeneratedMessage(message);

      setSuccess('Access key generated - Message ready to copy');
      setFormData({
        grantsRank: 'VAGRANT',
        grantsPermissions: RANK_GRANTS_CONFIG['VAGRANT'],
        grantsMembership: getDefaultMembershipForRank('VAGRANT'),
      });
      setRecipientCallsign('');
      setShowAdvanced(false);
      setError(null);
      await loadKeys();
    } catch (err) {
      setError(`Failed to create key: ${err.message}`);
    }
  };

  const generateDiscordMessage = (issuer, recipient, code, rank, permissions, membership) => {
    const grantsText = permissions.length > 0 
      ? `\nGRANTS: ${permissions.join(', ')}`
      : '';
    const membershipText = membership ? `\nMEMBERSHIP: ${getMembershipLabel(membership)}` : '';
    return `⸻ AUTHORIZATION GRANTED ⸻

  FROM: ${issuer}
  TO: ${recipient}

  ACCESS CODE: ${code}
  RANK: ${rank}${membershipText}${grantsText}

  Redeem at: ${window.location.origin}${createPageUrl('AccessGate')}

  ⸻ END ⸻`;
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Revoke this access key? It cannot be redeemed.')) {
      return;
    }

    try {
      await base44.entities.AccessKey.update(keyId, {
        status: 'REVOKED',
      });
      // Log audit trail
      await invokeMemberFunction('logAccessKeyAudit', {
        access_key_id: keyId,
        action: 'REVOKE',
        details: { reason: 'Manual revocation' },
      });
      setSuccess('Access key revoked');
      await loadKeys();
    } catch (err) {
      setError(`Failed to revoke key: ${err.message}`);
    }
  };

  const handleBulkRevoke = async () => {
    if (selectedKeys.size === 0) {
      setError('No keys selected for revocation');
      return;
    }

    if (!confirm(`Revoke ${selectedKeys.size} access key(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const keysArray = Array.from(selectedKeys);
      await Promise.all(
        keysArray.map((keyId) =>
          base44.entities.AccessKey.update(keyId, { status: 'REVOKED' })
        )
      );
      
      // Log each revocation
      await Promise.all(
        keysArray.map((keyId) =>
          invokeMemberFunction('logAccessKeyAudit', {
            access_key_id: keyId,
            action: 'REVOKE',
            details: { reason: 'Bulk revocation' },
          })
        )
      );

      setSuccess(`${selectedKeys.size} key(s) revoked`);
      setSelectedKeys(new Set());
      await loadKeys();
    } catch (err) {
      setError(`Failed to revoke keys: ${err.message}`);
    }
  };

  const toggleKeySelection = (keyId) => {
    const newSelected = new Set(selectedKeys);
    if (newSelected.has(keyId)) {
      newSelected.delete(keyId);
    } else {
      newSelected.add(keyId);
    }
    setSelectedKeys(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedKeys.size === filteredKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredKeys.map((k) => k.id)));
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setSuccess(`Copied: ${code}`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const filteredKeys = keys.filter((k) => {
    const matchesSearch =
      k.code?.includes(searchTerm.toUpperCase()) ||
      k.grants_rank?.includes(searchTerm.toUpperCase()) ||
      k.grantsRank?.includes(searchTerm.toUpperCase()) ||
      k.grants_membership?.includes(searchTerm.toUpperCase()) ||
      k.grantsMembership?.includes(searchTerm.toUpperCase());
    const isNotRevoked = k.status !== 'REVOKED';
    const shouldShow = showRevoked || isNotRevoked;
    const rankMatch = filterRank === 'ALL' || k.grants_rank === filterRank;
    return matchesSearch && shouldShow && rankMatch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-400 bg-green-500/20';
      case 'REDEEMED':
        return 'text-blue-400 bg-blue-500/20';
      case 'EXPIRED':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'REVOKED':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-zinc-400 bg-zinc-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-orange-500">Loading access keys...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Search */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAuditLog(!showAuditLog)}
              className={showAuditLog ? 'bg-orange-600 text-white' : ''}
            >
              <History className="w-4 h-4 mr-2" />
              Audit Log
            </Button>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-orange-600 hover:bg-orange-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate Keys
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterRank}
            onChange={(e) => setFilterRank(e.target.value)}
            className="px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded text-zinc-100"
          >
            <option value="ALL">All Ranks</option>
            {RANK_OPTIONS.map((rank) => (
              <option key={rank} value={rank}>
                {rank}
              </option>
            ))}
          </select>
          <Button
            variant={showRevoked ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowRevoked(!showRevoked)}
            className={showRevoked ? 'bg-orange-600 hover:bg-orange-500' : ''}
          >
            Show Revoked
          </Button>
          {selectedKeys.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkRevoke}
              className="bg-red-600 hover:bg-red-500"
            >
              Revoke {selectedKeys.size}
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-900/20 border border-green-500/30 rounded text-green-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateKeys} className="p-5 bg-zinc-800/50 border border-orange-500/30 rounded-lg space-y-4">
          <h3 className="text-lg font-bold text-orange-400">Generate Access Key</h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-orange-300 block mb-2">Recipient Callsign *</label>
              <Input
                type="text"
                placeholder="Enter callsign..."
                value={recipientCallsign}
                onChange={(e) => setRecipientCallsign(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-zinc-100"
                required
              />
            </div>

            <div>
              <label className="text-sm font-bold text-orange-300 block mb-2">Authorization Rank *</label>
              <Select 
                value={formData.grantsRank} 
                onValueChange={(rank) => {
                  setFormData({ 
                    ...formData, 
                    grantsRank: rank,
                    grantsPermissions: RANK_GRANTS_CONFIG[rank],
                    grantsMembership: getDefaultMembershipForRank(rank),
                  });
                }}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {RANK_OPTIONS.map((rank) => (
                    <SelectItem key={rank} value={rank}>
                      <span className="text-zinc-100">{rank}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-400 mt-1">Pre-configured with standard permissions for this rank</p>
            </div>

            <div>
              <label className="text-sm font-bold text-orange-300 block mb-2">Membership Tier *</label>
              <Select
                value={formData.grantsMembership}
                onValueChange={(membership) => {
                  setFormData({
                    ...formData,
                    grantsMembership: membership,
                  });
                }}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {MEMBERSHIP_LIST.map((membership) => (
                    <SelectItem key={membership} value={membership}>
                      <span className="text-zinc-100">{getMembershipLabel(membership)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-400 mt-1">Controls Focused comms + voice access</p>
            </div>

            {/* Advanced Settings Collapsible */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 mt-2"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  Advanced Settings
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 pt-3 border-t border-zinc-700 space-y-3">
                <GrantsSelector 
                  selectedGrants={formData.grantsPermissions}
                  onChange={(perms) => setFormData({ ...formData, grantsPermissions: perms })}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-300">
            <strong>Note:</strong> One key per user. Keys never expire and are permanently linked to identity.
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowCreateForm(false); setGeneratedMessage(null); setShowAdvanced(false); }}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-500">
              Generate Key
            </Button>
          </div>
        </form>
      )}

      {/* Discord Message Modal */}
      <Dialog open={!!generatedMessage} onOpenChange={(open) => {
        if (!open) {
          setGeneratedMessage(null);
          loadKeys(); // Refresh list when dialog closes
        }
      }}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <MessageSquare className="w-4 h-4" />
              Discord Message Ready
            </DialogTitle>
          </DialogHeader>
          <pre className="text-xs text-zinc-300 bg-zinc-950 p-3 rounded border border-zinc-700 overflow-y-auto max-h-96 whitespace-pre-wrap font-mono">
{generatedMessage}
          </pre>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setGeneratedMessage(null)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(generatedMessage);
                setSuccess('Message copied to clipboard!');
                setTimeout(() => setSuccess(null), 2000);
              }}
              className="bg-orange-600 hover:bg-orange-500"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log */}
      {showAuditLog && (
        <div className="p-4 bg-zinc-900/50 border border-orange-500/20 rounded">
          <AccessKeyAuditLog />
        </div>
      )}

      {/* Keys List with Selection */}
      <div className="space-y-2">
        {filteredKeys.length === 0 ? (
          <div className="p-4 text-center text-zinc-400">
            {keys.length === 0 ? 'No access keys yet' : 'No results'}
          </div>
        ) : (
          <>
            {/* Select All Checkbox */}
            {filteredKeys.length > 0 && (
              <div className="p-2 bg-zinc-900/30 border border-zinc-700/30 rounded flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedKeys.size === filteredKeys.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-zinc-400">
                  {selectedKeys.size > 0 ? `${selectedKeys.size} selected` : 'Select all on this page'}
                </span>
              </div>
            )}

            {/* Keys */}
            {filteredKeys.map((key) => {
              const expiresAt = key.expiresAt ? new Date(key.expiresAt) : null;
              const isExpired = expiresAt && expiresAt < new Date();
              const isSelected = selectedKeys.has(key.id);

              return (
                <div
                  key={key.id}
                  className={`p-4 border rounded transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500/10 border-orange-500/40'
                      : 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600'
                  }`}
                  onClick={() => key.status !== 'REDEEMED' && key.status !== 'REVOKED' && toggleKeySelection(key.id)}
                >
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {key.status !== 'REDEEMED' && key.status !== 'REVOKED' && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleKeySelection(key.id)}
                          className="w-4 h-4 cursor-pointer flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <Key className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <code className="font-mono text-sm text-zinc-200 font-bold truncate">{key.code}</code>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(key.status)}`}>
                        {key.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                    <div>
                      <span className="text-zinc-500">Rank:</span>
                      <p className="text-zinc-300 font-mono">{key.grants_rank}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500">Membership:</span>
                      <p className="text-zinc-300">{getMembershipLabel(key.grants_membership || 'VAGRANT')}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500">Created:</span>
                      <p className="text-zinc-300">{format(new Date(key.created_date), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>

                  {key.grants_roles && key.grants_roles.length > 0 && (
                    <div className="mb-3">
                      <span className="text-zinc-500 text-xs block mb-1">Grants:</span>
                      <div className="flex flex-wrap gap-1">
                        {key.grants_roles.map((role) => (
                          <span key={role} className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyCode(key.code);
                      }}
                      className="text-zinc-400 hover:text-orange-400"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                    {key.status !== 'REVOKED' && key.status !== 'REDEEMED' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevokeKey(key.id);
                        }}
                        className="text-zinc-400 hover:text-red-400"
                      >
                        <Lock className="w-4 h-4 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-zinc-400">
        Total: {keys.length} key{keys.length !== 1 ? 's' : ''} ({keys.filter((k) => k.status === 'ACTIVE').length} active)
      </div>
    </div>
  );
}
