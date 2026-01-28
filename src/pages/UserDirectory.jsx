import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Users as UsersIcon } from 'lucide-react';

export default function UserDirectory() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          window.location.href = createPageUrl('AccessGate');
          return;
        }
        const profilesList = await base44.entities.MemberProfile.list('-created_date', 100);
        setProfiles(profilesList);
        setLoading(false);
      } catch (error) {
        window.location.href = createPageUrl('AccessGate');
      }
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-orange-500 text-xl">LOADING...</div>
      </div>
    );
  }

  const filteredProfiles = profiles.filter(p => 
    p.callsign?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <a href={createPageUrl('Hub')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </a>
          <div className="flex-1">
            <h1 className="text-3xl font-black uppercase tracking-wider text-white">User Directory</h1>
            <p className="text-zinc-400 text-sm">Member roster</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by callsign..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.length === 0 ? (
            <div className="col-span-full text-center py-16 text-zinc-500">
              No members found
            </div>
          ) : (
            filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-zinc-900/50 border-2 border-zinc-800 hover:border-orange-500/50 p-6 transition-all"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <UsersIcon className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white uppercase">{profile.callsign}</h3>
                    <p className="text-sm text-zinc-500 uppercase">{profile.rank}</p>
                  </div>
                </div>
                
                {profile.bio && (
                  <p className="text-sm text-zinc-400">{profile.bio}</p>
                )}
                
                {profile.roles?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {profile.roles.map((role, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs font-bold uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {role}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        </div>
      </div>
    </AuthGuard>
  );
}