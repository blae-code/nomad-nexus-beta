import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Flag, CheckSquare, User, Rocket, CornerDownRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function EventObjectives({ event, users, assets, canEdit }) {
  const queryClient = useQueryClient();

  const updateObjectiveMutation = useMutation({
    mutationFn: async ({ objectiveIndex, ...updates }) => {
       const newObjectives = [...(event.objectives || [])];
       newObjectives[objectiveIndex] = { ...newObjectives[objectiveIndex], ...updates };
       return base44.entities.Event.update(event.id, { objectives: newObjectives });
    },
    onSuccess: () => {
       queryClient.invalidateQueries(['event-detail', event.id]);
       toast.success("Objective updated");
    }
  });

  if (!event.objectives || event.objectives.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
         <CheckSquare className="w-4 h-4" /> Tactical Objectives
      </h3>
      <div className="bg-zinc-950 border border-zinc-800 divide-y divide-zinc-900">
         {event.objectives.map((obj, idx) => (
            <ObjectiveItem 
               key={obj.id || idx} 
               objective={obj} 
               index={idx} 
               onUpdate={(updates) => updateObjectiveMutation.mutate({ objectiveIndex: idx, ...updates })}
               users={users}
               assets={assets}
               canEdit={canEdit}
            />
         ))}
      </div>
    </div>
  );
}

function ObjectiveItem({ objective, index, onUpdate, users, assets, canEdit }) {
   const toggleSubTask = (subIndex, isChecked) => {
      const newSubTasks = [...(objective.sub_tasks || [])];
      newSubTasks[subIndex] = { ...newSubTasks[subIndex], is_completed: isChecked };
      onUpdate({ sub_tasks: newSubTasks });
   };

   const assignedEntities = (objective.assignments || []).map(a => ({
      ...a,
      entity: a.type === 'USER' ? users.find(u => u.id === a.id) : assets.find(as => as.id === a.id)
   })).filter(a => a.entity);

   return (
      <div className="group">
         <div className="p-3 flex items-start gap-3 hover:bg-zinc-900/30 transition-colors">
            <Checkbox 
               checked={objective.is_completed} 
               onCheckedChange={(checked) => onUpdate({ is_completed: checked })}
               disabled={!canEdit && objective.sub_tasks?.some(s => !s.is_completed)} 
               className="mt-0.5 border-zinc-700 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 disabled:opacity-50"
            />
            <div className="flex-1">
               <div className="flex justify-between items-start">
                  <span className={`text-sm font-medium ${objective.is_completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                     {objective.text}
                  </span>
                  {/* Assignments */}
                  <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                     {assignedEntities.map((assign, i) => (
                        <div key={i} className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded-sm text-[9px] text-zinc-400">
                           {assign.type === 'USER' ? <User className="w-2 h-2" /> : <Rocket className="w-2 h-2" />}
                           <span className="truncate max-w-[60px]">{assign.entity?.callsign || assign.entity?.name || 'Unknown'}</span>
                        </div>
                     ))}
                  </div>
               </div>
               
               {/* Subtasks */}
               {objective.sub_tasks && objective.sub_tasks.length > 0 && (
                  <div className="mt-2 space-y-1 pl-2 border-l-2 border-zinc-800 ml-1">
                     {objective.sub_tasks.map((sub, sIdx) => {
                        const subAssignments = (sub.assignments || []).map(a => ({
                           ...a,
                           entity: a.type === 'USER' ? users.find(u => u.id === a.id) : assets.find(as => as.id === a.id)
                        })).filter(a => a.entity);

                        return (
                           <div key={sub.id || sIdx} className="flex items-center gap-2 py-1">
                              <Checkbox 
                                 checked={sub.is_completed} 
                                 onCheckedChange={(checked) => toggleSubTask(sIdx, checked)}
                                 className="w-3 h-3 border-zinc-600 data-[state=checked]:bg-zinc-500 data-[state=checked]:border-zinc-500"
                              />
                              <span className={`text-xs ${sub.is_completed ? 'text-zinc-600 line-through' : 'text-zinc-400'}`}>
                                 {sub.text}
                              </span>
                              {subAssignments.length > 0 && (
                                 <div className="flex gap-1 ml-auto">
                                    {subAssignments.map((assign, i) => (
                                       <div key={i} title={assign.entity?.callsign || assign.entity?.name} className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                                    ))}
                                 </div>
                              )}
                           </div>
                        );
                     })}
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}