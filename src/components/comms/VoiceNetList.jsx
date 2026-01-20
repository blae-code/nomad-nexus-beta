import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Archive, Users, Radio, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function VoiceNetList({ 
  nets = [], 
  netActivity = {}, 
  onEdit, 
  onDelete, 
  onArchive,
  isLoading = false 
}) {
  const [expandedNet, setExpandedNet] = useState(null);

  const getDisciplineColor = (discipline) => {
    return discipline === 'focused' ? 'text-red-400' : 'text-emerald-400';
  };

  const getTypeIcon = (type) => {
    const icons = {
      command: '⚡',
      squad: '👥',
      support: '🛠️',
      general: '📡'
    };
    return icons[type] || '📡';
  };

  const getActivityStatus = (netId) => {
    const activity = netActivity[netId];
    if (!activity) return { users: 0, transmitting: 0 };
    return activity;
  };

  return (
    <div className="space-y-3">
      {nets.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Radio className="w-12 h-12 mx-auto text-zinc-600 mb-4 opacity-50" />
            <p className="text-zinc-400 font-mono text-sm">No voice nets configured</p>
            <p className="text-zinc-600 text-xs mt-2">Create your first net to enable communications</p>
          </CardContent>
        </Card>
      ) : (
        nets.map((net) => {
          const activity = getActivityStatus(net.id);
          const isExpanded = expandedNet === net.id;
          const isActive = activity.users > 0;

          return (
            <Card key={net.id} className={cn(
              "bg-zinc-900 border transition-all cursor-pointer",
              isActive ? "border-emerald-700/50 shadow-lg shadow-emerald-950/30" : "border-zinc-800"
            )}>
              <div 
                onClick={() => setExpandedNet(isExpanded ? null : net.id)}
                className="p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTypeIcon(net.type)}</span>
                      <div>
                        <h3 className="font-bold text-lg text-white">{net.code}</h3>
                        <p className="text-sm text-zinc-400">{net.label}</p>
                      </div>
                      
                      {/* Status Badges */}
                      <div className="flex items-center gap-2 ml-auto">
                        {isActive && (
                          <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-700/50 animate-pulse">
                            ACTIVE
                          </Badge>
                        )}
                        {net.stage_mode && (
                          <Badge className="bg-amber-950/60 text-amber-400 border-amber-700/50">
                            STAGE MODE
                          </Badge>
                        )}
                        <Badge className={cn(
                          "text-[10px]",
                          net.discipline === 'focused' 
                            ? "bg-red-950/60 text-red-400 border-red-700/50"
                            : "bg-emerald-950/60 text-emerald-400 border-emerald-700/50"
                        )}>
                          {net.discipline.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-6 mt-3 text-xs text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{activity.users} users</span>
                      </div>
                      {activity.transmitting > 0 && (
                        <div className="flex items-center gap-1 text-red-400">
                          <Radio className="w-3 h-3 animate-pulse" />
                          <span>{activity.transmitting} transmitting</span>
                        </div>
                      )}
                      <div className="text-zinc-600">Type: {net.type}</div>
                      <div className="text-zinc-600">Priority: {net.priority}</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(net);
                      }}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/30"
                      title="Edit net"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchive(net.id);
                      }}
                      className="text-amber-400 hover:text-amber-300 hover:bg-amber-950/30"
                      title="Archive net"
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete ${net.code}? This cannot be undone.`)) {
                          onDelete(net.id);
                        }
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                      title="Delete net"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-zinc-800 px-4 py-4 bg-zinc-950/50 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-zinc-500 mb-1">Assigned Squad</p>
                      <p className="text-zinc-300 font-mono">
                        {net.linked_squad_id ? 'Linked' : 'None'}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 mb-1">Minimum RX Rank</p>
                      <p className="text-zinc-300">{net.min_rank_to_rx}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 mb-1">Minimum TX Rank</p>
                      <p className="text-zinc-300">{net.min_rank_to_tx}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 mb-1">Default for Squad</p>
                      <p className="text-zinc-300">{net.is_default_for_squad ? 'Yes' : 'No'}</p>
                    </div>
                  </div>

                  {net.allowed_role_tags && net.allowed_role_tags.length > 0 && (
                    <div>
                      <p className="text-zinc-500 text-xs mb-2">Allowed Roles</p>
                      <div className="flex flex-wrap gap-1">
                        {net.allowed_role_tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-[9px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {net.livekit_room_name && (
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">LiveKit Room</p>
                      <p className="text-zinc-300 font-mono text-[10px] break-all">{net.livekit_room_name}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}