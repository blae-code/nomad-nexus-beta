import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Radio, Loader2, MapPin, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function RescueForm({ onSuccess }) {
    const [formData, setFormData] = useState({
        type: "MEDICAL",
        location: "",
        description: ""
    });
    const [error, setError] = useState("");

    const rescueMutation = useMutation({
        mutationFn: async (data) => {
            const res = await base44.functions.invoke('handleRescueRequest', data);
            // Axios response structure: res.data contains the returned JSON
            if (res.data?.error) {
                throw new Error(res.data.error);
            }
            return res.data;
        },
        onSuccess: (data) => {
            if (onSuccess) onSuccess(data);
        },
        onError: (err) => {
            setError(err.message || "Failed to broadcast distress signal");
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");
        if (!formData.location) {
            setError("Location is required");
            return;
        }
        rescueMutation.mutate(formData);
    };

    return (
        <Card className="bg-black/50 border-red-900/50 backdrop-blur-sm max-w-md mx-auto relative overflow-hidden">
             {/* Scanner/Grid Effect Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
            
            <CardHeader className="border-b border-red-900/30 relative z-10">
                <div className="flex items-center gap-3 text-red-500 mb-1">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Emergency Uplink</span>
                </div>
                <CardTitle className="text-2xl font-black text-red-100 tracking-wide uppercase">
                    Request Rescue
                </CardTitle>
                <p className="text-xs font-mono text-red-400/70">
                    BROADCASTS TO ALL REDSCAR RESCUE UNITS
                </p>
            </CardHeader>

            <CardContent className="pt-6 space-y-4 relative z-10">
                {error && (
                    <div className="bg-red-950/50 border border-red-900 text-red-200 px-4 py-3 rounded text-xs font-mono flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Emergency Type</Label>
                    <Select 
                        value={formData.type} 
                        onValueChange={(v) => setFormData({...formData, type: v})}
                    >
                        <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-zinc-200 font-mono">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="MEDICAL">MEDICAL (INJURY/INCAP)</SelectItem>
                            <SelectItem value="FUEL">FUEL (STRANDED)</SelectItem>
                            <SelectItem value="REPAIR">REPAIR (SHIP CRITICAL)</SelectItem>
                            <SelectItem value="TRANSPORT">TRANSPORT (EXTRACTION)</SelectItem>
                            <SelectItem value="COMBAT_ASSIST">COMBAT ASSIST (HOT)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Location / Grid</Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                        <Input 
                            placeholder="E.G. DAYMAR OM-1 / BUNKER 4" 
                            className="pl-9 bg-zinc-900/50 border-zinc-800 font-mono text-zinc-200 uppercase placeholder:text-zinc-700"
                            value={formData.location}
                            onChange={(e) => setFormData({...formData, location: e.target.value})}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Situation Report</Label>
                    <Textarea 
                        placeholder="DESCRIBE THREAT LEVEL, HOSTILES, URGENCY..." 
                        className="bg-zinc-900/50 border-zinc-800 font-mono text-zinc-200 min-h-[100px] uppercase placeholder:text-zinc-700"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                </div>
            </CardContent>

            <CardFooter className="relative z-10 pb-6">
                <Button 
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest border border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)] h-12 group"
                    onClick={handleSubmit}
                    disabled={rescueMutation.isPending}
                >
                    {rescueMutation.isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            BROADCASTING...
                        </>
                    ) : (
                        <>
                            <Radio className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                            BROADCAST BEACON
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}