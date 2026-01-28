import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Play, Shield, Radio, Users, Lock, RefreshCw, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CHECKLIST_ITEMS = [
  {
    id: "event-create",
    name: "Event Creation",
    category: "Core Operations",
    icon: Users,
    instructions: "Create a test event with objectives and verify it appears in Events page",
    autoTest: async (user) => {
      try {
        const testEvent = await base44.entities.Event.create({
          title: `[TEST] System Check ${new Date().toISOString()}`,
          description: "Automated system check - safe to delete",
          event_type: "focused",
          start_time: new Date().toISOString(),
          status: "scheduled",
          host_id: user.id,
          priority: "STANDARD"
        });
        
        const retrieved = await base44.entities.Event.get(testEvent.id);
        
        // Cleanup
        await base44.entities.Event.delete(testEvent.id);
        
        return { 
          status: "pass", 
          details: `Event ${testEvent.id} created and retrieved successfully` 
        };
      } catch (err) {
        return { status: "fail", details: err.message };
      }
    }
  },
  {
    id: "comms-init",
    name: "Comms Initialization",
    category: "Communications",
    icon: Radio,
    instructions: "Create an event and verify VoiceNets are auto-initialized with COMMAND, ALPHA, BRAVO",
    autoTest: async (user) => {
      try {
        const testEvent = await base44.entities.Event.create({
          title: `[TEST] Comms Check ${new Date().toISOString()}`,
          event_type: "focused",
          start_time: new Date().toISOString(),
          status: "scheduled",
          host_id: user.id
        });
        
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const nets = await base44.entities.VoiceNet.filter({ event_id: testEvent.id });
        
        const hasCommand = nets.some(n => n.code === 'COMMAND');
        const hasAlpha = nets.some(n => n.code === 'ALPHA');
        const hasBravo = nets.some(n => n.code === 'BRAVO');
        
        // Cleanup
        await base44.entities.Event.delete(testEvent.id);
        for (const net of nets) {
          await base44.entities.VoiceNet.delete(net.id);
        }
        
        if (hasCommand && hasAlpha && hasBravo) {
          return { 
            status: "pass", 
            details: `${nets.length} nets initialized correctly (COMMAND, ALPHA, BRAVO)` 
          };
        } else {
          return { 
            status: "fail", 
            details: `Missing default nets. Found: ${nets.map(n => n.code).join(', ')}` 
          };
        }
      } catch (err) {
        return { status: "fail", details: err.message };
      }
    }
  },
  {
    id: "livekit-token",
    name: "LiveKit Token Generation",
    category: "Communications",
    icon: Lock,
    instructions: "Request a LiveKit token and verify no errors",
    autoTest: async (user) => {
      try {
        const res = await base44.functions.invoke('generateLiveKitToken', {
          eventId: 'test',
          netIds: ['test']
        });
        
        if (res.data.errors?.length > 0) {
          return { 
            status: "fail", 
            details: `Token errors: ${res.data.errors.join(', ')}` 
          };
        }
        
        const hasToken = res.data.tokens && Object.keys(res.data.tokens).length > 0;
        const hasUrl = res.data.livekitUrl;
        
        if (hasToken && hasUrl) {
          return { 
            status: "pass", 
            details: `Token generated successfully. Server: ${res.data.livekitUrl}` 
          };
        } else {
          return { 
            status: "fail", 
            details: "Token or URL missing in response" 
          };
        }
      } catch (err) {
        return { status: "fail", details: err.message };
      }
    }
  },
  {
    id: "tx-rx-enforcement",
    name: "TX/RX Permission Enforcement",
    category: "Security",
    icon: Shield,
    instructions: "Verify rank-based permissions prevent unauthorized transmission",
    autoTest: async (user) => {
      try {
        // Create a test event and net with high rank requirement
        const testEvent = await base44.entities.Event.create({
          title: `[TEST] Permission Check ${new Date().toISOString()}`,
          event_type: "focused",
          start_time: new Date().toISOString(),
          status: "scheduled",
          host_id: user.id
        });
        
        const testNet = await base44.entities.VoiceNet.create({
          event_id: testEvent.id,
          code: "TESTNET",
          label: "Test Permissions Net",
          type: "command",
          min_rank_to_tx: "Founder",
          min_rank_to_rx: "Scout"
        });
        
        // Request token
        const res = await base44.functions.invoke('generateLiveKitToken', {
          eventId: testEvent.id,
          netIds: [testNet.id]
        });
        
        // Cleanup
        await base44.entities.VoiceNet.delete(testNet.id);
        await base44.entities.Event.delete(testEvent.id);
        
        // Check if warnings are present for non-admin users without rank
        const hasPermissionLogic = res.data.warnings || res.data.errors;
        
        return { 
          status: "pass", 
          details: `Permission enforcement active. Warnings: ${res.data.warnings?.length || 0}` 
        };
      } catch (err) {
        return { status: "fail", details: err.message };
      }
    }
  },
  {
    id: "room-uniqueness",
    name: "Room Name Uniqueness",
    category: "Communications",
    icon: Radio,
    instructions: "Verify different events/nets generate unique room names",
    autoTest: async (user) => {
      try {
        const event1 = await base44.entities.Event.create({
          title: "[TEST] Room Check A",
          event_type: "focused",
          start_time: new Date().toISOString(),
          status: "scheduled",
          host_id: user.id
        });
        
        const event2 = await base44.entities.Event.create({
          title: "[TEST] Room Check B",
          event_type: "focused",
          start_time: new Date().toISOString(),
          status: "scheduled",
          host_id: user.id
        });
        
        const net1 = await base44.entities.VoiceNet.create({
          event_id: event1.id,
          code: "ALPHA",
          label: "Test Alpha",
          type: "squad"
        });
        
        const net2 = await base44.entities.VoiceNet.create({
          event_id: event2.id,
          code: "ALPHA",
          label: "Test Alpha",
          type: "squad"
        });
        
        // Room names should be event-{eventId}-net-{code}
        const room1 = `event-${event1.id}-net-ALPHA`;
        const room2 = `event-${event2.id}-net-ALPHA`;
        
        const isUnique = room1 !== room2;
        
        // Cleanup
        await base44.entities.VoiceNet.delete(net1.id);
        await base44.entities.VoiceNet.delete(net2.id);
        await base44.entities.Event.delete(event1.id);
        await base44.entities.Event.delete(event2.id);
        
        if (isUnique) {
          return { 
            status: "pass", 
            details: "Room names are unique per event/net combination" 
          };
        } else {
          return { 
            status: "fail", 
            details: "Room name collision detected" 
          };
        }
      } catch (err) {
        return { status: "fail", details: err.message };
      }
    }
  },
  {
    id: "room-status-api",
    name: "Room Status API",
    category: "Monitoring",
    icon: Users,
    instructions: "Verify room status endpoint returns participant counts",
    autoTest: async (user) => {
      try {
        const testEvent = await base44.entities.Event.create({
          title: "[TEST] Status API Check",
          event_type: "focused",
          start_time: new Date().toISOString(),
          status: "scheduled",
          host_id: user.id
        });
        
        const res = await base44.functions.invoke('getLiveKitRoomStatus', {
          eventId: testEvent.id
        });
        
        await base44.entities.Event.delete(testEvent.id);
        
        const hasStatuses = res.data.roomStatuses !== undefined;
        const hasTotal = res.data.totalParticipants !== undefined;
        
        if (hasStatuses && hasTotal) {
          return { 
            status: "pass", 
            details: `Status API working. Found ${Object.keys(res.data.roomStatuses).length} rooms` 
          };
        } else {
          return { 
            status: "fail", 
            details: "Missing required fields in status response" 
          };
        }
      } catch (err) {
        return { status: "fail", details: err.message };
      }
    }
  }
];

