import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Target, Calendar, MapPin, Users, Rocket, Clock, CheckSquare, AlertTriangle, ArrowRight, RotateCw, ExternalLink, Flag, User, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import MissionForm from '@/components/missions/MissionForm';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function MissionControlPage() {
  const [selectedMission, setSelectedMission] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const { data: missions, isLoading } = useQuery({
    queryKey: ['missions'],
    queryFn: () => base44.entities.Mission.list({ sort: { created_date: -1 } }),
    refetchInterval: 5000,
    initialData: []
  });

  const filteredMissions = missions.filter(m => 
    filterStatus === 'ALL' || 
    (filterStatus === 'ACTIVE' && (m.status === 'ACTIVE' || m.status === 'PENDING')) ||
    m.status === filterStatus
  );

  return (
    <div className="h-full flex flex-col bg-black text-zinc-200 font-sans">
      {/* Top Bar */}
      <div className="h-16 border-b border-zinc-800 bg-zinc-950 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-900/20 border border-emerald-900/50 flex items-center justify-center text-emerald-500">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest text-white leading-none">Mission Control</h1>
            <div className="text-xs font-mono text-zinc-500 mt-1">TACTICAL OPERATIONS CENTER // {missions.length} RECORDS</div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-sm">
              {['ALL', 'ACTIVE', 'COMPLETED', 'FAILED'].map(status => (
                 <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors rounded-sm ${filterStatus === status ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                 >
                    {status}
                 </button>
              ))}
           </div>
           <Button 
              onClick={() => setIsCreateOpen(true)} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold tracking-wider"
           >
              <Target className="w-4 h-4 mr-2" /> NEW OP
           </Button>
           <MissionForm open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Mission List Sidebar */}
        <div className="w-96 shrink-0 border-r border-zinc-800 bg-zinc-950 overflow-y-auto p-2 space-y-2">
           {isLoading && <div className="text-center py-10 text-zinc-600 text-xs font-mono animate-pulse">DOWNLOADING MISSION DATA...</div>}
           {!isLoading && filteredMissions.length === 0 && <div className="text-center py-10 text-zinc-600 text-xs font-mono">NO OPERATIONS FOUND</div>}
           
           {filteredMissions.map(mission => (
              <div 
                 key={mission.id}
                 onClick={() => setSelectedMission(mission)}
                 className={`p-4 border cursor-pointer transition-all relative group ${selectedMission?.id === mission.id ? 'bg-zinc-900 border-emerald-500' : 'bg-black border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50'}`}
              >
                 {selectedMission?.id === mission.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                 
                 <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-bold uppercase tracking-wide text-sm ${selectedMission?.id === mission.id ? 'text-white' : 'text-zinc-300'}`}>
                       {mission.title}
                    </h3>
                    <StatusBadge status={mission.status} />
                 </div>
                 
                 <div className="flex justify-between items-center text-xs text-zinc-500 font-mono">
                    <div className="flex items-center gap-1">
                       <MapPin className="w-3 h-3" /> {mission.location || 'Unknown Sector'}
                    </div>
                    <div className={`px-1.5 py-0.5 border text-[9px] font-bold rounded-sm ${getPriorityColor(mission.priority)}`}>
                       {mission.priority}
                    </div>
                 </div>

                 {/* Progress Bar */}
                 <div className="mt-3 flex items-center gap-2">
                    <Progress value={calculateOverallProgress(mission)} className="h-1 bg-zinc-800" indicatorClassName={getProgressColor(mission.status)} />
                    <span className="text-[9px] font-mono text-zinc-500">{calculateOverallProgress(mission)}%</span>
                 </div>
              </div>
           ))}
        </div>

        {/* Mission Detail View */}
        <div className="flex-1 bg-black relative flex flex-col min-w-0">
           {selectedMission ? (
              <MissionDetailView mission={selectedMission} onEdit={() => setIsEditOpen(true)} />
           ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-700">
                 <Target className="w-24 h-24 mb-4 opacity-10" />
                 <h2 className="text-xl font-black uppercase tracking-widest opacity-50">Select an Operation</h2>
                 <p className="text-xs font-mono mt-2">AWAITING COMMAND INPUT //</p>
              </div>
           )}
           
           {selectedMission && (
              <MissionForm 
                 mission={selectedMission} 
                 open={isEditOpen} 
                 onOpenChange={(open) => {
                    setIsEditOpen(open);
                 }} 
              />
           )}
        </div>

      </div>
    </div>
  );
}

function MissionDetailView({ mission, onEdit }) {
   const queryClient = useQueryClient();

   const { data: allUsers } = useQuery({ queryKey: ['mission-users-detail'], queryFn: () => base44.entities.User.list(), initialData: [] });
   const { data: allAssets } = useQuery({ queryKey: ['mission-assets-detail'], queryFn: () => base44.entities.FleetAsset.list(), initialData: [] });

   // Global mission assignments
   const missionUsers = allUsers.filter(u => mission.assigned_user_ids?.includes(u.id));
   const missionAssets = allAssets.filter(a => mission.assigned_asset_ids?.includes(a.id));

   const updateStatusMutation = useMutation({
      mutationFn: (status) => base44.entities.Mission.update(mission.id, { status }),
      onSuccess: () => {
         queryClient.invalidateQueries(['missions']);
         toast.success(`Mission status: ${status}`);
      }
   });

   // Helper to toggle completion of an objective or subtask
   const toggleObjective = async (objIndex, checked) => {
      const newObjectives = [...(mission.objectives || [])];
      newObjectives[objIndex] = { ...newObjectives[objIndex], is_completed: checked };
      await base44.entities.Mission.update(mission.id, { objectives: newObjectives });
      queryClient.invalidateQueries(['missions']);
   };

   const toggleSubTask = async (objIndex, subIndex, checked) => {
      const newObjectives = [...(mission.objectives || [])];
      const newSubTasks = [...(newObjectives[objIndex].sub_tasks || [])];
      newSubTasks[subIndex] = { ...newSubTasks[subIndex], is_completed: checked };
      newObjectives[objIndex].sub_tasks = newSubTasks;
      
      // Auto-complete parent if all subs are done? Optional. Let's keep them independent or manual for now.
      
      await base44.entities.Mission.update(mission.id, { objectives: newObjectives });
      queryClient.invalidateQueries(['missions']);
   };

   return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
         {/* Header */}
         <div className="p-6 border-b border-zinc-800 bg-zinc-900/20 flex justify-between items-start shrink-0">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-white">{mission.title}</h2>
                  <StatusBadge status={mission.status} size="lg" />
               </div>
               <div className="flex items-center gap-6 text-xs font-mono text-zinc-400">
                  <div className="flex items-center gap-1.5">
                     <MapPin className="w-4 h-4 text-zinc-500" />
                     {mission.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                     <Clock className="w-4 h-4 text-zinc-500" />
                     START: {mission.start_time ? format(new Date(mission.start_time), 'dd MMM HH:mm') : 'TBD'}
                  </div>
                  <div className="flex items-center gap-1.5">
                     <AlertTriangle className="w-4 h-4 text-zinc-500" />
                     PRIORITY: <span className={getPriorityColor(mission.priority, true)}>{mission.priority}</span>
                  </div>
               </div>
            </div>
            <div className="flex gap-2">
               {mission.status === 'ACTIVE' && (
                  <Button onClick={() => updateStatusMutation.mutate('COMPLETED')} variant="outline" className="border-emerald-900 text-emerald-500 hover:bg-emerald-900/20 hover:text-emerald-400">
                     COMPLETE OP
                  </Button>
               )}
               <Button onClick={onEdit} variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                  EDIT PARAMETERS
               </Button>
            </div>
         </div>

         {/* Body */}
         <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Description */}
            <div className="bg-zinc-950 border border-zinc-800 p-6 relative">
               <div className="absolute top-0 left-0 px-2 py-1 bg-zinc-900 border-r border-b border-zinc-800 text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Mission Briefing</div>
               <p className="mt-2 text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm">{mission.description || "No briefing data available."}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               
               {/* Detailed Objectives */}
               <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                     <CheckSquare className="w-4 h-4" /> Tactical Objectives
                  </h3>
                  <div className="space-y-2">
                     {mission.objectives && mission.objectives.length > 0 ? (
                        mission.objectives.map((obj, idx) => (
                           <ObjectiveDetailItem 
                              key={idx} 
                              objective={obj} 
                              allUsers={allUsers}
                              allAssets={allAssets}
                              onToggle={() => toggleObjective(idx, !obj.is_completed)}
                              onToggleSub={(subIdx, val) => toggleSubTask(idx, subIdx, val)}
                           />
                        ))
                     ) : (
                        <div className="p-4 text-zinc-600 text-xs italic border border-zinc-800 border-dashed">No objectives defined.</div>
                     )}
                  </div>
               </div>

               {/* Assets & Personnel (Global) */}
               <div className="space-y-6">
                  
                  <div>
                     <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4" /> Mission Personnel
                     </h3>
                     <div className="grid grid-cols-1 gap-2">
                        {missionUsers.length > 0 ? missionUsers.map(u => (
                           <UserCard key={u.id} user={u} />
                        )) : <div className="text-zinc-600 text-xs italic">No personnel assigned globally.</div>}
                     </div>
                  </div>

                  <div>
                     <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2 mb-3">
                        <Rocket className="w-4 h-4" /> Deployed Assets
                     </h3>
                     <div className="grid grid-cols-1 gap-2">
                        {missionAssets.length > 0 ? missionAssets.map(a => (
                           <AssetCard key={a.id} asset={a} />
                        )) : <div className="text-zinc-600 text-xs italic">No assets assigned globally.</div>}
                     </div>
                  </div>

               </div>

            </div>
         </div>
      </div>
   );
}

function ObjectiveDetailItem({ objective, allUsers, allAssets, onToggle, onToggleSub }) {
   const assignedUsers = allUsers.filter(u => objective.assigned_user_ids?.includes(u.id));
   const assignedAssets = allAssets.filter(a => objective.assigned_asset_ids?.includes(a.id));

   return (
      <div className={`bg-zinc-950 border border-zinc-800 p-3 ${objective.is_completed ? 'opacity-60' : ''}`}>
         <div className="flex items-start gap-3">
            <Checkbox 
               checked={objective.is_completed} 
               onCheckedChange={onToggle}
               className="mt-0.5 border-zinc-700 data-[state=checked]:bg-emerald-600"
            />
            <div className="flex-1">
               <div className={`text-sm font-bold ${objective.is_completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                  {objective.text}
               </div>
               
               {/* Objective Assignments */}
               {(assignedUsers.length > 0 || assignedAssets.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                     {assignedUsers.map(u => (
                        <div key={u.id} className="flex items-center gap-1 bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-400 border border-zinc-800 rounded-sm">
                           <User className="w-2.5 h-2.5" /> {u.callsign || u.full_name}
                        </div>
                     ))}
                     {assignedAssets.map(a => (
                        <div key={a.id} className="flex items-center gap-1 bg-blue-950/20 px-1.5 py-0.5 text-[9px] text-blue-400 border border-blue-900/30 rounded-sm">
                           <Rocket className="w-2.5 h-2.5" /> {a.name}
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* Sub Tasks */}
         {objective.sub_tasks && objective.sub_tasks.length > 0 && (
            <div className="ml-7 mt-3 pl-3 border-l border-zinc-800 space-y-2">
               {objective.sub_tasks.map((sub, idx) => {
                  const subUsers = allUsers.filter(u => sub.assigned_user_ids?.includes(u.id));
                  const subAssets = allAssets.filter(a => sub.assigned_asset_ids?.includes(a.id));
                  
                  return (
                     <div key={idx} className="flex items-start gap-2">
                        <Checkbox 
                           checked={sub.is_completed} 
                           onCheckedChange={(v) => onToggleSub(idx, v)}
                           className="mt-0.5 w-3 h-3 border-zinc-700"
                        />
                        <div className="flex-1">
                           <div className={`text-xs ${sub.is_completed ? 'text-zinc-600 line-through' : 'text-zinc-400'}`}>
                              {sub.text}
                           </div>
                           {/* Subtask Assignments */}
                           {(subUsers.length > 0 || subAssets.length > 0) && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                 {subUsers.map(u => (
                                    <span key={u.id} className="text-[9px] text-zinc-600 flex items-center"><User className="w-2 h-2 mr-0.5"/>{u.callsign}</span>
                                 ))}
                                 {subAssets.map(a => (
                                    <span key={a.id} className="text-[9px] text-blue-900 flex items-center"><Rocket className="w-2 h-2 mr-0.5"/>{a.name}</span>
                                 ))}
                              </div>
                           )}
                        </div>
                     </div>
                  );
               })}
            </div>
         )}
      </div>
   );
}

function UserCard({ user }) {
   return (
      <div className="flex items-center gap-3 p-2 bg-zinc-900/50 border border-zinc-800">
         <div className="w-6 h-6 bg-zinc-800 flex items-center justify-center text-zinc-500">
            <User className="w-3 h-3" />
         </div>
         <div>
            <div className="text-xs font-bold text-zinc-200">{user.callsign || user.full_name}</div>
            <div className="text-[9px] text-zinc-500 uppercase">{user.rank}</div>
         </div>
      </div>
   );
}

function AssetCard({ asset }) {
   return (
      <div className="flex items-center gap-3 p-2 bg-blue-950/10 border border-blue-900/30">
         <div className="w-6 h-6 bg-blue-900/20 flex items-center justify-center text-blue-500">
            <Rocket className="w-3 h-3" />
         </div>
         <div>
            <div className="text-xs font-bold text-blue-200">{asset.name}</div>
            <div className="text-[9px] text-blue-400 uppercase">{asset.model}</div>
         </div>
         <div className="ml-auto text-[9px] font-mono text-zinc-500">{asset.status}</div>
      </div>
   );
}

// Helpers
function StatusBadge({ status, size = 'sm' }) {
   const styles = {
      PENDING: "bg-zinc-800 text-zinc-400 border-zinc-700",
      ACTIVE: "bg-emerald-950/50 text-emerald-500 border-emerald-800 animate-pulse",
      COMPLETED: "bg-blue-950/50 text-blue-500 border-blue-800",
      FAILED: "bg-red-950/50 text-red-500 border-red-800",
      ABORTED: "bg-zinc-950 text-zinc-600 border-zinc-800",
   };
   return (
      <Badge variant="outline" className={`uppercase font-mono tracking-wider rounded-sm border ${styles[status] || styles.PENDING} ${size === 'lg' ? 'text-sm px-3 py-1' : 'text-[9px] px-1.5 py-0.5'}`}>
         {status}
      </Badge>
   );
}

function getPriorityColor(priority, textOnly = false) {
   const map = {
      CRITICAL: textOnly ? "text-red-500 font-bold" : "bg-red-950 text-red-500 border-red-900",
      HIGH: textOnly ? "text-orange-500" : "bg-orange-950 text-orange-500 border-orange-900",
      STANDARD: textOnly ? "text-emerald-500" : "bg-emerald-950 text-emerald-500 border-emerald-900",
      LOW: textOnly ? "text-zinc-500" : "bg-zinc-900 text-zinc-500 border-zinc-800"
   };
   return map[priority] || map.STANDARD;
}

function getProgressColor(status) {
   if (status === 'FAILED') return 'bg-red-500';
   if (status === 'COMPLETED') return 'bg-blue-500';
   return 'bg-emerald-500';
}

function calculateOverallProgress(mission) {
   if (!mission.objectives || mission.objectives.length === 0) return 0;
   
   let totalPoints = 0;
   let earnedPoints = 0;

   mission.objectives.forEach(obj => {
      // Each main objective is worth 10 points
      const mainWorth = 10;
      totalPoints += mainWorth;
      if (obj.is_completed) earnedPoints += mainWorth;

      // Each subtask is worth 2 points (adds to total)
      if (obj.sub_tasks) {
         obj.sub_tasks.forEach(sub => {
            totalPoints += 2;
            if (sub.is_completed) earnedPoints += 2;
         });
      }
   });
   
   if (totalPoints === 0) return 0;
   return Math.round((earnedPoints / totalPoints) * 100);
}