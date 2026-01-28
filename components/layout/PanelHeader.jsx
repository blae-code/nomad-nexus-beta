import { cn } from '@/lib/utils';

/**
 * Normalized panel header with consistent spacing, typography, and icon alignment
 * Reduces visual jitter across Hub → Events → Comms → Rescue
 */
export function PanelHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  rightContent,
  className = ''
}) {
  return (
    <div className={cn(
      'flex items-center justify-between py-2 px-3',
      'border-b border-zinc-800',
      className
    )}>
      <div className="flex items-center gap-2 min-w-0">
        {Icon && (
          <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
            <Icon className="w-4 h-4 text-zinc-400" />
          </div>
        )}
        
        <div className="min-w-0">
          <h3 className="text-[9px] font-bold uppercase text-zinc-200 tracking-wider">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[7px] text-zinc-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {rightContent}
        {action}
      </div>
    </div>
  );
}

/**
 * Mini variant for compact headers
 */
export function PanelHeaderMini({
  title,
  rightContent,
  className = ''
}) {
  return (
    <div className={cn(
      'flex items-center justify-between py-1.5 px-3',
      'text-[8px] font-bold uppercase text-zinc-400 tracking-wider',
      'border-b border-zinc-800/50',
      className
    )}>
      {title}
      {rightContent}
    </div>
  );
}