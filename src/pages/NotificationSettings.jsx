import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";
import NotificationPreferences from "@/components/notifications/NotificationPreferences";

export default function NotificationSettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to load user", error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-200 flex items-center justify-center font-mono">
        LOADING NOTIFICATION SETTINGS...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-200 flex items-center justify-center font-mono">
        Please log in to manage notification settings.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 p-6 overflow-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Notification Settings</h1>
          <p className="text-zinc-500 font-mono text-xs tracking-widest mt-1">Manage your alerts and preferences</p>
        </div>

        {/* Notification Preferences Component */}
        <NotificationPreferences user={user} />
      </div>
    </div>
  );
}