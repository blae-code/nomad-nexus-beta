import React from "react";
import { Shield, Copy, Mail, Zap, Lock, Activity, Badge as BadgeIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function UserProfileCard({ 
  user, 
  roles, 
  onRoleToggle, 
  onRankChange, 
  isAdmin,
  currentUser 
}) {
  const canEdit = isAdmin || currentUser?.rank === "Pioneer";
  const [editingRank, setEditingRank] = React.useState(false);
  const [newRank, setNewRank] = React.useState(user?.rank || "");

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(user.email);
    toast.success("Email copied");
  };

  const handleRankSave = () => {
    if (newRank && newRank !== user.rank) {
      // TODO: Implement rank update mutation
      toast.success(`Rank updated to ${newRank}`);
      setEditingRank(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#ea580c]/0 via-[#ea580c]/10 to-[#ea580c]/0 blur-xl rounded-lg" />

        {/* Corner indicators */}
        <div className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t border-l border-[#ea580c]/50" />
        <div className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t border-r border-[#ea580c]/50" />
        <div className="absolute -bottom-[1px] -left-[1px] w-2 h-2 border-b border-l border-[#ea580c]/50" />
        <div className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b border-r border-[#ea580c]/50" />

        <Card className="bg-zinc-950 border-zinc-800/80 backdrop-blur-sm relative z-10">
          <CardHeader className="border-b border-zinc-800/50 pb-3">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-black uppercase tracking-wide text-zinc-100 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#ea580c]" />
                    {user.callsign}
                  </CardTitle>
                  {(isAdmin || currentUser?.callsign === user.callsign) && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Mail className="w-3 h-3 text-zinc-600" />
                      <span className="text-[11px] font-mono text-zinc-400">{user.email}</span>
                      <button
                        onClick={handleCopyEmail}
                        className="p-0.5 hover:bg-zinc-800 rounded transition-colors"
                        title="Copy email"
                      >
                        <Copy className="w-3 h-3 text-zinc-600 hover:text-zinc-300" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Context bar */}
              <div className="flex gap-1 text-[8px] font-mono text-zinc-600 uppercase tracking-wider">
                <span className="text-zinc-700">[USER]</span>
                <span>CLEARANCE:</span>
                <span className="text-[#ea580c]">{user.rank || "UNASSIGNED"}</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {/* Rank Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-[#ea580c]" />
                  RANK ASSIGNMENT
                </label>
                {!editingRank && canEdit && (
                   <button
                     onClick={() => setEditingRank(true)}
                     className="text-[9px] font-mono text-zinc-600 hover:text-[#ea580c] transition-colors"
                   >
                     EDIT
                   </button>
                 )}
              </div>

              {editingRank ? (
                <div className="flex gap-2">
                  <Input
                    value={newRank}
                    onChange={(e) => setNewRank(e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-xs h-7"
                    placeholder="e.g. Pioneer, Voyager"
                  />
                  <Button
                    size="sm"
                    onClick={handleRankSave}
                    className="bg-[#ea580c] hover:bg-[#c2410c] h-7 text-xs"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingRank(false)}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="px-3 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded text-xs font-mono text-zinc-300">
                  {user.rank || <span className="text-zinc-600">UNASSIGNED</span>}
                </div>
              )}
            </div>

            {/* Divider */}
            <div
              className="h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent"
              style={{
                backgroundImage: 'linear-gradient(90deg, transparent, rgba(39,39,42,0.5), transparent)',
                backgroundSize: '100% 1px',
              }}
            />

            {/* Roles Section */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
                <BadgeIcon className="w-3 h-3 text-[#ea580c]" />
                ASSIGNED ROLES ({user.assigned_role_ids?.length || 0})
              </label>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {roles.length === 0 ? (
                  <div className="text-[9px] text-zinc-600 italic">No roles defined</div>
                ) : (
                  roles.map((role) => {
                    const isAssigned = user.assigned_role_ids?.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        onClick={() => canEdit && onRoleToggle(role.id)}
                        disabled={!canEdit}
                        className={cn(
                           "w-full text-left p-2 rounded border transition-all duration-150 group relative",
                           canEdit && "cursor-pointer",
                           !canEdit && "opacity-60 cursor-not-allowed",
                           isAssigned
                             ? "bg-[#ea580c]/10 border-[#ea580c]/50 hover:border-[#ea580c] text-zinc-100"
                             : "bg-zinc-900/30 border-zinc-800/50 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
                         )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold">{role.name}</div>
                            <div className="text-[9px] text-zinc-500 mt-0.5">{role.description}</div>
                          </div>
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full transition-colors",
                              isAssigned ? "bg-[#ea580c]" : "bg-zinc-700 group-hover:bg-zinc-600"
                            )}
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Divider */}
            <div
              className="h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent"
              style={{
                backgroundImage: 'linear-gradient(90deg, transparent, rgba(39,39,42,0.5), transparent)',
                backgroundSize: '100% 1px',
              }}
            />

            {/* User Info */}
            <div className="space-y-1.5 text-[9px]">
              <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-900/30 border border-zinc-800/30 rounded">
                <span className="text-zinc-600 uppercase font-mono">ID</span>
                <span className="font-mono text-zinc-400">{user.id?.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-900/30 border border-zinc-800/30 rounded">
                <span className="text-zinc-600 uppercase font-mono">JOINED</span>
                <span className="font-mono text-zinc-400">
                  {user.created_date ? new Date(user.created_date).toLocaleDateString() : "—"}
                </span>
              </div>
              {user.updated_date && (
                <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-900/30 border border-zinc-800/30 rounded">
                  <span className="text-zinc-600 uppercase font-mono">UPDATED</span>
                  <span className="font-mono text-zinc-400">{new Date(user.updated_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>

          {/* Footer status bar */}
          <div className="border-t border-zinc-800/50 px-4 py-2 bg-zinc-900/30 flex items-center justify-between text-[8px] font-mono text-zinc-600 uppercase tracking-wider">
            <span>STATUS: ACTIVE</span>
            <span>SECURED</span>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}