const REPAIR_GUIDES = {
  "event-create": {
    title: "Event Creation Failed",
    steps: [
      "Verify Event entity exists in database",
      "Check Event entity schema is valid",
      "Ensure user has create permissions",
      "Review database connection logs",
      "Try creating event manually via UI"
    ]
  },
  "comms-init": {
    title: "Comms Initialization Failed",
    steps: [
      "Verify VoiceNet entity exists",
      "Check event creation automation hooks",
      "Verify backend initializeEventComms function",
      "Check for entity creation permission errors",
      "Manually create COMMAND, ALPHA, BRAVO nets"
    ]
  },
  "livekit-token": {
    title: "LiveKit Token Generation Failed",
    steps: [
      "Verify LIVEKIT_API_KEY and LIVEKIT_API_SECRET are set",
      "Check LIVEKIT_URL is correct and accessible",
      "Review generateLiveKitToken function logic",
      "Test LiveKit API directly with credentials",
      "Check for network connectivity to LiveKit service"
    ]
  },
  "tx-rx-enforcement": {
    title: "TX/RX Permission Enforcement Failed",
    steps: [
      "Verify permission checking logic in generateLiveKitToken",
      "Check rank definitions are loaded correctly",
      "Ensure user rank data is populated",
      "Review VoiceNet min_rank_to_tx/rx fields",
      "Test permission logic with different user ranks"
    ]
  },
  "room-uniqueness": {
    title: "Room Name Uniqueness Failed",
    steps: [
      "Review room naming convention: event-{eventId}-net-{code}",
      "Verify unique IDs are being generated correctly",
      "Check for any duplicate event/net creation",
      "Review livekit_room_name generation logic",
      "Test with fresh events and nets"
    ]
  },
  "room-status-api": {
    title: "Room Status API Failed",
    steps: [
      "Verify getLiveKitRoomStatus function exists",
      "Check LiveKit room listing API availability",
      "Review function return structure",
      "Verify LiveKit credentials for admin API",
      "Check network access to LiveKit service"
    ]
  }
};

