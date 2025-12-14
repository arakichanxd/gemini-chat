
import React, { useState, useEffect } from 'react';
import { Message, Sender, MessageType } from '../types';

interface MemoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    characterName: string;
    messages: Message[];
    onClearMemory: () => void;
}

interface Memory {
    category: string;
    icon: string;
    items: string[];
}

const MemoryModal: React.FC<MemoryModalProps> = ({
    isOpen,
    onClose,
    characterName,
    messages,
    onClearMemory
}) => {
    const [memories, setMemories] = useState<Memory[]>([]);

    useEffect(() => {
        if (isOpen) {
            extractMemories();
        }
    }, [isOpen, messages]);

    const extractMemories = () => {
        const stats = {
            totalMessages: messages.length,
            userMessages: messages.filter(m => m.sender === Sender.USER).length,
            aiMessages: messages.filter(m => m.sender === Sender.AI).length,
            images: messages.filter(m => m.type === MessageType.IMAGE).length,
            voiceNotes: messages.filter(m => m.type === MessageType.AUDIO).length,
        };

        // Extract topics from recent messages
        const recentTexts = messages
            .filter(m => m.type === MessageType.TEXT && m.text)
            .slice(-20)
            .map(m => m.text || '');

        // Simple keyword extraction
        const keywords = new Set<string>();
        const commonWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'to', 'for', 'of', 'in', 'on', 'with', 'you', 'i', 'me', 'my', 'we', 'our', 'your', 'it', 'this', 'that', 'tum', 'mein', 'hai', 'hoon', 'kya', 'ko', 'se', 'ki', 'ka', 'ne', 'main'];

        recentTexts.forEach(text => {
            text.toLowerCase().split(/\s+/).forEach(word => {
                if (word.length > 3 && !commonWords.includes(word)) {
                    keywords.add(word);
                }
            });
        });

        const extractedMemories: Memory[] = [
            {
                category: 'Chat Statistics',
                icon: '📊',
                items: [
                    `${stats.totalMessages} total messages`,
                    `${stats.userMessages} from you, ${stats.aiMessages} from ${characterName}`,
                    `${stats.images} photos shared`,
                    `${stats.voiceNotes} voice notes exchanged`
                ]
            },
            {
                category: 'Recent Topics',
                icon: '💭',
                items: Array.from(keywords).slice(0, 8).map(k => k.charAt(0).toUpperCase() + k.slice(1))
            },
            {
                category: 'Conversation Mood',
                icon: '💕',
                items: [
                    messages.length > 10 ? 'Active conversation' : 'Just getting started',
                    stats.voiceNotes > 0 ? 'Voice connection established' : 'Text-based chat',
                    stats.images > 3 ? 'Visual connection strong' : 'Words are your love language'
                ]
            }
        ];

        setMemories(extractedMemories);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 flex items-center justify-between text-white">
                    <div className="flex items-center">
                        <span className="text-2xl mr-2">🧠</span>
                        <div>
                            <h2 className="text-lg font-semibold">Memory Summary</h2>
                            <p className="text-xs opacity-80">What {characterName} remembers</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Memory Sections */}
                <div className="max-h-80 overflow-y-auto p-4 space-y-4">
                    {memories.map((memory, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3">
                            <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <span>{memory.icon}</span>
                                {memory.category}
                            </h3>
                            <ul className="space-y-1">
                                {memory.items.length > 0 ? (
                                    memory.items.map((item, i) => (
                                        <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                                            {item}
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-sm text-gray-400 italic">No data yet</li>
                                )}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                        Based on {messages.length} messages
                    </p>
                    <button
                        onClick={() => {
                            if (window.confirm('Clear all chat history? This cannot be undone.')) {
                                onClearMemory();
                                onClose();
                            }
                        }}
                        className="text-sm text-red-500 hover:text-red-600 font-medium px-3 py-1.5 hover:bg-red-50 rounded transition-colors"
                    >
                        Clear Memory
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MemoryModal;
