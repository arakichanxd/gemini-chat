
import React, { useState, useRef } from 'react';
import { generateWallpaper } from '../services/geminiService';
import { SavedPrompt } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
  avatarUrl: string;
  referenceImageUrl?: string;
  voiceName: string;
  savedPrompts: SavedPrompt[];
  onSave: (prompt: string, avatar: string, referenceImage: string | undefined, voice: string) => void;
  onUpdateWallpaper: (url: string) => void;
  onSavePrompt: (name: string, content: string) => void;
}

const PRESET_WALLPAPERS = [
  { name: "Default", url: null }, 
  { name: "Dark", url: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=600&auto=format&fit=crop" },
  { name: "Blue", url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop" },
  { name: "Pink", url: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?q=80&w=600&auto=format&fit=crop" },
  { name: "Night City", url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=600&auto=format&fit=crop" },
  { name: "Nature", url: "https://images.unsplash.com/photo-1501854140884-074cf2b2c3af?q=80&w=600&auto=format&fit=crop" },
];

const VOICES = [
  // User requested Female Category
  { name: 'Aoede', gender: 'Female' },
  { name: 'Kore', gender: 'Female' },
  { name: 'Leda', gender: 'Female' },
  { name: 'Callirroe', gender: 'Female' },
  { name: 'Autonoe', gender: 'Female' },
  { name: 'Despina', gender: 'Female' },
  { name: 'Erinome', gender: 'Female' },
  { name: 'Laomedeia', gender: 'Female' },
  { name: 'Achernar', gender: 'Female' },
  { name: 'Pulcherrima', gender: 'Female' },
  { name: 'Sulafat', gender: 'Female' },
  { name: 'Zephyr', gender: 'Female' },
  
  // Male Category
  { name: 'Fenrir', gender: 'Male' },
  { name: 'Charon', gender: 'Male' },
  { name: 'Puck', gender: 'Male' }
];

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  systemPrompt, 
  avatarUrl,
  referenceImageUrl,
  voiceName,
  savedPrompts,
  onSave,
  onUpdateWallpaper,
  onSavePrompt
}) => {
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);
  const [localAvatar, setLocalAvatar] = useState(avatarUrl);
  const [localReferenceImage, setLocalReferenceImage] = useState(referenceImageUrl);
  const [localVoice, setLocalVoice] = useState(voiceName);
  const [wallpaperPrompt, setWallpaperPrompt] = useState("geometric shapes with soft green hues");
  const [isGenerating, setIsGenerating] = useState(false);
  const [newPromptName, setNewPromptName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLocalPrompt(systemPrompt);
    setLocalAvatar(avatarUrl);
    setLocalReferenceImage(referenceImageUrl);
    setLocalVoice(voiceName || 'Kore');
  }, [systemPrompt, avatarUrl, referenceImageUrl, voiceName, isOpen]);

  if (!isOpen) return null;

  const handleGenerateWallpaper = async () => {
    setIsGenerating(true);
    const url = await generateWallpaper(wallpaperPrompt);
    if (url) {
      onUpdateWallpaper(url);
    }
    setIsGenerating(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFunction: (val: string) => void) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFunction(reader.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSavePrompt = () => {
    if (newPromptName.trim() && localPrompt.trim()) {
        onSavePrompt(newPromptName, localPrompt);
        setNewPromptName("");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-wa-teal p-4 flex items-center text-white shrink-0">
          <button onClick={onClose} className="mr-4 hover:bg-white/10 p-2 rounded-full transition-colors">
             <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <h2 className="text-xl font-semibold">Settings</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          
          {/* Profile Picture & Reference Image Row */}
          <div className="flex justify-around items-start">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                 <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                   <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-lg">
                     <img src={localAvatar} alt="Profile" className="w-full h-full object-cover" />
                   </div>
                   <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <svg viewBox="0 0 24 24" width="20" height="20" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                   </div>
                 </div>
                 <p className="text-wa-teal text-xs font-medium mt-2">Avatar</p>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   onChange={(e) => handleFileChange(e, setLocalAvatar)} 
                   className="hidden" 
                   accept="image/*"
                 />
              </div>

              {/* Reference Image */}
              <div className="flex flex-col items-center">
                 <div className="relative group cursor-pointer" onClick={() => refImageInputRef.current?.click()}>
                   <div className="w-24 h-24 rounded-lg overflow-hidden border-4 border-gray-100 shadow-lg bg-gray-100">
                     {localReferenceImage ? (
                         <img src={localReferenceImage} alt="Ref" className="w-full h-full object-cover" />
                     ) : (
                         <div className="flex items-center justify-center h-full text-gray-400">
                             <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                         </div>
                     )}
                   </div>
                   <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <svg viewBox="0 0 24 24" width="20" height="20" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                   </div>
                 </div>
                 <p className="text-wa-teal text-xs font-medium mt-2 text-center w-24">Reference Pic<br/>(For Generation)</p>
                 <input 
                   type="file" 
                   ref={refImageInputRef} 
                   onChange={(e) => handleFileChange(e, setLocalReferenceImage)} 
                   className="hidden" 
                   accept="image/*"
                 />
              </div>
          </div>

          <hr className="border-gray-100" />
          
           {/* Voice Selection */}
           <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Character Voice
            </label>
            <div className="relative">
                <select 
                    value={localVoice} 
                    onChange={(e) => setLocalVoice(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-wa-teal appearance-none text-sm"
                >
                    <optgroup label="Female">
                        {VOICES.filter(v => v.gender === 'Female').map(v => (
                            <option key={v.name} value={v.name}>{v.name}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Male">
                        {VOICES.filter(v => v.gender === 'Male').map(v => (
                            <option key={v.name} value={v.name}>{v.name}</option>
                        ))}
                    </optgroup>
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Wallpaper Section */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Chat Wallpaper
            </label>
            
            <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar mb-4 snap-x">
                {PRESET_WALLPAPERS.map((wp, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => onUpdateWallpaper(wp.url || '')}
                        className="w-20 h-32 shrink-0 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-wa-teal overflow-hidden relative snap-center group"
                    >
                        {wp.url ? (
                            <img src={wp.url} alt={wp.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                            <div className="w-full h-full bg-[#efeae2] flex items-center justify-center text-xs text-center text-gray-500 p-1">Default</div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center py-1 truncate px-1">
                            {wp.name}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                value={wallpaperPrompt}
                onChange={(e) => setWallpaperPrompt(e.target.value)}
                className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-wa-teal"
                placeholder="Describe a new background..."
              />
              <button 
                onClick={handleGenerateWallpaper}
                disabled={isGenerating}
                className="bg-wa-teal text-white px-5 py-2 rounded-lg hover:bg-[#008f6f] disabled:opacity-70 transition-colors flex items-center justify-center min-w-[60px]"
              >
                {isGenerating ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                )}
              </button>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* System Prompt Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-gray-700">
                System Prompt (Persona)
                </label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Save as..." 
                        value={newPromptName}
                        onChange={(e) => setNewPromptName(e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 outline-none w-24"
                    />
                    <button 
                        onClick={handleSavePrompt}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                    >
                        Save
                    </button>
                </div>
            </div>
            
            {savedPrompts.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {savedPrompts.map((p, idx) => (
                        <button 
                            key={idx}
                            onClick={() => setLocalPrompt(p.content)}
                            className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors truncate max-w-[120px]"
                            title={p.content}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            )}

            <div className="relative">
                <textarea
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-wa-teal focus:border-transparent outline-none resize-none h-48 text-sm text-gray-800 font-mono leading-relaxed"
                value={localPrompt}
                onChange={(e) => setLocalPrompt(e.target.value)}
                placeholder="Define how the AI should behave..."
                />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 flex justify-end shrink-0 border-t border-gray-100">
          <button
            onClick={() => {
              onSave(localPrompt, localAvatar, localReferenceImage, localVoice);
              onClose();
            }}
            className="bg-wa-teal text-white px-8 py-2.5 rounded-full shadow-md hover:bg-[#008f6f] transition-all font-semibold text-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
