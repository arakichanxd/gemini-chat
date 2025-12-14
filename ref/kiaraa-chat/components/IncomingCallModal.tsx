
import React from 'react';

interface IncomingCallModalProps {
    avatarUrl: string;
    callerName: string;
    onAccept: () => void;
    onReject: () => void;
    isVideo?: boolean;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({ avatarUrl, callerName, onAccept, onReject, isVideo }) => {
    return (
        <div className="fixed inset-0 z-[300] bg-[#0b141a]/95 flex flex-col items-center justify-center animate-fade-in text-white backdrop-blur-md">
            
            <div className="flex flex-col items-center mb-16 animate-pulse">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#25d366] shadow-2xl mb-6 relative">
                    <img src={avatarUrl} alt={callerName} className="w-full h-full object-cover" />
                </div>
                <h2 className="text-3xl font-semibold mb-2">{callerName}</h2>
                <p className="text-[#8696a0] text-lg">WhatsApp {isVideo ? 'Video' : 'Audio'} Call...</p>
            </div>

            <div className="flex gap-16 items-center">
                {/* Decline */}
                <div className="flex flex-col items-center gap-2">
                    <button 
                        onClick={onReject}
                        className="w-16 h-16 rounded-full bg-[#ea0038] flex items-center justify-center shadow-lg hover:bg-[#c90030] transition-transform hover:scale-110"
                    >
                        <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.36 7.46 6.5 12 6.5s8.66 1.86 11.71 5.17c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </button>
                    <span className="text-sm font-medium">Decline</span>
                </div>

                {/* Accept */}
                <div className="flex flex-col items-center gap-2">
                    <button 
                        onClick={onAccept}
                        className="w-16 h-16 rounded-full bg-[#25d366] flex items-center justify-center shadow-lg hover:bg-[#20b959] transition-transform hover:scale-110 animate-bounce"
                    >
                        {isVideo ? (
                             <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        ) : (
                             <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.26-.26.35-.65.24-1.01A11.36 11.36 0 0 1 9.96 4.4c0-.55-.45-1-1-1H4.38c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-4.58c0-.55-.45-1-1-1z"/></svg>
                        )}
                    </button>
                    <span className="text-sm font-medium">Accept</span>
                </div>
            </div>
        </div>
    );
};

export default IncomingCallModal;
