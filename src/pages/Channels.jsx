import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Hash, Mic, EyeOff, Edit3 } from "lucide-react";
import { canAccessChannel, canPostInChannel } from "@/components/permissions";

export default function ChannelsPage() {
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: () => base44.entities.Channel.list(),
    initialData: []
  });

  if (isLoading) return <div className="p-10 text-zinc-500">Loading Channels...</div>;
  if (!currentUser) return <div className="p-10 text-zinc-500">Please log in to view channels.</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-black uppercase tracking-tight mb-8 text-white">Comms Channels</h1>
        
        <div className="grid gap-4">
          {channels.map(channel => {
            const accessible = canAccessChannel(currentUser, channel);
            const canPost = canPostInChannel(currentUser, channel);
            
            if (!accessible) {
              // Optionally hide completely, but for demo we show as locked
              return (
                <Card key={channel.id} className="bg-zinc-900/30 border-zinc-800 opacity-50">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                       <CardTitle className="text-sm font-mono text-zinc-600 flex items-center gap-2">
                         <Lock className="w-4 h-4" /> {channel.name}
                       </CardTitle>
                       <Badge variant="outline" className="border-zinc-800 text-zinc-600">RESTRICTED</Badge>
                    </div>
                  </CardHeader>
                </Card>
              );
            }

            return (
              <Card key={channel.id} className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-zinc-200 flex items-center gap-2">
                      {channel.type === 'voice' ? <Mic className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                      {channel.name}
                    </CardTitle>
                    <div className="flex gap-2">
                      {channel.access_min_rank && (
                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
                          {channel.access_min_rank}+
                        </Badge>
                      )}
                      {channel.is_read_only && (
                         <Badge variant="destructive" className="bg-red-950 text-red-400 border-red-900">READ ONLY</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                   <div className="text-sm text-zinc-500 mb-4">
                      Category: <span className="text-zinc-300 uppercase">{channel.category}</span>
                   </div>
                   
                   {/* Permission Debug / Status */}
                   <div className="p-3 bg-zinc-950 rounded border border-zinc-800 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Your Access Status:</span>
                      <div className="flex gap-3">
                         <span className="text-emerald-500 font-bold">VIEW GRANTED</span>
                         {canPost ? (
                            <span className="text-emerald-500 font-bold">POST GRANTED</span>
                         ) : (
                            <span className="text-red-500 font-bold flex items-center gap-1">
                               <EyeOff className="w-3 h-3" /> POST DENIED
                            </span>
                         )}
                      </div>
                   </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}