import React from 'react';
import { Badge } from '@/components/ui/badge';
import { OpsPanel } from '@/components/ui/OpsPanel';
import { MapPin, Users, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSeverityBadge, getPrioritySeverity, getEventSeverity } from '@/components/utils/severitySystem';
import { typographyClasses } from '@/components/utils/typography';

export default function EventCard({
  event,
  creator,
  density = 'standard',
  onActionClick,
}) {
  const getEventStatus = (evt) => {
    const now = new Date();
    const start = new Date(evt.start_time);
    const end = evt.end_time ? new Date(evt.end_time) : null;

    const statusLabel =
      evt.status === 'cancelled' || evt.status === 'failed' || evt.status === 'aborted'
        ? evt.status.toUpperCase()
        : evt.status === 'completed'
          ? 'COMPLETED'
          : evt.status === 'active' || (now >= start && (!end || now <= end))
            ? 'ACTIVE'
            : now < start
              ? 'UPCOMING'
              : 'SCHEDULED';

    const severity = getEventSeverity(evt.status);
    return { label: statusLabel, color: getSeverityBadge(severity) };
  };

  const formatEventTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
  };

  const status = getEventStatus(event);
  const eventTime = formatEventTime(event.start_time);

  if (density === 'compact') {
    return (
      <OpsPanel className="hover:border-zinc-700 transition-colors">
        <div className="p-4 flex items-center gap-4 justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className={status.color}>
                {status.label}
              </Badge>
              <Badge
                variant="outline"
                className={getSeverityBadge(
                  event.event_type === 'focused' ? 'critical' : 'nominal'
                )}
              >
                {event.event_type.toUpperCase()}
              </Badge>
              <span className="text-zinc-600 text-xs font-mono">
                {eventTime.date}
              </span>
            </div>
            <h3 className={cn('text-lg font-semibold truncate', typographyClasses.commandSubtitle)}>
              {event.title}
            </h3>
          </div>
          {onActionClick && (
            <button
              onClick={() => onActionClick(event)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 transition-colors text-sm font-medium whitespace-nowrap"
            >
              OPEN
            </button>
          )}
        </div>
      </OpsPanel>
    );
  }

  // Standard density (default)
  return (
    <OpsPanel className="hover:border-zinc-700 transition-colors group">
      <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className={status.color}>
              {status.label}
            </Badge>
            <Badge
              variant="outline"
              className={getSeverityBadge(
                event.event_type === 'focused' ? 'critical' : 'nominal'
              )}
            >
              {event.event_type.toUpperCase()}
            </Badge>
            {event.priority && (
              <Badge
                variant="outline"
                className={getSeverityBadge(getPrioritySeverity(event.priority))}
              >
                {event.priority}
              </Badge>
            )}
            <span className="text-zinc-600 text-xs font-mono">
              {eventTime.date} • {eventTime.time}
            </span>
          </div>
          <h3 className={cn('text-xl mb-2 group-hover:text-red-500 transition-colors', typographyClasses.commandSubtitle)}>
            {event.title}
          </h3>
          <p className={cn(typographyClasses.bodySmall, 'line-clamp-2 max-w-2xl')}>
            {event.description}
          </p>
        </div>

        <div className="flex items-center gap-4 md:w-auto w-full justify-between md:justify-end">
          <div className="text-right hidden md:block">
            <div className={cn(typographyClasses.labelSecondary, 'flex items-center justify-end gap-2 mb-1')}>
              <MapPin className="w-3 h-3" />
              {event.location || 'TBD'}
            </div>
            <div className={cn(typographyClasses.labelSecondary, 'flex items-center justify-end gap-2')}>
              <Users className="w-3 h-3" />
              {creator ? creator.callsign || creator.rsi_handle || creator.email : 'Command'}
            </div>
          </div>

          {onActionClick && (
            <button
              onClick={() => onActionClick(event)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
            >
              ACCESS
            </button>
          )}
        </div>
      </div>
    </OpsPanel>
  );
}