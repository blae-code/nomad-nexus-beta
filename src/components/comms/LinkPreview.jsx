/**
 * LinkPreview — Displays rich preview for URLs in messages
 */

import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ExternalLink, Loader2 } from 'lucide-react';

export default function LinkPreview({ url, onClose }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Extract metadata from this URL and return structured data: ${url}

Return JSON with: title, description, image, domain`,
          response_json_schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              domain: { type: 'string' },
              image: { type: 'string' },
            },
          },
          add_context_from_internet: true,
        });

        setPreview(response);
      } catch (error) {
        console.error('Failed to fetch preview:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading preview...
      </div>
    );
  }

  if (!preview) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block p-3 border border-zinc-700 rounded hover:border-orange-500/50 transition-colors bg-zinc-900/30"
    >
      {preview.image && (
        <img
          src={preview.image}
          alt="preview"
          className="w-full h-32 object-cover rounded mb-2"
        />
      )}
      <div className="text-xs">
        <div className="text-zinc-400 mb-1">{preview.domain}</div>
        <div className="font-semibold text-zinc-200 mb-1 line-clamp-2">
          {preview.title || 'Link'}
        </div>
        {preview.description && (
          <div className="text-zinc-500 text-[10px] line-clamp-2">
            {preview.description}
          </div>
        )}
      </div>
      <ExternalLink className="w-3 h-3 absolute top-2 right-2 text-zinc-500" />
    </a>
  );
}