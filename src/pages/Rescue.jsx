import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import RescueForm from "@/components/rescue/RescueForm";
import ActiveRescueList from "@/components/rescue/ActiveRescueList";
import { Shield, AlertCircle, CheckCircle2, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useVisibilityPause } from "@/components/hooks/useVisibilityPause";
import { SkeletonLoader } from "@/components/feedback/SkeletonLoader";
import { EmptyStateCard, EmptyStateMessages } from "@/components/feedback/EmptyStateCard";
import { ErrorStateCard } from "@/components/feedback/ErrorStateCard";
import { PanelHeader } from "@/components/layout/PanelHeader";

export default function RescuePage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [requestSuccess, setRequestSuccess] = useState(null);
    const isTabVisible = useVisibilityPause();

    useQuery({
        queryKey: ['rescue-user'],
        queryFn: () => base44.auth.me().then(u => {
            setCurrentUser(u);
            return u;
        }),
        enabled: isTabVisible,
        staleTime: 60000
    });

    // Handle Success from Form
    const handleRequestSuccess = (data) => {
        setRequestSuccess(data);
    };

    return (
        <div className="h-full w-full bg-black text-zinc-200 font-sans flex flex-col overflow-hidden relative">
            
            {/* Background FX */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                 style={{ 
                     backgroundImage: 'repeating-linear-gradient(45deg, #111 25%, transparent 25%, transparent 75%, #111 75%, #111), repeating-linear-gradient(45deg, #111 25%, #09090b 25%, #09090b 75%, #111 75%, #111)',
                     backgroundPosition: '0 0, 10px 10px',
                     backgroundSize: '20px 20px'
                 }} 
            />

            <header className="p-6 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur z-10 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-red-600/20 p-2 rounded border border-red-900/50">
                        <Shield className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-widest text-white">Rescue Operations</h1>
                        <p className="text-xs font-mono text-zinc-500">EMERGENCY RESPONSE & DISPATCH</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">System Status</div>
                    <div className="text-emerald-500 font-bold text-xs flex items-center justify-end gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        ONLINE
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-6 relative z-10">
                <div className="max-w-4xl mx-auto space-y-8">
                    
                    {/* ACTIVE BEACONS (Visible to all, actionable by Rescuers) */}
                    <ActiveRescueList user={currentUser} />

                    {/* REQUEST FORM OR SUCCESS STATE */}
                    <div className="mt-8">
                        <AnimatePresence mode="wait">
                            {requestSuccess ? (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-emerald-950/20 border border-emerald-900/50 p-8 rounded max-w-md mx-auto text-center space-y-4"
                                >
                                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                                    <div>
                                        <h2 className="text-xl font-bold text-white uppercase tracking-wider">Signal Broadcasted</h2>
                                        <p className="text-zinc-400 text-sm mt-2">Rescue units have been notified of your coordinates.</p>
                                    </div>
                                    
                                    <div className="bg-black/50 p-4 rounded border border-zinc-800 font-mono text-xs text-left space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">TICKET ID:</span>
                                            <span className="text-emerald-400">{requestSuccess.ticketId}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-zinc-500">COMMS CHANNEL:</span>
                                            <span className="text-emerald-400">{requestSuccess.roomName}</span>
                                        </div>
                                    </div>

                                    <Button 
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => {
                                            // Join room simulation
                                            alert(`Connecting to ${requestSuccess.roomName} using token...`);
                                        }}
                                    >
                                        <Headphones className="w-4 h-4 mr-2" />
                                        OPEN COMMS LINK
                                    </Button>
                                    
                                    <Button 
                                        variant="ghost" 
                                        className="text-xs text-zinc-500 hover:text-white"
                                        onClick={() => setRequestSuccess(null)}
                                    >
                                        Submit New Request
                                    </Button>
                                </motion.div>
                            ) : (
                                <RescueForm onSuccess={handleRequestSuccess} />
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Instructions */}
                    <div className="text-center text-zinc-600 text-[10px] font-mono max-w-lg mx-auto">
                        WARNING: ABUSE OF EMERGENCY FREQUENCIES WILL RESULT IN IMMEDIATE RANK DEMOTION.
                        <br/>ONLY USE FOR GENUINE DISTRESS SCENARIOS.
                    </div>
                </div>
            </main>
        </div>
    );
}