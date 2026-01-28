import { MessageSquare, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function WhisperDisplay({ message, currentUserId }) {
  const whisperData = message.whisper_metadata;
  
  if (!whisperData?.is_whisper) return null;

  // Check if current user is a recipient
  const isRecipient = whisperData.recipient_user_ids?.includes(currentUserId);
  const isSender = whisperData.sender_id === currentUserId;
  const canSee = isRecipient || isSender;

  return (
    <div className={cn(
      'border-l-4 p-3 mb-2',
      canSee 
        ? 'bg-purple-950/30 border-purple-700' 
        : 'bg-zinc-900/30 border-zinc-700 opacity-40'
    )}>
      <div className="flex items-start gap-2 mb-1">
        <MessageSquare className="w-3 h-3 text-purple-400 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-purple-300">
              {whisperData.sender_name}
            </span>
            {canSee ? (
              <Eye className="w-3 h-3 text-purple-500" />
            ) : (
              <EyeOff className="w-3 h-3 text-zinc-600" />
            )}
            <Badge className="text-[7px] bg-purple-900/50 text-purple-200 border-purple-800">
              WHISPER
            </Badge>
          </div>
          
          {canSee ? (
            <>
              <div className="text-xs text-zinc-300 mb-1">
                {message.content.replace(/^\[WHISPER[^\]]*\]\s*/, '')}
              </div>
              <div className="text-[9px] text-purple-400/70">
                To: {message.content.match(/\[WHISPER to ([^\]]+)\]/)?.[1] || 'Unknown'}
              </div>
            </>
          ) : (
            <div className="text-xs text-zinc-600 italic">
              [Whisper to command staff - encrypted]
            </div>
          )}
        </div>
      </div>
      
      <div className="text-[8px] text-zinc-500 font-mono ml-5">
        {new Date(whisperData.sent_at).toLocaleTimeString()}
      </div>
    </div>
  );
}