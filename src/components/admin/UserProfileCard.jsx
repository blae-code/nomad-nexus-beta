import React from "react";
import { Shield, Copy, Mail, Zap, Lock, Activity, Badge as BadgeIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RANKS = ["Pioneer", "Founder", "Voyager", "Scout", "Affiliate", "Vagrant"];
const STATUSES = ["active", "inactive", "on_leave"];

const FIELD_PRESETS = {
  status: ["active", "inactive", "on_leave"]
};

export default function UserProfileCard({ 
  user, 
  roles, 
  onRoleToggle, 
  onRankChange, 
  onFieldChange,
  isAdmin,
  currentUser 
}) {
  const canEdit = isAdmin || currentUser?.rank === "Pioneer";
  const [editingRank, setEditingRank] = React.useState(false);
  const [newRank, setNewRank] = React.useState(user?.rank || "");
  const [editingFields, setEditingFields] = React.useState({});

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(user.email);
    toast.success("Email copied");
  };

  const handleRankSave = () => {
    if (newRank && newRank !== user.rank) {
      onRankChange?.(newRank);
      toast.success(`Rank updated to ${newRank}`);
      setEditingRank(false);
    }
  };

  const handleFieldChange = (field, value) => {
    if (onFieldChange) {
      onFieldChange(field, value);
      toast.success(`${field} updated`);
    }
  };

  const toggleEditField = (field) => {
    if (!canEditField(field)) return;
    setEditingFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const canEditField = (field) => {
    // Rank can only be edited by Pioneers or Admins
    if (field === "rank") {
      return isAdmin || currentUser?.rank === "Pioneer";
    }
    // Other fields can be edited by anyone with general edit permission
    return canEdit;
  };

  const EditableField = ({ label, field, value, type = "text", icon: Icon, isLongForm = false }) => {
    const isEditing = editingFields[field];
    const presets = FIELD_PRESETS[field] || [];
    const hasPresets = presets.length > 0;
    const fieldCanEdit = canEditField(field);
    
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
          {Icon && <Icon className="w-3 h-3 text-[#ea580c]" />}
          {label}
          {!fieldCanEdit && <span className="text-[9px] text-zinc-600 ml-auto">(Admin Only)</span>}
        </label>
        
        {isEditing && fieldCanEdit ? (
          <div className="space-y-2">
            {hasPresets ? (
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      handleFieldChange(field, preset);
                      toggleEditField(field);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-xs font-mono rounded border transition-all",
                      value === preset
                        ? "bg-[#ea580c]/20 border-[#ea580c]/50 text-[#ea580c]"
                        : "bg-zinc-900/50 border-zinc-800/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            ) : isLongForm ? (
              <Textarea
                autoFocus
                value={value || ""}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                onBlur={() => toggleEditField(field)}
                className="bg-zinc-900 border-zinc-700 text-xs min-h-20 resize-none"
                placeholder={`Enter ${label.toLowerCase()}`}
              />
            ) : (
              <Input
                autoFocus
                value={value || ""}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                onBlur={() => toggleEditField(field)}
                className="bg-zinc-900 border-zinc-700 text-xs h-7"
                placeholder={`Enter ${label.toLowerCase()}`}
              />
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleEditField(field)}
              className="h-7 text-xs w-full"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <button
            onClick={() => fieldCanEdit && toggleEditField(field)}
            disabled={!fieldCanEdit}
            className={cn(
              "w-full text-left px-3 py-2 rounded border transition-all text-xs font-mono",
              fieldCanEdit && "cursor-pointer hover:border-[#ea580c]/50 bg-zinc-900/50 border-zinc-800/50 text-zinc-300 hover:text-zinc-200",
              !fieldCanEdit && "cursor-not-allowed opacity-50 bg-zinc-900/20 border-zinc-800/30 text-zinc-500"
            )}
          >
            {value ? <span className="text-zinc-100">{value}</span> : <span className="text-zinc-600">—</span>}
          </button>
        )}
      </div>
    );
  };

  const ToggleField = ({ label, field, value, icon: Icon }) => {
    const fieldCanEdit = canEditField(field);
    const [isChanging, setIsChanging] = React.useState(false);
    
    const handleToggle = async () => {
      if (!fieldCanEdit) return;
      setIsChanging(true);
      try {
        await handleFieldChange(field, !value);
      } finally {
        setIsChanging(false);
      }
    };
    
    return (
      <div className={cn(
        "flex items-center justify-between px-3 py-2 rounded border transition-all",
        fieldCanEdit ? "bg-zinc-900/30 border-zinc-800/50 cursor-pointer hover:border-zinc-700" : "bg-zinc-900/15 border-zinc-800/30 opacity-60"
      )}>
        <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
          {Icon && <Icon className="w-3 h-3 text-[#ea580c]" />}
          {label}
          {!fieldCanEdit && <span className="text-[9px] text-zinc-700 ml-auto">(Admin Only)</span>}
        </label>
        <button
          onClick={handleToggle}
          disabled={!fieldCanEdit || isChanging}
          className={cn(
            "w-8 h-4 rounded-full border transition-all",
            value
              ? "bg-[#ea580c]/30 border-[#ea580c]/50"
              : "bg-zinc-800/30 border-zinc-700/50",
            !fieldCanEdit && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className={cn(
            "w-3 h-3 rounded-full transition-transform",
            value ? "translate-x-4 bg-[#ea580c]" : "translate-x-0.5 bg-zinc-600"
          )} />
        </button>
      </div>
    );
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
             {/* Callsign & Bio Section */}
             <EditableField 
               label="Callsign" 
               field="callsign" 
               value={user.callsign}
               icon={Shield}
             />

             <EditableField 
               label="RSI Handle" 
               field="rsi_handle" 
               value={user.rsi_handle}
               icon={Activity}
             />

             <EditableField 
               label="Bio" 
               field="bio" 
               value={user.bio}
               icon={Activity}
               isLongForm={true}
             />

             {/* Divider */}
             <div className="h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

             {/* Rank Section */}
             <div className="space-y-2">
               <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
                 <Zap className="w-3 h-3 text-[#ea580c]" />
                 RANK ASSIGNMENT
                 {!canEditField("rank") && <span className="text-[9px] text-zinc-700">(Admin Only)</span>}
               </label>

               {canEditField("rank") ? (
                 <Select value={user.rank || ""} onValueChange={(val) => {
                   onRankChange?.(val);
                   toast.success("Rank updated");
                 }}>
                   <SelectTrigger className={cn(
                     "bg-zinc-900 border-zinc-700 text-xs h-8 font-mono",
                     "hover:border-[#ea580c]/50 focus:border-[#ea580c] focus:ring-0"
                   )}>
                     <SelectValue placeholder="Select rank" />
                   </SelectTrigger>
                   <SelectContent className="bg-zinc-950 border-zinc-800">
                     {RANKS.map((rank) => (
                       <SelectItem 
                         key={rank} 
                         value={rank}
                         className="font-mono text-xs cursor-pointer hover:bg-[#ea580c]/10 focus:bg-[#ea580c]/20"
                       >
                         <span className="flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c]" />
                           {rank}
                         </span>
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               ) : (
                 <div className="px-3 py-2 rounded text-xs font-mono bg-zinc-900/20 border border-zinc-800/30 text-zinc-500 opacity-60">
                   {user.rank || <span className="text-zinc-600">UNASSIGNED</span>}
                 </div>
               )}
             </div>

             {/* Voyager Number (show only if Voyager rank) */}
             {user.rank === "Voyager" && (
               <EditableField 
                 label="Voyager #" 
                 field="voyager_number" 
                 value={user.voyager_number}
                 icon={BadgeIcon}
               />
             )}

             {/* Status Section */}
             <EditableField 
               label="Status" 
               field="status" 
               value={user.status || "active"}
               type="select"
               icon={Activity}
             />

             {/* Divider */}
             <div className="h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

             {/* Admin Privileges */}
             <ToggleField 
               label="System Admin" 
               field="is_system_administrator" 
               value={user.is_system_administrator || false}
               icon={Lock}
             />

             <ToggleField 
               label="Shaman" 
               field="is_shaman" 
               value={user.is_shaman || false}
               icon={Zap}
             />

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
            <span>STATUS: {(user.status || "active").toUpperCase()}</span>
            <span className={user.is_system_administrator ? "text-[#ea580c]" : ""}>{user.is_system_administrator ? "ADMIN" : "SECURED"}</span>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}