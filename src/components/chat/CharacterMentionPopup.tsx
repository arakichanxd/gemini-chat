import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Character } from "@/hooks/useCharacters";

interface CharacterMentionPopupProps {
    characters: Character[];
    searchTerm: string;
    onSelect: (character: Character) => void;
    onClose: () => void;
    position?: { top: number; left: number };
}

export const CharacterMentionPopup = ({
    characters,
    searchTerm,
    onSelect,
    onClose,
    position,
}: CharacterMentionPopupProps) => {
    const popupRef = useRef<HTMLDivElement>(null);

    // Filter characters based on search term
    const filteredCharacters = characters.filter((character) =>
        character.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    if (filteredCharacters.length === 0) {
        return null;
    }

    return (
        <div
            ref={popupRef}
            className="absolute z-50 w-64 max-h-48 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
            style={position ? { bottom: position.top, left: position.left } : { bottom: "100%", left: 0, marginBottom: "8px" }}
        >
            <div className="p-2 border-b border-border">
                <p className="text-xs text-muted-foreground">Mention a character</p>
            </div>
            <div className="max-h-36 overflow-y-auto">
                {filteredCharacters.map((character) => (
                    <div
                        key={character.id}
                        className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => onSelect(character)}
                    >
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={character.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {character.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{character.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                                @{character.name.toLowerCase().replace(/\s+/g, '')}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
