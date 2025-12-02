import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Activity, Crosshair, Headphones, Clock, ShieldCheck } from "lucide-react";
import { hasRole } from "@/components/permissions";

export default function ActiveRescueList({ user }) {
    const isRescuer = hasRole(user, 'Redscar Rescue') || user?.rank === 'Pioneer';

    const { data: activeBeacons, refetch } = useQuery({
        queryKey: ['active-rescues'],
        queryFn: () => base44.entities.RescueRequest.list({
            filter: { status: 'ACTIVE' },
            sort: { created_date: -1 }
        }),
        refetchInterval: 5000
    });

    // Join Voice Mutation
    const joinVoiceMutation = useMutation({
        mutationFn: async ({ roomName }) => {
             const { data } = await base44.functions.invoke('generateLiveKitToken', {
                roomName: roomName,
                userRole: user.rank,
                userName: user.rsi_handle || user.full_name
             });
             return data.token;
        },
        onSuccess: (token) => {
             // Simulation
             console.log("Token received:", token);
             alert("CONNECTING TO RESCUE NET... (Simulation)");
        }
    });

    if (!activeBeacons?.length) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-red-500 animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">
                    Active Distress Beacons
                </h3>
            </div>

            <div className="grid gap-4">
                {activeBeacons.map(beacon => (
                    <Card key={beacon.id} className="bg-zinc-900 border-l-4 border-l-red-500 border-y-0 border-r-0 rounded-none overflow-hidden">
                        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Badge variant="destructive" className="animate-pulse font-mono text-[10px] uppercase">
                                        {beacon.type}
                                    </Badge>
                                    <span className="text-xs font-mono text-zinc-500">
                                        {new Date(beacon.created_date).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-200 font-bold uppercase text-sm">
                                    <MapPin className="w-4 h-4 text-red-500" />
                                    {beacon.location}
                                </div>
                                <p className="text-xs text-zinc-400 font-mono max-w-lg">
                                    {beacon.description}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                {isRescuer && (
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="border-red-900 text-red-500 hover:bg-red-950 hover:text-red-400 font-mono text-xs h-8"
                                    >
                                        <Crosshair className="w-3 h-3 mr-2" />
                                        RESPOND
                                    </Button>
                                )}
                                <Button 
                                    size="sm" 
                                    className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs h-8"
                                    onClick={() => joinVoiceMutation.mutate({ roomName: beacon.livekit_room_name })}
                                >
                                    <Headphones className="w-3 h-3 mr-2" />
                                    COMMS LINK
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}