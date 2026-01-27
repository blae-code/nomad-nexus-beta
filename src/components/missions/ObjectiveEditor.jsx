import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Flag, Plus, Trash2, User, Rocket, CornerDownRight } from 'lucide-react';

function AssignmentSelector({ selected = [], onSelect, users = [], assets = [] }) {
  // selected is array of { id, type }
  const [open, setOpen] = useState(false);

  const toggleSelection = (id, type) => {
    const exists = selected.find(s => s.id === id && s.type === type);
    if (exists) {
      onSelect(selected.filter(s => !(s.id === id && s.type === type)));
    } else {
      onSelect([...selected, { id, type }]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs" className="h-6 text-[10px] uppercase border border-dashed border-zinc-700 text-zinc-500 hover:text-emerald-500 hover:border-emerald-500">
          {selected.length > 0 ? (
            <span className="flex items-center gap-1">
               <User className="w-3 h-3" /> {selected.length} Assigned
            </span>
          ) : (
            "+ Assign"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-60 bg-zinc-950 border-zinc-800" side="right" align="start">
        <Command className="bg-zinc-950">
          <CommandInput placeholder="Assign personnel or assets..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Personnel">
              {users.map(user => (
                <CommandItem key={user.id} onSelect={() => toggleSelection(user.id, 'USER')} className="text-xs data-[selected='true']:bg-zinc-900">
                  <Checkbox 
                    checked={selected.some(s => s.id === user.id && s.type === 'USER')}
                    className="mr-2 w-3 h-3 border-zinc-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <User className="w-3 h-3 mr-2 text-zinc-500" />
                  {user.callsign || user.full_name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Assets">
              {assets.map(asset => (
                <CommandItem key={asset.id} onSelect={() => toggleSelection(asset.id, 'ASSET')} className="text-xs data-[selected='true']:bg-zinc-900">
                   <Checkbox 
                    checked={selected.some(s => s.id === asset.id && s.type === 'ASSET')}
                    className="mr-2 w-3 h-3 border-zinc-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Rocket className="w-3 h-3 mr-2 text-blue-500" />
                  {asset.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ObjectiveEditor({ objectives, onChange, users, assets }) {
  const [newObjText, setNewObjText] = useState("");

  const addObjective = () => {
    if (!newObjText.trim()) return;
    const newObj = {
      id: Date.now().toString(),
      text: newObjText,
      is_completed: false,
      assignments: [],
      sub_tasks: []
    };
    onChange([...objectives, newObj]);
    setNewObjText("");
  };

  const updateObjective = (index, updates) => {
    const newObjectives = [...objectives];
    newObjectives[index] = { ...newObjectives[index], ...updates };
    onChange(newObjectives);
  };

  const removeObjective = (index) => {
    const newObjectives = [...objectives];
    newObjectives.splice(index, 1);
    onChange(newObjectives);
  };

  const addSubTask = (objIndex, text) => {
    if (!text.trim()) return;
    const newSub = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: text,
      is_completed: false,
      assignments: []
    };
    const obj = objectives[objIndex];
    updateObjective(objIndex, { sub_tasks: [...(obj.sub_tasks || []), newSub] });
  };

  const updateSubTask = (objIndex, subIndex, updates) => {
     const obj = objectives[objIndex];
     const newSubs = [...(obj.sub_tasks || [])];
     newSubs[subIndex] = { ...newSubs[subIndex], ...updates };
     updateObjective(objIndex, { sub_tasks: newSubs });
  };

  const removeSubTask = (objIndex, subIndex) => {
     const obj = objectives[objIndex];
     const newSubs = [...(obj.sub_tasks || [])];
     newSubs.splice(subIndex, 1);
     updateObjective(objIndex, { sub_tasks: newSubs });
  };

  return (
    <div className="space-y-4 bg-zinc-900/30 p-4 border border-zinc-800/50 rounded-sm">
      <div className="flex items-center justify-between mb-2">
         <span className="text-[10px] uppercase text-zinc-500 font-bold flex items-center gap-2">
            <Flag className="w-3 h-3" /> Tactical Objectives
         </span>
      </div>

      <div className="space-y-2">
         {objectives.map((obj, idx) => (
            <div key={obj.id} className="bg-zinc-950 border border-zinc-900 rounded-sm overflow-hidden">
               {/* Main Objective Row */}
               <div className="p-2 flex items-start gap-2 group">
                  <div className="mt-1">
                     <Flag className="w-3 h-3 text-emerald-500" />
                  </div>
                  <div className="flex-1 space-y-2">
                     <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-200">{obj.text}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <AssignmentSelector 
                              selected={obj.assignments} 
                              onSelect={(newAssigns) => updateObjective(idx, { assignments: newAssigns })} 
                              users={users} 
                              assets={assets}
                           />
                           <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-zinc-600 hover:text-red-500" onClick={() => removeObjective(idx)}>
                              <Trash2 className="w-3 h-3" />
                           </Button>
                        </div>
                     </div>
                     
                     {/* Assignments Display */}
                     {obj.assignments?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                           {obj.assignments.map((assign, i) => {
                              const entity = assign.type === 'USER' ? users.find(u => u.id === assign.id) : assets.find(a => a.id === assign.id);
                              if (!entity) return null;
                              return (
                                 <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-zinc-900 border-zinc-800 text-zinc-400 gap-1 hover:bg-zinc-800">
                                    {assign.type === 'USER' ? <User className="w-2 h-2" /> : <Rocket className="w-2 h-2" />}
                                    {assign.type === 'USER' ? (entity.callsign || entity.full_name) : entity.name}
                                 </Badge>
                              )
                           })}
                        </div>
                     )}
                  </div>
               </div>

               {/* Subtasks Section */}
               <div className="bg-zinc-900/30 px-2 pb-2 pt-0">
                  <div className="ml-5 border-l border-zinc-800 pl-2 space-y-1.5">
                     {obj.sub_tasks?.map((sub, sIdx) => (
                        <div key={sub.id} className="flex items-start justify-between group/sub">
                           <div className="flex items-start gap-2 flex-1">
                              <CornerDownRight className="w-3 h-3 text-zinc-600 mt-1 shrink-0" />
                              <div className="flex-1">
                                 <span className="text-xs text-zinc-400">{sub.text}</span>
                                 {/* Subtask Assignments */}
                                 {sub.assignments?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                       {sub.assignments.map((assign, i) => {
                                          const entity = assign.type === 'USER' ? users.find(u => u.id === assign.id) : assets.find(a => a.id === assign.id);
                                          if (!entity) return null;
                                          return (
                                             <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-zinc-950 border-zinc-800 text-zinc-500 gap-1">
                                                {assign.type === 'USER' ? <User className="w-2 h-2" /> : <Rocket className="w-2 h-2" />}
                                                {assign.type === 'USER' ? (entity.callsign || entity.full_name) : entity.name}
                                             </Badge>
                                          )
                                       })}
                                    </div>
                                 )}
                              </div>
                           </div>
                           <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                              <AssignmentSelector 
                                 selected={sub.assignments} 
                                 onSelect={(newAssigns) => updateSubTask(idx, sIdx, { assignments: newAssigns })} 
                                 users={users} 
                                 assets={assets}
                              />
                              <Button type="button" variant="ghost" size="icon" className="h-4 w-4 text-zinc-600 hover:text-red-500" onClick={() => removeSubTask(idx, sIdx)}>
                                 <Trash2 className="w-2.5 h-2.5" />
                              </Button>
                           </div>
                        </div>
                     ))}
                     
                     {/* Add Subtask Input */}
                     <div className="flex items-center gap-2 mt-1 pt-1">
                        <CornerDownRight className="w-3 h-3 text-zinc-700 shrink-0" />
                        <Input 
                           className="h-6 text-[10px] bg-transparent border-zinc-800 focus-visible:ring-0 focus-visible:border-zinc-600 placeholder:text-zinc-700" 
                           placeholder="Add sub-task..."
                           onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                 e.preventDefault();
                                 addSubTask(idx, e.target.value);
                                 e.target.value = '';
                              }
                           }}
                        />
                     </div>
                  </div>
               </div>
            </div>
         ))}
      </div>

      {/* New Objective Input */}
      <div className="flex gap-2 pt-2">
         <Input 
            value={newObjText} 
            onChange={(e) => setNewObjText(e.target.value)} 
            className="bg-zinc-900 border-zinc-800 h-8 text-xs" 
            placeholder="Define new primary objective..."
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
         />
         <Button type="button" onClick={addObjective} size="sm" variant="outline" className="h-8 border-zinc-700 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/30">
            <Plus className="w-4 h-4" />
         </Button>
      </div>
    </div>
  );
}