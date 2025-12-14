
import React from 'react';

interface ImageViewerModalProps {
    isOpen: boolean;
    imageUrl: string | null;
    onClose: () => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, imageUrl, onClose }) => {
    if (!isOpen || !imageUrl) return null;

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[400] bg-black/90 flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center p-4 text-white bg-black/40 backdrop-blur-sm absolute top-0 w-full">
                <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                     </div>
                     <span className="font-medium">View Photo</span>
                </div>
                <div className="flex gap-4">
                    <button onClick={handleDownload} className="hover:bg-white/20 p-2 rounded-full transition-colors" title="Download">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    </button>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors" title="Close">
                         <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
            </div>

            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden" onClick={onClose}>
                <img 
                    src={imageUrl} 
                    alt="Full Screen" 
                    className="max-w-full max-h-full object-contain shadow-2xl"
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
                />
            </div>
        </div>
    );
};

export default ImageViewerModal;
