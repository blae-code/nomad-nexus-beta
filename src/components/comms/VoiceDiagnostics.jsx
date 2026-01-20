import React, { useState, useEffect, useRef } from "react";
import { Room, RoomEvent } from "livekit-client";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Volume2, Radio, CheckCircle2, XCircle, AlertTriangle, Copy, Play, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function VoiceDiagnostics({ user, eventId }) {
  const [diagnostics, setDiagnostics] = useState({
    micPermission: null,
    micLevel: 0,
    speakerTest: null,
    connectionTest: null,
    rxPermission: null,
    txPermission: null,
    roomConnection: null
  });
  
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [errorDetails, setErrorDetails] = useState({});
  const [expandedErrors, setExpandedErrors] = useState({});
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const testRoomRef = useRef(null);

  // Test 1: Microphone Permission & Level
  const testMicrophone = async () => {
    setIsTestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      setDiagnostics(prev => ({ ...prev, micPermission: 'pass' }));
      
      // Setup audio analyzer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Monitor audio level for 3 seconds
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let maxLevel = 0;
      
      const checkLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedLevel = Math.min(100, (average / 128) * 100);
        
        if (normalizedLevel > maxLevel) maxLevel = normalizedLevel;
        
        setDiagnostics(prev => ({ ...prev, micLevel: normalizedLevel }));
      };
      
      const interval = setInterval(checkLevel, 100);
      
      setTimeout(() => {
        clearInterval(interval);
        setIsTestingMic(false);
        
        // Stop mic stream
        stream.getTracks().forEach(track => track.stop());
        if (audioContext) audioContext.close();
        
        if (maxLevel < 5) {
          toast.error("No audio detected - check your microphone");
        } else {
          toast.success(`Microphone working - peak level: ${Math.round(maxLevel)}%`);
        }
      }, 3000);
      
    } catch (err) {
      console.error("Mic test failed:", err);
      setDiagnostics(prev => ({ ...prev, micPermission: 'fail' }));
      setErrorDetails(prev => ({
        ...prev,
        micPermission: {
          title: 'Microphone Access Denied',
          message: err.message,
          solutions: [
            'Check browser permissions for microphone access',
            'Ensure your browser has microphone permission enabled',
            'Try using HTTPS connection if on HTTP',
            'Check if another app is using the microphone'
          ],
          errorCode: err.name || 'UNKNOWN'
        }
      }));
      setIsTestingMic(false);
      toast.error("Microphone access denied - check browser permissions");
    }
  };

  // Test 2: Speaker Test
  const testSpeakers = () => {
    setDiagnostics(prev => ({ ...prev, speakerTest: 'testing' }));
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 440; // A4 note
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    
    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
      setDiagnostics(prev => ({ ...prev, speakerTest: 'pass' }));
      toast.success("Speaker test complete - did you hear a tone?");
    }, 1000);
  };

  // Test 3: Full Connection Test
  const testConnection = async () => {
    setIsTestingConnection(true);
    const testLog = [];
    
    try {
      testLog.push(`[${new Date().toISOString()}] Starting connection test...`);
      
      // Step 1: Request token
      testLog.push(`[INFO] Requesting LiveKit token for test room...`);
      const res = await base44.functions.invoke('generateLiveKitToken', {
        eventId: eventId || 'test',
        netIds: ['test']
      });
      
      if (res.data.errors?.length > 0) {
        testLog.push(`[ERROR] Token errors: ${res.data.errors.join(', ')}`);
        setDiagnostics(prev => ({ ...prev, connectionTest: 'fail', rxPermission: 'fail', txPermission: 'fail' }));
        setDebugInfo({ log: testLog, errors: res.data.errors });
        setIsTestingConnection(false);
        toast.error("Permission check failed");
        return;
      }
      
      const token = res.data.tokens?.test || Object.values(res.data.tokens)[0];
      const url = res.data.livekitUrl;
      
      if (!token) {
        testLog.push(`[ERROR] No token received`);
        setDiagnostics(prev => ({ ...prev, connectionTest: 'fail' }));
        setDebugInfo({ log: testLog });
        setIsTestingConnection(false);
        toast.error("Failed to get connection token");
        return;
      }
      
      testLog.push(`[SUCCESS] Token received`);
      
      // Check permissions from warnings
      const canTX = !res.data.warnings?.some(w => w.includes('transmit'));
      const canRX = !res.data.warnings?.some(w => w.includes('receive'));
      
      setDiagnostics(prev => ({ 
        ...prev, 
        rxPermission: canRX ? 'pass' : 'fail',
        txPermission: canTX ? 'pass' : 'fail'
      }));
      
      testLog.push(`[INFO] RX Permission: ${canRX ? 'GRANTED' : 'DENIED'}`);
      testLog.push(`[INFO] TX Permission: ${canTX ? 'GRANTED' : 'DENIED'}`);
      
      // Step 2: Connect to test room
      testLog.push(`[INFO] Connecting to LiveKit room...`);
      const room = new Room({ adaptiveStream: true, dynacast: true });
      testRoomRef.current = room;
      
      await room.connect(url, token);
      testLog.push(`[SUCCESS] Connected to room: ${room.name}`);
      
      // Step 3: Test microphone publish (if allowed)
      if (canTX) {
        testLog.push(`[INFO] Testing microphone publish...`);
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          testLog.push(`[SUCCESS] Microphone published`);
          
          // Disable after test
          setTimeout(() => {
            room.localParticipant.setMicrophoneEnabled(false);
          }, 500);
        } catch (err) {
          testLog.push(`[WARNING] Microphone publish failed: ${err.message}`);
        }
      }
      
      // Step 4: Get connection stats
      const stats = await room.localParticipant.getStats();
      const latency = stats.length > 0 ? Math.round(stats[0].rtt * 1000) : 'N/A';
      testLog.push(`[INFO] Round-trip latency: ${latency}ms`);
      
      setDebugInfo({
        userId: user?.id,
        userIdentity: room.localParticipant.identity,
        roomName: room.name,
        serverUrl: url.split('://')[1],
        latency: latency,
        canTransmit: canTX,
        canReceive: canRX,
        log: testLog
      });
      
      setDiagnostics(prev => ({ ...prev, connectionTest: 'pass', roomConnection: 'connected' }));
      toast.success(`Connection test passed - ${latency}ms latency`);
      
      // Disconnect after test
      setTimeout(() => {
        room.disconnect();
        testRoomRef.current = null;
      }, 2000);
      
    } catch (err) {
      testLog.push(`[ERROR] ${err.message}`);
      setDiagnostics(prev => ({ ...prev, connectionTest: 'fail' }));
      
      // Detailed error analysis
      let errorAnalysis = {
        title: 'Connection Test Failed',
        message: err.message,
        solutions: [],
        errorCode: err.name || 'UNKNOWN',
        errorStack: err.stack?.split('\n').slice(0, 3).join('\n')
      };
      
      if (err.message.includes('404') || err.message.includes('token')) {
        errorAnalysis.solutions.push('LiveKit server token generation failed - check function logs');
        errorAnalysis.solutions.push('Verify event ID is valid');
        errorAnalysis.solutions.push('Check LiveKit API credentials in backend');
      } else if (err.message.includes('connection') || err.message.includes('connect')) {
        errorAnalysis.solutions.push('Unable to reach LiveKit server - check URL and network');
        errorAnalysis.solutions.push('Verify LIVEKIT_URL environment variable is correct');
        errorAnalysis.solutions.push('Check if firewall is blocking WebSocket connections');
      } else if (err.message.includes('permission') || err.message.includes('denied')) {
        errorAnalysis.solutions.push('User lacks required permissions for voice communication');
        errorAnalysis.solutions.push('Check rank and role requirements for this event');
        errorAnalysis.solutions.push('Verify VoiceNet permissions match user profile');
      } else {
        errorAnalysis.solutions.push('Check browser console for detailed error logs');
        errorAnalysis.solutions.push('Try refreshing the page and running test again');
        errorAnalysis.solutions.push('Contact system administrator if issue persists');
      }
      
      setErrorDetails(prev => ({
        ...prev,
        connectionTest: errorAnalysis
      }));
      setDebugInfo({ log: testLog, error: err.message });
      toast.error(`Connection test failed: ${err.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Copy debug info
  const copyDebugInfo = () => {
    const info = `
=== VOICE DIAGNOSTICS REPORT ===
Date: ${new Date().toISOString()}
User ID: ${debugInfo.userId || 'N/A'}
User Identity: ${debugInfo.userIdentity || 'N/A'}
Room Name: ${debugInfo.roomName || 'N/A'}
Server: ${debugInfo.serverUrl || 'N/A'}
Latency: ${debugInfo.latency || 'N/A'}
RX Permission: ${diagnostics.rxPermission?.toUpperCase() || 'N/A'}
TX Permission: ${diagnostics.txPermission?.toUpperCase() || 'N/A'}
Mic Permission: ${diagnostics.micPermission?.toUpperCase() || 'N/A'}

=== TEST LOG ===
${debugInfo.log?.join('\n') || 'No log available'}
    `.trim();
    
    navigator.clipboard.writeText(info);
    toast.success("Debug info copied to clipboard");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (testRoomRef.current) {
        testRoomRef.current.disconnect();
      }
    };
  }, []);

  const getStatusIcon = (status) => {
    if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === 'fail') return <XCircle className="w-4 h-4 text-red-500" />;
    if (status === 'testing') return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
    return <AlertTriangle className="w-4 h-4 text-zinc-600" />;
  };

  const ErrorDetailCard = ({ testKey, error }) => {
    if (!error) return null;
    
    const isExpanded = expandedErrors[testKey];
    
    return (
      <div className="mt-4 p-3 bg-red-950/20 border border-red-900/50 rounded-sm space-y-2">
        <button
          onClick={() => setExpandedErrors(prev => ({ ...prev, [testKey]: !prev[testKey] }))}
          className="w-full flex items-start justify-between text-left hover:text-red-300 transition-colors"
        >
          <div>
            <div className="text-xs font-bold text-red-400">{error.title}</div>
            <div className="text-[10px] text-red-300/70 mt-1">{error.message}</div>
          </div>
          <ChevronRight className={`w-4 h-4 text-red-500 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </button>
        
        {isExpanded && (
          <div className="mt-3 space-y-3 border-t border-red-900/30 pt-3">
            {error.errorCode && (
              <div className="text-[9px] font-mono bg-black/30 p-2 rounded border border-red-900/30">
                <span className="text-red-500/70">Error Code:</span> {error.errorCode}
              </div>
            )}
            
            {error.solutions?.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-red-300 uppercase">Troubleshooting Steps:</div>
                <ol className="space-y-1">
                  {error.solutions.map((solution, i) => (
                    <li key={i} className="text-[9px] text-red-200/80 flex gap-2">
                      <span className="text-red-500 font-bold shrink-0">{i + 1}.</span>
                      <span>{solution}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            
            {error.errorStack && (
              <div className="text-[8px] font-mono text-red-300/50 bg-black/50 p-2 rounded border border-red-900/20 whitespace-pre-wrap break-words max-h-24 overflow-auto">
                {error.errorStack}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-zinc-200">Voice Diagnostics</h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">Test your audio setup before joining operations</p>
        </div>
      </div>

      {/* Test Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Microphone Test */}
         <Card className="bg-zinc-950 border-zinc-800">
           <CardHeader className="pb-3">
             <CardTitle className="text-sm flex items-center gap-2">
               <Mic className="w-4 h-4 text-[#ea580c]" />
               Microphone Test
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             <div className="flex items-center justify-between">
               <span className="text-xs text-zinc-400">Permission</span>
               {getStatusIcon(diagnostics.micPermission)}
             </div>

             {isTestingMic && (
               <div className="space-y-2">
                 <div className="text-xs text-zinc-500 font-mono">Speak now...</div>
                 <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-emerald-500 transition-all duration-100"
                     style={{ width: `${diagnostics.micLevel}%` }}
                   />
                 </div>
                 <div className="text-[10px] text-zinc-600 text-right font-mono">
                   Level: {Math.round(diagnostics.micLevel)}%
                 </div>
               </div>
             )}

             <Button 
               onClick={testMicrophone}
               disabled={isTestingMic}
               size="sm"
               className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700"
             >
               {isTestingMic ? (
                 <>
                   <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                   Testing...
                 </>
               ) : (
                 <>
                   <Play className="w-3 h-3 mr-2" />
                   Test Microphone
                 </>
               )}
             </Button>

             {errorDetails.micPermission && (
               <ErrorDetailCard testKey="micPermission" error={errorDetails.micPermission} />
             )}
           </CardContent>
         </Card>

        {/* Speaker Test */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#ea580c]" />
              Speaker Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Audio Output</span>
              {getStatusIcon(diagnostics.speakerTest)}
            </div>
            
            <Button 
              onClick={testSpeakers}
              size="sm"
              className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700"
            >
              <Play className="w-3 h-3 mr-2" />
              Play Test Tone
            </Button>
            
            {diagnostics.speakerTest === 'pass' && (
              <div className="text-xs text-zinc-500 bg-zinc-900 p-2 rounded border border-zinc-800">
                Did you hear a beep? If not, check your speakers/headphones.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Test */}
         <Card className="bg-zinc-950 border-zinc-800 lg:col-span-2">
           <CardHeader className="pb-3">
             <CardTitle className="text-sm flex items-center gap-2">
               <Radio className="w-4 h-4 text-[#ea580c]" />
               Connection & Permission Test
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             <div className="grid grid-cols-2 gap-4">
               <div className="flex items-center justify-between">
                 <span className="text-xs text-zinc-400">RX (Receive)</span>
                 {getStatusIcon(diagnostics.rxPermission)}
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-xs text-zinc-400">TX (Transmit)</span>
                 {getStatusIcon(diagnostics.txPermission)}
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-xs text-zinc-400">Connection</span>
                 {getStatusIcon(diagnostics.connectionTest)}
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-xs text-zinc-400">Room Join</span>
                 {getStatusIcon(diagnostics.roomConnection)}
               </div>
             </div>

             <Button 
               onClick={testConnection}
               disabled={isTestingConnection || !eventId}
               size="sm"
               className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white"
             >
               {isTestingConnection ? (
                 <>
                   <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                   Testing Connection...
                 </>
               ) : (
                 <>
                   <Play className="w-3 h-3 mr-2" />
                   Run Connection Test
                 </>
               )}
             </Button>

             {!eventId && (
               <div className="text-xs text-amber-500 bg-amber-950/20 p-2 rounded border border-amber-900">
                 Select an event in Comms Console to test connection
               </div>
             )}

             {errorDetails.connectionTest && (
               <ErrorDetailCard testKey="connectionTest" error={errorDetails.connectionTest} />
             )}
           </CardContent>
         </Card>
      </div>

      {/* Debug Info */}
      {Object.keys(debugInfo).length > 0 && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Debug Information</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={copyDebugInfo}
                className="gap-2 text-xs"
              >
                <Copy className="w-3 h-3" />
                Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2 text-xs font-mono">
                {debugInfo.userId && (
                  <div className="flex gap-2">
                    <span className="text-zinc-600">User ID:</span>
                    <span className="text-zinc-400">{debugInfo.userId}</span>
                  </div>
                )}
                {debugInfo.userIdentity && (
                  <div className="flex gap-2">
                    <span className="text-zinc-600">Identity:</span>
                    <span className="text-zinc-400">{debugInfo.userIdentity}</span>
                  </div>
                )}
                {debugInfo.roomName && (
                  <div className="flex gap-2">
                    <span className="text-zinc-600">Room:</span>
                    <span className="text-zinc-400">{debugInfo.roomName}</span>
                  </div>
                )}
                {debugInfo.serverUrl && (
                  <div className="flex gap-2">
                    <span className="text-zinc-600">Server:</span>
                    <span className="text-zinc-400">{debugInfo.serverUrl}</span>
                  </div>
                )}
                {debugInfo.latency && (
                  <div className="flex gap-2">
                    <span className="text-zinc-600">Latency:</span>
                    <Badge variant="outline" className={cn(
                      "h-5 text-xs",
                      debugInfo.latency < 100 ? "bg-emerald-950/30 text-emerald-400 border-emerald-800" :
                      debugInfo.latency < 200 ? "bg-amber-950/30 text-amber-400 border-amber-800" :
                      "bg-red-950/30 text-red-400 border-red-800"
                    )}>
                      {debugInfo.latency}ms
                    </Badge>
                  </div>
                )}
                
                {debugInfo.log && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <div className="text-zinc-500 mb-2">Test Log:</div>
                    <div className="bg-black rounded p-3 space-y-1 text-[10px]">
                      {debugInfo.log.map((line, i) => (
                        <div key={i} className={cn(
                          line.includes('[ERROR]') ? 'text-red-400' :
                          line.includes('[SUCCESS]') ? 'text-emerald-400' :
                          line.includes('[WARNING]') ? 'text-amber-400' :
                          'text-zinc-500'
                        )}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}