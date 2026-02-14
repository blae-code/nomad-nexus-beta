import React from 'react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';

export default function AIFeatureToggle({
  label = 'AI Features',
  description = '',
  className = '',
}) {
  const {
    aiFeaturesEnabled,
    aiFeaturesUpdating,
    aiFeaturesError,
    setAiFeaturesEnabled,
  } = useAuth();

  const enabled = aiFeaturesEnabled !== false;

  return (
    <div className={cn('rounded border border-zinc-800 bg-zinc-900/45 px-2.5 py-2', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</div>
          {description ? <div className="text-[11px] text-zinc-400">{description}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${enabled ? 'text-emerald-300' : 'text-zinc-500'}`}>
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
          <Switch
            checked={enabled}
            disabled={aiFeaturesUpdating}
            onCheckedChange={(checked) => {
              void setAiFeaturesEnabled(Boolean(checked));
            }}
            aria-label="Toggle AI features"
          />
        </div>
      </div>
      {aiFeaturesError ? (
        <div className="mt-1 text-[11px] text-red-300">{aiFeaturesError}</div>
      ) : null}
    </div>
  );
}
