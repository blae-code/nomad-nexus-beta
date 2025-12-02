import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Target, Calendar, MapPin, Users, Rocket, Clock, CheckSquare, AlertTriangle, ArrowRight, RotateCw, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import MissionForm from './MissionForm';
import { toast } from 'sonner';

export default function MissionControlPage() {
  const [selectedMission, setSelectedMission] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const { data: missions, isLoading } = useQuery({
    queryKey: ['missions'],
    queryFn: () => base44.entities.Mission.list({ sort: { created_date: -1 } }),
    refetchInterval: 10000,
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

                 {/* Progress Bar (based on objectives) */}
                 <div className="mt-3 flex items-center gap-2">
                    <Progress value={calculateProgress(mission.objectives)} className="h-1 bg-zinc-800" indicatorClassName={getProgressColor(mission.status)} />
                    <span className="text-[9px] font-mono text-zinc-500">{calculateProgress(mission.objectives)}%</span>
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
                    if (!open) {
                       // Simple refetch logic is handled by query invalidation in form
                       // But we might want to update selectedMission if needed
                    }
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

   // Fetch linked data
   const { data: allUsers } = useQuery({ queryKey: ['mission-users-detail'], queryFn: () => base44.entities.User.list(), initialData: [] });
   const { data: allAssets } = useQuery({ queryKey: ['mission-assets-detail'], queryFn: () => base44.entities.FleetAsset.list(), initialData: [] });

   const assignedUsers = allUsers.filter(u => mission.assigned_user_ids?.includes(u.id));
   const assignedAssets = allAssets.filter(a => mission.assigned_asset_ids?.includes(a.id));

   const updateObjectiveMutation = useMutation({
      mutationFn: async ({ objectiveIndex, isCompleted }) => {
         const newObjectives = [...(mission.objectives || [])];
         newObjectives[objectiveIndex] = { ...newObjectives[objectiveIndex], is_completed: isCompleted };
         return base44.entities.Mission.update(mission.id, { objectives: newObjectives });
      },
      onSuccess: () => {
         queryClient.invalidateQueries(['missions']);
         toast.success("Objective updated");
      }
   });

   const updateStatusMutation = useMutation({
      mutationFn: (status) => base44.entities.Mission.update(mission.id, { status }),
      onSuccess: () => {
         queryClient.invalidateQueries(['missions']);
         toast.success(`Mission status: ${status}`);
      }
   });

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
               
               {/* Objectives */}
               <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                     <CheckSquare className="w-4 h-4" /> Tactical Objectives
                  </h3>
                  <div className="bg-zinc-950 border border-zinc-800 divide-y divide-zinc-900">
                     {mission.objectives && mission.objectives.length > 0 ? (
                        mission.objectives.map((obj, idx) => (
                           <div key={idx} className="p-3 flex items-start gap-3 hover:bg-zinc-900/30 transition-colors">
                              <Checkbox 
                                 checked={obj.is_completed} 
                                 onCheckedChange={(checked) => updateObjectiveMutation.mutate({ objectiveIndex: idx, isCompleted: checked })}
                                 className="mt-0.5 border-zinc-700 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                              />
                              <div className={`text-sm ${obj.is_completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                                 {obj.text}
                              </div>
                           </div>
                        ))
                     ) : (
                        <div className="p-4 text-zinc-600 text-xs italic">No objectives defined.</div>
                     )}
                  </div>
               </div>

               {/* Assets & Personnel */}
               <div className="space-y-6">
                  
                  {/* Personnel */}
                  <div>
                     <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4" /> Assigned Personnel
                     </h3>
                     <div className="grid grid-cols-1 gap-2">
                        {assignedUsers.length > 0 ? assignedUsers.map(u => (
                           <div key={u.id} className="flex items-center gap-3 p-2 bg-zinc-900/50 border border-zinc-800">
                              <div className="w-6 h-6 bg-zinc-800 flex items-center justify-center text-zinc-500">
                                 <User className="w-3 h-3" />
                              </div>
                              <div>
                                 <div className="text-xs font-bold text-zinc-200">{u.callsign || u.full_name}</div>
                                 <div className="text-[9px] text-zinc-500 uppercase">{u.rank}</div>
                              </div>
                           </div>
                        )) : <div className="text-zinc-600 text-xs italic">No personnel assigned.</div>}
                     </div>
                  </div>

                  {/* Fleet Assets */}
                  <div>
                     <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2 mb-3">
                        <Rocket className="w-4 h-4" /> Deployed Assets
                     </h3>
                     <div className="grid grid-cols-1 gap-2">
                        {assignedAssets.length > 0 ? assignedAssets.map(a => (
                           <div key={a.id} className="flex items-center gap-3 p-2 bg-blue-950/10 border border-blue-900/30">
                              <div className="w-6 h-6 bg-blue-900/20 flex items-center justify-center text-blue-500">
                                 <Rocket className="w-3 h-3" />
                              </div>
                              <div>
                                 <div className="text-xs font-bold text-blue-200">{a.name}</div>
                                 <div className="text-[9px] text-blue-400 uppercase">{a.model}</div>
                              </div>
                              <div className="ml-auto text-[9px] font-mono text-zinc-500">{a.status}</div>
                           </div>
                        )) : <div className="text-zinc-600 text-xs italic">No assets assigned.</div>}
                     </div>
                  </div>

               </div>

            </div>
         </div>
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

function calculateProgress(objectives) {
   if (!objectives || objectives.length === 0) return 0;
   const completed = objectives.filter(o => o.is_completed).length;
   return Math.round((completed / objectives.length) * 100);
}