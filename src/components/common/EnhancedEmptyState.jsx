import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Plus, 
  MessageSquare, 
  Calendar, 
  Users, 
  Radio,
  FileText,
  Ship,
  Map
} from 'lucide-react';

const iconMap = {
  events: Calendar,
  channels: MessageSquare,
  members: Users,
  voice: Radio,
  messages: MessageSquare,
  reports: FileText,
  assets: Ship,
  missions: Map,
};

export default function EnhancedEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  suggestions = [],
}) {
  const Icon = icon ? iconMap[icon] || icon : Plus;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 p-12">
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <Icon className="w-10 h-10 text-orange-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white uppercase tracking-wide">
            {title}
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {description}
          </p>
        </div>

        {(actionLabel || onAction) && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {actionLabel && onAction && (
              <Button
                onClick={onAction}
                className="bg-orange-600 hover:bg-orange-500 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                {actionLabel}
              </Button>
            )}
            
            {secondaryLabel && onSecondary && (
              <Button
                onClick={onSecondary}
                variant="outline"
                className="border-zinc-700 hover:border-orange-500/50"
              >
                {secondaryLabel}
              </Button>
            )}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="pt-4 border-t border-zinc-800">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-3">
              Quick Actions
            </div>
            <div className="space-y-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={suggestion.onClick}
                  className="w-full text-left px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-orange-500/30 transition-all text-sm text-zinc-300 hover:text-orange-300"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}