import React, { useState, useEffect } from 'react';
import { Target, X, Plus, MapPin, Users as UsersIcon, Ship } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function HolographicMissionDirector({ widgetId, onRemove, isDragging }) {
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [view3D, setView3D] = useState(true);

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      const events = await base44.entities.Event.filter({ status: 'active' }, '-updated_date', 5);
      setMissions(events || []);
    } catch (err) {
      console.error('Mission load failed:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.08)_0%,transparent_70%)] pointer-events-none animate-pulse" />
      
      {/* Header */}
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Mission Director</span>
          <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setView3D(!view3D)}
            className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
          >
            <MapPin className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onRemove}
            className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* 3D View */}
      {view3D ? (
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-48 h-48">
              {/* Orbital rings */}
              <div className="absolute inset-0 border-2 border-red-700/20 rounded-full animate-spin" style={{ animationDuration: '20s' }} />
              <div className="absolute inset-4 border border-red-700/10 rounded-full animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
              <div className="absolute inset-8 border border-red-700/5 rounded-full animate-spin" style={{ animationDuration: '10s' }} />
              
              {/* Center target */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <Target className="w-6 h-6 text-red-500" />
                </div>
              </div>

              {/* Mission markers */}
              {missions.slice(0, 4).map((mission, i) => {
                const angle = (i / 4) * 2 * Math.PI;
                const radius = 70;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                return (
                  <div
                    key={mission.id}
                    className="absolute w-6 h-6 -ml-3 -mt-3 cursor-pointer group"
                    style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
                    onClick={() => setSelectedMission(mission)}
                  >
                    <div className="w-full h-full border border-orange-500 rounded-sm flex items-center justify-center bg-orange-500/10 group-hover:bg-orange-500/30 transition-all">
                      <Ship className="w-3 h-3 text-orange-500" />
                    </div>
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {mission.title?.substring(0, 15)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected mission overlay */}
          {selectedMission && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/90 border-t border-red-700/40 p-3 backdrop-blur-md">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">{selectedMission.title}</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{selectedMission.location || 'Sector Unknown'}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSelectedMission(null)}
                  className="h-5 w-5 text-zinc-600 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex items-center gap-3 text-[9px]">
                <span className="flex items-center gap-1 text-zinc-500">
                  <UsersIcon className="w-2.5 h-2.5" />
                  {selectedMission.assigned_member_profile_ids?.length || 0}
                </span>
                <span className="flex items-center gap-1 text-zinc-500">
                  <Ship className="w-2.5 h-2.5" />
                  {selectedMission.assigned_asset_ids?.length || 0}
                </span>
                <span className={`px-1.5 py-0.5 rounded uppercase font-bold ${
                  selectedMission.priority === 'CRITICAL' ? 'bg-red-950/40 text-red-400' :
                  selectedMission.priority === 'HIGH' ? 'bg-orange-950/40 text-orange-400' :
                  'bg-zinc-900/40 text-zinc-500'
                }`}>
                  {selectedMission.priority}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
          {missions.map(mission => (
            <div
              key={mission.id}
              className="p-2 bg-zinc-900/40 border border-zinc-700/40 hover:border-red-700/60 rounded cursor-pointer transition-all"
              onClick={() => setSelectedMission(mission)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-red-400">{mission.title}</h4>
                  <p className="text-[9px] text-zinc-500 mt-0.5">{mission.location}</p>
                </div>
                <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${
                  mission.priority === 'CRITICAL' ? 'bg-red-950/40 text-red-400' : 'bg-zinc-900/40 text-zinc-500'
                }`}>
                  {mission.priority}
                </span>
              </div>
            </div>
          ))}
          {missions.length === 0 && (
            <div className="text-center py-6 text-[10px] text-zinc-600 uppercase tracking-wider">
              No active missions
            </div>
          )}
        </div>
      )}

      {/* Quick Add */}
      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm relative z-10">
        <Button size="sm" variant="outline" className="w-full h-7 text-xs border-red-700/40 hover:border-red-500/60">
          <Plus className="w-3 h-3 mr-1" /> New Mission
        </Button>
      </div>
    </div>
  );
}