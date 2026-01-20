import React from 'react';
import { Button } from '@/components/ui/button';
import { canEditEvent } from '@/components/permissions';

/**
 * Canonical action bar for events.
 * Shows: Modify (if can edit) in consistent order.
 * Actions user cannot perform are hidden.
 */
export default function EventActionBar({
  event,
  currentUser,
  onModify,
  className = '',
}) {
  const canEdit = canEditEvent(currentUser, event);

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
    </div>
  );
}