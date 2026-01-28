import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hand, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function HailQueue({ 
  netId, 
  eventId, 
  user, 
  room, 
  onGrantTx, 
  onRevokeTx,
  hasTemporaryTx 
}) {
  const [hailRequests, setHailRequests] = useState([]);
  const [myHailStatus, setMyHailStatus] = useState(null); // 'pending', 'granted', 'denied'
  const [grantedUsers, setGrantedUsers] = useState(new Set());

  const isCommander = user?.rank === 'Pioneer' || user?.rank === 'Founder' || user?.role === 'admin';

  // Listen for hail data messages via LiveKit
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload, participant) => {
      try {
        const decoder = new TextDecoder();
        const message = JSON.parse(decoder.decode(payload));
        
        if (message.type === 'hail_request') {
          setHailRequests(prev => {
            const exists = prev.find(r => r.userId === participant.identity);
            if (exists) return prev;
            return [...prev, {
              userId: participant.identity,
              userName: participant.name || 'Unknown',
              timestamp: Date.now()
            }];
          });
        } else if (message.type === 'hail_granted') {
          if (message.userId === user.id) {
            setMyHailStatus('granted');
            onGrantTx?.(true);
          }
          setGrantedUsers(prev => new Set([...prev, message.userId]));
        } else if (message.type === 'hail_denied') {
          if (message.userId === user.id) {
            setMyHailStatus('denied');
          }
          setHailRequests(prev => prev.filter(r => r.userId !== message.userId));
        } else if (message.type === 'hail_revoked') {
          if (message.userId === user.id) {
            setMyHailStatus(null);
            onRevokeTx?.(false);
          }
          setGrantedUsers(prev => {
            const next = new Set(prev);
            next.delete(message.userId);
            return next;
          });
        }
      } catch (err) {
        console.error('[HAIL] Data message error:', err);
      }
    };

    room.on('dataReceived', handleDataReceived);

    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room, user?.id, onGrantTx, onRevokeTx]);

  const sendHailRequest = () => {
    if (!room || !user) return;
    
    const message = {
      type: 'hail_request',
      userId: user.id,
      userName: user.callsign || user.rsi_handle || user.full_name,
      rank: user.rank
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));
    room.localParticipant.publishData(data, { reliable: true });
    
    setMyHailStatus('pending');
  };

  const grantHail = (requestUserId, requestUserName) => {
    if (!room || !isCommander) return;

    const message = {
      type: 'hail_granted',
      userId: requestUserId
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));
    room.localParticipant.publishData(data, { reliable: true });

    setHailRequests(prev => prev.filter(r => r.userId !== requestUserId));
    setGrantedUsers(prev => new Set([...prev, requestUserId]));
  };

  const denyHail = (requestUserId) => {
    if (!room || !isCommander) return;

    const message = {
      type: 'hail_denied',
      userId: requestUserId
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));
    room.localParticipant.publishData(data, { reliable: true });

    setHailRequests(prev => prev.filter(r => r.userId !== requestUserId));
  };

  const revokeHail = (userId) => {
    if (!room || !isCommander) return;

    const message = {
      type: 'hail_revoked',
      userId: userId
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));
    room.localParticipant.publishData(data, { reliable: true });

    setGrantedUsers(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  return (
    <Card className="border-zinc-800 bg-zinc-950">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <Hand className="w-4 h-4 text-amber-500" />
          Stage Mode - Request to Speak
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* User Hail Button */}
        {!isCommander && (
          <div className="space-y-2">
            {!myHailStatus && (
              <Button
                onClick={sendHailRequest}
                className="w-full bg-amber-900 hover:bg-amber-800 text-white"
              >
                <Hand className="w-4 h-4 mr-2" />
                Request to Speak
              </Button>
            )}
            {myHailStatus === 'pending' && (
              <div className="p-3 bg-amber-950/50 border border-amber-800 rounded text-center">
                <Clock className="w-5 h-5 text-amber-500 mx-auto mb-2 animate-pulse" />
                <div className="text-xs font-bold text-amber-400">Request Pending</div>
                <div className="text-[10px] text-amber-300 mt-1">Awaiting commander approval</div>
              </div>
            )}
            {myHailStatus === 'granted' && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                <div className="text-xs font-bold text-emerald-400">TX Granted</div>
                <div className="text-[10px] text-emerald-300 mt-1">You may transmit</div>
              </div>
            )}
            {myHailStatus === 'denied' && (
              <div className="p-3 bg-red-950/50 border border-red-800 rounded text-center">
                <XCircle className="w-5 h-5 text-red-500 mx-auto mb-2" />
                <div className="text-xs font-bold text-red-400">Request Denied</div>
                <div className="text-[10px] text-red-300 mt-1">Try again later</div>
              </div>
            )}
          </div>
        )}

        {/* Commander Queue */}
        {isCommander && (
          <div className="space-y-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
              Pending Requests ({hailRequests.length})
            </div>
            
            {hailRequests.length === 0 ? (
              <div className="text-center py-6 text-zinc-600 text-xs italic">
                No pending requests
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {hailRequests.map(request => (
                    <div 
                      key={request.userId}
                      className="flex items-center justify-between bg-zinc-900/50 p-2 rounded border border-zinc-800"
                    >
                      <div>
                        <div className="text-sm font-bold text-zinc-300">{request.userName}</div>
                        <div className="text-[10px] text-zinc-500">
                          {new Date(request.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => grantHail(request.userId, request.userName)}
                          className="h-7 bg-emerald-900 hover:bg-emerald-800 text-white"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Grant
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => denyHail(request.userId)}
                          className="h-7 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Active Speakers */}
            {grantedUsers.size > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">
                  Active Speakers ({grantedUsers.size})
                </div>
                <div className="space-y-1">
                  {Array.from(grantedUsers).map(userId => (
                    <div 
                      key={userId}
                      className="flex items-center justify-between bg-emerald-950/20 p-2 rounded border border-emerald-900/30"
                    >
                      <div className="text-xs text-emerald-400 font-mono">{userId.slice(0, 8)}...</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revokeHail(userId)}
                        className="h-6 text-[10px] border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}