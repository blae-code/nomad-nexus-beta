/**
 * AccessKeyManager — Manage access codes for membership tiers
 * Create, revoke, and track access key redemptions
 */

import React, { useState, useEffect } from 'react';
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
import { Copy, Trash2, Key, Plus, Search, CheckCircle2, Lock, AlertCircle } from 'lucide-react';

const RANK_OPTIONS = ['VAGRANT', 'SCOUT', 'VOYAGER', 'PIONEER', 'FOUNDER'];

export default function AccessKeyManager() {
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    count: 1,
    maxUses: 1,
    grantsRank: 'VAGRANT',
    expiresIn: 30, // days
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load keys
  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const keyList = await base44.asServiceRole.entities.AccessKey.list();
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

    try {
      const newKeys = [];
      for (let i = 0; i < formData.count; i++) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + formData.expiresIn);

        const key = await base44.asServiceRole.entities.AccessKey.create({
          code: generateRandomCode(),
          status: 'ACTIVE',
          maxUses: formData.maxUses,
          usesCount: 0,
          grantsRank: formData.grantsRank,
          expiresAt: expiresAt.toISOString(),
        });
        newKeys.push(key);
      }

      setSuccess(`Created ${newKeys.length} access key(s)`);
      setFormData({ count: 1, maxUses: 1, grantsRank: 'VAGRANT', expiresIn: 30 });
      setShowCreateForm(false);
      setError(null);
      await loadKeys();
    } catch (err) {
      setError(`Failed to create keys: ${err.message}`);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Revoke this access key? It cannot be redeemed.')) {
      return;
    }

    try {
      await base44.asServiceRole.entities.AccessKey.update(keyId, {
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

  const filteredKeys = keys.filter((k) =>
    k.code?.includes(searchTerm.toUpperCase()) ||
    k.grantsRank?.includes(searchTerm.toUpperCase())
  );

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
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search codes or ranks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-700"
          />
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-orange-600 hover:bg-orange-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Generate Keys
        </Button>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Number of Keys</label>
              <Input
                type="number"
                min="1"
                max="50"
                value={formData.count}
                onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) })}
                className="bg-zinc-900 border-zinc-700"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Max Uses Per Key</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
                className="bg-zinc-900 border-zinc-700"
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

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Expires In (days)</label>
              <Input
                type="number"
                min="1"
                max="365"
                value={formData.expiresIn}
                onChange={(e) => setFormData({ ...formData, expiresIn: parseInt(e.target.value) })}
                className="bg-zinc-900 border-zinc-700"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-500">
              Generate {formData.count}
            </Button>
          </div>
        </form>
      )}

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
                    <span className="text-zinc-500">Uses:</span>
                    <p className="text-zinc-300">
                      {key.usesCount || 0} / {key.maxUses}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Expires:</span>
                    <p className="text-zinc-300">
                      {expiresAt
                        ? `${expiresAt.toLocaleDateString()} ${isExpired ? '(expired)' : ''}`
                        : 'Never'}
                    </p>
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