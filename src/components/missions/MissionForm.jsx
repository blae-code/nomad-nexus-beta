import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalendarIcon, Target, User, Rocket, Flag, Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import ObjectiveEditor from './ObjectiveEditor';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function MissionForm({ mission, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [objectives, setObjectives] = useState(mission?.objectives || []);
  const [newObjective, setNewObjective] = useState("");

  // Fetch potential assignees (Users) and assets (Fleet)
  const { data: users } = useQuery({
    queryKey: ['mission-users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

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

  const addObjective = () => {
    if (!newObjective.trim()) return;
    setObjectives([...objectives, { id: Date.now().toString(), text: newObjective, is_completed: false }]);
    setNewObjective("");
  };

  const removeObjective = (index) => {
    const newObjs = [...objectives];
    newObjs.splice(index, 1);
    setObjectives(newObjs);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm font-bold flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-500" />
            {mission ? "Modify Mission Parameters" : "Initialize New Operation"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-zinc-500">Operation Name</Label>
              <Input name="title" defaultValue={mission?.title} required className="bg-zinc-900 border-zinc-800 font-bold text-white" placeholder="e.g. OP: NIGHTFALL" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-zinc-500">Location / Sector</Label>
              <Input name="location" defaultValue={mission?.location} className="bg-zinc-900 border-zinc-800" placeholder="e.g. Yela Asteroid Belt" />
            </div>
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-zinc-500">Priority Level</Label>
              <Select name="priority" defaultValue={mission?.priority || "STANDARD"}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 h-9">
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
              <Label className="text-[10px] uppercase text-zinc-500">Mission Status</Label>
              <Select name="status" defaultValue={mission?.status || "PENDING"}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 h-9">
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

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-zinc-500">Briefing / Description</Label>
            <Textarea name="description" defaultValue={mission?.description} className="bg-zinc-900 border-zinc-800 min-h-[100px]" placeholder="Mission details..." />
          </div>

          {/* Objectives */}
          <ObjectiveEditor 
            objectives={objectives} 
            onChange={setObjectives} 
            users={users} 
            assets={assets} 
          />

          {/* Assignments */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-zinc-500 flex items-center gap-2">
                <User className="w-3 h-3" /> Personnel Assignment
              </Label>
              <ScrollArea className="h-32 border border-zinc-800 bg-zinc-900/50 p-2 rounded-sm">
                {users.map(user => (
                  <div key={user.id} className="flex items-center space-x-2 mb-2">
                    <Checkbox 
                      id={`user-${user.id}`} 
                      name="assigned_users" 
                      value={user.id} 
                      defaultChecked={mission?.assigned_user_ids?.includes(user.id)}
                      className="border-zinc-700 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <label htmlFor={`user-${user.id}`} className="text-xs text-zinc-300 cursor-pointer select-none">
                      {user.callsign || user.full_name}
                    </label>
                  </div>
                ))}
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-zinc-500 flex items-center gap-2">
                <Rocket className="w-3 h-3" /> Fleet Assets
              </Label>
              <ScrollArea className="h-32 border border-zinc-800 bg-zinc-900/50 p-2 rounded-sm">
                {assets.map(asset => (
                  <div key={asset.id} className="flex items-center space-x-2 mb-2">
                    <Checkbox 
                      id={`asset-${asset.id}`} 
                      name="assigned_assets" 
                      value={asset.id} 
                      defaultChecked={mission?.assigned_asset_ids?.includes(asset.id)}
                      className="border-zinc-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <label htmlFor={`asset-${asset.id}`} className="text-xs text-zinc-300 cursor-pointer select-none flex items-center justify-between w-full pr-2">
                      <span>{asset.name}</span>
                      <span className="text-[9px] text-zinc-500">{asset.model}</span>
                    </label>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label className="text-[10px] uppercase text-zinc-500">Start Time</Label>
                <Input type="datetime-local" name="start_time" defaultValue={mission?.start_time} className="bg-zinc-900 border-zinc-800 text-xs" />
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