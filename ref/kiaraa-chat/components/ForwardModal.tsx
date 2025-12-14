
import React from 'react';
import { ChatSession, Message, MessageType } from '../types';

interface ForwardModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: Message | null;
    sessions: ChatSession[];
    currentSessionId: string;
    onForward: (targetSessionId: string, message: Message) => void;
}

const ForwardModal: React.FC<ForwardModalProps> = ({
    isOpen,
    onClose,
    message,
    sessions,
    currentSessionId,
    onForward
}) => {
    if (!isOpen || !message) return null;

    const otherSessions = sessions.filter(s => s.id !== currentSessionId);

    const handleForward = (targetSessionId: string) => {
        onForward(targetSessionId, message);
        onClose();
    };

    const getMessagePreview = () => {
        if (message.type === MessageType.TEXT) {
            return message.text?.slice(0, 50) + (message.text && message.text.length > 50 ? '...' : '');
        }
        if (message.type === MessageType.IMAGE) return '📷 Photo';
        if (message.type === MessageType.AUDIO) return '🎤 Voice Note';
        return 'Message';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="bg-wa-teal p-4 flex items-center text-white">
                    <button onClick={onClose} className="mr-4 hover:bg-white/10 p-2 rounded-full transition-colors">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <h2 className="text-lg font-semibold">Forward Message</h2>
                </div>

                {/* Message Preview */}
                <div className="p-4 border-b bg-gray-50">
                    <p className="text-sm text-gray-500 mb-1">Forwarding:</p>
                    <p className="text-sm text-gray-800 font-medium truncate">{getMessagePreview()}</p>
                </div>

                {/* Session List */}
                <div className="max-h-64 overflow-y-auto">
                    {otherSessions.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                            No other characters to forward to
                        </div>
                    ) : (
                        otherSessions.map(session => (
                            <button
                                key={session.id}
                                onClick={() => handleForward(session.id)}
                                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                            >
                                <div className="w-12 h-12 rounded-full overflow-hidden mr-3 shrink-0">
                                    <img src={session.avatar} alt={session.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="text-[#111b21] text-base font-medium">{session.name}</h3>
                                    <p className="text-[#667781] text-sm truncate">
                                        {session.messages.length > 0
                                            ? `${session.messages.length} messages`
                                            : 'No messages yet'}
                                    </p>
                                </div>
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="#25d366">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForwardModal;
