import { MessageSquare, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PioneerUplink() {
  return (
    <div className="w-full border-2 border-orange-700 bg-zinc-950 p-4 flex items-center justify-between group hover:bg-zinc-900 transition-colors">
      <div>
        <div className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-1">
          Command Authority
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-orange-600 fill-orange-600" />
          <div className="font-black text-white text-lg uppercase tracking-tight">
            The Pioneer
          </div>
        </div>
        <div className="text-xs font-mono text-zinc-500 pl-7">
          Ref: MurphyJack 1
        </div>
      </div>
      
      <Button 
        variant="outline" 
        size="icon"
        className="border-orange-900 text-orange-600 hover:bg-orange-950 hover:text-orange-500 hover:border-orange-700 rounded-none h-10 w-10"
      >
        <MessageSquare className="w-5 h-5" />
      </Button>
    </div>
  );
}