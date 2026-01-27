import { cn } from '@/lib/utils';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 text-center',
      className
    )}>
      {Icon && (
        <div className="w-12 h-12 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-zinc-600" />
        </div>
      )}
      <h3 className="text-sm font-bold text-zinc-300 mb-1 uppercase tracking-wide">{title}</h3>
      {description && (
        <p className="text-xs text-zinc-500 mb-4 max-w-xs">{description}</p>
      )}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}