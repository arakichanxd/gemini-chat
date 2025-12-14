import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useActiveStories, useMarkStoryViewed, useAutoGenerateStories, type CharacterStory } from "@/hooks/useCharacterStories";
import type { Character } from "@/hooks/useCharacters";
import { X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StoriesBarProps {
    onCharacterClick?: (character: Character) => void;
}

export const StoriesBar = ({ onCharacterClick }: StoriesBarProps) => {
    const { data: storiesByCharacter, isLoading } = useActiveStories();
    const markViewed = useMarkStoryViewed();
    // Trigger auto-generation of stories on load
    useAutoGenerateStories();
    const [viewingStory, setViewingStory] = useState<{
        character: Character;
        stories: CharacterStory[];
        currentIndex: number;
    } | null>(null);

    if (isLoading || !storiesByCharacter || storiesByCharacter.size === 0) {
        return null;
    }

    const charactersWithStories = Array.from(storiesByCharacter.entries()).map(
        ([characterId, stories]) => ({
            character: stories[0].character!,
            stories,
            hasUnviewed: stories.some((s) => !s.viewed),
        })
    );

    const handleStoryClick = (character: Character, stories: CharacterStory[]) => {
        setViewingStory({ character, stories, currentIndex: 0 });
        // Mark first story as viewed
        if (!stories[0].viewed) {
            markViewed.mutate(stories[0].id);
        }
    };

    const handleNextStory = () => {
        if (!viewingStory) return;

        const nextIndex = viewingStory.currentIndex + 1;
        if (nextIndex < viewingStory.stories.length) {
            setViewingStory({ ...viewingStory, currentIndex: nextIndex });
            if (!viewingStory.stories[nextIndex].viewed) {
                markViewed.mutate(viewingStory.stories[nextIndex].id);
            }
        } else {
            setViewingStory(null);
        }
    };

    const handlePrevStory = () => {
        if (!viewingStory) return;

        const prevIndex = viewingStory.currentIndex - 1;
        if (prevIndex >= 0) {
            setViewingStory({ ...viewingStory, currentIndex: prevIndex });
        }
    };

    return (
        <>
            {/* Stories Bar */}
            <div className="px-4 py-3 border-b border-border">
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-3">
                        {charactersWithStories.map(({ character, stories, hasUnviewed }) => (
                            <button
                                key={character.id}
                                onClick={() => handleStoryClick(character, stories)}
                                className="flex flex-col items-center gap-1 group"
                            >
                                <div
                                    className={`p-0.5 rounded-full ${hasUnviewed
                                        ? "bg-gradient-to-tr from-primary via-pink-500 to-yellow-500"
                                        : "bg-muted"
                                        }`}
                                >
                                    <Avatar className="h-14 w-14 border-2 border-background">
                                        <AvatarImage src={character.avatar_url || undefined} />
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {character.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <span className="text-xs text-muted-foreground truncate max-w-[60px] group-hover:text-foreground transition-colors">
                                    {character.name.split(" ")[0]}
                                </span>
                            </button>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            {/* Story Viewer Modal */}
            {viewingStory && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex flex-col"
                    onClick={handleNextStory}
                >
                    {/* Progress bars */}
                    <div className="flex gap-1 p-2">
                        {viewingStory.stories.map((_, index) => (
                            <div
                                key={index}
                                className={`h-0.5 flex-1 rounded-full ${index <= viewingStory.currentIndex
                                    ? "bg-white"
                                    : "bg-white/30"
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Header */}
                    <div className="flex items-center gap-3 p-4" onClick={(e) => e.stopPropagation()}>
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={viewingStory.character.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                                {viewingStory.character.name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-semibold text-white">{viewingStory.character.name}</p>
                            <p className="text-xs text-white/60">
                                {formatDistanceToNow(
                                    new Date(viewingStory.stories[viewingStory.currentIndex].created_at),
                                    { addSuffix: true }
                                )}
                            </p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setViewingStory(null);
                            }}
                            className="p-2 text-white/80 hover:text-white"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Story Content */}
                    <div className="flex-1 flex items-center justify-center p-8">
                        <p className="text-2xl text-white text-center max-w-lg leading-relaxed">
                            {viewingStory.stories[viewingStory.currentIndex].content}
                        </p>
                    </div>

                    {/* Navigation areas */}
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1/3 h-1/2 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrevStory();
                        }}
                    />
                    <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-1/2 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNextStory();
                        }}
                    />
                </div>
            )}
        </>
    );
};
