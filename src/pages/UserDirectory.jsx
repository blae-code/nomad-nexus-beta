import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search, Users as UsersIcon } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

export default function UserDirectory() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const init = async () => {
      const profilesList = await base44.entities.MemberProfile.list('-created_date', 100);
      setProfiles(profilesList);
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-orange-500">LOADING...</div>;
  }

  const filteredProfiles = profiles.filter(p => 
    p.callsign?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">User Directory</h1>
        <p className="text-zinc-400 text-sm">Member roster</p>
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
              <EmptyState 
                icon={UsersIcon}
                title="No members found"
                description="Try adjusting your search"
              />
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
  );
}