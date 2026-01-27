import RankVisualizer from "@/components/dashboard/RankVisualizer";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Shield } from "lucide-react";

export default function RanksPage() {
   const { data: user } = useQuery({
      queryKey: ['ranks-user'],
      queryFn: () => base44.auth.me().catch(() => null)
   });

   return (
      <div className="h-full p-8 bg-black text-zinc-200 overflow-y-auto">
         <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-4">
               <Shield className="w-8 h-8 text-[#ea580c]" />
               <div>
                  <h1 className="text-3xl font-black uppercase tracking-widest text-white">Clearance Protocols</h1>
                  <p className="text-zinc-500 font-mono text-sm">ORGANIZATIONAL HIERARCHY & ACCESS LEVELS</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Rank Ladder */}
               <div className="h-[600px]">
                  <RankVisualizer currentRank={user?.rank || 'Vagrant'} />
               </div>

               {/* Details Panel */}
               <div className="space-y-6">
                  <div className="bg-zinc-900/30 border border-zinc-800 p-6">
                     <h2 className="text-xl font-bold text-[#ea580c] mb-4 uppercase tracking-wider">Current Standing</h2>
                     <div className="flex items-center gap-4 mb-4">
                        <div className="text-4xl font-black font-mono text-white">{user?.rank || 'VAGRANT'}</div>
                     </div>
                     <p className="text-sm text-zinc-400 leading-relaxed">
                        Your current clearance level dictates your access to communications, armory resources, and operational command.
                        Maintain active status and contribute to operations to be considered for promotion.
                     </p>
                  </div>

                  <div className="bg-zinc-900/30 border border-zinc-800 p-6">
                     <h2 className="text-lg font-bold text-zinc-300 mb-4 uppercase tracking-wider">Promotion Criteria</h2>
                     <ul className="space-y-3 text-sm text-zinc-400 list-disc list-inside">
                        <li><strong className="text-zinc-200">Vagrant to Scout:</strong> Complete 3 operations and training module.</li>
                        <li><strong className="text-zinc-200">Scout to Voyager:</strong> 3 months active service + leadership recommendation.</li>
                        <li><strong className="text-zinc-200">Voyager to Founder:</strong> Exceptional contribution and organizational leadership.</li>
                     </ul>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}