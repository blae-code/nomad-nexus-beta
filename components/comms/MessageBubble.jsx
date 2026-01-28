import { cn } from "@/lib/utils";
import { getRankColorClass } from "@/components/utils/rankUtils";
import { CheckCheck, Check, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

export default function MessageBubble({ message, author, isMe, isOnline, isRead, onlineUsers }) {
  return (
    <div className="flex gap-3 group hover:bg-zinc-900/30 -mx-2 px-2 py-1 rounded transition-colors">
      {/* Avatar */}
      <div className="relative shrink-0 mt-1">
        <div className={cn(
          "w-8 h-8 rounded border flex items-center justify-center text-xs font-bold",
          isMe ? "bg-emerald-950 text-emerald-400 border-emerald-900" : "bg-zinc-900 text-zinc-400 border-zinc-800"
        )}>
          {(author.callsign || author.full_name || 'U')[0].toUpperCase()}
        </div>
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-950" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Header: Author + Timestamp */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            "text-sm font-bold",
            isMe ? "text-emerald-400" : getRankColorClass(author.rank, 'text')
          )}>
            {author.callsign || author.full_name}
          </span>
          <span className="text-[10px] text-zinc-600 font-mono">
            {format(new Date(message.created_date), 'HH:mm:ss')}
          </span>
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((url, idx) => (
              <div key={idx} className="relative group/attachment">
                {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img 
                    src={url} 
                    alt={`Attachment ${idx}`}
                    className="max-w-xs max-h-64 rounded border border-zinc-700 cursor-pointer hover:border-[#ea580c]"
                    onClick={() => window.open(url, '_blank')}
                  />
                ) : (
                  <a 
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded hover:border-[#ea580c] hover:bg-zinc-800 text-[12px] text-zinc-300"
                  >
                    <ImageIcon className="w-3 h-3" />
                    File
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Message Content */}
        <div className="text-sm text-zinc-200 break-words">
          {message.content}
        </div>
      </div>

      {/* Read Receipt & Timestamp on Hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[9px] text-zinc-600 font-mono self-start mt-1 shrink-0">
        {isMe && (
          <>
            {isRead ? (
              <CheckCheck className="w-3 h-3 text-blue-500" title="Read" />
            ) : (
              <Check className="w-3 h-3" title="Sent" />
            )}
          </>
        )}
        <span>{format(new Date(message.created_date), 'HH:mm')}</span>
      </div>
    </div>
  );
}