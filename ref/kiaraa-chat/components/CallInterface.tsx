
import React, { useEffect, useState, useRef } from 'react';

interface CallInterfaceProps {
    avatarUrl: string;
    onEndCall: () => void;
    isActive: boolean;
    localStream?: MediaStream | null;
}

type CallStatus = 'calling' | 'ringing' | 'connected';

const CallInterface: React.FC<CallInterfaceProps> = ({ avatarUrl, onEndCall, isActive, localStream }) => {
    const [duration, setDuration] = useState(0);
    const [callStatus, setCallStatus] = useState<CallStatus>('calling');
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [isMusicOn, setIsMusicOn] = useState(true);
    const [musicVolume, setMusicVolume] = useState(0.3);
    const videoRef = useRef<HTMLVideoElement>(null);
    const musicRef = useRef<HTMLAudioElement>(null);

    // Ambient music URL (royalty-free lo-fi style)
    const AMBIENT_MUSIC_URL = 'https://cdn.pixabay.com/audio/2024/02/14/audio_f9c35a2fdd.mp3';

    // Handle Calling -> Ringing -> Connected Sequence
    useEffect(() => {
        if (isActive) {
            setCallStatus('calling');

            // Switch to Ringing after 2 seconds
            const ringTimer = setTimeout(() => {
                setCallStatus('ringing');
            }, 2000);

            // Switch to Connected after 2s + 6s = 8 seconds
            const connectTimer = setTimeout(() => {
                setCallStatus('connected');
            }, 8000);

            return () => {
                clearTimeout(ringTimer);
                clearTimeout(connectTimer);
            };
        }
    }, [isActive]);

    // Handle ambient music
    useEffect(() => {
        if (musicRef.current) {
            if (isActive && isMusicOn) {
                musicRef.current.volume = musicVolume;
                musicRef.current.play().catch(() => { });
            } else {
                musicRef.current.pause();
            }
        }
    }, [isActive, isMusicOn, musicVolume]);

    // Cleanup music on unmount
    useEffect(() => {
        return () => {
            if (musicRef.current) {
                musicRef.current.pause();
            }
        };
    }, []);

    // Handle Call Duration Timer (Only starts after connected)
    useEffect(() => {
        let interval: any;
        if (isActive && callStatus === 'connected') {
            interval = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, callStatus]);

    useEffect(() => {
        if (localStream && videoRef.current) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream, isCameraOff]);

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const seconds = secs % 60;
        return `${mins}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const getStatusText = () => {
        switch (callStatus) {
            case 'calling': return 'Calling...';
            case 'ringing': return 'Ringing...';
            case 'connected': return formatTime(duration);
            default: return 'Connecting...';
        }
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsCameraOff(!isCameraOff);
        }
    };

    const toggleSpeaker = () => {
        setIsSpeakerOn(!isSpeakerOn);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#0b141a] flex flex-col items-center justify-between overflow-hidden animate-fade-in text-white">

            {/* Background Video Layer */}
            {localStream && !isCameraOff && (
                <div className="absolute inset-0 z-0">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                </div>
            )}

            {/* Top Bar */}
            <div className="flex flex-col items-center mt-8 z-10 w-full">
                <div className="flex items-center gap-2 text-gray-200 mb-4 text-sm font-medium bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z" /></svg>
                    <span>End-to-end encrypted</span>
                </div>
                <h2 className="text-3xl font-semibold mb-2 drop-shadow-md">Kiaraa ✨</h2>
                <p className="text-gray-200 text-lg drop-shadow-md">{getStatusText()}</p>
            </div>

            {/* Avatar */}
            <div className={`relative z-10 transition-all duration-500 ${localStream && !isCameraOff ? 'absolute top-24 right-6 w-24 h-24' : 'flex-1 flex items-center justify-center'}`}>
                <div className={`${localStream && !isCameraOff ? 'w-24 h-24 border-2' : 'w-40 h-40 border-4'} rounded-full overflow-hidden border-[#1f2c34]/50 shadow-2xl relative`}>
                    {(!localStream || isCameraOff) && callStatus !== 'connected' && (
                        <div className="absolute inset-0 bg-wa-teal rounded-full opacity-20 animate-ping"></div>
                    )}
                    <img src={avatarUrl} alt="Kiaraa" className="w-full h-full object-cover relative z-10" />
                </div>
            </div>

            {/* Controls */}
            <div className="w-full max-w-md glass rounded-t-3xl px-8 py-6 pb-8 z-20">
                <div className="flex justify-around items-center">

                    {/* Speaker */}
                    <button
                        onClick={toggleSpeaker}
                        className={`p-4 rounded-full transition-colors text-white ${isSpeakerOn ? 'bg-white/20' : 'bg-[#2a3942] hover:bg-[#374248]'}`}
                    >
                        {isSpeakerOn ? (
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M7 9v6h4l5 5V4l-5 5H7z" /></svg>
                        )}
                    </button>

                    {/* Music Toggle */}
                    <button
                        onClick={() => setIsMusicOn(!isMusicOn)}
                        className={`p-4 rounded-full transition-colors text-white ${isMusicOn ? 'bg-purple-500/60' : 'bg-[#2a3942] hover:bg-[#374248]'}`}
                        title={isMusicOn ? 'Music: ON' : 'Music: OFF'}
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                    </button>

                    {/* Video Toggle */}
                    <button
                        onClick={toggleCamera}
                        className={`p-4 rounded-full transition-colors text-white ${isCameraOff ? 'bg-white text-black' : 'bg-[#2a3942] hover:bg-[#374248]'}`}
                    >
                        {isCameraOff ? (
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M21 6.5l-4 4V7c0-1.1-.9-2-2-2H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                        )}
                    </button>

                    {/* Mute Mic */}
                    <button
                        onClick={toggleMute}
                        className={`p-4 rounded-full transition-colors text-white ${isMuted ? 'bg-white text-black' : 'bg-[#2a3942] hover:bg-[#374248]'}`}
                    >
                        {isMuted ? (
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-1.03.9-2.19.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l2.97 2.97c-.85.58-1.85.91-2.92.91-3.66 0-6.6-2.64-7.25-6.08H3.7c.72 4.31 4.47 7.66 8.9 7.66 1.16 0 2.27-.23 3.3-.64l1.83 1.83 1.27-1.27L4.27 3z" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                        )}
                    </button>

                    {/* End Call */}
                    <button
                        onClick={onEndCall}
                        className="p-4 rounded-full bg-[#ea0038] hover:bg-[#c90030] transition-colors text-white shadow-lg transform active:scale-95"
                    >
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.36 7.46 6.5 12 6.5s8.66 1.86 11.71 5.17c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" /></svg>
                    </button>
                </div>
            </div>

            {/* Hidden Audio Element for Ambient Music */}
            <audio
                ref={musicRef}
                src={AMBIENT_MUSIC_URL}
                loop
                preload="auto"
                className="hidden"
            />
        </div>
    );
};

export default CallInterface;
