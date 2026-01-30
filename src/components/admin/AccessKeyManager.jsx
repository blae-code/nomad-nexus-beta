/**
 * AccessKeyManager — Manage access codes for membership tiers
 * Create, revoke, and track access key redemptions
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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
import { Copy, Trash2, Key, Plus, Search, CheckCircle2, Lock, AlertCircle, MessageSquare, X } from 'lucide-react';

const RANK_OPTIONS = ['VAGRANT', 'SCOUT', 'VOYAGER', 'PIONEER', 'FOUNDER'];

export default function AccessKeyManager() {
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);
  const [formData, setFormData] = useState({
    grantsRank: 'VAGRANT',
  });
  const [recipientCallsign, setRecipientCallsign] = useState('');
  const [adminCallsign, setAdminCallsign] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load keys and admin callsign
  useEffect(() => {
    loadKeys();
    loadAdminCallsign();
  }, []);

  const loadAdminCallsign = async () => {
    try {
      const user = await base44.auth.me();
      const profile = await base44.entities.MemberProfile.filter({ user_id: user.id });
      if (profile && profile.length > 0) {
        setAdminCallsign(profile[0].callsign || user.full_name);
      } else {
        setAdminCallsign(user.full_name);
      }
    } catch (err) {
      console.error('Failed to load admin callsign:', err);
    }
  };

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
      const response = await base44.functions.invoke('createAccessKey', {
        grantsRank: formData.grantsRank,
      });

      const key = response.data.key;

      // Generate immersive Discord message
      const message = generateDiscordMessage(adminCallsign, recipientCallsign, key.code, formData.grantsRank);
      setGeneratedMessage(message);
      
      setSuccess('Access key generated - Message ready to copy');
      setFormData({ grantsRank: 'VAGRANT' });
      setRecipientCallsign('');
      setError(null);
      await loadKeys();
    } catch (err) {
      setError(`Failed to create key: ${err.message}`);
    }
  };

  const generateDiscordMessage = (issuer, recipient, code, rank) => {
    return `⸻ AUTHORIZATION GRANTED ⸻

  FROM: ${issuer}
  TO: ${recipient}

  ACCESS CODE: ${code}
  RANK: ${rank}

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
      setSuccess('Access key revoked');
      await loadKeys();
    } catch (err) {
      setError(`Failed to revoke key: ${err.message}`);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setSuccess(`Copied: ${code}`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const filteredKeys = keys.filter((k) => {
    const matchesSearch = k.code?.includes(searchTerm.toUpperCase()) || k.grantsRank?.includes(searchTerm.toUpperCase());
    const isNotRevoked = k.status !== 'REVOKED';
    const shouldShow = showRevoked || isNotRevoked;
    return matchesSearch && shouldShow;
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search codes or ranks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-700"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showRevoked ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowRevoked(!showRevoked)}
            className={showRevoked ? 'bg-orange-600 hover:bg-orange-500' : ''}
          >
            Show Revoked
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
        <form onSubmit={handleCreateKeys} className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded space-y-4">
          <h3 className="font-bold text-orange-400">Generate Access Keys</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Recipient Callsign *</label>
              <Input
                type="text"
                placeholder="Enter recipient's callsign"
                value={recipientCallsign}
                onChange={(e) => setRecipientCallsign(e.target.value)}
                className="bg-zinc-900 border-zinc-700"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Grants Rank</label>
              <Select value={formData.grantsRank} onValueChange={(rank) => setFormData({ ...formData, grantsRank: rank })}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANK_OPTIONS.map((rank) => (
                    <SelectItem key={rank} value={rank}>
                      {rank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-300">
            <strong>Note:</strong> One key per user. Keys never expire and are permanently linked to identity.
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => { setShowCreateForm(false); setGeneratedMessage(null); }}>
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

      {/* Keys List */}
      <div className="space-y-2">
        {filteredKeys.length === 0 ? (
          <div className="p-4 text-center text-zinc-400">
            {keys.length === 0 ? 'No access keys yet' : 'No results'}
          </div>
        ) : (
          filteredKeys.map((key) => {
            const expiresAt = key.expiresAt ? new Date(key.expiresAt) : null;
            const isExpired = expiresAt && expiresAt < new Date();

            return (
              <div
                key={key.id}
                className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Key className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <code className="font-mono text-sm text-zinc-200 font-bold truncate">{key.code}</code>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(key.status)}`}>
                      {key.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                  <div>
                    <span className="text-zinc-500">Rank:</span>
                    <p className="text-zinc-300 font-mono">{key.grantsRank}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Expiration:</span>
                    <p className="text-zinc-300">Never</p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopyCode(key.code)}
                    className="text-zinc-400 hover:text-orange-400"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                  {key.status !== 'REVOKED' && key.status !== 'REDEEMED' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevokeKey(key.id)}
                      className="text-zinc-400 hover:text-red-400"
                    >
                      <Lock className="w-4 h-4 mr-1" />
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-zinc-400">
        Total: {keys.length} key{keys.length !== 1 ? 's' : ''} ({keys.filter((k) => k.status === 'ACTIVE').length} active)
      </div>
    </div>
  );
}