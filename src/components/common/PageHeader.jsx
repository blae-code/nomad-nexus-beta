import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function PageHeader({ title, description, action }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <a href={createPageUrl('Hub')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </a>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">{title}</h1>
          {description && <p className="text-zinc-400 text-sm">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}