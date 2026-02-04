import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Ship, MapPin } from 'lucide-react';

export default function MemberHangar({ memberId, onMemberUpdate }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignId, setAssignId] = useState('');

  useEffect(() => {
    if (!memberId) return;
    const loadAssets = async () => {
      setLoading(true);
      try {
        const list = await base44.entities.FleetAsset.list('name', 200);
        setAssets(list || []);
      } catch (error) {
        console.error('Failed to load hangar assets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, [memberId]);

  const assignedAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (asset.owner_member_profile_id === memberId) return true;
      if (asset.assigned_member_profile_id === memberId) return true;
      if (Array.isArray(asset.assigned_member_profile_ids) && asset.assigned_member_profile_ids.includes(memberId)) return true;
      if (asset.assigned_user_id === memberId) return true;
      return false;
    });
  }, [assets, memberId]);

  const unassignedAssets = useMemo(() => {
    return assets.filter((asset) => !asset.owner_member_profile_id && !asset.assigned_member_profile_id);
  }, [assets]);

  const assignAsset = async () => {
    if (!assignId) return;
    try {
      await base44.entities.FleetAsset.update(assignId, { owner_member_profile_id: memberId });
      setAssignId('');
      onMemberUpdate?.();
      const refreshed = await base44.entities.FleetAsset.list('name', 200);
      setAssets(refreshed || []);
    } catch (error) {
      console.error('Failed to assign asset:', error);
    }
  };

  const releaseAsset = async (assetId) => {
    try {
      await base44.entities.FleetAsset.update(assetId, { owner_member_profile_id: null, assigned_member_profile_id: null });
      onMemberUpdate?.();
      const refreshed = await base44.entities.FleetAsset.list('name', 200);
      setAssets(refreshed || []);
    } catch (error) {
      console.error('Failed to release asset:', error);
    }
  };

  if (loading) {
    return <div className="text-xs text-zinc-500">Loading hangar...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-800/50 border border-zinc-700 rounded p-4 space-y-3">
        <div className="text-xs uppercase tracking-widest text-zinc-500">Assign Asset</div>
        <div className="flex gap-2">
          <select
            value={assignId}
            onChange={(e) => setAssignId(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
          >
            <option value="">Select asset</option>
            {unassignedAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>{asset.name} ({asset.model})</option>
            ))}
          </select>
          <Button size="sm" onClick={assignAsset} disabled={!assignId}>Assign</Button>
        </div>
      </div>

      {assignedAssets.length === 0 ? (
        <div className="text-xs text-zinc-500">No ships assigned to this member.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {assignedAssets.map((asset) => (
            <div key={asset.id} className="bg-zinc-800/50 border border-zinc-700 rounded p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <Ship className="w-4 h-4 text-orange-400" />
                    {asset.name}
                  </div>
                  <div className="text-[10px] text-zinc-500">{asset.model}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => releaseAsset(asset.id)}>
                  Release
                </Button>
              </div>
              {asset.location && (
                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {asset.location}
                </div>
              )}
              {asset.loadout && (
                <div className="text-[10px] text-zinc-400">Loadout: {JSON.stringify(asset.loadout)}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
