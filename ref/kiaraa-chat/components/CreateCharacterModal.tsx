
import React, { useState, useRef, useEffect } from 'react';

interface CreateCharacterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, prompt: string, voice: string, avatar: string, referenceImage?: string) => void;
}

const VOICES = [
    'Aoede', 'Kore', 'Leda', 'Callirroe', 'Autonoe', 'Despina', 'Erinome', 'Laomedeia', 'Achernar', 'Pulcherrima', 'Sulafat', 'Zephyr',
    'Fenrir', 'Charon', 'Puck'
];

const CreateCharacterModal: React.FC<CreateCharacterModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [prompt, setPrompt] = useState('');
    const [voice, setVoice] = useState('Kore');
    const [avatar, setAvatar] = useState<string>('');
    const [referenceImage, setReferenceImage] = useState<string | undefined>(undefined);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const refImageInputRef = useRef<HTMLInputElement>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setName('');
            setPrompt('');
            setVoice('Kore');
            setAvatar('');
            setReferenceImage(undefined);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFunction: (val: string) => void) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFunction(reader.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSubmit = () => {
        if (name && prompt) {
            // Use uploaded avatar or generate a default one based on name
            const finalAvatar = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
            
            onCreate(name, prompt, voice, finalAvatar, referenceImage);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-6 animate-fade-in-up flex flex-col max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-xl font-semibold text-wa-teal">Create New Character</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2">
                    {/* Image Upload Section */}
                    <div className="flex justify-around items-start">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Profile Picture</label>
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-md bg-gray-100 flex items-center justify-center">
                                    {avatar ? (
                                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <svg viewBox="0 0 24 24" width="32" height="32" stroke="gray" strokeWidth="1" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                </div>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={(e) => handleFileChange(e, setAvatar)} 
                                className="hidden" 
                                accept="image/*"
                            />
                        </div>

                        {/* Reference Image Upload */}
                        <div className="flex flex-col items-center">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Reference Image</label>
                            <div className="relative group cursor-pointer" onClick={() => refImageInputRef.current?.click()}>
                                <div className="w-24 h-24 rounded-lg overflow-hidden border-4 border-gray-100 shadow-md bg-gray-100 flex items-center justify-center">
                                    {referenceImage ? (
                                        <img src={referenceImage} alt="Ref" className="w-full h-full object-cover" />
                                    ) : (
                                        <svg viewBox="0 0 24 24" width="32" height="32" stroke="gray" strokeWidth="1" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">For AI Generation</p>
                            <input 
                                type="file" 
                                ref={refImageInputRef} 
                                onChange={(e) => handleFileChange(e, setReferenceImage)} 
                                className="hidden" 
                                accept="image/*"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Character Name</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wa-teal outline-none"
                            placeholder="e.g. Maya"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                         <label className="block text-sm font-bold text-gray-700 mb-1">Voice</label>
                         <div className="relative">
                            <select 
                                value={voice} 
                                onChange={(e) => setVoice(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wa-teal outline-none appearance-none"
                            >
                                <optgroup label="Female">
                                    {VOICES.filter(v => !['Fenrir', 'Charon', 'Puck'].includes(v)).map(v => <option key={v} value={v}>{v}</option>)}
                                </optgroup>
                                <optgroup label="Male">
                                    {VOICES.filter(v => ['Fenrir', 'Charon', 'Puck'].includes(v)).map(v => <option key={v} value={v}>{v}</option>)}
                                </optgroup>
                            </select>
                            <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                            </div>
                         </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">System Prompt (Persona)</label>
                        <textarea
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wa-teal outline-none h-32 resize-none text-sm leading-relaxed"
                            placeholder="Describe how the AI should behave, speak, and interact..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>
                </div>

                <div className="pt-6 flex justify-end border-t border-gray-100 mt-2">
                    <button 
                        onClick={handleSubmit}
                        disabled={!name || !prompt}
                        className="bg-wa-teal text-white px-8 py-2.5 rounded-full font-medium hover:bg-[#008f6f] transition-all disabled:opacity-50 shadow-md"
                    >
                        Create Character
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateCharacterModal;
