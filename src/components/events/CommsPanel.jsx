import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Radio } from "lucide-react";

export default function CommsPanel({ eventId }) {
  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-wider">
          <Radio className="w-4 h-4" />
          Comms Panel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 rounded border border-dashed border-zinc-800 bg-zinc-900/50 text-center">
          <p className="text-xs text-zinc-500 font-mono">
            // COMMS LINK OFFLINE //
            <br />
            VoiceNet Interface Placeholder
          </p>
        </div>
      </CardContent>
    </Card>
  );
}