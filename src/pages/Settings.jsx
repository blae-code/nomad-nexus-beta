import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, LogOut, Save, Layout, Shield, AlertCircle } from 'lucide-react';
import LayoutSettings from '@/components/layout/LayoutSettings';
import UserManagement from '@/components/admin/UserManagement';
import AccessKeyManager from '@/components/admin/AccessKeyManager';
import DataValidation from '@/components/admin/DataValidation';
import DiagnosticsBundle from '@/components/admin/DiagnosticsBundle';
import ImmersiveSeed from '@/components/admin/ImmersiveSeed';
import FactoryReset from '@/components/admin/FactoryReset';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        const userProfile = await base44.entities.MemberProfile.filter({ user_id: currentUser.id });
        setUser(currentUser);
        if (userProfile.length > 0) {
          setProfile(userProfile[0]);
          setBio(userProfile[0].bio || '');
        }
      } catch (err) {
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await base44.entities.MemberProfile.update(profile.id, { bio });
      alert('Profile updated successfully');
    } catch (error) {
      alert('Error updating profile');
    }
    setSaving(false);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return <div className="p-8 text-center text-orange-500">LOADING...</div>;
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">
          {isAdmin ? 'System Admin' : 'Settings'}
        </h1>
        <p className="text-zinc-400 text-sm">
          {isAdmin ? 'Administration and configuration' : 'User settings and preferences'}
        </p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full mb-6" style={{ gridTemplateColumns: `repeat(${isAdmin ? 6 : 3}, minmax(0, 1fr))` }}>
          <TabsTrigger value="account">My Account</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          {isAdmin && <TabsTrigger value="keys">Access Keys</TabsTrigger>}
          {isAdmin && <TabsTrigger value="data">Data Tools</TabsTrigger>}
          {isAdmin && <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>}
        </TabsList>

        {/* My Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <div className="bg-zinc-900/50 border-2 border-zinc-800 p-6">
            <h2 className="text-xl font-bold text-white uppercase mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 uppercase mb-2 block">Email</label>
                <Input value={user?.email || ''} disabled />
              </div>

              {profile && (
                <>
                  <div>
                    <label className="text-sm text-zinc-400 uppercase mb-2 block">Callsign</label>
                    <Input value={profile.callsign || ''} disabled />
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 uppercase mb-2 block">Rank</label>
                    <Input value={profile.rank || ''} disabled />
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 uppercase mb-2 block">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full h-24 rounded-lg border-2 border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/50 border-2 border-zinc-800 p-6">
            <h2 className="text-xl font-bold text-white uppercase mb-4">Account Actions</h2>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </TabsContent>

        {/* Workspace Tab */}
        <TabsContent value="workspace" className="space-y-6">
          <div className="bg-zinc-900/50 border-2 border-zinc-800 p-6">
            <h2 className="text-xl font-bold text-white uppercase mb-4 flex items-center gap-2">
              <Layout className="w-5 h-5" />
              Workspace
            </h2>
            <LayoutSettings />
          </div>
        </TabsContent>

        {/* Admin: Users Tab */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-6">
            <div className="bg-zinc-900/50 border-2 border-zinc-800 p-6">
              <h2 className="text-xl font-bold text-white uppercase mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                User Management
              </h2>
              <UserManagement />
            </div>
          </TabsContent>
        )}

        {/* Admin: Access Keys Tab */}
        {isAdmin && (
          <TabsContent value="keys" className="space-y-6">
            <div className="bg-zinc-900/50 border-2 border-zinc-800 p-6">
              <h2 className="text-xl font-bold text-white uppercase mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Access Key Manager
              </h2>
              <AccessKeyManager />
            </div>
          </TabsContent>
        )}

        {/* Admin: Data Tools Tab */}
        {isAdmin && (
          <TabsContent value="data" className="space-y-6">
            <div className="bg-zinc-900/50 border-2 border-zinc-800 p-6">
              <h2 className="text-xl font-bold text-white uppercase mb-4">Data Validation</h2>
              <DataValidation />
            </div>

            <div className="bg-zinc-900/50 border-2 border-zinc-800 p-6">
              <h2 className="text-xl font-bold text-white uppercase mb-4">Immersive Seed</h2>
              <ImmersiveSeed />
            </div>

            <div className="bg-zinc-900/50 border-2 border-zinc-800 p-6">
              <h2 className="text-xl font-bold text-white uppercase mb-4">Factory Reset</h2>
              <FactoryReset />
            </div>
          </TabsContent>
        )}

        {/* Admin: Diagnostics Tab */}
        {isAdmin && (
          <TabsContent value="diagnostics" className="space-y-6">
            <div className="bg-zinc-900/50 border-2 border-zinc-800 p-6">
              <h2 className="text-xl font-bold text-white uppercase mb-4">Diagnostics Bundle</h2>
              <DiagnosticsBundle />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {!isAdmin && (
        <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-700/50 rounded flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-zinc-400">
            <p className="font-semibold text-zinc-300">Admin tools disabled</p>
            <p>Only administrators can access user management, access keys, and system tools.</p>
          </div>
        </div>
      )}
    </div>
  );
}