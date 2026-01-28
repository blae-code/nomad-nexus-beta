import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, LogOut, Save } from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState('');

  useEffect(() => {
    const init = async () => {
      const currentUser = await base44.auth.me();
      const userProfile = await base44.entities.MemberProfile.filter({ user_id: currentUser.id });
      setUser(currentUser);
      if (userProfile.length > 0) {
        setProfile(userProfile[0]);
        setBio(userProfile[0].bio || '');
      }
      setLoading(false);
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

  if (loading) {
    return <div className="p-8 text-center text-orange-500">LOADING...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Settings</h1>
        <p className="text-zinc-400 text-sm">App configuration</p>
      </div>

      <div className="space-y-6">
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
            </div>
            );
            }