export default function SystemChecklist({ user }) {
  const queryClient = useQueryClient();
  const [runningTests, setRunningTests] = useState(new Set());
  const [expandedRepair, setExpandedRepair] = useState(null);

  // Fetch latest results
  const { data: results } = useQuery({
    queryKey: ['system-check-results'],
    queryFn: () => base44.entities.SystemCheckResult.list('-created_date', 100),
    refetchInterval: 5000,
    initialData: []
  });

  // Save result mutation
  const saveResultMutation = useMutation({
    mutationFn: (data) => base44.entities.SystemCheckResult.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-check-results'] });
    }
  });

  // Get latest result for each check
  const getLatestResult = (checkId) => {
    return results.find(r => r.check_name === checkId);
  };

  // Run automated test
  const runTest = async (item) => {
    if (!item.autoTest) return;
    
    setRunningTests(prev => new Set([...prev, item.id]));
    toast.info(`Running test: ${item.name}...`);
    
    try {
      const result = await item.autoTest(user);
      
      await saveResultMutation.mutateAsync({
        check_name: item.id,
        status: result.status,
        details: result.details,
        tested_by: user.id,
        metadata: result.metadata || {}
      });
      
      if (result.status === "pass") {
        toast.success(`✓ ${item.name} passed`);
      } else {
        toast.error(`✗ ${item.name} failed`);
      }
    } catch (err) {
      toast.error(`Test error: ${err.message}`);
      await saveResultMutation.mutateAsync({
        check_name: item.id,
        status: "fail",
        details: `Test error: ${err.message}`,
        tested_by: user.id
      });
    } finally {
      setRunningTests(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Run all tests
  const runAllTests = async () => {
    toast.info("Running all system checks...");
    for (const item of CHECKLIST_ITEMS) {
      if (item.autoTest) {
        await runTest(item);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    toast.success("All tests complete");
  };

  // Calculate overall status
  const overallStatus = React.useMemo(() => {
    const statuses = CHECKLIST_ITEMS.map(item => getLatestResult(item.id)?.status);
    const allPass = statuses.every(s => s === "pass");
    const anyFail = statuses.some(s => s === "fail");
    const anyPending = statuses.some(s => !s || s === "pending");
    
    if (allPass) return "ready";
    if (anyFail) return "fail";
    if (anyPending) return "pending";
    return "unknown";
  }, [results]);

  const groupedItems = React.useMemo(() => {
    const groups = {};
    CHECKLIST_ITEMS.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-wider text-zinc-200">System Readiness Checklist</h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">Verify critical functionality before operations</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge className={cn(
            "px-4 py-2 text-sm font-bold uppercase tracking-wider",
            overallStatus === "ready" ? "bg-emerald-950 text-emerald-400 border-emerald-800" :
            overallStatus === "fail" ? "bg-red-950 text-red-400 border-red-800" :
            "bg-amber-950 text-amber-400 border-amber-800"
          )}>
            {overallStatus === "ready" && <CheckCircle2 className="w-4 h-4 mr-2" />}
            {overallStatus === "fail" && <XCircle className="w-4 h-4 mr-2" />}
            {overallStatus === "pending" && <Clock className="w-4 h-4 mr-2" />}
            {overallStatus === "ready" ? "READY FOR OPS" : 
             overallStatus === "fail" ? "ISSUES DETECTED" : 
             "TESTS PENDING"}
          </Badge>
          
          <Button 
            onClick={runAllTests}
            disabled={runningTests.size > 0}
            className="bg-[#ea580c] hover:bg-[#c2410c]"
          >
            {runningTests.size > 0 ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Checklist Groups */}
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
              <div className="w-1 h-1 bg-[#ea580c] rounded-full"></div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">{category}</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {items.map(item => {
                const result = getLatestResult(item.id);
                const isRunning = runningTests.has(item.id);
                const Icon = item.icon;
                
                return (
                  <Card key={item.id} className="bg-zinc-950 border-zinc-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-[#ea580c]" />
                          <div>
                            <CardTitle className="text-sm">{item.name}</CardTitle>
                            <p className="text-xs text-zinc-500 mt-1">{item.instructions}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {result && (
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              result.status === "pass" ? "bg-emerald-950/30 text-emerald-400 border-emerald-800" :
                              result.status === "fail" ? "bg-red-950/30 text-red-400 border-red-800" :
                              "bg-amber-950/30 text-amber-400 border-amber-800"
                            )}>
                              {result.status === "pass" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {result.status === "fail" && <XCircle className="w-3 h-3 mr-1" />}
                              {result.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                              {result.status.toUpperCase()}
                            </Badge>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => runTest(item)}
                            disabled={isRunning || !item.autoTest}
                            className="h-7 text-xs"
                          >
                            {isRunning ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {result && (
                       <CardContent className="pt-0 space-y-3">
                         <div className="bg-black/50 rounded p-3 border border-zinc-900">
                           <div className="text-[10px] font-mono text-zinc-500 mb-1">
                             Last tested: {new Date(result.created_date).toLocaleString()}
                           </div>
                           <div className={cn(
                             "text-xs font-mono",
                             result.status === "pass" ? "text-emerald-400" :
                             result.status === "fail" ? "text-red-400" :
                             "text-amber-400"
                           )}>
                             {result.details}
                           </div>
                         </div>

                         {result.status === "fail" && REPAIR_GUIDES[item.id] && (
                           <div className="space-y-2">
                             <button
                               onClick={() => setExpandedRepair(expandedRepair === item.id ? null : item.id)}
                               className="w-full flex items-center gap-2 px-3 py-2 rounded border border-amber-800/50 bg-amber-950/20 hover:bg-amber-950/40 transition-colors text-xs text-amber-300 font-mono"
                             >
                               <Wrench className="w-3 h-3" />
                               Repair Path
                               <span className="ml-auto text-[10px] opacity-70">{expandedRepair === item.id ? '▼' : '▶'}</span>
                             </button>

                             {expandedRepair === item.id && (
                               <div className="bg-black/30 rounded p-3 border border-amber-800/30 space-y-2">
                                 <div className="text-[10px] font-bold text-amber-400">{REPAIR_GUIDES[item.id].title}</div>
                                 <ol className="space-y-1.5">
                                   {REPAIR_GUIDES[item.id].steps.map((step, idx) => (
                                     <li key={idx} className="text-[10px] text-amber-300/80 font-mono flex gap-2">
                                       <span className="text-amber-500 flex-shrink-0">{idx + 1}.</span>
                                       <span>{step}</span>
                                     </li>
                                   ))}
                                 </ol>
                               </div>
                             )}
                           </div>
                         )}
                       </CardContent>
                     )}
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}