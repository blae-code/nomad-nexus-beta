import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from "react-leaflet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Radio, AlertTriangle, Users, Send, Target, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

export default function TacticalMapPanel({ eventId, nets = [], userPresence = [], voiceNetStatus = [] }) {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [commandText, setCommandText] = useState("");
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]);
  const queryClient = useQueryClient();

  // Fetch users with location data
  const { data: users = [] } = useQuery({
    queryKey: ['tactical-users'],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 5000
  });

  // Fetch AI-detected anomalies
  const { data: anomalies = [] } = useQuery({
    queryKey: ['tactical-anomalies', eventId],
    queryFn: () => base44.entities.EventLog.filter({ 
      event_id: eventId, 
      severity: 'HIGH',
      type: 'COMMS'
    }),
    enabled: !!eventId,
    refetchInterval: 10000
  });

  // Send command mutation
  const sendCommandMutation = useMutation({
    mutationFn: async ({ targetId, targetType, message }) => {
      await base44.functions.invoke('sendTacticalCommand', {
        targetId,
        targetType,
        message,
        eventId
      });
    },
    onSuccess: () => {
      setCommandText("");
      setSelectedUnit(null);
    }
  });

  // Generate user markers with comms status
  const getUserMarkers = () => {
    return users
      .filter(u => u.last_known_position)
      .map(user => {
        const presence = userPresence.find(p => p.user_id === user.id);
        const isTransmitting = presence?.is_transmitting;
        const currentNet = presence?.current_net;

        return {
          id: user.id,
          type: 'user',
          position: [user.last_known_position.lat, user.last_known_position.lng],
          user,
          presence,
          isTransmitting,
          currentNet
        };
      });
  };

  // Generate net coverage areas
  const getNetCoverageAreas = () => {
    return nets.map(net => {
      const netStatus = voiceNetStatus.find(s => s.net_id === net.id);
      const usersOnNet = userPresence.filter(p => p.net_id === net.id);
      
      if (usersOnNet.length === 0) return null;

      // Calculate center from users
      const positions = usersOnNet
        .map(p => {
          const u = users.find(user => user.id === p.user_id);
          return u?.last_known_position;
        })
        .filter(Boolean);

      if (positions.length === 0) return null;

      const centerLat = positions.reduce((sum, p) => sum + p.lat, 0) / positions.length;
      const centerLng = positions.reduce((sum, p) => sum + p.lng, 0) / positions.length;

      return {
        id: net.id,
        net,
        center: [centerLat, centerLng],
        radius: 500 + (usersOnNet.length * 100),
        status: netStatus,
        userCount: usersOnNet.length
      };
    }).filter(Boolean);
  };

  // Get AI threat markers
  const getThreatMarkers = () => {
    return anomalies
      .filter(a => a.details?.location)
      .map(anomaly => ({
        id: anomaly.id,
        type: 'threat',
        position: [anomaly.details.location.lat, anomaly.details.location.lng],
        anomaly
      }));
  };

  const userMarkers = getUserMarkers();
  const netAreas = getNetCoverageAreas();
  const threatMarkers = getThreatMarkers();

  const handleSendCommand = () => {
    if (!selectedUnit || !commandText) return;
    sendCommandMutation.mutate({
      targetId: selectedUnit.id,
      targetType: selectedUnit.type,
      message: commandText
    });
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#ea580c]" />
          <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 font-mono">
            TACTICAL MAP
          </span>
        </div>
        <div className="flex gap-1">
          <div className="text-[7px] font-mono text-zinc-600">
            {userMarkers.length} UNITS
          </div>
          <div className="w-px h-3 bg-zinc-800" />
          <div className="text-[7px] font-mono text-zinc-600">
            {netAreas.length} NETS
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%', background: '#09090b' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Net Coverage Areas */}
          {netAreas.map(area => {
            const isJammed = area.status?.is_jammed;
            const signalStrength = area.status?.signal_strength || 100;
            
            let color = '#10b981'; // emerald
            if (isJammed) color = '#ef4444'; // red
            else if (signalStrength < 50) color = '#f59e0b'; // amber

            return (
              <Circle
                key={area.id}
                center={area.center}
                radius={area.radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.1,
                  weight: 2,
                  dashArray: '5, 5'
                }}
              >
                <Popup>
                  <div className="text-xs font-mono">
                    <div className="font-bold">{area.net.code}</div>
                    <div className="text-[10px] text-zinc-600">{area.net.label}</div>
                    <div className="text-[10px] mt-1">Users: {area.userCount}</div>
                    {isJammed && (
                      <div className="text-[10px] text-red-500 mt-1">⚠ JAMMED</div>
                    )}
                  </div>
                </Popup>
              </Circle>
            );
          })}

          {/* User Markers */}
          {userMarkers.map(marker => {
            const icon = L.divIcon({
              className: 'custom-marker',
              html: `
                <div class="relative">
                  <div class="${cn(
                    'w-3 h-3 rounded-full border-2',
                    marker.isTransmitting 
                      ? 'bg-[#ea580c] border-[#ea580c] animate-pulse shadow-[0_0_12px_rgba(234,88,12,0.8)]' 
                      : 'bg-emerald-500 border-emerald-700'
                  )}"></div>
                  ${marker.isTransmitting ? `
                    <div class="absolute -top-1 -right-1 w-2 h-2 bg-[#ea580c] rounded-full animate-ping"></div>
                  ` : ''}
                </div>
              `,
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            });

            return (
              <Marker
                key={marker.id}
                position={marker.position}
                icon={icon}
                eventHandlers={{
                  click: () => setSelectedUnit(marker)
                }}
              >
                <Popup>
                  <div className="text-xs font-mono">
                    <div className="font-bold">{marker.user.callsign || marker.user.email}</div>
                    <div className="text-[10px] text-zinc-600">{marker.user.rank}</div>
                    {marker.currentNet && (
                      <div className="text-[10px] mt-1 text-emerald-500">
                        NET: {marker.currentNet.code}
                      </div>
                    )}
                    {marker.isTransmitting && (
                      <div className="text-[10px] text-[#ea580c] mt-1">⚡ TRANSMITTING</div>
                    )}
                    <button
                      onClick={() => setSelectedUnit(marker)}
                      className="mt-2 w-full text-[9px] bg-[#ea580c] text-white px-2 py-1 rounded"
                    >
                      SEND COMMAND
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Threat Markers */}
          {threatMarkers.map(threat => {
            const icon = L.divIcon({
              className: 'threat-marker',
              html: `
                <div class="relative">
                  <div class="w-4 h-4 bg-red-500 border-2 border-red-700 animate-pulse shadow-[0_0_16px_rgba(239,68,68,0.8)]" 
                       style="transform: rotate(45deg);"></div>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <div class="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                </div>
              `,
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            });

            return (
              <Marker
                key={threat.id}
                position={threat.position}
                icon={icon}
              >
                <Popup>
                  <div className="text-xs font-mono">
                    <div className="font-bold text-red-500">⚠ THREAT DETECTED</div>
                    <div className="text-[10px] mt-1">{threat.anomaly.summary}</div>
                    <div className="text-[10px] text-zinc-600 mt-1">
                      {new Date(threat.anomaly.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Transmission Lines */}
          {userMarkers
            .filter(m => m.isTransmitting)
            .map(transmitter => {
              const netArea = netAreas.find(a => a.id === transmitter.presence?.net_id);
              if (!netArea) return null;

              return (
                <Polyline
                  key={`tx-${transmitter.id}`}
                  positions={[transmitter.position, netArea.center]}
                  pathOptions={{
                    color: '#ea580c',
                    weight: 2,
                    opacity: 0.6,
                    dashArray: '5, 10'
                  }}
                />
              );
            })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-zinc-950/90 border border-zinc-800 p-2 space-y-1">
          <div className="text-[7px] uppercase font-bold text-zinc-600 mb-2 font-mono tracking-widest">
            LEGEND
          </div>
          <div className="flex items-center gap-2 text-[8px] font-mono text-zinc-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span>ACTIVE</span>
          </div>
          <div className="flex items-center gap-2 text-[8px] font-mono text-[#ea580c]">
            <div className="w-2 h-2 rounded-full bg-[#ea580c] animate-pulse"></div>
            <span>TX</span>
          </div>
          <div className="flex items-center gap-2 text-[8px] font-mono text-red-500">
            <div className="w-2 h-2 bg-red-500 transform rotate-45"></div>
            <span>THREAT</span>
          </div>
        </div>
      </div>

      {/* Command Interface */}
      {selectedUnit && (
        <div className="border-t border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[9px] uppercase font-bold text-zinc-400 font-mono flex items-center gap-2">
              <Send className="w-3 h-3 text-[#ea580c]" />
              COMMAND TARGET
            </div>
            <button
              onClick={() => setSelectedUnit(null)}
              className="text-zinc-600 hover:text-zinc-400 text-xs"
            >
              ×
            </button>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 p-2">
            <div className="text-[10px] font-mono text-zinc-300 mb-1">
              {selectedUnit.type === 'user' 
                ? selectedUnit.user.callsign || selectedUnit.user.email
                : selectedUnit.net?.code}
            </div>
            {selectedUnit.currentNet && (
              <div className="text-[8px] font-mono text-zinc-600">
                NET: {selectedUnit.currentNet.code}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter command..."
              value={commandText}
              onChange={e => setCommandText(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSendCommand()}
              className="bg-zinc-950 border-zinc-800 h-7 text-xs font-mono"
            />
            <Button
              onClick={handleSendCommand}
              disabled={!commandText || sendCommandMutation.isPending}
              className="h-7 px-3 bg-[#ea580c] hover:bg-[#c2410c] text-xs"
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setCommandText("STATUS CHECK")}
              className="text-[8px] px-2 py-1 border border-zinc-800 text-zinc-400 hover:border-zinc-700 font-mono"
            >
              STATUS
            </button>
            <button
              onClick={() => setCommandText("HOLD POSITION")}
              className="text-[8px] px-2 py-1 border border-zinc-800 text-zinc-400 hover:border-zinc-700 font-mono"
            >
              HOLD
            </button>
            <button
              onClick={() => setCommandText("RALLY TO WAYPOINT")}
              className="text-[8px] px-2 py-1 border border-zinc-800 text-zinc-400 hover:border-zinc-700 font-mono"
            >
              RALLY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}