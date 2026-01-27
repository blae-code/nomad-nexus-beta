import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, Headphones, Mic, MicOff, Radio, Users, VolumeX } from "lucide-react";

const LOG_LIMIT = 50;

const initialQuality = {
  packetLoss: 0,
  latency: 0,
  quality: "unknown",
};

export default function CommsDevTest() {
  const [eventId, setEventId] = useState("");
  const [netId, setNetId] = useState("");
  const [net, setNet] = useState(null);
  const [user, setUser] = useState(null);
  const [connectionState, setConnectionState] = useState("disconnected");
  const [connectionError, setConnectionError] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState(initialQuality);
  const [participantCount, setParticipantCount] = useState(0);
  const [debugLogs, setDebugLogs] = useState([]);
  const [pttEnabled, setPttEnabled] = useState(true);
  const [isPTTPressed, setIsPTTPressed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  const roomRef = useRef(null);
  const eventListenersRef = useRef([]);
  const qualityIntervalRef = useRef(null);
  const audioContainerRef = useRef(null);

  const isTransmitting = useMemo(() => {
    if (isMuted || isDeafened) return false;
    if (!pttEnabled) return true;
    return isPTTPressed;
  }, [isMuted, isDeafened, pttEnabled, isPTTPressed]);

  const appendLog = useCallback((label, payload) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label,
      payload,
      timestamp: new Date().toISOString(),
    };
    setDebugLogs((prev) => [entry, ...prev].slice(0, LOG_LIMIT));
  }, []);

  const normalizeLiveKitUrl = (rawUrl) => {
    if (typeof rawUrl !== "string" || rawUrl.length === 0) {
      return null;
    }
    let url = rawUrl.trim();
    if (!url.startsWith("wss://") && !url.startsWith("ws://")) {
      if (url.startsWith("http://")) {
        url = `ws://${url.substring(7)}`;
      } else if (url.startsWith("https://")) {
        url = `wss://${url.substring(8)}`;
      } else {
        url = `wss://${url}`;
      }
    }
    if (!import.meta.env.DEV && url.startsWith("ws://")) {
      return null;
    }
    return url;
  };

  const clearRoom = useCallback(() => {
    if (qualityIntervalRef.current) {
      clearInterval(qualityIntervalRef.current);
      qualityIntervalRef.current = null;
    }
    if (roomRef.current) {
      try {
        eventListenersRef.current.forEach(({ event, handler }) => {
          roomRef.current.off(event, handler);
        });
      } catch (err) {
        console.warn("[DEV COMMS] Failed to remove listeners:", err);
      }
      eventListenersRef.current = [];
      try {
        roomRef.current.disconnect();
      } catch (err) {
        console.warn("[DEV COMMS] Failed to disconnect:", err);
      }
    }
    roomRef.current = null;
    setParticipantCount(0);
    setConnectionQuality(initialQuality);
  }, []);

  const updateParticipantCount = useCallback((room) => {
    if (!room) {
      setParticipantCount(0);
      return;
    }
    const remoteCount = room.remoteParticipants?.size || 0;
    const localCount = room.localParticipant ? 1 : 0;
    setParticipantCount(remoteCount + localCount);
  }, []);

  const connectToRoom = useCallback(async () => {
    if (!eventId || !netId) {
      setConnectionError("Event ID and Net ID are required.");
      return;
    }

    setConnectionError(null);
    setConnectionState("connecting");
    setMicPermissionDenied(false);
    clearRoom();

    try {
      const [currentUser, voiceNet] = await Promise.all([
        base44.auth.me(),
        base44.entities.VoiceNet.get(netId),
      ]);
      setUser(currentUser);
      setNet(voiceNet);

      const roomName = `op-${eventId}-${voiceNet.code}`;

      const readinessResponse = await base44.functions.invoke("verifyCommsReadiness", {});
      appendLog("verifyCommsReadiness", readinessResponse.data);

      const statusResponse = await base44.functions.invoke("getLiveKitRoomStatus", { roomName });
      appendLog("getLiveKitRoomStatus", statusResponse.data);

      const tokenResponse = await base44.functions.invoke("generateLiveKitToken", {
        roomName,
        userIdentity: currentUser?.id || "unknown",
      });
      appendLog("generateLiveKitToken", tokenResponse.data);

      if (!tokenResponse.data?.ok) {
        throw new Error(tokenResponse.data?.message || "Failed to mint token.");
      }

      const token = tokenResponse.data?.data?.token;
      const rawUrl = tokenResponse.data?.data?.url;
      const url = normalizeLiveKitUrl(rawUrl);

      if (!token) {
        throw new Error("Token missing from response.");
      }
      if (!url) {
        throw new Error("LiveKit URL missing or invalid.");
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        autoSubscribe: true,
      });
      roomRef.current = room;

      const registerListener = (event, handler) => {
        room.on(event, handler);
        eventListenersRef.current.push({ event, handler });
      };

      registerListener(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        if (track?.kind !== "audio") return;
        try {
          const elements = track.attach();
          const elementsArray = Array.isArray(elements) ? elements : [elements];
          elementsArray.forEach((element) => {
            if (!element || !(element instanceof HTMLElement)) return;
            element.style.display = "none";
            element.style.visibility = "hidden";
            element.muted = isDeafened;
            if (audioContainerRef.current) {
              audioContainerRef.current.appendChild(element);
            }
          });
          console.log(`[DEV COMMS] Subscribed to audio from ${participant.identity}`);
        } catch (err) {
          console.warn("[DEV COMMS] Failed to attach audio:", err);
        }
      });

      registerListener(RoomEvent.TrackUnsubscribed, (track) => {
        try {
          const elements = track.detach();
          const elementsArray = Array.isArray(elements) ? elements : [elements];
          elementsArray.forEach((element) => {
            if (element && element.parentNode) {
              element.remove();
            }
          });
        } catch (err) {
          console.warn("[DEV COMMS] Failed to detach audio:", err);
        }
      });

      registerListener(RoomEvent.ParticipantConnected, () => updateParticipantCount(room));
      registerListener(RoomEvent.ParticipantDisconnected, () => updateParticipantCount(room));
      registerListener(RoomEvent.Reconnecting, () => setConnectionState("reconnecting"));
      registerListener(RoomEvent.Reconnected, () => setConnectionState("connected"));
      registerListener(RoomEvent.Disconnected, (reason) => {
        console.warn("[DEV COMMS] Disconnected:", reason);
        setConnectionState("disconnected");
      });

      await room.connect(url, token);
      setConnectionState("connected");
      updateParticipantCount(room);

      qualityIntervalRef.current = setInterval(() => {
        if (!room?.localParticipant) return;
        const quality = room.localParticipant.lastConnectionQuality || "unknown";
        let packetLoss = 0;
        let latency = 0;
        if (quality === "poor") {
          packetLoss = 5;
          latency = 200;
        } else if (quality === "good") {
          packetLoss = 1;
          latency = 100;
        } else if (quality === "excellent") {
          packetLoss = 0;
          latency = 50;
        }
        setConnectionQuality({ quality, packetLoss, latency });
      }, 3000);
    } catch (err) {
      console.error("[DEV COMMS] Connection failed:", err);
      setConnectionError(err.message || "Connection failed.");
      setConnectionState("failed");
    }
  }, [appendLog, clearRoom, eventId, netId, isDeafened, updateParticipantCount]);

  const disconnectFromRoom = useCallback(() => {
    clearRoom();
    setConnectionState("disconnected");
  }, [clearRoom]);

  const fetchRoomStatus = useCallback(async () => {
    if (!eventId || !net?.code) {
      setConnectionError("Event ID and Net must be loaded before fetching status.");
      return;
    }
    const roomName = `op-${eventId}-${net.code}`;
    try {
      const response = await base44.functions.invoke("getLiveKitRoomStatus", { roomName });
      appendLog("getLiveKitRoomStatus", response.data);
    } catch (err) {
      appendLog("getLiveKitRoomStatus:error", { message: err.message });
    }
  }, [appendLog, eventId, net?.code]);

  const verifyReadiness = useCallback(async () => {
    try {
      const response = await base44.functions.invoke("verifyCommsReadiness", {});
      appendLog("verifyCommsReadiness", response.data);
    } catch (err) {
      appendLog("verifyCommsReadiness:error", { message: err.message });
    }
  }, [appendLog]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === "Space" && pttEnabled && !isMuted && !isDeafened) {
        if (event.target.tagName !== "INPUT" && event.target.tagName !== "TEXTAREA") {
          event.preventDefault();
          setIsPTTPressed(true);
        }
      }
    };
    const handleKeyUp = (event) => {
      if (event.code === "Space") {
        setIsPTTPressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [pttEnabled, isMuted, isDeafened]);

  useEffect(() => {
    const audioElements = audioContainerRef.current?.querySelectorAll("audio") || [];
    audioElements.forEach((element) => {
      element.muted = isDeafened;
    });
  }, [isDeafened]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) return;

    const handleAudioState = async () => {
      try {
        if (isDeafened) {
          await room.localParticipant.setMicrophoneEnabled(false);
          return;
        }
        await room.localParticipant.setMicrophoneEnabled(isTransmitting);
      } catch (err) {
        console.error("[DEV COMMS] Microphone error:", err);
        if (err.name === "NotAllowedError" || err.message.includes("Permission")) {
          setMicPermissionDenied(true);
        }
      }
    };

    handleAudioState();
  }, [isDeafened, isTransmitting]);

  useEffect(() => () => clearRoom(), [clearRoom]);

  const micStateLabel = isDeafened
    ? "DEAFENED"
    : isMuted
    ? "MUTED"
    : isTransmitting
    ? "TRANSMITTING"
    : pttEnabled
    ? "PTT READY"
    : "OPEN MIC";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-6 space-y-6">
      <div className="space-y-2">
        <Badge className="bg-emerald-950/60 text-emerald-300 border border-emerald-800">DEV ONLY</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">Comms LiveKit Debug Console</h1>
        <p className="text-sm text-zinc-400 max-w-3xl">
          Use this hidden page to generate LiveKit tokens, join any net, and inspect detailed connection telemetry without leaving the page.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <Card className="border border-zinc-800 bg-zinc-950/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-400" />
              Connection Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dev-event-id">Event ID</Label>
                <Input
                  id="dev-event-id"
                  placeholder="evt_123..."
                  value={eventId}
                  onChange={(event) => setEventId(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dev-net-id">Net ID</Label>
                <Input
                  id="dev-net-id"
                  placeholder="net_123..."
                  value={netId}
                  onChange={(event) => setNetId(event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={connectToRoom}
                disabled={connectionState === "connecting"}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Join Room
              </Button>
              <Button variant="outline" onClick={disconnectFromRoom}>
                Disconnect
              </Button>
              <Button variant="secondary" onClick={verifyReadiness}>
                Verify Readiness
              </Button>
              <Button variant="secondary" onClick={fetchRoomStatus}>
                Get Room Status
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Connection Status</div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium capitalize">{connectionState}</span>
                  {connectionError && (
                    <Badge className="bg-red-950 text-red-300 border border-red-800">Error</Badge>
                  )}
                </div>
                {connectionError && (
                  <div className="text-xs text-red-300 flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3" />
                    {connectionError}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Participants</div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-blue-300" />
                  {participantCount}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Microphone</div>
                <div className="flex items-center gap-2 text-sm">
                  {isMuted || isDeafened ? (
                    <MicOff className="h-4 w-4 text-red-400" />
                  ) : (
                    <Mic className="h-4 w-4 text-emerald-300" />
                  )}
                  <span className="font-medium">{micStateLabel}</span>
                </div>
                {micPermissionDenied && (
                  <div className="text-xs text-amber-300">Microphone permission denied.</div>
                )}
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Quality</div>
                <div className="text-sm font-medium capitalize">{connectionQuality.quality}</div>
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Latency / Loss</div>
                <div className="text-sm font-medium">
                  {connectionQuality.latency}ms · {connectionQuality.packetLoss}%
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Quick Controls</div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={pttEnabled ? "default" : "outline"}
                  className={cn(pttEnabled && "bg-amber-500 hover:bg-amber-400 text-black")}
                  onClick={() => setPttEnabled((prev) => !prev)}
                >
                  <Radio className="h-4 w-4 mr-2" />
                  {pttEnabled ? "PTT Enabled" : "Open Mic"}
                </Button>
                <Button
                  variant={isMuted ? "destructive" : "outline"}
                  onClick={() => setIsMuted((prev) => !prev)}
                >
                  <MicOff className="h-4 w-4 mr-2" />
                  {isMuted ? "Unmute" : "Mute"}
                </Button>
                <Button
                  variant={isDeafened ? "destructive" : "outline"}
                  onClick={() => setIsDeafened((prev) => !prev)}
                >
                  {isDeafened ? (
                    <VolumeX className="h-4 w-4 mr-2" />
                  ) : (
                    <Headphones className="h-4 w-4 mr-2" />
                  )}
                  {isDeafened ? "Undeafen" : "Deafen"}
                </Button>
              </div>
              <div className="text-xs text-zinc-500">
                {pttEnabled ? "Hold Space to transmit." : "Microphone is open unless muted."}
              </div>
            </div>

            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">
              <div className="font-semibold text-zinc-200 mb-1">Loaded Net</div>
              {net ? (
                <div className="space-y-1">
                  <div>
                    <span className="text-zinc-500">Label:</span> {net.label || "Unknown"}
                  </div>
                  <div>
                    <span className="text-zinc-500">Code:</span> {net.code}
                  </div>
                  <div>
                    <span className="text-zinc-500">Discipline:</span> {net.discipline}
                  </div>
                </div>
              ) : (
                <div>No net loaded yet.</div>
              )}
              {user && (
                <div className="mt-2 text-zinc-500">User: {user.callsign || user.email || user.id}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-800 bg-zinc-950/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Debug Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[520px] pr-3">
              <div className="space-y-3">
                {debugLogs.length === 0 ? (
                  <div className="text-xs text-zinc-500">No debug logs yet.</div>
                ) : (
                  debugLogs.map((entry) => (
                    <div key={entry.id} className="rounded border border-zinc-800 bg-zinc-900/50 p-3">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span className="uppercase tracking-widest">{entry.label}</span>
                        <span>{entry.timestamp}</span>
                      </div>
                      <pre className="text-xs text-zinc-200 mt-2 whitespace-pre-wrap break-words">
                        {JSON.stringify(entry.payload, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div ref={audioContainerRef} className="hidden" aria-hidden />
    </div>
  );
}
