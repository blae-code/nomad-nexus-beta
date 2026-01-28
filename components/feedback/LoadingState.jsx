import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoadingState({ message = 'RETRIEVING DATA...', size = 'default', className }) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 text-zinc-500',
      size === 'compact' && 'py-6',
      className
    )}>
      <Loader2 className="w-5 h-5 text-[#ea580c] animate-spin mb-3" />
      <p className="text-xs font-mono tracking-widest uppercase">{message}</p>
    </div>
  );
}