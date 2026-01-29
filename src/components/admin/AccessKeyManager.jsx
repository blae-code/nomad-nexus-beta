import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, RefreshCw, Trash2, Plus, Check, Clock, X } from 'lucide-react';
import { useNotification } from '@/components/providers/NotificationContext';

export default function AccessKeyManager() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    grants_rank: 'VAGRANT',
    max_uses: 1,
    expires_at: getDefaultExpiry(),
  });

  const { addNotification } = useNotification();

  function getDefaultExpiry() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const keys = await base44.entities.AccessKey.list('-created_date', 100);
      setKeys(keys);
    } catch (error) {
      console.error('Failed to load keys:', error);
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load access keys' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('issueAccessKey', {
        grants_rank: formData.grants_rank,
        max_uses: parseInt(formData.max_uses),
        expires_at: new Date(formData.expires_at).toISOString(),
      });

      addNotification({
        type: 'success',
        title: 'Key Generated',
        message: `Code: ${response.data.code}`,
      });

      setFormData({
        grants_rank: 'VAGRANT',
        max_uses: 1,
        expires_at: getDefaultExpiry(),
      });
      setShowForm(false);
      loadKeys();
    } catch (error) {
      console.error('Failed to generate key:', error);
      addNotification({ type: 'error', title: 'Error', message: 'Failed to generate access key' });
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Revoke this access key?')) return;

    try {
      await base44.entities.AccessKey.update(keyId, { status: 'REVOKED' });
      addNotification({ type: 'success', title: 'Revoked', message: 'Access key revoked' });
      loadKeys();
    } catch (error) {
      console.error('Failed to revoke key:', error);
      addNotification({ type: 'error', title: 'Error', message: 'Failed to revoke key' });
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    addNotification({ type: 'success', title: 'Copied', message: 'Code copied to clipboard' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-400';
      case 'REDEEMED':
        return 'text-blue-400';
      case 'EXPIRED':
        return 'text-yellow-400';
      case 'REVOKED':
        return 'text-red-400';
      default:
        return 'text-zinc-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <Check className="w-4 h-4" />;
      case 'REDEEMED':
        return <Clock className="w-4 h-4" />;
      case 'EXPIRED':
        return <X className="w-4 h-4" />;
      case 'REVOKED':
        return <X className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-widest text-white">Access Keys</h2>
          <p className="text-sm text-zinc-400 mt-1">Manage tester and member access codes</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Generate Key
        </Button>
      </div>

      {/* Generate Form */}
      {showForm && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Rank</label>
            <select
              value={formData.grants_rank}
              onChange={(e) => setFormData({ ...formData, grants_rank: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-200"
            >
              <option value="VAGRANT">Vagrant</option>
              <option value="PIONEER">Pioneer</option>
              <option value="VOYAGER">Voyager</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Max Uses</label>
              <Input
                type="number"
                min="1"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                className="bg-zinc-900 border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">Expires</label>
              <Input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="bg-zinc-900 border-zinc-700"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGenerateKey}
              disabled={generating}
              className="flex-1"
            >
              {generating ? 'Generating...' : 'Generate'}
            </Button>
            <Button
              onClick={() => setShowForm(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center text-zinc-400 py-8">Loading keys...</div>
        ) : keys.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">No access keys yet</div>
        ) : (
          keys.map((key) => (
            <div key={key.id} className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <code className="font-mono text-sm text-orange-400 font-bold">{key.code}</code>
                  <button
                    onClick={() => copyCode(key.code)}
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
                    title="Copy code"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <span className={`flex items-center gap-1 text-xs font-bold uppercase ${getStatusColor(key.status)}`}>
                    {getStatusIcon(key.status)}
                    {key.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 space-y-1">
                  <div>Rank: <span className="text-orange-300">{key.grants_rank}</span></div>
                  <div>Uses: <span className="text-zinc-300">{key.uses_count} / {key.max_uses}</span></div>
                  <div>Expires: <span className="text-zinc-300">{new Date(key.expires_at).toLocaleDateString()}</span></div>
                </div>
              </div>

              {key.status === 'ACTIVE' && (
                <Button
                  onClick={() => handleRevokeKey(key.id)}
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  title="Revoke key"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}