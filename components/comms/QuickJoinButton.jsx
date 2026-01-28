import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';

export default function QuickJoinButton({ net, isConnected, onJoin, onLeave, disabled }) {
  if (isConnected) {
    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={onLeave}
        disabled={disabled}
        className="h-7 text-xs bg-red-900 hover:bg-red-800"
      >
        <PhoneOff className="w-3 h-3 mr-1" />
        Leave
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={onJoin}
      disabled={disabled}
      className="h-7 text-xs bg-emerald-900 hover:bg-emerald-800"
    >
      <Phone className="w-3 h-3 mr-1" />
      Join
    </Button>
  );
}