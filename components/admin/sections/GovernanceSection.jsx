import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function GovernanceSection({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const list = await base44.entities.User.list();
      setUsers(list);
    } catch (err) {
      toast.error('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-zinc-400 text-xs">Loading...</div>;
  }

  return (
    <div className="space-y-3 p-3 bg-zinc-950/50 border border-zinc-800">
      {/* Access Keys */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono uppercase text-zinc-400">Access Keys</label>
          <Button size="sm" variant="outline" className="text-[8px] h-5 px-1 gap-1">
            <UserPlus className="w-2.5 h-2.5" />
            Issue Key
          </Button>
        </div>
        <p className="text-[7px] text-zinc-500">
          Invite-only: generate and share access keys for onboarding.
        </p>
      </div>

      {/* User Rank/Role Management */}
      <div className="border-t border-zinc-800 pt-3 space-y-2">
        <label className="text-xs font-mono uppercase text-zinc-400 flex items-center gap-1">
          <Shield className="w-3 h-3" />
          User Ranks ({users.length})
        </label>

        <div className="space-y-1 max-h-40 overflow-y-auto">
          {users.slice(0, 10).map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between p-1.5 bg-zinc-900/50 border border-zinc-800 text-[8px]"
            >
              <div>
                <div className="font-bold text-zinc-300">{u.full_name}</div>
                <div className="text-zinc-500">{u.email}</div>
              </div>
              <div className="flex gap-1">
                <Badge className="bg-blue-900/40 text-blue-300 border-blue-700/50">
                  {u.role === 'admin' ? 'ADMIN' : 'USER'}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {users.length > 10 && (
          <p className="text-[7px] text-zinc-500">+{users.length - 10} more users</p>
        )}
      </div>

      {/* Policies */}
      <div className="border-t border-zinc-800 pt-3 space-y-2">
        <label className="text-xs font-mono uppercase text-zinc-400">Policies</label>
        <div className="space-y-1 text-[8px]">
          <div className="flex items-center justify-between p-1.5 bg-zinc-900/50 border border-zinc-800">
            <span className="text-zinc-300">Comms Policy Version</span>
            <span className="font-mono text-zinc-400">v1.2</span>
          </div>
          <div className="flex items-center justify-between p-1.5 bg-zinc-900/50 border border-zinc-800">
            <span className="text-zinc-300">AI Consent Default</span>
            <Badge className="bg-yellow-900/40 text-yellow-300 border-yellow-700/50">
              OPT-IN
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}