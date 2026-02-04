import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/components/providers/AuthProvider';
import { AlertTriangle, CheckCircle2, Fuel, Shield, HeartPulse, Package } from 'lucide-react';

const clamp = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(100, num));
};

const resolveTelemetry = (asset) => {
  const telemetry = asset?.telemetry || {};
  return {
    health: telemetry.health ?? asset.health_percent ?? asset.health ?? 100,
    shields: telemetry.shields ?? asset.shields_percent ?? asset.shields ?? 100,
    fuel: telemetry.fuel ?? asset.fuel_percent ?? asset.fuel ?? 100,
    cargo: telemetry.cargo ?? asset.cargo_percent ?? asset.cargo ?? 0,
  };
};

const TelemetryBar = ({ label, value, icon: Icon, color }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[10px] text-zinc-500">
      <span className="flex items-center gap-1"><Icon className={`w-3 h-3 ${color}`} /> {label}</span>
      <span>{Math.round(value)}%</span>
    </div>
    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  </div>
);

export default function FleetTelemetryPanel({ assets, activeEvent }) {
  const { user } = useAuth();
  const member = user?.member_profile_data || user;
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [telemetryForm, setTelemetryForm] = useState(null);

  const eventAssetIds = Array.isArray(activeEvent?.assigned_asset_ids)
    ? activeEvent.assigned_asset_ids
    : [];

  const scopedAssets = useMemo(() => {
    if (eventAssetIds.length === 0) return assets;
    return assets.filter((asset) => eventAssetIds.includes(asset.id));
  }, [assets, eventAssetIds]);

  const openReport = (asset) => {
    const telemetry = resolveTelemetry(asset);
    setSelectedAsset(asset);
    setTelemetryForm({
      health: telemetry.health,
      shields: telemetry.shields,
      fuel: telemetry.fuel,
      cargo: telemetry.cargo,
    });
  };

  const submitReport = async () => {
    if (!selectedAsset || !telemetryForm) return;
    const payload = {
      telemetry: {
        health: clamp(telemetryForm.health),
        shields: clamp(telemetryForm.shields),
        fuel: clamp(telemetryForm.fuel),
        cargo: clamp(telemetryForm.cargo),
      },
      last_reported_at: new Date().toISOString(),
      reported_by_member_profile_id: member?.id || null,
    };

    try {
      await base44.entities.FleetAsset.update(selectedAsset.id, payload);
      setSelectedAsset(null);
      setTelemetryForm(null);
    } catch (error) {
      console.error('Failed to update telemetry:', error);
    }
  };

  if (scopedAssets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
        No assets reported for this operation.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {scopedAssets.map((asset) => {
          const telemetry = resolveTelemetry(asset);
          return (
            <div key={asset.id} className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{asset.name}</div>
                  <div className="text-[10px] text-zinc-500">{asset.model}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openReport(asset)}>
                  Report
                </Button>
              </div>
              <TelemetryBar label="Health" value={telemetry.health} icon={HeartPulse} color="bg-red-500" />
              <TelemetryBar label="Shields" value={telemetry.shields} icon={Shield} color="bg-blue-500" />
              <TelemetryBar label="Fuel" value={telemetry.fuel} icon={Fuel} color="bg-amber-500" />
              <TelemetryBar label="Cargo" value={telemetry.cargo} icon={Package} color="bg-emerald-500" />
              <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                {telemetry.health >= 70 ? (
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-orange-400" />
                )}
                {asset.status}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Telemetry</DialogTitle>
          </DialogHeader>
          {telemetryForm && (
            <div className="space-y-3">
              <Input
                value={telemetryForm.health}
                onChange={(e) => setTelemetryForm((prev) => ({ ...prev, health: e.target.value }))}
                placeholder="Health %"
              />
              <Input
                value={telemetryForm.shields}
                onChange={(e) => setTelemetryForm((prev) => ({ ...prev, shields: e.target.value }))}
                placeholder="Shields %"
              />
              <Input
                value={telemetryForm.fuel}
                onChange={(e) => setTelemetryForm((prev) => ({ ...prev, fuel: e.target.value }))}
                placeholder="Fuel %"
              />
              <Input
                value={telemetryForm.cargo}
                onChange={(e) => setTelemetryForm((prev) => ({ ...prev, cargo: e.target.value }))}
                placeholder="Cargo %"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAsset(null)}>Cancel</Button>
            <Button onClick={submitReport}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
