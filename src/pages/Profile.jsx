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
import { User, Shield, Tag, Save, History, AlertTriangle, MessageSquare, Pin, Radio, Brain, Activity, Zap, ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRankColorClass } from "@/components/utils/rankUtils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from 'framer-motion';
import AIPreferencesPanel from "@/components/profile/AIPreferencesPanel";
import ProfileOperationalView from "@/components/profile/ProfileOperationalView";
import ProfilePresenceCard from "@/components/profile/ProfilePresenceCard";
import ProfilePersonalizationPanel from "@/components/profile/ProfilePersonalizationPanel";
import ProfileActivityAnalytics from "@/components/profile/ProfileActivityAnalytics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setValue("email", currentUser.email || "");
        setValue("callsign", currentUser.callsign || "");
        setValue("rsi_handle", currentUser.rsi_handle || "");
        setValue("bio", currentUser.bio || "");
        setValue("full_name", currentUser.full_name || "");
        setValue("rank", currentUser.rank || "Vagrant");
        setProfilePicUrl(currentUser.profile_pic_url || null);
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
      // If rank was changed and user is not Vagrant, validate permission
      if (data.rank !== user?.rank) {
        const response = await base44.functions.invoke('validateRankChangePermission', {
          targetUserId: user.id,
          newRank: data.rank
        });

        if (!response.data.permitted) {
          toast.error(response.data.error);
          return;
        }
      }

      await base44.auth.updateMe({
        email: data.email,
        callsign: data.callsign,
        rsi_handle: data.rsi_handle,
        bio: data.bio,
        status: data.status,
        voyager_number: data.voyager_number,
        profile_pic_url: profilePicUrl,
        ...(data.rank !== user?.rank && { rank: data.rank })
      });

      const updatedUser = await base44.auth.me();
      setUser(updatedUser);

      // Notify header to refresh user data
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: updatedUser }));

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Update failed", error);
      toast.error("Failed to update profile");
    }
  };

  const handleAIPreferencesUpdate = async (prefs) => {
    try {
      await base44.auth.updateMe(prefs);
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: updatedUser }));
    } catch (error) {
      console.error("Failed to update AI preferences", error);
      throw error;
    }
  };

  const handleProfilePicUpload = async (file) => {
    if (!file) return;
    setIsUploadingPic(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfilePicUrl(file_url);
      toast.success("Profile picture updated");
    } catch (error) {
      console.error("Failed to upload profile picture", error);
      toast.error("Failed to upload profile picture");
    } finally {
      setIsUploadingPic(false);
    }
  };

  const hasModerationActivity = 
    (moderationActions.deletedMessages?.length > 0) || 
    (moderationActions.mutes?.length > 0) || 
    (moderationActions.pinnedMessages?.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-200 flex items-center justify-center font-mono">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm text-zinc-400">LOADING PROFILE DATA...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#09090b] text-zinc-200 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-2.5 space-y-2 flex-shrink-0 overflow-y-auto max-h-fit">
           {/* Header with Profile Picture - Compact Style */}
           <div className="border border-zinc-800 bg-gradient-to-br from-zinc-950 via-[#ea580c]/5 to-zinc-950 p-2">
              <div className="flex items-center gap-3">
                 <div className="relative group">
                    <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                       {profilePicUrl ? (
                          <img src={profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                       ) : (
                          <User className="w-8 h-8 text-zinc-500" />
                       )}
                    </div>
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded">
                       <span className="text-[8px] text-white font-bold">CHANGE</span>
                       <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleProfilePicUpload(e.target.files?.[0])}
                          disabled={isUploadingPic}
                          className="hidden"
                       />
                    </label>
                 </div>
                 <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-black uppercase tracking-tighter text-white">{user?.callsign || 'OPERATIVE'}</h1>
                    <p className="text-zinc-500 font-mono text-[9px] tracking-widest">
                       {user?.email || "LOADING..."}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                       <Badge className={cn("text-[8px] font-mono uppercase", getRankColorClass(user?.rank, 'bg'))}>
                          {user?.rank || 'VAGRANT'}
                       </Badge>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Main Content - Flex Column */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-2 space-y-0">
           <Tabs defaultValue="profile" className="w-full flex flex-col h-full">
              <TabsList className="bg-zinc-900/30 border-b border-zinc-800 mb-0 shrink-0 overflow-x-auto p-0 h-auto rounded-none">
                 <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#ea580c] data-[state=active]:bg-zinc-900/50 px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 data-[state=active]:text-white transition-colors duration-150">
                    PROFILE
                 </TabsTrigger>
                 <TabsTrigger value="operational" className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#ea580c] data-[state=active]:bg-zinc-900/50 px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 data-[state=active]:text-white transition-colors duration-150">
                    OPS
                 </TabsTrigger>
                 <TabsTrigger value="presence" className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#ea580c] data-[state=active]:bg-zinc-900/50 px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 data-[state=active]:text-white transition-colors duration-150">
                    STATUS
                 </TabsTrigger>
                 <TabsTrigger value="personality" className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#ea580c] data-[state=active]:bg-zinc-900/50 px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 data-[state=active]:text-white transition-colors duration-150">
                    ID
                 </TabsTrigger>
                 <TabsTrigger value="clearance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#ea580c] data-[state=active]:bg-zinc-900/50 px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 data-[state=active]:text-white transition-colors duration-150">
                    CLEARANCE
                 </TabsTrigger>
                 <TabsTrigger value="ai-preferences" className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#ea580c] data-[state=active]:bg-zinc-900/50 px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 data-[state=active]:text-white transition-colors duration-150 flex items-center gap-1">
                    <Brain className="w-2.5 h-2.5" />
                    AI
                 </TabsTrigger>
                 <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#ea580c] data-[state=active]:bg-zinc-900/50 px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 data-[state=active]:text-white transition-colors duration-150 flex items-center gap-1">
                    <Activity className="w-2.5 h-2.5" />
                    ACTIVITY
                 </TabsTrigger>
                 {hasModerationActivity && (
                    <TabsTrigger value="moderation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#ea580c] data-[state=active]:bg-zinc-900/50 px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 data-[state=active]:text-white transition-colors duration-150">
                       MOD LOG
                    </TabsTrigger>
                 )}
                 </TabsList>

             {/* Profile Tab */}
             <TabsContent value="profile" className="space-y-2 flex-1 min-h-0 overflow-auto p-2">
                {/* Voice Channel Status */}
                {voiceStatus && (
                   <div className="border border-zinc-800 bg-zinc-950/50">
                      <div className="border-b border-zinc-800 bg-emerald-950/20 p-1.5">
                         <div className="text-[8px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                            <Radio className="w-3 h-3 animate-pulse" />
                            Active Voice Connection
                         </div>
                      </div>
                      <div className="p-2 text-[9px] space-y-1">
                         <div className="flex justify-between">
                            <span className="text-zinc-500">Status</span>
                            <span className="font-bold text-white">{voiceStatus.status || 'READY'}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-zinc-500">Role</span>
                            <span className="font-bold text-white">{voiceStatus.role || 'OTHER'}</span>
                         </div>
                         {voiceStatus.current_location && (
                            <div className="text-zinc-400 text-[8px] font-mono">{voiceStatus.current_location}</div>
                         )}
                      </div>
                      </div>
                      )}

                {/* Squad Memberships */}
                {userSquads.length > 0 && (
                   <div className="border border-zinc-800 bg-zinc-950/50">
                      <div className="border-b border-zinc-800 bg-zinc-900/20 p-1.5">
                         <div className="text-[8px] font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-2">
                            <Shield className="w-3 h-3 text-[#ea580c]" />
                            SQUAD ASSIGNMENTS
                         </div>
                      </div>
                      <div className="p-2 space-y-1">
                         {userSquads.map((squad) => (
                            <div key={squad.id} className="p-1.5 bg-zinc-900/30 border border-zinc-800 text-[8px]">
                               <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-white text-[9px]">{squad.name}</span>
                                  <Badge className={cn(
                                     "text-[6px] font-bold px-1 py-0.5",
                                     squad.membership.role === 'leader' ? "bg-amber-500 text-black" : "bg-cyan-600 text-white"
                                  )}>
                                     {squad.membership.role.toUpperCase()}
                                  </Badge>
                               </div>
                               <div className="text-zinc-500 text-[7px]">
                                  {new Date(squad.membership.joined_date || squad.membership.created_date).toLocaleDateString()}
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                )}

                <div className="border border-zinc-800 bg-zinc-950/50">
                   <div className="border-b border-zinc-800 bg-zinc-900/20 p-1.5">
                      <div className="text-[8px] font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-2">
                         <Tag className="w-3 h-3 text-[#ea580c]" />
                         IDENTITY CONFIGURATION
                      </div>
                   </div>
                   <div className="p-2 space-y-3">
                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-[9px]">
                         <div>
                            <Label htmlFor="email" className="text-[7px] uppercase text-[#ea580c] font-bold">EMAIL</Label>
                            <Input 
                              id="email" 
                              type="email"
                              {...register("email")} 
                              className="bg-zinc-900 border-zinc-800 text-white h-7 text-[8px]"
                            />
                         </div>

                         <div>
                            <Label htmlFor="callsign" className="text-[7px] uppercase text-[#ea580c] font-bold">CALLSIGN</Label>
                            <Input 
                              id="callsign" 
                              {...register("callsign")} 
                              className="bg-zinc-900 border-zinc-800 text-white h-7 text-[8px]"
                            />
                         </div>

                         <div>
                            <Label htmlFor="rsi_handle" className="text-[7px] uppercase text-zinc-500 font-bold">RSI HANDLE</Label>
                            <Input 
                              id="rsi_handle" 
                              {...register("rsi_handle")} 
                              className="bg-zinc-900/50 border-zinc-800 text-zinc-300 h-7 text-[8px]"
                            />
                         </div>

                         <div>
                            <Label htmlFor="status" className="text-[7px] uppercase text-zinc-500 font-bold">STATUS</Label>
                            <Select defaultValue={user?.status || "active"}>
                              <SelectTrigger {...register("status")} className="bg-zinc-900 border-zinc-800 h-7 text-[8px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-800">
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="on_leave">On Leave</SelectItem>
                              </SelectContent>
                            </Select>
                         </div>

                         {user?.rank === "Voyager" && (
                           <div>
                              <Label htmlFor="voyager_number" className="text-[7px] uppercase text-[#ea580c] font-bold">VOYAGER #</Label>
                              <Input 
                                id="voyager_number" 
                                {...register("voyager_number")} 
                                className="bg-zinc-900 border-zinc-800 text-white h-7 text-[8px]"
                              />
                           </div>
                         )}

                         {user?.rank === 'Vagrant' && (
                           <div className="pt-2 border-t border-zinc-800">
                              <Label htmlFor="rank" className="text-[7px] uppercase text-[#ea580c] font-bold">CLEARANCE LEVEL</Label>
                              <select 
                                {...register("rank")}
                                className="w-full h-7 border border-zinc-800 bg-zinc-900 text-[8px] focus:ring-1 focus:ring-[#ea580c]"
                              >
                                <option value="Vagrant">Vagrant</option>
                                <option value="Scout">Scout</option>
                                <option value="Voyager">Voyager</option>
                                <option value="Founder">Founder</option>
                                <option value="Pioneer">Pioneer</option>
                              </select>
                           </div>
                         )}

                         <div className="pt-2 flex justify-end border-t border-zinc-800">
                            <Button 
                              type="submit" 
                              disabled={isSubmitting}
                              className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-[8px] font-bold h-6 px-2"
                            >
                               <Save className="w-3 h-3 mr-1" />
                               {isSubmitting ? "SAVING..." : "SAVE"}
                            </Button>
                         </div>
                      </form>
                   </div>
                   </div>
                   </TabsContent>

                   {/* Operational Tab */}
                   <TabsContent value="operational" className="space-y-2 flex-1 min-h-0 overflow-auto p-2">
                {user && (
                   <ProfileOperationalView 
                      user={user} 
                      onUpdate={handleAIPreferencesUpdate}
                   />
                )}
             </TabsContent>

             {/* Presence Tab */}
             <TabsContent value="presence" className="space-y-2 flex-1 min-h-0 overflow-auto p-2">
                {user && (
                   <ProfilePresenceCard 
                      user={user} 
                      onUpdate={handleAIPreferencesUpdate}
                   />
                )}
             </TabsContent>

             {/* Personality Tab */}
             <TabsContent value="personality" className="space-y-2 flex-1 min-h-0 overflow-auto p-2">
                {user && (
                   <ProfilePersonalizationPanel 
                      user={user} 
                      onUpdate={handleAIPreferencesUpdate}
                   />
                )}
             </TabsContent>

             {/* AI Customization Tab */}
             <TabsContent value="ai-preferences" className="space-y-2 flex-1 min-h-0 overflow-auto p-2">
                {user && (
                   <AIPreferencesPanel 
                      user={user} 
                      onUpdate={handleAIPreferencesUpdate}
                   />
                )}
             </TabsContent>

             {/* Activity Analytics Tab */}
             <TabsContent value="activity" className="space-y-2 flex-1 min-h-0 overflow-auto p-2">
                {user && (
                   <ProfileActivityAnalytics user={user} />
                )}
             </TabsContent>

             {/* Clearance & Roles Tab */}
             <TabsContent value="clearance" className="space-y-2 flex-1 min-h-0 overflow-auto p-2">
                <div className="border border-zinc-800 bg-zinc-950/50">
                   <div className="border-b border-zinc-800 bg-zinc-900/20 p-1.5">
                      <div className="text-[8px] font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-2">
                         <Shield className="w-3 h-3 text-[#ea580c]" />
                         CLEARANCE LEVEL
                      </div>
                   </div>
                   <div className="p-2">
                      <div className="flex items-center gap-2 text-[8px]">
                         <Badge className={cn("text-[8px] font-mono uppercase", getRankColorClass(user?.rank, 'bg'))}>
                            {user?.rank || "VAGRANT"}
                         </Badge>
                         {user?.role === 'admin' && <Badge className="bg-red-600 text-white text-[7px]">ADMIN</Badge>}
                         {user?.is_shaman && <Badge className="bg-yellow-500 text-black text-[7px]">SHAMAN</Badge>}
                      </div>
                   </div>
                </div>

                {user?.role_tags && user.role_tags.length > 0 && (
                   <div className="border border-zinc-800 bg-zinc-950/50">
                      <div className="border-b border-zinc-800 bg-zinc-900/20 p-1.5">
                         <div className="text-[8px] font-bold text-zinc-300 uppercase tracking-wide">ROLE TAGS</div>
                      </div>
                      <div className="p-2 flex flex-wrap gap-1">
                         {user.role_tags.map((tag, idx) => (
                            <Badge key={idx} className="bg-emerald-600 text-white text-[7px] font-bold">
                               {tag}
                            </Badge>
                         ))}
                      </div>
                   </div>
                )}

                {assignedRoles.length > 0 && (
                   <div className="border border-zinc-800 bg-zinc-950/50">
                      <div className="border-b border-zinc-800 bg-zinc-900/20 p-1.5">
                         <div className="text-[8px] font-bold text-zinc-300 uppercase tracking-wide">ASSIGNED ROLES</div>
                      </div>
                      <div className="p-2 space-y-1">
                         {assignedRoles.map((role) => (
                            <div key={role.id} className="p-1.5 bg-zinc-900/30 border border-zinc-800 text-[8px]">
                               <div className="font-bold text-white text-[9px]">{role.name}</div>
                               {role.description && (
                                  <div className="text-zinc-500 text-[7px] mt-0.5">{role.description}</div>
                               )}
                               {role.permissions && role.permissions.length > 0 && (
                                  <div className="flex flex-wrap gap-0.5 mt-1">
                                     {role.permissions.map((perm, idx) => (
                                        <Badge key={idx} className="text-[6px] bg-purple-600 text-white font-bold px-1">
                                           {perm}
                                        </Badge>
                                     ))}
                                  </div>
                               )}
                            </div>
                         ))}
                      </div>
                   </div>
                )}
             </TabsContent>

             {/* Moderation History Tab */}
             {hasModerationActivity && (
                <TabsContent value="moderation" className="space-y-2 flex-1 min-h-0 overflow-auto p-2">
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
                                        <Badge className={`text-[10px] font-bold ${mute.is_active ? "bg-red-600 text-white border-red-400" : "bg-zinc-600 text-white border-zinc-400"}`}>
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
          </div>
          </div>
          );
          }