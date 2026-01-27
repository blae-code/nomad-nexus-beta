import React from 'react';
import { base44 } from '@/api/base44Client';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

const RANK_CLEARANCE = {
  'Pioneer': 'LEVEL 5 - COMMAND',
  'Founder': 'LEVEL 4 - SENIOR',
  'Voyager': 'LEVEL 3 - FULL',
  'Scout': 'LEVEL 2 - STANDARD',
  'Affiliate': 'LEVEL 1 - LIMITED',
  'Vagrant': 'LEVEL 0 - BASIC'
};

export default function PersonalReadinessPanel() {
  const [user, setUser] = React.useState(null);
  const [lastActivity, setLastActivity] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setLastActivity(new Date(u?.updated_date || Date.now()));
    }).catch(() => {});
  }, []);

  if (!user) return null;

  const minutesAgo = Math.floor((Date.now() - lastActivity) / 60000);
  const activityText = minutesAgo === 0 ? 'NOW' : `${minutesAgo}m AGO`;

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center gap-2">
          <User className="w-3 h-3" />
          OPERATIONAL READINESS
        </OpsPanelTitle>
      </OpsPanelHeader>

      <OpsPanelContent className="space-y-4 text-xs">
        <div>
          <div className="text-zinc-500 uppercase tracking-wider font-bold mb-2">IDENTIFICATION</div>
          <div className={cn("font-mono text-zinc-300", user?.callsign && "text-emerald-400")}>
            {user?.callsign || user?.rsi_handle || user?.email}
          </div>
        </div>

        <div>
          <div className="text-zinc-500 uppercase tracking-wider font-bold mb-2">RANK</div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {user?.rank || 'VAGRANT'}
            </Badge>
            {user?.role === 'admin' && (
              <Badge variant="outline" className="bg-purple-900/20 border-purple-900/50">
                ADMIN
              </Badge>
            )}
          </div>
        </div>

        <div>
          <div className="text-zinc-500 uppercase tracking-wider font-bold mb-2">CLEARANCE</div>
          <div className="font-mono text-amber-400 text-[10px]">
            {RANK_CLEARANCE[user?.rank] || RANK_CLEARANCE['Vagrant']}
          </div>
        </div>

        {user?.role_tags && user.role_tags.length > 0 && (
          <div>
            <div className="text-zinc-500 uppercase tracking-wider font-bold mb-2">ROLES</div>
            <div className="flex flex-wrap gap-1">
              {user.role_tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-[9px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="text-zinc-500 uppercase tracking-wider font-bold text-[9px]">
              LAST ACTIVITY
            </div>
            <div className="font-mono text-zinc-400 text-[9px]">
              {activityText}
            </div>
          </div>
        </div>
      </OpsPanelContent>
    </OpsPanel>
  );
}