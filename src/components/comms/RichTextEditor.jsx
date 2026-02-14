import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Code, Link as LinkIcon, Smile, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function RichTextEditor({ onSubmit, isDisabled }) {
  const [content, setContent] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const editorRef = useRef(null);

  const applyFormat = (format) => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    let formatted = '';

    switch (format) {
      case 'bold':
        formatted = `**${selected}**`;
        break;
      case 'italic':
        formatted = `_${selected}_`;
        break;
      case 'code':
        formatted = `\`${selected}\``;
        break;
      case 'link':
        formatted = `[${selected || 'link'}](url)`;
        break;
      default:
        return;
    }

    const newContent = content.substring(0, start) + formatted + content.substring(end);
    setContent(newContent);
  };

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim());
      setContent('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2 bg-zinc-900 rounded-lg border border-orange-500/20 p-3">
      <div className="flex gap-1 flex-wrap">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => applyFormat('bold')}
          className="h-8 w-8 p-0"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => applyFormat('italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => applyFormat('code')}
          className="h-8 w-8 p-0"
        >
          <Code className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => applyFormat('link')}
          className="h-8 w-8 p-0"
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPreviewMode(!previewMode)}
          className="text-xs"
        >
          {previewMode ? 'Edit' : 'Preview'}
        </Button>
      </div>

      {previewMode ? (
        <div className="bg-zinc-800 rounded p-3 min-h-20 text-sm text-zinc-200 prose prose-sm prose-invert max-w-none">
          <ReactMarkdown>{content || '(empty message)'}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          ref={editorRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type message... (Ctrl+Enter to send)"
          className="w-full bg-zinc-800 text-zinc-100 border border-zinc-700 rounded p-2 text-sm resize-none min-h-20 focus:outline-none focus:border-orange-500/50"
        />
      )}

      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isDisabled || !content.trim()}
          className="gap-2"
        >
          <Send className="w-3 h-3" />
          Send
        </Button>
      </div>
    </div>
  );
}