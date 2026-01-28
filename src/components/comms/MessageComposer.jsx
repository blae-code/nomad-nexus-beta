/**
 * MessageComposer — Input for sending messages to a channel
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

export default function MessageComposer({ onSendMessage, disabled = false }) {
  const [body, setBody] = useState('');
  const inputRef = useRef(null);

  const handleSend = async () => {
    if (!body.trim()) return;

    await onSendMessage(body.trim());
    setBody('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/40 p-2 flex gap-2">
      <Input
        ref={inputRef}
        placeholder="Type message..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="text-xs h-8 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
      />
      <Button
        size="sm"
        onClick={handleSend}
        disabled={!body.trim() || disabled}
        className="h-8 px-2 bg-orange-600 hover:bg-orange-500 text-white"
      >
        <Send className="w-3 h-3" />
      </Button>
    </div>
  );
}