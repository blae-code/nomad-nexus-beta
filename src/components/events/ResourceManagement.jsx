import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Ship, Plus, Trash2 } from 'lucide-react';

export default function ResourceManagement({ event, onUpdate }) {
  const [assets, setAssets] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingPersonnel, setLoadingPersonnel] = useState(true);

  useEffect(() => {
    loadResources();
  }, [event?.id]);

  const getAssignmentInfo = () => {
    const memberIds = Array.isArray(event?.assigned_member_profile_ids)
      ? event.assigned_member_profile_ids
      : [];
    const legacyIds = Array.isArray(event?.assigned_user_ids)
      ? event.assigned_user_ids
      : [];
    const assignedIds = memberIds.length > 0 ? memberIds : legacyIds;
    const field = memberIds.length > 0 ? 'assigned_member_profile_ids' : 'assigned_user_ids';
    return { assignedIds, field };
  };

  const loadResources = async () => {
    setLoadingAssets(true);
    setLoadingPersonnel(true);

    try {
      const allAssets = await base44.entities.FleetAsset.list();
      const assignedAssets = allAssets.filter((a) => event.assigned_asset_ids?.includes(a.id));
      setAssets(assignedAssets);

      const { assignedIds } = getAssignmentInfo();
      if (assignedIds.length > 0) {
        const members = await base44.entities.MemberProfile.list();
        const assignedMembers = members.filter((m) => assignedIds.includes(m.id));
        setPersonnel(assignedMembers);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setLoadingAssets(false);
      setLoadingPersonnel(false);
    }
  };

  const removeAsset = async (assetId) => {
    const updated = event.assigned_asset_ids.filter((id) => id !== assetId);
    await base44.entities.Event.update(event.id, { assigned_asset_ids: updated });
    onUpdate();
  };

  const removePersonnel = async (memberId) => {
    const { assignedIds, field } = getAssignmentInfo();
    const updated = assignedIds.filter((id) => id !== memberId);
    await base44.entities.Event.update(event.id, { [field]: updated });
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Personnel */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-blue-400 uppercase flex items-center gap-2">
          <Users className="w-4 h-4" />
          Assigned Personnel ({personnel.length})
        </h4>

        {loadingPersonnel ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400 mr-2" />
            <span className="text-xs text-zinc-500">Loading personnel...</span>
          </div>
        ) : personnel.length === 0 ? (
          <div className="text-xs text-zinc-500 text-center py-4">No personnel assigned</div>
        ) : (
          <div className="space-y-2">
            {personnel.map((member) => (
              <div key={member.id} className="p-3 bg-blue-950/20 border border-blue-600/30 rounded flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-blue-300">
                    {member.display_callsign || member.callsign || member.full_name || member.email}
                  </div>
                  {member.rank && (
                    <div className="text-xs text-blue-200">{member.rank}</div>
                  )}
                </div>
                <button
                  onClick={() => removePersonnel(member.id)}
                  className="text-red-400 hover:text-red-300 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assets */}
      <div className="space-y-3 border-t border-zinc-700 pt-6">
        <h4 className="text-sm font-bold text-green-400 uppercase flex items-center gap-2">
          <Ship className="w-4 h-4" />
          Fleet Assets ({assets.length})
        </h4>

        {loadingAssets ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400 mr-2" />
            <span className="text-xs text-zinc-500">Loading assets...</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-xs text-zinc-500 text-center py-4">No assets assigned</div>
        ) : (
          <div className="space-y-2">
            {assets.map((asset) => (
              <div key={asset.id} className="p-3 bg-green-950/20 border border-green-600/30 rounded">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-green-300">{asset.name}</div>
                    <div className="text-xs text-green-200">{asset.model}</div>
                  </div>
                  <button
                    onClick={() => removeAsset(asset.id)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className={`px-2 py-1 rounded ${
                    asset.status === 'OPERATIONAL'
                      ? 'bg-green-600/30 text-green-300'
                      : 'bg-yellow-600/30 text-yellow-300'
                  }`}>
                    {asset.status}
                  </span>
                  {asset.location && (
                    <span className="px-2 py-1 rounded bg-zinc-700 text-zinc-300">
                      {asset.location}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resource Summary */}
      <div className="grid grid-cols-2 gap-3 border-t border-zinc-700 pt-6">
        <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded">
          <div className="text-xs text-zinc-400 mb-1">Total Personnel</div>
          <div className="text-2xl font-black text-blue-400">{personnel.length}</div>
        </div>
        <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded">
          <div className="text-xs text-zinc-400 mb-1">Available Assets</div>
          <div className="text-2xl font-black text-green-400">{assets.length}</div>
        </div>
      </div>
    </div>
  );
}
