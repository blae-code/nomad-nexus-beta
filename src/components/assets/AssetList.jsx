import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Rocket, Car, Wrench, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';

export default function AssetList({ onSelect, selectedId }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: assets } = useQuery({
    queryKey: ['fleet-assets'],
    queryFn: () => base44.entities.FleetAsset.list(),
    initialData: []
  });

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Fleet Manifest</h2>
        <AssetFormDialog 
           open={isCreateOpen} 
           onOpenChange={setIsCreateOpen} 
           trigger={
             <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 hover:border-emerald-500 hover:text-emerald-500 bg-zinc-900">
               <Plus className="w-3 h-3 mr-1" /> ADD ASSET
             </Button>
           }
        />
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
         {assets.length === 0 ? (
             <div className="text-center py-10 text-zinc-600 text-xs font-mono">NO ASSETS REGISTERED</div>
         ) : (
             assets.map(asset => (
                <div 
                   key={asset.id}
                   onClick={() => onSelect(asset)}
                   className={`p-3 border cursor-pointer transition-all group relative overflow-hidden ${selectedId === asset.id ? 'bg-zinc-900 border-emerald-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'}`}
                >
                   {selectedId === asset.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                   
                   <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm font-bold font-mono ${selectedId === asset.id ? 'text-white' : 'text-zinc-300'}`}>{asset.name}</span>
                      <StatusBadge status={asset.status} />
                   </div>
                   
                   <div className="flex justify-between items-end">
                      <div className="text-xs text-zinc-500">
                         <div className="flex items-center gap-1">
                            {asset.type === 'SHIP' ? <Rocket className="w-3 h-3" /> : <Car className="w-3 h-3" />}
                            <span className="uppercase">{asset.model}</span>
                         </div>
                         <div className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>{asset.location || 'Unknown'}</span>
                         </div>
                      </div>
                   </div>
                </div>
             ))
         )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
   const colors = {
      OPERATIONAL: 'text-emerald-500 bg-emerald-950/30 border-emerald-900',
      MAINTENANCE: 'text-amber-500 bg-amber-950/30 border-amber-900',
      DESTROYED: 'text-red-500 bg-red-950/30 border-red-900',
      MISSION: 'text-blue-500 bg-blue-950/30 border-blue-900',
      UNKNOWN: 'text-zinc-500 bg-zinc-950/30 border-zinc-800'
   };
   
   return (
      <span className={`text-[9px] px-1.5 py-0.5 border rounded-sm font-mono uppercase ${colors[status] || colors.UNKNOWN}`}>
         {status}
      </span>
   );
}

export function AssetFormDialog({ open, onOpenChange, trigger, asset }) {
   const queryClient = useQueryClient();
   const [loading, setLoading] = useState(false);

   const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      const formData = new FormData(e.target);
      const data = {
         name: formData.get('name'),
         model: formData.get('model'),
         type: formData.get('type'),
         status: formData.get('status'),
         location: formData.get('location'),
         coordinates: {
            x: Number(formData.get('coord_x')) || 50,
            y: Number(formData.get('coord_y')) || 50
         },
         maintenance_notes: formData.get('maintenance_notes')
      };

      try {
         if (asset) {
            await base44.entities.FleetAsset.update(asset.id, data);
            toast.success("Asset updated");
         } else {
            await base44.entities.FleetAsset.create(data);
            toast.success("Asset registered");
         }
         queryClient.invalidateQueries(['fleet-assets']);
         onOpenChange(false);
      } catch (err) {
         console.error(err);
         toast.error("Operation failed");
      } finally {
         setLoading(false);
      }
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogTrigger asChild>{trigger}</DialogTrigger>
         <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
            <DialogHeader>
               <DialogTitle className="uppercase tracking-widest text-sm font-bold">
                  {asset ? "Edit Asset Protocol" : "New Asset Registration"}
               </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label className="text-[10px] uppercase text-zinc-500">Designation Name</Label>
                     <Input name="name" defaultValue={asset?.name} required className="bg-zinc-900 border-zinc-800 text-xs" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] uppercase text-zinc-500">Model / Hull</Label>
                     <Input name="model" defaultValue={asset?.model} required className="bg-zinc-900 border-zinc-800 text-xs" />
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label className="text-[10px] uppercase text-zinc-500">Classification</Label>
                     <Select name="type" defaultValue={asset?.type || "SHIP"}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-9">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800">
                           <SelectItem value="SHIP">Starship</SelectItem>
                           <SelectItem value="VEHICLE">Ground Vehicle</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] uppercase text-zinc-500">Operational Status</Label>
                     <Select name="status" defaultValue={asset?.status || "OPERATIONAL"}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-9">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800">
                           <SelectItem value="OPERATIONAL">Operational</SelectItem>
                           <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                           <SelectItem value="MISSION">Deployed (Mission)</SelectItem>
                           <SelectItem value="DESTROYED">Destroyed</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-zinc-500">Current Location</Label>
                  <Input name="location" defaultValue={asset?.location} className="bg-zinc-900 border-zinc-800 text-xs" />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label className="text-[10px] uppercase text-zinc-500">Grid X (0-100)</Label>
                     <Input type="number" name="coord_x" defaultValue={asset?.coordinates?.x ?? 50} className="bg-zinc-900 border-zinc-800 text-xs" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] uppercase text-zinc-500">Grid Y (0-100)</Label>
                     <Input type="number" name="coord_y" defaultValue={asset?.coordinates?.y ?? 50} className="bg-zinc-900 border-zinc-800 text-xs" />
                  </div>
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-zinc-500">Maintenance Log</Label>
                  <Textarea name="maintenance_notes" defaultValue={asset?.maintenance_notes} className="bg-zinc-900 border-zinc-800 text-xs min-h-[80px]" />
               </div>

               <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-white">CANCEL</Button>
                  <Button type="submit" size="sm" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                     {loading ? "PROCESSING..." : (asset ? "UPDATE RECORD" : "REGISTER ASSET")}
                  </Button>
               </div>
            </form>
         </DialogContent>
      </Dialog>
   );
}