import React from 'react';
import { BarChart3, Users, Ship, AlertTriangle } from 'lucide-react';

export default function ReportPreview({ report }) {
  return (
    <div className="bg-zinc-900/50 border-2 border-zinc-800 rounded p-6 space-y-6">
      {/* Summary Cards */}
      {report.summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-blue-950/30 border border-blue-600/50 rounded">
            <div className="text-xs text-blue-400 mb-1">OPERATIONS</div>
            <div className="text-3xl font-black text-blue-300">{report.summary.total_operations}</div>
          </div>
          <div className="p-4 bg-purple-950/30 border border-purple-600/50 rounded">
            <div className="text-xs text-purple-400 mb-1">MEMBERS</div>
            <div className="text-3xl font-black text-purple-300">{report.summary.total_members}</div>
          </div>
          <div className="p-4 bg-green-950/30 border border-green-600/50 rounded">
            <div className="text-xs text-green-400 mb-1">ASSETS</div>
            <div className="text-3xl font-black text-green-300">{report.summary.total_assets}</div>
          </div>
        </div>
      )}

      {/* Operations Section */}
      {report.events && report.events.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-blue-400 uppercase flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Operations ({report.events.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {report.events.map((event) => (
              <div key={event.id} className="p-3 bg-blue-950/20 border border-blue-600/30 rounded text-sm">
                <div className="font-bold text-blue-300">{event.title}</div>
                <div className="text-xs text-blue-200 mt-1">
                  {event.event_type} • {event.status} • {event.priority}
                </div>
                <div className="text-xs text-blue-100 mt-1">
                  👥 {event.assigned_user_ids?.length || 0} members • 🚢 {event.assigned_asset_ids?.length || 0} assets
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members Section */}
      {report.members && report.members.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-purple-400 uppercase flex items-center gap-2">
            <Users className="w-4 h-4" />
            Members ({report.members.length})
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {report.members.map((member) => (
              <div key={member.id} className="p-3 bg-purple-950/20 border border-purple-600/30 rounded text-sm">
                <div className="font-bold text-purple-300">{member.full_name}</div>
                <div className="text-xs text-purple-200 mt-1">
                  {member.rank} • {member.roles?.join(', ') || 'No roles'}
                </div>
                <div className="text-xs text-purple-100">Operations: {member.operations_count || 0}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assets Section */}
      {report.assets && report.assets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-green-400 uppercase flex items-center gap-2">
            <Ship className="w-4 h-4" />
            Fleet Assets ({report.assets.length})
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {report.assets.map((asset) => (
              <div key={asset.id} className="p-3 bg-green-950/20 border border-green-600/30 rounded text-sm">
                <div className="font-bold text-green-300">{asset.name}</div>
                <div className="text-xs text-green-200 mt-1">{asset.model}</div>
                <div className="flex justify-between text-xs text-green-100 mt-1">
                  <span>{asset.status}</span>
                  <span>{asset.deployments || 0} deployments</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      {report.risk_assessment && (
        <div className="p-4 bg-orange-950/30 border border-orange-600/50 rounded space-y-2">
          <h3 className="text-sm font-bold text-orange-400 uppercase flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Risk Summary
          </h3>
          <div className="text-sm text-orange-200">{report.risk_assessment}</div>
        </div>
      )}
    </div>
  );
}