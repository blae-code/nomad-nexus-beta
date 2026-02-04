import React from 'react';
import { useMemberProfileMap } from '@/components/hooks/useMemberProfileMap';

export default function TypingIndicator({ userIds }) {
  const limitedIds = React.useMemo(() => (userIds || []).slice(0, 3), [userIds]);
  const { memberMap } = useMemberProfileMap(limitedIds);

  const names = limitedIds
    .map((id) => memberMap[id]?.label)
    .filter(Boolean)
    .slice(0, 2);
  const totalCount = (userIds || []).length;
  const remaining = totalCount - names.length;

  if (names.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500 py-2 px-3">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>
        {names.join(', ')}
        {remaining > 0 && ` and ${remaining} other${remaining > 1 ? 's' : ''}`}
        {' '}typing...
      </span>
    </div>
  );
}
