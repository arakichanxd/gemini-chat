import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Camera, SwitchCamera } from "lucide-react";
import type { Character } from "@/hooks/useCharacters";
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { encodeBase64, float32ToPcm16, decodeAudioData } from "@/lib/audioUtils";
import { toast } from "sonner";

const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY || '';

interface VideoCallDialogProps {
    character: Character | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conversationId: string;
    messageHistory: { role: string; content: string }[];
    onNewMessage?: (role: string, content: string) => void;
}

type CallStatus = 'idle' | 'connecting' | 'ringing' | 'connected';

export const VideoCallDialog = ({
    character,
    open,
    onOpenChange,
    conversationId,
    messageHistory,
    onNewMessage,
}: VideoCallDialogProps) => {
    const [callStatus, setCallStatus] = useState<CallStatus>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [callDuration, setCallDuration] = useState(0);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const sessionRef = useRef<any>(null);
    const callTimerRef = useRef<NodeJS.Timeout | null>(null);
    const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isConnectedRef = useRef(false);
    const nextStartTimeRef = useRef(0);

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

    const playAudio = (buffer: AudioBuffer) => {
        if (!audioContextRef.current) return;

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);

        const startTime = Math.max(audioContextRef.current.currentTime, nextStartTimeRef.current);
        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;
    };

    const captureAndSendFrame = async () => {
        if (!videoRef.current || !canvasRef.current || !sessionRef.current || !isConnectedRef.current) return;
        if (!isCameraOn) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize to avoid sending huge images
        canvas.width = 640;
        canvas.height = 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64 JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const base64Data = dataUrl.split(',')[1];

        try {
            await sessionRef.current.sendRealtimeInput({
                media: {
                    mimeType: 'image/jpeg',
                    data: base64Data
                }
            });
        } catch (e) {
            console.error("Error sending video frame:", e);
        }
    };

    const startCall = async () => {
        if (!character) return;
        if (!API_KEY) {
            toast.error("API key not configured");
            return;
        }

        setCallStatus('connecting');

        try {
            // Simulate ringing effect
            setTimeout(() => {
                setCallStatus('ringing');
            }, 500);

            // Get camera and microphone
            streamRef.current = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            // Display video
            if (videoRef.current) {
                videoRef.current.srcObject = streamRef.current;
            }

            // Setup audio
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            await audioContextRef.current.resume();
            nextStartTimeRef.current = audioContextRef.current.currentTime;

            // Build context
            const contextString = messageHistory.slice(-10).map(m =>
                `${m.role === 'user' ? 'User' : 'Character'}: ${m.content}`
            ).join("\n");

            const fullInstruction = `${character.system_prompt || "You are a helpful AI assistant."}

[Recent Chat Context]
${contextString}

[Video Call Instructions]
You are now in a VIDEO CALL. You can see the user through their camera. Describe what you see when relevant. Respond naturally and conversationally. Keep responses brief and engaging. Comment on what the user shows you. Start by greeting and acknowledging that you can see them.`;

            const client = new GoogleGenAI({ apiKey: API_KEY });

            const session = await client.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: character.voice_name || 'Kore' } }
                    },
                    systemInstruction: fullInstruction,
                },
                callbacks: {
                    onopen: () => {
                        console.log("Video Call: Connected");
                        isConnectedRef.current = true;
                        setCallStatus('connected');
                        startAudioInput();
                        // Start sending video frames every 500ms
                        frameIntervalRef.current = setInterval(captureAndSendFrame, 500);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData && audioContextRef.current) {
                            try {
                                const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000);
                                playAudio(audioBuffer);
                            } catch (e) {
                                console.error("Error decoding audio", e);
                            }
                        }
                    },
                    onclose: () => {
                        console.log("Video Call: Closed");
                        isConnectedRef.current = false;
                        endCall();
                    },
                    onerror: (err) => {
                        console.error("Video Call: Error", err);
                        toast.error("Call error: " + (err?.message || "Connection failed"));
                        endCall();
                    }
                }
            });

            sessionRef.current = session;

        } catch (error: any) {
            console.error("Failed to start video call:", error);
            toast.error("Failed to start call: " + (error?.message || "Camera/mic access denied"));
            endCall();
        }
    };

    const startAudioInput = () => {
        if (!streamRef.current) return;

        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const inputSource = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
        const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

        scriptProcessor.onaudioprocess = (e) => {
            if (!isConnectedRef.current || isMuted) return;

            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = float32ToPcm16(inputData);
            const base64Data = encodeBase64(new Uint8Array(pcm16.buffer));

            if (sessionRef.current) {
                sessionRef.current.sendRealtimeInput({
                    media: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64Data
                    }
                });
            }
        };

        inputSource.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContextRef.current.destination);
    };

    const endCall = () => {
        isConnectedRef.current = false;
        setCallStatus('idle');

        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (inputAudioContextRef.current) {
            try { inputAudioContextRef.current.close(); } catch (e) { }
            inputAudioContextRef.current = null;
        }

        if (audioContextRef.current) {
            try { audioContextRef.current.close(); } catch (e) { }
            audioContextRef.current = null;
        }

        sessionRef.current = null;
    };

    const toggleCamera = async () => {
        setIsCameraOn(!isCameraOn);
        if (streamRef.current) {
            streamRef.current.getVideoTracks().forEach(track => {
                track.enabled = !isCameraOn;
            });
        }
    };

    const switchCamera = async () => {
        const newMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newMode);

        if (streamRef.current && callStatus === 'connected') {
            // Stop current video track
            streamRef.current.getVideoTracks().forEach(track => track.stop());

            // Get new video track
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: newMode }
                });
                const newVideoTrack = newStream.getVideoTracks()[0];

                // Replace track
                const oldTrack = streamRef.current.getVideoTracks()[0];
                if (oldTrack) {
                    streamRef.current.removeTrack(oldTrack);
                }
                streamRef.current.addTrack(newVideoTrack);

                if (videoRef.current) {
                    videoRef.current.srcObject = streamRef.current;
                }
            } catch (e) {
                console.error("Failed to switch camera:", e);
            }
        }
    };

    // Handle dialog close
    useEffect(() => {
        if (!open && callStatus !== 'idle') {
            endCall();
        }
    }, [open]);

    // Auto-start call when dialog opens
    useEffect(() => {
        if (open && callStatus === 'idle') {
            startCall();
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-[#0b141a] border-none">
                <div className="relative w-full aspect-[3/4] bg-gradient-to-b from-[#1a2c38] to-[#0b141a] flex flex-col">

                    {/* Video Preview */}
                    <div className="flex-1 relative overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className={`w-full h-full object-cover ${!isCameraOn ? 'hidden' : ''}`}
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {!isCameraOn && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Avatar className="h-24 w-24 ring-4 ring-white/20">
                                    <AvatarImage src={character?.avatar_url || ""} />
                                    <AvatarFallback className="text-3xl bg-[#00a884] text-white">
                                        {character?.name?.[0] || "?"}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        )}

                        {/* Character overlay (small) */}
                        <div className="absolute top-4 right-4 flex flex-col items-center">
                            <Avatar className="h-16 w-16 ring-2 ring-white/30">
                                <AvatarImage src={character?.avatar_url || ""} />
                                <AvatarFallback className="text-xl bg-[#00a884] text-white">
                                    {character?.name?.[0] || "?"}
                                </AvatarFallback>
                            </Avatar>
                            <p className="text-white text-xs mt-1 opacity-80">{character?.name}</p>
                        </div>

                        {/* Status overlay */}
                        <div className="absolute top-4 left-4 text-white">
                            {callStatus === 'connecting' && (
                                <p className="text-sm animate-pulse">Connecting...</p>
                            )}
                            {callStatus === 'ringing' && (
                                <p className="text-sm animate-pulse">Ringing...</p>
                            )}
                            {callStatus === 'connected' && (
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <p className="text-sm">{formatDuration(callDuration)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="p-6 flex justify-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-14 w-14 rounded-full ${isCameraOn ? 'bg-[#2a3942] text-white' : 'bg-red-500 text-white'}`}
                            onClick={toggleCamera}
                            disabled={callStatus !== 'connected'}
                        >
                            {isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-14 w-14 rounded-full ${!isMuted ? 'bg-[#2a3942] text-white' : 'bg-red-500 text-white'}`}
                            onClick={() => setIsMuted(!isMuted)}
                            disabled={callStatus !== 'connected'}
                        >
                            {!isMuted ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-14 w-14 rounded-full bg-[#2a3942] text-white"
                            onClick={switchCamera}
                            disabled={callStatus !== 'connected'}
                        >
                            <SwitchCamera className="h-6 w-6" />
                        </Button>

                        <Button
                            variant="destructive"
                            size="icon"
                            className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700"
                            onClick={() => {
                                endCall();
                                onOpenChange(false);
                            }}
                        >
                            <PhoneOff className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
