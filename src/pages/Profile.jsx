import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Shield, Tag, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  const onSubmit = async (data) => {
    try {
      await base44.auth.updateMe({
        callsign: data.callsign,
        rsi_handle: data.rsi_handle,
        rank: data.rank // Saving rank from the override
      });
      
      toast.success("Profile updated successfully");
      // Reload user to reflect changes
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
    } catch (error) {
      console.error("Update failed", error);
      toast.error("Failed to update profile");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-zinc-200 flex items-center justify-center font-mono">
        LOADING PROFILE DATA...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-200 p-6 flex flex-col items-center font-sans">
       <div className="max-w-2xl w-full space-y-6">
          <div className="flex items-center gap-4 mb-8">
             <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <User className="w-8 h-8 text-zinc-500" />
             </div>
             <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Operative Profile</h1>
                <p className="text-zinc-500 font-mono text-xs tracking-widest">IDENTITY // CLEARANCE // TAGS</p>
             </div>
          </div>

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

                   {/* Temporary Dev Override for Rank */}
                   <div className="grid gap-2 pt-4 border-t border-zinc-900/50">
                      <Label htmlFor="rank" className="text-xs uppercase text-zinc-500 font-bold">Clearance Level (Dev Override)</Label>
                      <select 
                        {...register("rank")}
                        className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ea580c] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Vagrant">Vagrant</option>
                        <option value="Scout">Scout</option>
                        <option value="Voyager">Voyager</option>
                        <option value="Founder">Founder</option>
                        <option value="Pioneer">Pioneer (Admin)</option>
                      </select>
                      <p className="text-[10px] text-zinc-600">Set your rank manually to access restricted systems.</p>
                   </div>

                   <div className="pt-4 flex items-center justify-between border-t border-zinc-900">
                      <div className="flex flex-col gap-1">
                         <span className="text-[10px] uppercase text-zinc-500 font-bold">Current Clearance</span>
                         <Badge variant="outline" className="w-fit border-zinc-700 text-zinc-400 font-mono">
                            {user?.rank || "VAGRANT"}
                         </Badge>
                      </div>
                      
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold uppercase tracking-wider"
                      >
                         {isSubmitting ? "Updating..." : "Save Changes"}
                      </Button>
                   </div>
                </form>
             </CardContent>
          </Card>
       </div>
    </div>
  );
}