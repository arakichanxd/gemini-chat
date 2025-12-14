
import React, { useRef, useState, useEffect } from 'react';

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (imageData: string) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, facingMode]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    setIsReady(true);
                };
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Could not access camera. Please check permissions.');
            onClose();
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsReady(false);
    };

    const flipCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current || !isReady) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Mirror if front camera
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0);

        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(imageData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[400] bg-black flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center p-4 text-white bg-black/40 absolute top-0 w-full z-10">
                <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                </button>
                <span className="font-medium">Camera</span>
                <button onClick={flipCamera} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M9 12c0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3-3 1.34-3 3zm13 0c0 4.97-4.03 9-9 9-2.83 0-5.35-1.31-7-3.35V20H4v-6h6v2H7.11c1.26 1.79 3.32 3 5.89 3 3.86 0 7-3.14 7-7h2zm-2-9v6H8V7h2.89C9.63 5.21 7.57 4 5 4c-3.86 0-7 3.14-7 7H0C0 6.03 4.03 2 9 2c2.83 0 5.35 1.31 7 3.35V3h2z" />
                    </svg>
                </button>
            </div>

            {/* Video Preview */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
            </div>

            {/* Hidden Canvas */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Capture Button */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                <button
                    onClick={capturePhoto}
                    disabled={!isReady}
                    className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center"
                >
                    <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-400"></div>
                </button>
            </div>
        </div>
    );
};

export default CameraModal;
