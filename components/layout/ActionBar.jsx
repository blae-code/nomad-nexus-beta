import { cn } from '@/lib/utils';

export default function ActionBar({ primary, secondary, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="flex items-center gap-2">{secondary}</div>
      <div className="flex items-center gap-2">{primary}</div>
    </div>
  );
}