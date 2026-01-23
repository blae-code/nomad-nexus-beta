import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Circle, Square, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function VoiceRecordingControls({ netId, netLabel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStart, setRecordingStart] = useState(null);

  const transcribeMutation = useMutation({
    mutationFn: async ({ start, end }) => {
      const response = await base44.functions.invoke('transcribeVoiceNet', {
        netId,
        audioFileUrl: 'placeholder', // Would be actual recording URL
        startTime: start,
        endTime: end
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Voice transcript generated');
    },
    onError: () => {
      toast.error('Transcription failed');
    }
  });

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingStart(new Date().toISOString());
    toast.success('Recording started');
  };

  const handleStopRecording = () => {
    const end = new Date().toISOString();
    setIsRecording(false);
    
    // Trigger transcription
    transcribeMutation.mutate({
      start: recordingStart,
      end
    });
    
    setRecordingStart(null);
  };

  return (
    <div className="flex items-center gap-2 p-2 border border-zinc-800 bg-zinc-950/50">
      <div className="flex-1">
        <div className="text-xs font-bold text-zinc-300">Voice Recording</div>
        <div className="text-[10px] text-zinc-500">{netLabel}</div>
      </div>
      
      {isRecording ? (
        <Button
          size="sm"
          onClick={handleStopRecording}
          className="gap-2 bg-red-900/50 hover:bg-red-900"
        >
          <Square className="w-3 h-3" />
          Stop
          <Badge className="bg-red-500 animate-pulse">REC</Badge>
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={handleStartRecording}
          variant="outline"
          className="gap-2"
        >
          <Circle className="w-3 h-3 text-red-500" />
          Record
        </Button>
      )}
      
      {transcribeMutation.isPending && (
        <Badge variant="outline" className="text-[9px] animate-pulse">
          <FileText className="w-2.5 h-2.5 mr-1" />
          Transcribing...
        </Badge>
      )}
    </div>
  );
}