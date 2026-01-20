import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Shield, Tag, Save, History, AlertTriangle, MessageSquare, Pin, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRankColorClass } from "@/components/utils/rankUtils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setValue("callsign", currentUser.callsign || "");
        setValue("rsi_handle", currentUser.rsi_handle || "");
        setValue("bio", currentUser.bio || "");
        setValue("full_name", currentUser.full_name || "");
        setValue("rank", currentUser.rank || "Vagrant");
      } catch (error) {
        console.error("Failed to load user", error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [setValue]);

  // Fetch moderation actions (only if user has moderation privileges)
  const { data: moderationActions = [] } = useQuery({
    queryKey: ['moderation-actions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch messages deleted by this user
      const deletedMessages = await base44.entities.Message.filter({ deleted_by: user.id });
      
      // Fetch channel mutes issued by this user
      const mutes = await base44.entities.ChannelMute.filter({ muted_by: user.id });
      
      // Fetch pinned messages by this user
      const pinnedMessages = await base44.entities.PinnedMessage.filter({ pinned_by: user.id });
      
      return { deletedMessages, mutes, pinnedMessages };
    },
    enabled: !!user
  });

  // Fetch assigned roles
  const { data: assignedRoles = [] } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.assigned_role_ids || user.assigned_role_ids.length === 0) return [];
      
      const roles = await Promise.all(
        user.assigned_role_ids.map(roleId => 
          base44.entities.Role.get(roleId).catch(() => null)
        )
      );
      
      return roles.filter(Boolean);
    },
    enabled: !!user?.assigned_role_ids
  });

  // Fetch current voice channel status
  const { data: voiceStatus } = useQuery({
    queryKey: ['voice-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Check if user has an active voice net connection
      // This would be populated by the voice system when user joins
      const playerStatus = await base44.entities.PlayerStatus.filter({ 
        user_id: user.id 
      });
      
      return playerStatus[0] || null;
    },
    enabled: !!user,
    refetchInterval: 5000
  });

  // Fetch squad memberships
  const { data: squadMemberships = [] } = useQuery({
    queryKey: ['user-squad-memberships', user?.id],
    queryFn: () => base44.entities.SquadMembership.filter({ user_id: user.id, status: 'active' }),
    enabled: !!user
  });

  const { data: userSquads = [] } = useQuery({
    queryKey: ['user-squads', squadMemberships.map(m => m.squad_id).join(',')],
    queryFn: async () => {
      if (squadMemberships.length === 0) return [];
      const squads = await Promise.all(
        squadMemberships.map(m => 
          base44.entities.Squad.get(m.squad_id).catch(() => null)
        )
      );
      return squads.filter(Boolean).map((squad, idx) => ({
        ...squad,
        membership: squadMemberships[idx]
      }));
    },
    enabled: squadMemberships.length > 0
  });

  const onSubmit = async (data) => {
    try {
      await base44.auth.updateMe({
        callsign: data.callsign,
        rsi_handle: data.rsi_handle,
        bio: data.bio,
        rank: data.rank // Dev override only
      });
      
      toast.success("Profile updated successfully");
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
    } catch (error) {
      console.error("Update failed", error);
      toast.error("Failed to update profile");
    }
  };

  const hasModerationActivity = 
    (moderationActions.deletedMessages?.length > 0) || 
    (moderationActions.mutes?.length > 0) || 
    (moderationActions.pinnedMessages?.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-zinc-200 flex items-center justify-center font-mono">
        LOADING PROFILE DATA...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 p-6 overflow-auto">
       <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
             <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <User className="w-8 h-8 text-zinc-500" />
             </div>
             <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Operative Profile</h1>
                <p className="text-zinc-500 font-mono text-xs tracking-widest">
                   {user?.email || "LOADING..."}
                </p>
             </div>
          </div>

          <Tabs defaultValue="profile" className="w-full">
             <TabsList className="bg-zinc-900 border border-zinc-800 mb-6">
                <TabsTrigger value="profile" className="data-[state=active]:bg-[#ea580c] data-[state=active]:text-white">
                   Profile
                </TabsTrigger>
                <TabsTrigger value="clearance" className="data-[state=active]:bg-[#ea580c] data-[state=active]:text-white">
                   Clearance & Roles
                </TabsTrigger>
                {hasModerationActivity && (
                   <TabsTrigger value="moderation" className="data-[state=active]:bg-[#ea580c] data-[state=active]:text-white">
                      Moderation History
                   </TabsTrigger>
                )}
             </TabsList>

             {/* Profile Tab */}
             <TabsContent value="profile" className="space-y-6">
                {/* Voice Channel Status */}
                {voiceStatus && (
                   <Card className="bg-zinc-950 border-zinc-800">
                      <CardHeader className="border-b border-zinc-900 bg-emerald-950/20">
                         <CardTitle className="text-lg font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                            <Radio className="w-4 h-4 animate-pulse" />
                            Active Voice Connection
                         </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                         <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                               <div className="text-zinc-500 text-xs mb-1">Status</div>
                               <div className="font-bold text-white">{voiceStatus.status || 'READY'}</div>
                            </div>
                            <div>
                               <div className="text-zinc-500 text-xs mb-1">Role</div>
                               <div className="font-bold text-white">{voiceStatus.role || 'OTHER'}</div>
                            </div>
                            {voiceStatus.current_location && (
                               <div className="col-span-2">
                                  <div className="text-zinc-500 text-xs mb-1">Current Location</div>
                                  <div className="font-mono text-zinc-300 text-xs">{voiceStatus.current_location}</div>
                               </div>
                            )}
                         </div>
                      </CardContent>
                   </Card>
                )}

                {/* Squad Memberships */}
                {userSquads.length > 0 && (
                   <Card className="bg-zinc-950 border-zinc-800">
                      <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
                         <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#ea580c]" />
                            Squad Assignments
                         </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                         <div className="space-y-3">
                            {userSquads.map((squad) => (
                               <div key={squad.id} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                                  <div className="flex items-center justify-between mb-2">
                                     <div className="font-bold text-white">{squad.name}</div>
                                     <Badge className={cn(
                                        "text-[9px]",
                                        squad.membership.role === 'leader' ? "bg-[#ea580c] text-white" : "bg-zinc-800 text-zinc-400"
                                     )}>
                                        {squad.membership.role}
                                     </Badge>
                                  </div>
                                  {squad.description && (
                                     <div className="text-xs text-zinc-500">{squad.description}</div>
                                  )}
                                  <div className="text-[10px] text-zinc-600 mt-2">
                                     {squad.hierarchy_level} • Joined {new Date(squad.membership.joined_date || squad.membership.created_date).toLocaleDateString()}
                                  </div>
                               </div>
                            ))}
                         </div>
                      </CardContent>
                   </Card>
                )}

                <Card className="bg-zinc-950 border-zinc-800">
                   <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
                      <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                         <Shield className="w-4 h-4 text-[#ea580c]" />
                         Identity Configuration
                      </CardTitle>
                      <CardDescription className="text-xs font-mono text-zinc-600">
                         Update your handle and display preferences.
                      </CardDescription>
                   </CardHeader>
                   <CardContent className="p-6 space-y-6">
                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                         <div className="grid gap-2">
                            <Label htmlFor="full_name" className="text-xs uppercase text-zinc-500 font-bold">Registered Name (Read Only)</Label>
                            <Input 
                              id="full_name" 
                              {...register("full_name")} 
                              disabled 
                              className="bg-zinc-900/50 border-zinc-800 text-zinc-500"
                            />
                         </div>

                         <div className="grid gap-2">
                            <Label htmlFor="callsign" className="text-xs uppercase text-[#ea580c] font-bold">Callsign / Display Name</Label>
                            <Input 
                              id="callsign" 
                              {...register("callsign")} 
                              className="bg-zinc-900 border-zinc-800 text-white font-mono focus:border-[#ea580c]"
                              placeholder="e.g. System Admin, Maverick..."
                            />
                         </div>

                         <div className="grid gap-2">
                            <Label htmlFor="rsi_handle" className="text-xs uppercase text-zinc-500 font-bold">RSI Handle (In-Game)</Label>
                            <Input 
                              id="rsi_handle" 
                              {...register("rsi_handle")} 
                              className="bg-zinc-900/50 border-zinc-800 text-zinc-300 font-mono"
                              placeholder="Your Star Citizen handle"
                            />
                         </div>

                         <div className="grid gap-2">
                            <Label htmlFor="bio" className="text-xs uppercase text-zinc-500 font-bold">Bio / About</Label>
                            <Textarea 
                              id="bio" 
                              {...register("bio")} 
                              className="bg-zinc-900/50 border-zinc-800 text-zinc-300 min-h-[100px]"
                              placeholder="Tell us about yourself..."
                            />
                         </div>

                         {/* Temporary Dev Override for Rank */}
                         <div className="grid gap-2 pt-4 border-t border-zinc-900/50">
                            <Label htmlFor="rank" className="text-xs uppercase text-zinc-500 font-bold">Clearance Level (Dev Override)</Label>
                            <select 
                              {...register("rank")}
                              className="flex h-9 w-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ea580c]"
                            >
                              <option value="Vagrant">Vagrant</option>
                              <option value="Scout">Scout</option>
                              <option value="Voyager">Voyager</option>
                              <option value="Founder">Founder</option>
                              <option value="Pioneer">Pioneer</option>
                            </select>
                            <p className="text-[10px] text-zinc-600">Dev mode: Set rank manually to access restricted systems.</p>
                         </div>

                         <div className="pt-4 flex items-center justify-end border-t border-zinc-900">
                            <Button 
                              type="submit" 
                              disabled={isSubmitting}
                              className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold uppercase tracking-wider"
                            >
                               <Save className="w-4 h-4 mr-2" />
                               {isSubmitting ? "Updating..." : "Save Changes"}
                            </Button>
                         </div>
                      </form>
                   </CardContent>
                </Card>
             </TabsContent>

             {/* Clearance & Roles Tab */}
             <TabsContent value="clearance" className="space-y-6">
                <Card className="bg-zinc-950 border-zinc-800">
                   <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
                      <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                         <Shield className="w-4 h-4 text-[#ea580c]" />
                         Clearance Level
                      </CardTitle>
                   </CardHeader>
                   <CardContent className="p-6">
                      <div className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800">
                         <Badge 
                           className={cn(
                             "px-3 py-1 text-sm font-mono uppercase",
                             getRankColorClass(user?.rank, 'bg')
                           )}
                         >
                            {user?.rank || "VAGRANT"}
                         </Badge>
                         <div className="text-xs text-zinc-500">
                            {user?.role === 'admin' && <span className="text-[#ea580c] font-bold">SYSTEM ADMIN</span>}
                            {user?.is_shaman && <span className="text-yellow-500 font-bold ml-2">SHAMAN</span>}
                         </div>
                      </div>
                   </CardContent>
                </Card>

                <Card className="bg-zinc-950 border-zinc-800">
                   <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
                      <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                         <Tag className="w-4 h-4 text-[#ea580c]" />
                         Role Tags
                      </CardTitle>
                      <CardDescription className="text-xs font-mono text-zinc-600">
                         Specialty roles and certifications
                      </CardDescription>
                   </CardHeader>
                   <CardContent className="p-6">
                      {user?.role_tags && user.role_tags.length > 0 ? (
                         <div className="flex flex-wrap gap-2">
                            {user.role_tags.map((tag, idx) => (
                               <Badge key={idx} variant="outline" className="border-[#ea580c] text-[#ea580c] font-mono">
                                  {tag}
                               </Badge>
                            ))}
                         </div>
                      ) : (
                         <p className="text-sm text-zinc-500">No role tags assigned</p>
                      )}
                   </CardContent>
                </Card>

                <Card className="bg-zinc-950 border-zinc-800">
                   <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
                      <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                         <Shield className="w-4 h-4 text-[#ea580c]" />
                         Assigned Roles
                      </CardTitle>
                      <CardDescription className="text-xs font-mono text-zinc-600">
                         Formal roles with permissions
                      </CardDescription>
                   </CardHeader>
                   <CardContent className="p-6">
                      {assignedRoles.length > 0 ? (
                         <div className="space-y-3">
                            {assignedRoles.map((role) => (
                               <div key={role.id} className="p-3 bg-zinc-900/50 border border-zinc-800">
                                  <div className="font-bold text-white text-sm">{role.name}</div>
                                  {role.description && (
                                     <div className="text-xs text-zinc-500 mt-1">{role.description}</div>
                                  )}
                                  {role.permissions && role.permissions.length > 0 && (
                                     <div className="flex flex-wrap gap-1 mt-2">
                                        {role.permissions.map((perm, idx) => (
                                           <Badge key={idx} variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                                              {perm}
                                           </Badge>
                                        ))}
                                     </div>
                                  )}
                               </div>
                            ))}
                         </div>
                      ) : (
                         <p className="text-sm text-zinc-500">No formal roles assigned</p>
                      )}
                   </CardContent>
                </Card>
             </TabsContent>

             {/* Moderation History Tab */}
             {hasModerationActivity && (
                <TabsContent value="moderation" className="space-y-6">
                   {/* Deleted Messages */}
                   {moderationActions.deletedMessages?.length > 0 && (
                      <Card className="bg-zinc-950 border-zinc-800">
                         <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
                            <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                               <AlertTriangle className="w-4 h-4 text-red-500" />
                               Deleted Messages
                            </CardTitle>
                         </CardHeader>
                         <CardContent className="p-6">
                            <div className="space-y-2">
                               {moderationActions.deletedMessages.map((msg) => (
                                  <div key={msg.id} className="p-3 bg-zinc-900/50 border border-zinc-800 text-xs">
                                     <div className="text-zinc-500 mb-1">
                                        {msg.deleted_at && format(new Date(msg.deleted_at), 'MMM d, yyyy HH:mm')}
                                     </div>
                                     <div className="text-zinc-400 line-through">"{msg.content?.substring(0, 100)}..."</div>
                                  </div>
                               ))}
                            </div>
                         </CardContent>
                      </Card>
                   )}

                   {/* Channel Mutes */}
                   {moderationActions.mutes?.length > 0 && (
                      <Card className="bg-zinc-950 border-zinc-800">
                         <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
                            <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                               <MessageSquare className="w-4 h-4 text-yellow-500" />
                               Issued Mutes
                            </CardTitle>
                         </CardHeader>
                         <CardContent className="p-6">
                            <div className="space-y-2">
                               {moderationActions.mutes.map((mute) => (
                                  <div key={mute.id} className="p-3 bg-zinc-900/50 border border-zinc-800 text-xs">
                                     <div className="flex items-center justify-between mb-1">
                                        <Badge variant={mute.is_active ? "destructive" : "outline"} className="text-[10px]">
                                           {mute.is_active ? "ACTIVE" : "EXPIRED"}
                                        </Badge>
                                        {mute.expires_at && (
                                           <span className="text-zinc-500">
                                              Expires: {format(new Date(mute.expires_at), 'MMM d, yyyy HH:mm')}
                                           </span>
                                        )}
                                     </div>
                                     {mute.reason && <div className="text-zinc-400">Reason: {mute.reason}</div>}
                                  </div>
                               ))}
                            </div>
                         </CardContent>
                      </Card>
                   )}

                   {/* Pinned Messages */}
                   {moderationActions.pinnedMessages?.length > 0 && (
                      <Card className="bg-zinc-950 border-zinc-800">
                         <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
                            <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                               <Pin className="w-4 h-4 text-blue-500" />
                               Pinned Messages
                            </CardTitle>
                         </CardHeader>
                         <CardContent className="p-6">
                            <div className="space-y-2">
                               {moderationActions.pinnedMessages.map((pin) => (
                                  <div key={pin.id} className="p-3 bg-zinc-900/50 border border-zinc-800 text-xs">
                                     <div className="text-zinc-400">
                                        Pinned message in channel (ID: {pin.channel_id})
                                     </div>
                                     <div className="text-zinc-500 text-[10px] mt-1">
                                        Pin Order: {pin.pin_order}
                                     </div>
                                  </div>
                               ))}
                            </div>
                         </CardContent>
                      </Card>
                   )}
                </TabsContent>
             )}
          </Tabs>
       </div>
    </div>
  );
}