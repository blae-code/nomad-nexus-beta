import { Button } from '@/components/ui/button';
import { canEditEvent } from '@/components/permissions';
import { Trash2 } from 'lucide-react';

/**
 * Canonical action bar for events.
 * Shows: Modify (if can edit), Delete/Archive (if authorized) in consistent order.
 * Actions user cannot perform are hidden.
 * 
 * Delete/Archive permissions:
 * - System Admins (role = 'admin')
 * - Pioneer rank
 * - Event creator
 */
export default function EventActionBar({
  event,
  currentUser,
  onModify,
  onDelete,
  className = '',
}) {
  const canEdit = canEditEvent(currentUser, event);
  
  // Check delete/archive permissions
  const canDelete = currentUser && (
    currentUser.role === 'admin' ||
    currentUser.rank === 'Pioneer' ||
    currentUser.rank === 'Founder' ||
    currentUser.id === event.created_by
  );

  return (
    <div className={`flex items-center justify-end gap-2 ${className}`}>
      {canEdit && (
        <Button
          onClick={onModify}
          variant="outline"
          size="sm"
          className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          MODIFY
        </Button>
      )}
      {canDelete && (
        <Button
          onClick={onDelete}
          variant="outline"
          size="sm"
          className="bg-red-950/30 border-red-700/50 text-red-300 hover:bg-red-950/50 hover:border-red-600"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          DELETE
        </Button>
      )}
    </div>
  );
}