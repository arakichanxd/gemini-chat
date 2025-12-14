import { useState, useMemo } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Phone, Video, X, MessageCircle, Settings } from "lucide-react";
import type { Character } from "@/hooks/useCharacters";

interface CharacterProfileSheetProps {
    character: Character | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCall?: () => void;
    onVideoCall?: () => void;
    onSettings?: () => void;
    chatStats?: {
        total: number;
        firstDate: string | null;
        lastDate: string | null;
    };
    isTyping?: boolean;
    isCharacterOnline?: boolean;
}

// Generate a consistent phone number based on character name
const generatePhoneNumber = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash = hash & hash;
    }
    const num = Math.abs(hash);
    return `+91 ${String(num).slice(0, 5)} ${String(num).slice(5, 10) || '00000'}`;
};

export const CharacterProfileSheet = ({
    character,
    open,
    onOpenChange,
    onCall,
    onVideoCall,
    onSettings,
    chatStats,
    isTyping = false,
    isCharacterOnline = false,
}: CharacterProfileSheetProps) => {
    const [showFullImage, setShowFullImage] = useState(false);

    // Calculate online status based on isCharacterOnline prop and typing status
    const onlineStatus = useMemo(() => {
        if (isTyping) {
            return { text: "typing...", color: "#00a884", isOnline: true };
        }

        if (isCharacterOnline) {
            return { text: "online", color: "#00a884", isOnline: true };
        }

        if (!chatStats?.lastDate) {
            return { text: "offline", color: "#9ca3af", isOnline: false };
        }

        const lastActivity = new Date(chatStats.lastDate);
        return {
            text: `last seen ${lastActivity.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            color: "#9ca3af",
            isOnline: false
        };
    }, [chatStats?.lastDate, isTyping, isCharacterOnline]);

    if (!character) return null;

    const phoneNumber = generatePhoneNumber(character.name);

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
                    {/* Header with gradient background */}
                    <div
                        className="relative h-48 flex items-end justify-center pb-16"
                        style={{ backgroundColor: character.theme_color || '#00a884' }}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => onOpenChange(false)}
                            className="absolute top-4 left-4 text-white/80 hover:text-white"
                        >
                            <X className="h-6 w-6" />
                        </button>

                        {/* Profile Picture */}
                        <div
                            className="absolute -bottom-16 cursor-pointer"
                            onClick={() => setShowFullImage(true)}
                        >
                            <div className="relative">
                                <Avatar className="h-32 w-32 ring-4 ring-background shadow-lg">
                                    <AvatarImage src={character.avatar_url || undefined} />
                                    <AvatarFallback className="text-4xl bg-primary/20">
                                        {character.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                {/* Online indicator */}
                                {onlineStatus.isOnline && (
                                    <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-3 border-background" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-6 pt-20 pb-6 space-y-6">
                        {/* Name and Online Status */}
                        <div className="text-center">
                            <h2 className="text-2xl font-bold">{character.name}</h2>
                            <p className="text-sm mt-1" style={{ color: onlineStatus.color }}>
                                {onlineStatus.text}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-center gap-6">
                            {onCall && (
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    className="flex flex-col items-center gap-1 h-auto py-3"
                                    onClick={onCall}
                                >
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${character.theme_color || '#00a884'}20` }}>
                                        <Phone className="h-5 w-5" style={{ color: character.theme_color || '#00a884' }} />
                                    </div>
                                    <span className="text-xs">Call</span>
                                </Button>
                            )}
                            {onVideoCall && (
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    className="flex flex-col items-center gap-1 h-auto py-3"
                                    onClick={onVideoCall}
                                >
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${character.theme_color || '#00a884'}20` }}>
                                        <Video className="h-5 w-5" style={{ color: character.theme_color || '#00a884' }} />
                                    </div>
                                    <span className="text-xs">Video</span>
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="lg"
                                className="flex flex-col items-center gap-1 h-auto py-3"
                                onClick={() => onOpenChange(false)}
                            >
                                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${character.theme_color || '#00a884'}20` }}>
                                    <MessageCircle className="h-5 w-5" style={{ color: character.theme_color || '#00a884' }} />
                                </div>
                                <span className="text-xs">Message</span>
                            </Button>
                        </div>

                        {/* Bio / About */}
                        <div className="space-y-2 bg-muted/50 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-muted-foreground">About</h3>
                            <p className="text-foreground">
                                {character.description || "Hey there! I'm using AI Chat."}
                            </p>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-muted-foreground">Contact Info</h3>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-3 py-2">
                                    <Phone className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">{phoneNumber}</p>
                                        <p className="text-xs text-muted-foreground">Mobile</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Character Settings Button */}
                        {onSettings && (
                            <div
                                className="flex items-center gap-3 bg-muted/50 rounded-lg p-4 cursor-pointer hover:bg-muted transition-colors"
                                onClick={onSettings}
                            >
                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${character.theme_color || '#00a884'}20` }}>
                                    <Settings className="h-5 w-5" style={{ color: character.theme_color || '#00a884' }} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">Character Settings</p>
                                    <p className="text-xs text-muted-foreground">Edit profile, prompt, and preferences</p>
                                </div>
                            </div>
                        )}

                        {/* Chat Stats */}
                        {chatStats && chatStats.total > 0 && (
                            <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-muted-foreground">Media, Links and Docs</h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">{chatStats.total} messages exchanged</span>
                                    <span className="text-xs text-muted-foreground">
                                        Since {chatStats.firstDate ? new Date(chatStats.firstDate).toLocaleDateString() : '-'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Full Image Dialog */}
            <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black border-none">
                    <button
                        onClick={() => setShowFullImage(false)}
                        className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    {character.avatar_url ? (
                        <img
                            src={character.avatar_url}
                            alt={character.name}
                            className="w-full h-full object-contain max-h-[90vh]"
                        />
                    ) : (
                        <div className="w-full aspect-square flex items-center justify-center bg-primary/20">
                            <span className="text-8xl font-bold text-primary/50">
                                {character.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};
