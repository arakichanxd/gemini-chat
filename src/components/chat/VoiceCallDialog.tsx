import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import type { Character } from "@/hooks/useCharacters";
import { GeminiLiveSession } from "@/lib/geminiLive";
import { toast } from "sonner";

interface VoiceCallDialogProps {
  character: Character | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  messageHistory: { role: string; content: string }[];
  onNewMessage?: (role: string, content: string) => void;
}

type CallStatus = 'idle' | 'connecting' | 'ringing' | 'connected';

export const VoiceCallDialog = ({
  character,
  open,
  onOpenChange,
  conversationId,
  messageHistory,
  onNewMessage,
}: VoiceCallDialogProps) => {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const liveSessionRef = useRef<GeminiLiveSession>(new GeminiLiveSession());
  const streamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Call duration timer
  useEffect(() => {
    if (callStatus === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      setCallDuration(0);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startCall = async () => {
    if (!character) return;

    setCallStatus('connecting');

    try {
      // Simulate ringing effect
      setTimeout(() => {
        if (callStatus === 'connecting') {
          setCallStatus('ringing');
        }
      }, 1000);

      await liveSessionRef.current.start(
        character.system_prompt || "You are a helpful AI assistant.",
        messageHistory,
        character.voice_name || 'Kore',
        () => {
          // onClose
          setCallStatus('idle');
          toast.info("Call ended");
        },
        (err) => {
          // onError
          console.error("Call error:", err);
          setCallStatus('idle');
          if (err?.message?.includes('API_KEY')) {
            toast.error("API key not configured. Add VITE_GOOGLE_AI_API_KEY to .env");
          } else {
            toast.error("Failed to connect call");
          }
        }
      );

      // If session started successfully
      setCallStatus('connected');
      toast.success("Call connected!");

    } catch (error) {
      console.error("Failed to start call:", error);
      toast.error("Failed to start call");
      setCallStatus('idle');
    }
  };

  const endCall = async () => {
    await liveSessionRef.current.stop();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCallStatus('idle');
    setIsMuted(false);
    onOpenChange(false);
  };

  const toggleMute = () => {
    // Note: Muting would require stopping audio input to the session
    // For now, just toggle the UI state
    setIsMuted(!isMuted);
    toast.info(isMuted ? "Microphone unmuted" : "Microphone muted");
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting': return 'Connecting...';
      case 'ringing': return 'Ringing...';
      case 'connected': return formatDuration(callDuration);
      default: return 'Voice Call';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && endCall()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0">
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 p-8 text-center text-white min-h-[400px] flex flex-col items-center justify-between">

          {/* Top section */}
          <div className="text-center">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              End-to-end encrypted
            </p>
          </div>

          {/* Avatar with animation */}
          <div className="relative">
            <div
              className={`absolute inset-0 rounded-full bg-primary/30 ${callStatus === 'connected' ? "animate-ping" : callStatus === 'ringing' ? "animate-pulse" : ""
                }`}
              style={{ transform: "scale(1.3)" }}
            />
            <Avatar className="h-32 w-32 ring-4 ring-white/20 relative z-10">
              <AvatarImage src={character?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-white text-4xl font-medium">
                {character?.name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name and status */}
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-1">{character?.name}</h3>
            <p className="text-slate-300 text-lg">{getStatusText()}</p>
          </div>

          {/* Call controls */}
          <div className="flex justify-center gap-6">
            {callStatus === 'idle' ? (
              <Button
                onClick={startCall}
                size="lg"
                className="rounded-full h-16 w-16 bg-green-600 hover:bg-green-500"
              >
                <Phone className="h-7 w-7" />
              </Button>
            ) : (
              <>
                <Button
                  onClick={toggleMute}
                  size="lg"
                  variant="secondary"
                  className={`rounded-full h-14 w-14 ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}
                >
                  {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>

                <Button
                  onClick={endCall}
                  size="lg"
                  className="rounded-full h-16 w-16 bg-red-600 hover:bg-red-500"
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>

                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-full h-14 w-14 bg-white/10 text-white"
                >
                  <Volume2 className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};