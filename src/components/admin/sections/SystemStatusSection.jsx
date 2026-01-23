import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, AlertCircle, Cable } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const StatusCard = ({ label, status, detail }) => (
  <div className={cn(
    'p-2 border text-[8px]',
    status === 'ok'
      ? 'bg-green-950/40 border-green-800/50'
      : status === 'warn'
      ? 'bg-yellow-950/40 border-yellow-800/50'
      : 'bg-red-950/40 border-red-800/50'
  )}>
    <div className="flex items-center gap-1.5">
      {status === 'ok' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
      {status === 'warn' && <AlertCircle className="w-3 h-3 text-yellow-400" />}
      {status === 'error' && <AlertCircle className="w-3 h-3 text-red-400" />}
      <span className="font-bold">{label}</span>
    </div>
    <p className={cn(
      'text-[7px] mt-0.5 ml-4.5',
      status === 'ok' ? 'text-green-300' :
      status === 'warn' ? 'text-yellow-300' :
      'text-red-300'
    )}>
      {detail}
    </p>
  </div>
);

export default function SystemStatusSection() {
  const [integrations, setIntegrations] = useState([
    { name: 'LiveKit', status: 'ok', detail: 'URL & Key configured' },
    { name: 'File Upload', status: 'ok', detail: 'Storage operational' },
    { name: 'Realtime Subs', status: 'ok', detail: 'WebSocket healthy' },
  ]);

  const diagnostics = [
    { label: 'Last Error', value: 'None', status: 'ok' },
    { label: 'Network Req/min', value: '~45', status: 'ok' },
    { label: 'Active Subscriptions', value: '3', status: 'ok' },
    { label: 'Polling Status', value: 'Nominal', status: 'ok' },
  ];

  return (
    <div className="space-y-3 p-3 bg-zinc-950/50 border border-zinc-800">
      {/* Integrations */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase text-zinc-400 flex items-center gap-1">
          <Cable className="w-3 h-3" />
          Integrations
        </label>
        <div className="space-y-1">
          {integrations.map((integration, idx) => (
            <StatusCard key={idx} {...integration} />
          ))}
        </div>
      </div>

      {/* Diagnostics */}
      <div className="border-t border-zinc-800 pt-3 space-y-2">
        <label className="text-xs font-mono uppercase text-zinc-400">
          Basic Diagnostics
        </label>
        <div className="grid grid-cols-2 gap-1">
          {diagnostics.map((diag, idx) => (
            <div
              key={idx}
              className="p-1.5 bg-zinc-900/50 border border-zinc-800 text-[7px]"
            >
              <div className="text-zinc-500">{diag.label}</div>
              <div className="font-mono font-bold text-zinc-300">{diag.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Health Summary */}
      <div className="border-t border-zinc-800 pt-3">
        <div className="p-2 bg-zinc-900/50 border border-zinc-800 text-[8px]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            <span className="font-bold text-green-300">System Health</span>
            <Badge className="text-[7px] bg-green-900/40 text-green-300 border-green-700/50">
              NOMINAL
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}