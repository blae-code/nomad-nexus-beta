import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Archive, Users, Radio, AlertCircle, Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function VoiceNetList({ 
  nets = [], 
  netActivity = {}, 
  onEdit, 
  onDelete, 
  onArchive,
  onBulkArchive,
  onBulkDelete,
  onSetDefault,
  isLoading = false,
  filters = {}
}) {
  const [expandedNet, setExpandedNet] = useState(null);
  const [selectedNets, setSelectedNets] = useState(new Set());

  // Apply filters
  const filteredNets = useMemo(() => {
    return nets.filter(net => {
      if (filters.search && !net.code.toLowerCase().includes(filters.search.toLowerCase()) && 
          !net.label.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.type?.length && !filters.type.includes(net.type)) return false;
      if (filters.discipline?.length && !filters.discipline.includes(net.discipline)) return false;
      if (filters.squads?.length && !filters.squads.includes(net.linked_squad_id)) return false;
      if (filters.stageMode && !net.stage_mode) return false;
      if (filters.isDefault && !net.is_default_for_squad) return false;
      return true;
    });
  }, [nets, filters]);

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

  const toggleNetSelection = (netId) => {
    const newSelected = new Set(selectedNets);
    if (newSelected.has(netId)) {
      newSelected.delete(netId);
    } else {
      newSelected.add(netId);
    }
    setSelectedNets(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedNets.size === filteredNets.length) {
      setSelectedNets(new Set());
    } else {
      setSelectedNets(new Set(filteredNets.map(n => n.id)));
    }
  };

  const handleBulkArchive = () => {
    if (selectedNets.size === 0) return;
    if (confirm(`Archive ${selectedNets.size} net(s)? This action can be undone.`)) {
      onBulkArchive?.(Array.from(selectedNets));
      setSelectedNets(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedNets.size === 0) return;
    if (confirm(`Delete ${selectedNets.size} net(s)? This cannot be undone.`)) {
      onBulkDelete?.(Array.from(selectedNets));
      setSelectedNets(new Set());
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedNets.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-[#ea580c]/10 border border-[#ea580c]/30 rounded">
          <span className="text-sm font-semibold text-[#ea580c]">
            {selectedNets.size} net(s) selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkArchive}
              className="text-amber-400 hover:text-amber-300 text-xs"
            >
              <Archive className="w-3 h-3 mr-1" />
              Archive Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkDelete}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete Selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedNets(new Set())}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Net List */}
      <div className="space-y-3">
        {filteredNets.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-12 text-center">
              <Radio className="w-12 h-12 mx-auto text-zinc-600 mb-4 opacity-50" />
              <p className="text-zinc-400 font-mono text-sm">
                {nets.length === 0 ? 'No voice nets configured' : 'No nets match your filters'}
              </p>
              <p className="text-zinc-600 text-xs mt-2">
                {nets.length === 0 ? 'Create your first net to enable communications' : 'Try adjusting your filter criteria'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400">
              <button
                onClick={toggleAllSelection}
                className={cn(
                  'w-4 h-4 border rounded flex items-center justify-center transition-colors',
                  selectedNets.size === filteredNets.length
                    ? 'bg-[#ea580c] border-[#ea580c]'
                    : 'border-zinc-600 hover:border-[#ea580c]'
                )}
              >
                {selectedNets.size === filteredNets.length && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </button>
              <span className="text-xs">
                {selectedNets.size === filteredNets.length ? 'Deselect All' : 'Select All'}
              </span>
            </div>

            {/* Nets */}
            {filteredNets.map((net) => {
              const activity = getActivityStatus(net.id);
              const isExpanded = expandedNet === net.id;
              const isActive = activity.users > 0;
              const isSelected = selectedNets.has(net.id);

              return (
                <Card key={net.id} className={cn(
                  "bg-zinc-900 border transition-all cursor-pointer",
                  isActive ? "border-emerald-700/50 shadow-lg shadow-emerald-950/30" : "border-zinc-800",
                  isSelected && "border-[#ea580c] shadow-lg shadow-[#ea580c]/20"
                )}>
                  <div 
                    onClick={() => setExpandedNet(isExpanded ? null : net.id)}
                    className="p-4"
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNetSelection(net.id);
                        }}
                        className={cn(
                          'w-5 h-5 border rounded flex items-center justify-center transition-colors shrink-0',
                          isSelected
                            ? 'bg-[#ea580c] border-[#ea580c]'
                            : 'border-zinc-600 hover:border-[#ea580c]'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>

                      {/* Net Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl shrink-0">{getTypeIcon(net.type)}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg text-white truncate">{net.code}</h3>
                              {net.is_default_for_squad && (
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-zinc-400 truncate">{net.label}</p>
                          </div>

                          {/* Status Badges */}
                          <div className="flex items-center gap-2 ml-auto shrink-0">
                            {isActive && (
                              <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-700/50 animate-pulse text-xs">
                                ACTIVE
                              </Badge>
                            )}
                            {net.stage_mode && (
                              <Badge className="bg-amber-950/60 text-amber-400 border-amber-700/50 text-xs">
                                STAGE
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
                      <div className="flex items-center gap-2 shrink-0">
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
                          <div className="flex items-center gap-2">
                            <p className="text-zinc-300">{net.is_default_for_squad ? 'Yes' : 'No'}</p>
                            {!net.is_default_for_squad && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSetDefault?.(net.id);
                                }}
                                className="text-xs h-6 text-amber-400 hover:text-amber-300"
                              >
                                <Star className="w-3 h-3 mr-1" />
                                Set Default
                              </Button>
                            )}
                          </div>
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
            })}
          </>
        )}
      </div>
    </div>
  );
}