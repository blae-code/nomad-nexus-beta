/**
 * MessageComposer — Enhanced input for sending messages with formatting and attachments
 */

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Bold, Italic, Code, Smile, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmojiPickerModal from '@/components/comms/EmojiPickerModal';

export default function MessageComposer({ 
  channelId, 
  userId,
  onSendMessage, 
  onTyping,
  disabled = false,
  disabledReason = '',
  draftKey = '',
  placeholder = "Type message..."
}) {
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const draftTimeoutRef = useRef(null);

  useEffect(() => {
    if (!draftKey) return;
    const stored = localStorage.getItem(draftKey);
    if (stored && stored !== body) {
      setBody(stored);
      return;
    }
    if (!stored) {
      setBody('');
    }
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }
    draftTimeoutRef.current = setTimeout(() => {
      if (body && body.trim()) {
        localStorage.setItem(draftKey, body);
      } else {
        localStorage.removeItem(draftKey);
      }
    }, 350);

    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
    };
  }, [body, draftKey]);

  const handleSend = async () => {
    if (disabled || uploading) return;
    if (!body.trim() && attachments.length === 0) return;

    const messageData = {
      channel_id: channelId,
      user_id: userId,
      content: body.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    try {
      await onSendMessage(messageData);
      setBody('');
      setAttachments([]);
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const result = await base44.integrations.Core.UploadFile({ file });
          return result.file_url;
        })
      );
      setAttachments(prev => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error('Failed to upload files:', error);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (url) => {
    setAttachments(prev => prev.filter(a => a !== url));
  };

  const insertTextAtCursor = (text) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);
    const before = body.substring(0, start);
    const after = body.substring(end);
    const updated = before + text + after;
    setBody(updated);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + text.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const insertFormatting = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);

    let newText;
    let cursorOffset = 0;

    switch (format) {
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        cursorOffset = selectedText ? 2 : -11;
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        cursorOffset = selectedText ? 1 : -12;
        break;
      case 'code':
        newText = `\`${selectedText || 'code'}\``;
        cursorOffset = selectedText ? 1 : -5;
        break;
      default:
        return;
    }

    const before = body.substring(0, start);
    const after = body.substring(end);
    setBody(before + newText + after);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + newText.length + cursorOffset;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  return (
    <div className="border-t border-orange-500/10 p-3 bg-zinc-900/40 flex-shrink-0 space-y-2">
      {disabledReason && (
        <div className="text-[10px] text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-1">
          {disabledReason}
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((url, idx) => (
            <div key={idx} className="relative group">
              {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img src={url} alt="preview" className="h-12 w-12 object-cover rounded border border-zinc-700" />
              ) : (
                <div className="h-12 w-12 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center text-xs">
                  📎
                </div>
              )}
              <button
                onClick={() => removeAttachment(url)}
                className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 border-b border-zinc-800 pb-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => insertFormatting('bold')}
          className="h-7 w-7"
          title="Bold (Ctrl+B)"
          disabled={disabled}
        >
          <Bold className="w-3 h-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => insertFormatting('italic')}
          className="h-7 w-7"
          title="Italic (Ctrl+I)"
          disabled={disabled}
        >
          <Italic className="w-3 h-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => insertFormatting('code')}
          className="h-7 w-7"
          title="Code"
          disabled={disabled}
        >
          <Code className="w-3 h-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setShowEmojiPicker(true)}
          className="h-7 w-7"
          title="Insert emoji"
          disabled={disabled}
        >
          <Smile className="w-3 h-3" />
        </Button>
        <div className="border-l border-zinc-700 h-5 mx-1" />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-7 w-7"
          title="Attach file"
        >
          <Paperclip className="w-3 h-3" />
        </Button>
      </div>

      {/* Input Area */}
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          placeholder={uploading ? 'Uploading...' : placeholder}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            onTyping?.();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled || uploading}
          className="text-xs min-h-[60px] max-h-[120px] bg-zinc-900 border-orange-500/20 placeholder:text-zinc-600 focus:border-orange-500/40 transition-colors resize-none"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={(!body.trim() && attachments.length === 0) || disabled || uploading}
          className="h-9 w-9 flex-shrink-0 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Send message (Enter)"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <EmojiPickerModal
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={(emoji) => insertTextAtCursor(emoji)}
      />
    </div>
  );
}
