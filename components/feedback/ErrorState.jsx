import { AlertTriangle, RotateCw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ErrorState({ 
  message = 'Failed to retrieve data',
  details,
  onRetry,
  className 
}) {
  const isDev = import.meta.env.DEV;
  
  const handleCopyDetails = () => {
    if (details) {
      navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    }
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 text-center border border-red-900/30 bg-red-950/10 rounded-lg',
      className
    )}>
      <div className="w-10 h-10 rounded-lg border border-red-900/50 bg-red-950/20 flex items-center justify-center mb-3">
        <AlertTriangle className="w-5 h-5 text-red-500" />
      </div>
      <h3 className="text-sm font-bold text-red-400 mb-1 uppercase tracking-wide">Error</h3>
      <p className="text-xs text-zinc-400 mb-4 max-w-xs">{message}</p>
      
      {onRetry && (
        <Button
          size="sm"
          onClick={onRetry}
          className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs mb-3"
        >
          <RotateCw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      )}
      
      {isDev && details && (
        <div className="mt-3 w-full max-w-sm">
          <button
            onClick={handleCopyDetails}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center justify-center gap-1 mx-auto"
          >
            <Copy className="w-3 h-3" />
            Copy Details
          </button>
        </div>
      )}
    </div>
  );
}