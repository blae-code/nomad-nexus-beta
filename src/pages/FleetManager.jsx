import AssetList, { AssetFormDialog } from '@/components/assets/AssetList';
import TacticalMap from '@/components/ops/TacticalMap';
import { useState } from 'react';
import { Rocket, Activity, Shield, Edit, Trash2, Wrench } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function FleetManagerPage() {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
     mutationFn: (id) => base44.entities.FleetAsset.delete(id),
     onSuccess: () => {
        toast.success("Asset decommissioned");
        queryClient.invalidateQueries(['fleet-assets']);
        setSelectedAsset(null);
     }
  });

  return (
    <div className="h-full flex bg-[#09090b] text-zinc-200 font-sans pt-14">
       {/* Left Sidebar: Asset List */}
       <div className="w-80 shrink-0 h-full border-r border-zinc-800 overflow-y-auto">
          <AssetList onSelect={setSelectedAsset} selectedId={selectedAsset?.id} />
       </div>

       {/* Main Content: Detail View & Map */}
       <div className="flex-1 flex flex-col min-w-0">
           {selectedAsset ? (
              <div className="flex-1 flex flex-col">
                 {/* Asset Header */}
                 <div className="h-16 border-b border-zinc-800 bg-zinc-950 px-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                          {selectedAsset.type === 'SHIP' ? <Rocket className="w-5 h-5 text-[#ea580c]" /> : <Activity className="w-5 h-5 text-[#ea580c]" />}
                       </div>
                       <div>
                          <h1 className="text-sm font-black uppercase tracking-wider text-white">{selectedAsset.name}</h1>
                          <div className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">{selectedAsset.model} • {selectedAsset.status}</div>
                       </div>
                    </div>
                   
                   <div className="flex gap-2">
                      <AssetFormDialog 
                         open={isEditOpen} 
                         onOpenChange={setIsEditOpen} 
                         asset={selectedAsset}
                         trigger={
                            <button className="flex items-center gap-1.5 px-2.5 py-1.5 border border-zinc-800/50 bg-zinc-900/40 hover:border-[#ea580c]/50 hover:bg-zinc-900/60 transition-all duration-100 text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:text-[#ea580c]">
                               <Edit className="w-3 h-3" /> EDIT
                            </button>
                         } 
                      />
                      <button 
                         onClick={() => {
                            if (confirm('Confirm decommissioning of this asset?')) {
                               deleteMutation.mutate(selectedAsset.id);
                            }
                         }}
                         className="flex items-center gap-1.5 px-2.5 py-1.5 border border-red-800/50 bg-red-950/20 hover:border-red-700/50 hover:bg-red-950/40 transition-all duration-100 text-[9px] font-bold uppercase tracking-wider text-red-600 hover:text-red-500"
                      >
                         <Trash2 className="w-3 h-3" /> DELETE
                      </button>
                   </div>
                </div>

                {/* Asset Detail Body */}
                <div className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-y-auto">
                   
                   {/* Status & Location Card */}
                   <div className="col-span-4 space-y-6">
                      <div className="bg-zinc-950 border border-zinc-800 p-4">
                         <h3 className="text-xs font-bold uppercase text-zinc-500 mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Telemetry
                         </h3>
                         <div className="space-y-4">
                            <div className="flex justify-between border-b border-zinc-900 pb-2">
                               <span className="text-xs text-zinc-400">STATUS</span>
                               <span className={`text-xs font-bold font-mono ${getStatusColor(selectedAsset.status)}`}>{selectedAsset.status}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-900 pb-2">
                               <span className="text-xs text-zinc-400">LOCATION</span>
                               <span className="text-xs font-mono text-white">{selectedAsset.location || 'UNKNOWN'}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-900 pb-2">
                               <span className="text-xs text-zinc-400">GRID REF</span>
                               <span className="text-xs font-mono text-white">X:{selectedAsset.coordinates?.x} Y:{selectedAsset.coordinates?.y}</span>
                            </div>
                            <div className="flex justify-between">
                               <span className="text-xs text-zinc-400">COMMANDER</span>
                               <span className="text-xs font-mono text-white">{selectedAsset.assigned_user_id ? 'ASSIGNED' : 'UNASSIGNED'}</span>
                            </div>
                         </div>
                      </div>

                      <div className="bg-zinc-950 border border-zinc-800 p-4">
                         <h3 className="text-xs font-bold uppercase text-zinc-500 mb-4 flex items-center gap-2">
                            <Wrench className="w-4 h-4" /> Maintenance Log
                         </h3>
                         <div className="p-3 bg-zinc-900/50 border border-zinc-900 text-xs font-mono text-zinc-400 min-h-[100px]">
                            {selectedAsset.maintenance_notes || "No logs recorded."}
                         </div>
                      </div>
                   </div>

                   {/* Tactical View of Asset */}
                   <div className="col-span-8 bg-zinc-900/20 border border-zinc-800 relative min-h-[400px] flex flex-col">
                      <div className="absolute top-0 left-0 right-0 bg-zinc-950/80 border-b border-zinc-800 p-2 z-10 flex justify-between items-center">
                         <div className="text-[10px] font-bold uppercase text-emerald-500 tracking-widest pl-2">Asset Tactical Feed</div>
                         <div className="text-[10px] font-mono text-zinc-600">LIVE LINK ESTABLISHED</div>
                      </div>
                      <div className="flex-1 relative">
                         {/* Reuse TacticalMap but highlight selected asset maybe? For now just show the map */}
                         <TacticalMap className="w-full h-full" />
                         
                         {/* Highlight Indicator (Fake) */}
                         {selectedAsset.coordinates && (
                            <div 
                               className="absolute w-8 h-8 border-2 border-emerald-500 rounded-full animate-ping pointer-events-none"
                               style={{ 
                                  top: `${selectedAsset.coordinates.y}%`, 
                                  left: `${selectedAsset.coordinates.x}%`,
                                  transform: 'translate(-50%, -50%)'
                               }}
                            />
                         )}
                      </div>
                   </div>

                </div>
             </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                <Shield className="w-16 h-16 mb-4 opacity-20" />
                <h2 className="text-lg font-black uppercase tracking-tighter">FLEET COMMAND</h2>
                <p className="text-xs font-mono mt-2 tracking-widest text-zinc-700">SELECT AN ASSET FROM THE MANIFEST</p>
             </div>
          )}
       </div>
    </div>
  );
}

function getStatusColor(status) {
   switch (status) {
      case 'OPERATIONAL': return 'text-emerald-500';
      case 'MAINTENANCE': return 'text-amber-500';
      case 'DESTROYED': return 'text-red-500';
      case 'MISSION': return 'text-blue-500';
      default: return 'text-zinc-500';
   }
}