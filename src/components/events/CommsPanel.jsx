import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Radio } from "lucide-react";

export default function CommsPanel({ eventId }) {
  return (
    <Card className="bg-slate-50 border-dashed border-2 border-slate-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
          <Radio className="w-4 h-4" />
          Comms Panel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-24 flex items-center justify-center text-slate-400 text-xs italic">
          Voice Nets & LiveKit Integration Placeholder
        </div>
      </CardContent>
    </Card>
  );
}