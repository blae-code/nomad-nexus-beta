import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Map } from 'lucide-react';
import { toast } from 'sonner';

export default function TacticalMapStep({ user, onAudit }) {
  const [loading, setLoading] = useState(false);

  const openTacticalMap = async () => {
    const startTime = Date.now();
    setLoading(true);

    try {
      // Construct query params for demo preset
      const params = new URLSearchParams({
        demo: 'true',
        layers: 'personnel,fleet,incidents,objectives,commands',
        focus: 'distress'
      }).toString();

      const duration = Date.now() - startTime;

      await onAudit(
        'tactical_map',
        'Open demo tactical map',
        'success',
        duration,
        { demo: true, layers: 'personnel,fleet,incidents,objectives,commands' },
        { preset: 'demo_distress' },
        null
      );

      // Navigate to tactical map
      window.location.href = `/commsconsole?view=tactical&${params}`;
      toast.success('Opening tactical map with demo preset');
    } catch (err) {
      const duration = Date.now() - startTime;
      await onAudit(
        'tactical_map',
        'Open demo tactical map',
        'failure',
        duration,
        {},
        {},
        err.message
      );
      toast.error('Failed to open tactical map: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[9px] text-zinc-400">
        Launch the tactical map with demo preset: personnel, fleet, incidents, objectives, commands.
      </p>

      <Button
        size="sm"
        onClick={openTacticalMap}
        disabled={loading}
        className="w-full gap-2 text-[10px] h-7"
      >
        <Map className="w-3 h-3" />
        {loading ? 'Opening...' : 'Open Tactical Map'}
      </Button>
    </div>
  );
}