import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, User, Rocket, Flag, Plus, Trash2, ChevronDown, ChevronRight, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useUserDirectory } from '@/components/hooks/useUserDirectory';

export default function MissionForm({ mission, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [objectives, setObjectives] = useState(mission?.objectives || []);
  const [newObjective, setNewObjective] = useState("");

  // Global lists for assignment
  const { users } = useUserDirectory();

  const { data: assets } = useQuery({
    queryKey: ['mission-assets'],
    queryFn: () => base44.entities.FleetAsset.list(),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Mission.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['missions']);
      toast.success("Mission initialized");
      onOpenChange(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Mission.update(mission.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['missions']);
      toast.success("Mission updated");
      onOpenChange(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const assignedUserIds = Array.from(formData.getAll('assigned_users'));
    const assignedAssetIds = Array.from(formData.getAll('assigned_assets'));

    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      priority: formData.get('priority'),
      status: formData.get('status'),
      location: formData.get('location'),
      start_time: formData.get('start_time'),
      assigned_user_ids: assignedUserIds,
      assigned_asset_ids: assignedAssetIds,
      objectives: objectives
    };

    if (mission) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Objective Management
  const addObjective = () => {
    if (!newObjective.trim()) return;
    setObjectives([...objectives, { 
      id: Date.now().toString(), 
      text: newObjective, 
      is_completed: false, 
      sub_tasks: [],
      assigned_user_ids: [],
      assigned_asset_ids: []
    }]);
    setNewObjective("");
  };

  const removeObjective = (index) => {
    const newObjs = [...objectives];
    newObjs.splice(index, 1);
    setObjectives(newObjs);
  };

  const updateObjective = (index, field, value) => {
    const newObjs = [...objectives];
    newObjs[index] = { ...newObjs[index], [field]: value };
    setObjectives(newObjs);
  };

  // Sub-task Management
  const addSubTask = (objIndex, text) => {
    if (!text.trim()) return;
    const newObjs = [...objectives];
    if (!newObjs[objIndex].sub_tasks) newObjs[objIndex].sub_tasks = [];
    newObjs[objIndex].sub_tasks.push({
      id: Date.now().toString() + Math.random(),
      text: text,
      is_completed: false,
      assigned_user_ids: [],
      assigned_asset_ids: []
    });
    setObjectives(newObjs);
  };

  const removeSubTask = (objIndex, subIndex) => {
    const newObjs = [...objectives];
    newObjs[objIndex].sub_tasks.splice(subIndex, 1);
    setObjectives(newObjs);
  };

  const updateSubTaskAssignment = (objIndex, subIndex, field, value) => {
    const newObjs = [...objectives];
    // Handle array toggling for assignments
    // If field is 'assigned_user_ids' or 'assigned_asset_ids', value is the ID to toggle
    // But here we might pass the whole array from a component, keeping it simple for now
    // Let's assume we use a helper component for assignments
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-zinc-950 border-zinc-800 text-zinc-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm font-bold flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-500" />
            {mission ? "Modify Mission Parameters" : "Initialize New Operation"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             
             {/* Left Col: Basic Info */}
             <div className="lg:col-span-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-zinc-500">Operation Name</Label>
                  <Input name="title" defaultValue={mission?.title} required className="bg-zinc-900 border-zinc-800 font-bold text-white" placeholder="e.g. OP: NIGHTFALL" />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-zinc-500">Location / Sector</Label>
                  <Input name="location" defaultValue={mission?.location} className="bg-zinc-900 border-zinc-800" placeholder="e.g. Yela Asteroid Belt" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase text-zinc-500">Priority</Label>
                    <Select name="priority" defaultValue={mission?.priority || "STANDARD"}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-zinc-800">
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="STANDARD">Standard</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase text-zinc-500">Status</Label>
                    <Select name="status" defaultValue={mission?.status || "PENDING"}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-zinc-800">
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="ABORTED">Aborted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-zinc-500">Briefing</Label>
                  <Textarea name="description" defaultValue={mission?.description} className="bg-zinc-900 border-zinc-800 min-h-[100px] text-xs" placeholder="Mission details..." />
                </div>
                
                <div className="space-y-2">
                   <Label className="text-[10px] uppercase text-zinc-500">Start Time</Label>
                   <Input type="datetime-local" name="start_time" defaultValue={mission?.start_time} className="bg-zinc-900 border-zinc-800 text-xs" />
                </div>

                {/* Global Assignments */}
                <div className="space-y-4 pt-4 border-t border-zinc-900">
                   <Label className="text-[10px] uppercase text-zinc-500">Mission Level Assignments</Label>
                   <ScrollArea className="h-32 border border-zinc-800 bg-zinc-900/30 p-2 rounded-sm">
                      <div className="text-[9px] uppercase text-zinc-600 font-bold mb-1">Personnel</div>
                      {users.map(user => (
                        <div key={user.id} className="flex items-center space-x-2 mb-1">
                          <Checkbox 
                            id={`m-user-${user.id}`} 
                            name="assigned_users" 
                            value={user.id} 
                            defaultChecked={mission?.assigned_user_ids?.includes(user.id)}
                            className="w-3 h-3 border-zinc-700 data-[state=checked]:bg-emerald-600"
                          />
                          <label htmlFor={`m-user-${user.id}`} className="text-xs text-zinc-400 cursor-pointer select-none">
                            {user.callsign || user.full_name}
                          </label>
                        </div>
                      ))}
                   </ScrollArea>
                   <ScrollArea className="h-32 border border-zinc-800 bg-zinc-900/30 p-2 rounded-sm">
                      <div className="text-[9px] uppercase text-zinc-600 font-bold mb-1">Assets</div>
                      {assets.map(asset => (
                        <div key={asset.id} className="flex items-center space-x-2 mb-1">
                          <Checkbox 
                            id={`m-asset-${asset.id}`} 
                            name="assigned_assets" 
                            value={asset.id} 
                            defaultChecked={mission?.assigned_asset_ids?.includes(asset.id)}
                            className="w-3 h-3 border-zinc-700 data-[state=checked]:bg-blue-600"
                          />
                          <label htmlFor={`m-asset-${asset.id}`} className="text-xs text-zinc-400 cursor-pointer select-none">
                            {asset.name} <span className="text-[9px] opacity-50">({asset.model})</span>
                          </label>
                        </div>
                      ))}
                   </ScrollArea>
                </div>
             </div>

             {/* Right Col: Detailed Objectives */}
             <div className="lg:col-span-8 space-y-4 bg-zinc-900/20 p-4 border border-zinc-800/50 rounded-sm">
                <Label className="text-[10px] uppercase text-zinc-500 block">Tactical Objectives & Tasks</Label>
                
                <div className="flex gap-2">
                  <Input 
                    value={newObjective} 
                    onChange={(e) => setNewObjective(e.target.value)} 
                    className="bg-zinc-900 border-zinc-800 h-8 text-xs" 
                    placeholder="Add primary objective..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                  />
                  <Button type="button" onClick={addObjective} size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                   {objectives.map((obj, idx) => (
                      <ObjectiveEditor 
                         key={idx}
                         objective={obj}
                         users={users}
                         assets={assets}
                         onUpdate={(field, val) => updateObjective(idx, field, val)}
                         onRemove={() => removeObjective(idx)}
                         onAddSubTask={(text) => addSubTask(idx, text)}
                         onRemoveSubTask={(subIdx) => removeSubTask(idx, subIdx)}
                      />
                   ))}
                   {objectives.length === 0 && <div className="text-center py-8 text-zinc-600 text-xs italic">No objectives defined.</div>}
                </div>
             </div>

          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-white">CANCEL</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {mission ? "UPDATE MISSION" : "INITIATE MISSION"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ObjectiveEditor({ objective, users, assets, onUpdate, onRemove, onAddSubTask, onRemoveSubTask }) {
   const [isOpen, setIsOpen] = useState(false);
   const [newSub, setNewSub] = useState("");

   const handleAddSub = () => {
      if(newSub.trim()) {
         onAddSubTask(newSub);
         setNewSub("");
         setIsOpen(true);
      }
   };

   const toggleAssignment = (type, id) => {
      const field = type === 'user' ? 'assigned_user_ids' : 'assigned_asset_ids';
      const current = objective[field] || [];
      const updated = current.includes(id) 
         ? current.filter(x => x !== id)
         : [...current, id];
      onUpdate(field, updated);
   };

   // Helper to update subtask assignment
   const updateSubTask = (subIdx, field, value) => {
      const subTasks = [...(objective.sub_tasks || [])];
      subTasks[subIdx] = { ...subTasks[subIdx], [field]: value };
      onUpdate('sub_tasks', subTasks);
   };

   return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="bg-zinc-950 border border-zinc-800 rounded-sm overflow-hidden">
         <div className="flex items-center p-2 gap-2 bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
            <CollapsibleTrigger asChild>
               <Button variant="ghost" size="icon" className="h-6 w-6 p-0 text-zinc-500 hover:text-white">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
               </Button>
            </CollapsibleTrigger>
            <div className="flex-1 font-mono text-xs text-zinc-200 truncate font-bold">{objective.text}</div>
            
            {/* Quick Assign Counts */}
            <div className="flex items-center gap-2 text-[9px] text-zinc-500 mr-2">
               {(objective.assigned_user_ids?.length > 0) && <span className="flex items-center"><User className="w-3 h-3 mr-0.5" />{objective.assigned_user_ids.length}</span>}
               {(objective.assigned_asset_ids?.length > 0) && <span className="flex items-center"><Rocket className="w-3 h-3 mr-0.5" />{objective.assigned_asset_ids.length}</span>}
               {(objective.sub_tasks?.length > 0) && <span className="flex items-center"><Flag className="w-3 h-3 mr-0.5" />{objective.sub_tasks.length}</span>}
            </div>

            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-500" onClick={onRemove}>
               <Trash2 className="w-3 h-3" />
            </Button>
         </div>

         <CollapsibleContent className="border-t border-zinc-800 bg-black/30 p-3 space-y-4">
            
            {/* Assignments for this objective */}
            <div className="space-y-2">
               <Label className="text-[9px] uppercase text-zinc-500">Objective Assignments</Label>
               <div className="flex flex-wrap gap-2">
                  <AssignmentDropdown 
                     icon={User} 
                     label="Assign Personnel" 
                     items={users} 
                     selectedIds={objective.assigned_user_ids || []}
                     onToggle={(id) => toggleAssignment('user', id)}
                     displayKey={u => u.callsign || u.full_name}
                  />
                  <AssignmentDropdown 
                     icon={Rocket} 
                     label="Assign Assets" 
                     items={assets} 
                     selectedIds={objective.assigned_asset_ids || []}
                     onToggle={(id) => toggleAssignment('asset', id)}
                     displayKey={a => a.name}
                  />
               </div>
            </div>

            {/* Sub-tasks */}
            <div className="space-y-2">
               <Label className="text-[9px] uppercase text-zinc-500">Sub-Tasks</Label>
               <div className="pl-2 border-l border-zinc-800 space-y-2">
                  {(objective.sub_tasks || []).map((sub, subIdx) => (
                     <div key={subIdx} className="flex flex-col gap-1 bg-zinc-900/20 p-2 rounded border border-zinc-800/50">
                        <div className="flex items-center justify-between">
                           <span className="text-xs text-zinc-300 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
                              {sub.text}
                           </span>
                           <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-zinc-600 hover:text-red-500" onClick={() => onRemoveSubTask(subIdx)}>
                              <Trash2 className="w-3 h-3" />
                           </Button>
                        </div>
                        {/* Sub-task Assignments */}
                        <div className="flex gap-2 pl-3.5">
                           <AssignmentDropdown 
                              icon={User} 
                              label="Users" 
                              items={users} 
                              selectedIds={sub.assigned_user_ids || []}
                              onToggle={(id) => {
                                 const current = sub.assigned_user_ids || [];
                                 const updated = current.includes(id) ? current.filter(x=>x!==id) : [...current, id];
                                 updateSubTask(subIdx, 'assigned_user_ids', updated);
                              }}
                              displayKey={u => u.callsign || u.full_name}
                              compact
                           />
                           <AssignmentDropdown 
                              icon={Rocket} 
                              label="Assets" 
                              items={assets} 
                              selectedIds={sub.assigned_asset_ids || []}
                              onToggle={(id) => {
                                 const current = sub.assigned_asset_ids || [];
                                 const updated = current.includes(id) ? current.filter(x=>x!==id) : [...current, id];
                                 updateSubTask(subIdx, 'assigned_asset_ids', updated);
                              }}
                              displayKey={a => a.name}
                              compact
                           />
                        </div>
                     </div>
                  ))}
                  
                  <div className="flex gap-2 mt-2">
                     <Input 
                        value={newSub} 
                        onChange={(e) => setNewSub(e.target.value)} 
                        className="h-7 text-xs bg-zinc-900 border-zinc-800" 
                        placeholder="New sub-task..." 
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSub())}
                     />
                     <Button type="button" onClick={handleAddSub} size="sm" variant="secondary" className="h-7 text-xs">Add</Button>
                  </div>
               </div>
            </div>

         </CollapsibleContent>
      </Collapsible>
   );
}

function AssignmentDropdown({ icon: Icon, label, items, selectedIds, onToggle, displayKey, compact }) {
   return (
      <Select>
         <SelectTrigger className={`bg-zinc-900 border-zinc-800 ${compact ? 'h-6 text-[10px] w-auto px-2' : 'h-8 text-xs w-40'}`}>
            <div className="flex items-center gap-2 truncate">
               <Icon className="w-3 h-3 text-zinc-500" />
               <span>{selectedIds.length ? `${selectedIds.length} Assigned` : label}</span>
            </div>
         </SelectTrigger>
         <SelectContent className="bg-zinc-950 border-zinc-800 max-h-64">
            <ScrollArea className="h-full">
               {items.map(item => (
                  <div 
                     key={item.id} 
                     className="flex items-center gap-2 p-2 hover:bg-zinc-900 cursor-pointer"
                     onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggle(item.id);
                     }}
                  >
                     <Checkbox 
                        checked={selectedIds.includes(item.id)}
                        className="w-3 h-3 border-zinc-600"
                     />
                     <span className="text-xs text-zinc-300">{displayKey(item)}</span>
                  </div>
               ))}
            </ScrollArea>
         </SelectContent>
      </Select>
   );
}