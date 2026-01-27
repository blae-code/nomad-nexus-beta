import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

export default function CommsFallbackPanel({ onRetry, detail }) {
  const diagnosticsUrl = createPageUrl('Diagnostics');

  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center space-y-4 max-w-md p-6 border border-zinc-800 bg-zinc-950/70 rounded">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100">
            Communications service unavailable, please try again later
          </h3>
          {detail && (
            <p className="text-[10px] text-zinc-500 font-mono mt-2">
              {detail}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-2">
          <Button onClick={onRetry} size="sm" className="gap-2 text-xs font-bold">
            <RefreshCcw className="w-3 h-3" />
            Retry
          </Button>
          <a
            href={diagnosticsUrl}
            className="text-[10px] text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            View diagnostics &amp; environment setup
          </a>
        </div>
      </div>
    </div>
  );
}
