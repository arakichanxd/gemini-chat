import { useState, useRef, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGroupMessages, useSendGroupMessage, useReactToGroupMessage, parseMentions, type GroupMessage } from "@/hooks/useGroupMessages";
import type { GroupWithMembers } from "@/hooks/useGroups";
import type { Character } from "@/hooks/useCharacters";
import { CharacterMentionPopup } from "./CharacterMentionPopup";
import { Send, ArrowLeft, Users, Loader2, Smile } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GroupProfileSheet } from "./GroupProfileSheet";

const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥", "💯", "😍", "😏", "👀"];

// Character with optional model override from group settings
type CharacterWithOverride = Character & { _modelOverride?: string | null };

interface GroupChatWindowProps {
    group: GroupWithMembers;
    onBack?: () => void;
}

export const GroupChatWindow = ({ group, onBack }: GroupChatWindowProps) => {
    const [message, setMessage] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const [respondingCharacter, setRespondingCharacter] = useState<Character | null>(null);
    const [showMentionPopup, setShowMentionPopup] = useState(false);
    const [mentionSearch, setMentionSearch] = useState("");
    const [profileOpen, setProfileOpen] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { data: messages, isLoading: messagesLoading } = useGroupMessages(group.id);
    const sendGroupMessage = useSendGroupMessage();
    const reactToMessage = useReactToGroupMessage();

    // Get characters from group members with model override info
    const groupCharacters = useMemo(() => {
        return group.group_members.map((member) => ({
            ...member.characters,
            // Store model_override from group_members for use in chat
            _modelOverride: member.model_override,
        }));
    }, [group.group_members]);

    // Generate group avatar (collage of first 3 members)
    const groupAvatars = useMemo(() => {
        return group.group_members.slice(0, 3).map((m) => m.characters);
    }, [group.group_members]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, streamingContent]);

    // Handle input change and detect @ mentions
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setMessage(value);

        // Check for @ at cursor position
        const cursorPos = e.target.selectionStart || 0;
        const textBeforeCursor = value.slice(0, cursorPos);
        const atMatch = textBeforeCursor.match(/@(\w*)$/);

        if (atMatch) {
            setMentionSearch(atMatch[1]);
            setShowMentionPopup(true);
        } else {
            setShowMentionPopup(false);
            setMentionSearch("");
        }
    };

    // Handle character selection from mention popup
    const handleMentionSelect = (character: Character) => {
        const cursorPos = inputRef.current?.selectionStart || message.length;
        const textBeforeCursor = message.slice(0, cursorPos);
        const textAfterCursor = message.slice(cursorPos);

        // Replace the @partial with @fullname
        const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${character.name.toLowerCase().replace(/\s+/g, '')} `);

        setMessage(newTextBefore + textAfterCursor);
        setShowMentionPopup(false);
        setMentionSearch("");
        inputRef.current?.focus();
    };

    // Build context for AI character
    const buildGroupContext = (targetCharacter: Character, recentMessages: GroupMessage[]) => {
        const otherMembers = groupCharacters.filter((c) => c.id !== targetCharacter.id);
        const memberNames = otherMembers.map((c) => c.name).join(", ");

        // Build message history
        const messageHistory = recentMessages.slice(-20).map((msg) => {
            if (msg.sender_type === "user") {
                return `User: ${msg.content}`;
            } else {
                return `${msg.sender_character?.name || "Unknown"}: ${msg.content}`;
            }
        }).join("\n");

        // Detect jealousy triggers
        let jealousyTrigger = "";
        const recentUserMessages = recentMessages.slice(-10).filter((m) => m.sender_type === "user");
        const mentionCounts: Record<string, number> = {};

        recentUserMessages.forEach((msg) => {
            const { mentions } = parseMentions(msg.content, groupCharacters);
            mentions.forEach((m) => {
                mentionCounts[m.characterName] = (mentionCounts[m.characterName] || 0) + 1;
            });
        });

        // Check if another character is getting more attention
        const maxMentioned = Object.entries(mentionCounts)
            .filter(([name]) => name !== targetCharacter.name)
            .sort((a, b) => b[1] - a[1])[0];

        if (maxMentioned && maxMentioned[1] >= 3) {
            jealousyTrigger = `\n[EMOTIONAL CONTEXT: You notice that the user has been talking to ${maxMentioned[0]} a lot lately. You might feel a bit left out or jealous. Express this naturally in character.]`;
        }

        // Check if this character hasn't been addressed recently
        const lastMentionedIndex = [...recentMessages].reverse().findIndex(
            (msg) => msg.target_character_id === targetCharacter.id
        );
        if (lastMentionedIndex > 5) {
            jealousyTrigger = `\n[EMOTIONAL CONTEXT: You haven't been addressed in a while. You might playfully complain about being ignored.]`;
        }

        return `
[GROUP CHAT CONTEXT]
You are in a group chat named "${group.name}" with: ${memberNames}
The user is chatting with all of you. You can:
- Respond to the user directly
- Comment on what other characters said
- Express emotions like jealousy if the user is paying more attention to someone else
- Tease or interact with other characters in the group
- Stay true to your personality

Recent messages:
${messageHistory}
${jealousyTrigger}

Now respond as ${targetCharacter.name}. Keep it natural, in character, and engaging.
`;
    };

    // Helper to get AI response from a character
    const getCharacterResponse = async (targetCharacter: Character & { _modelOverride?: string | null }, promptContent: string): Promise<string> => {
        const groupContext = buildGroupContext(targetCharacter, messages || []);
        const fullPrompt = `${groupContext}\n\nUser's message: ${promptContent || "Say something to me!"}`;

        // Build messages array for the API (Edge Function expects 'messages' not 'message')
        const apiMessages = [
            { role: "user", content: fullPrompt }
        ];

        // Use model_override if set, otherwise use character's default model
        const modelToUse = targetCharacter._modelOverride || targetCharacter.model || "gemini-2.5-flash";
        console.log(`[Group Chat] ${targetCharacter.name} using model: ${modelToUse}`);

        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({
                    messages: apiMessages,
                    systemPrompt: targetCharacter.system_prompt,
                    model: modelToUse,
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Group Chat] API Error for ${targetCharacter.name}:`, response.status, errorText);
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        // Stream the response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const jsonStr = line.slice(6).trim();
                        if (jsonStr === "[DONE]") continue;

                        try {
                            const data = JSON.parse(jsonStr);
                            // Edge Function returns OpenAI-compatible format: choices[0].delta.content
                            const content = data.choices?.[0]?.delta?.content || data.content || "";
                            if (content) {
                                fullContent += content;
                                setStreamingContent(fullContent);
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                }
            }
        }

        return fullContent;
    };

    // Handle sending message
    const handleSend = async () => {
        if (!message.trim() || isStreaming) return;

        const messageContent = message.trim();
        setMessage("");
        setShowMentionPopup(false);

        // Check for @everyone or @all
        const isEveryoneMention = /@everyone\b/i.test(messageContent) || /@all\b/i.test(messageContent);

        // Parse mentions
        const { mentions, cleanMessage, isOnlyMention } = parseMentions(messageContent, groupCharacters);

        // Save user message
        const targetCharacterId = mentions.length > 0 ? mentions[0].characterId : null;

        await sendGroupMessage.mutateAsync({
            groupId: group.id,
            content: messageContent,
            senderType: "user",
            targetCharacterId,
        });

        // Determine which characters should respond
        let charactersToRespond: CharacterWithOverride[] = [];

        if (isEveryoneMention) {
            // Everyone responds
            charactersToRespond = [...groupCharacters];
        } else if (mentions.length > 0) {
            // Specific mentions - respond from mentioned characters
            charactersToRespond = mentions
                .map(m => groupCharacters.find(c => c.id === m.characterId))
                .filter((c): c is CharacterWithOverride => c !== undefined);
        } else {
            // No mention - pick 1-2 random characters to respond
            const shuffled = [...groupCharacters].sort(() => Math.random() - 0.5);
            const numResponders = Math.random() > 0.5 ? 2 : 1; // 50% chance for 2 responders
            charactersToRespond = shuffled.slice(0, Math.min(numResponders, shuffled.length));
        }

        // Get responses from each character (sequentially to avoid overwhelming)
        for (const targetCharacter of charactersToRespond) {
            setRespondingCharacter(targetCharacter);
            setIsStreaming(true);
            setStreamingContent("");

            try {
                let promptContent = cleanMessage;
                if (isOnlyMention && messages && messages.length > 0) {
                    const lastMsg = messages[messages.length - 1];
                    promptContent = `[Respond to this: "${lastMsg.content}"]`;
                }

                const fullContent = await getCharacterResponse(targetCharacter, promptContent);

                // Strip [REACT: emoji] tags from the response (they're meant for 1:1 chat reactions)
                const cleanContent = fullContent.replace(/\[REACT:\s*[^\]]+\]\s*/gi, '').trim();

                // Save AI response
                if (cleanContent) {
                    await sendGroupMessage.mutateAsync({
                        groupId: group.id,
                        content: cleanContent,
                        senderType: "character",
                        senderCharacterId: targetCharacter.id,
                    });
                }

                // Small delay between responses for natural feel
                if (charactersToRespond.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error("Error getting AI response:", error);
                toast.error(`${targetCharacter.name} couldn't respond`);
            }
        }

        setIsStreaming(false);
        setStreamingContent("");
        setRespondingCharacter(null);
    };

    // Get filtered characters for mention autocomplete
    const getFilteredCharacters = () => {
        if (!mentionSearch) return groupCharacters;
        return groupCharacters.filter((c) =>
            c.name.toLowerCase().includes(mentionSearch.toLowerCase())
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }

        // Tab autocomplete for @mentions
        if (e.key === "Tab" && showMentionPopup) {
            e.preventDefault();
            const filteredChars = getFilteredCharacters();
            if (filteredChars.length > 0) {
                // Select the first matching character
                handleMentionSelect(filteredChars[0]);
            }
        }

        // Escape to close mention popup
        if (e.key === "Escape" && showMentionPopup) {
            e.preventDefault();
            setShowMentionPopup(false);
            setMentionSearch("");
        }
    };

    return (
        <>
            <div className="flex flex-col h-full bg-background">
                {/* Header */}
                <div className="flex items-center gap-3 p-3 border-b border-border bg-card shrink-0">
                    {onBack && (
                        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}

                    <div
                        className="flex-1 flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setProfileOpen(true)}
                    >
                        {/* Group Avatar (collage) */}
                        <div className="relative h-10 w-10 shrink-0">
                            {groupAvatars.length >= 3 ? (
                                <div className="relative h-full w-full">
                                    <Avatar className="absolute h-6 w-6 top-0 left-0 ring-2 ring-background">
                                        <AvatarImage src={groupAvatars[0]?.avatar_url || undefined} />
                                        <AvatarFallback className="text-xs">{groupAvatars[0]?.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <Avatar className="absolute h-6 w-6 top-0 right-0 ring-2 ring-background">
                                        <AvatarImage src={groupAvatars[1]?.avatar_url || undefined} />
                                        <AvatarFallback className="text-xs">{groupAvatars[1]?.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <Avatar className="absolute h-6 w-6 bottom-0 left-1/2 -translate-x-1/2 ring-2 ring-background">
                                        <AvatarImage src={groupAvatars[2]?.avatar_url || undefined} />
                                        <AvatarFallback className="text-xs">{groupAvatars[2]?.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </div>
                            ) : group.avatar_url ? (
                                <Avatar className="h-full w-full">
                                    <AvatarImage src={group.avatar_url} />
                                    <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            ) : (
                                <div className="h-full w-full rounded-full bg-primary/10 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{group.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">
                                {groupCharacters.map((c) => c.name).join(", ")}
                            </p>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                            <Users className="h-4 w-4" />
                            {groupCharacters.length}
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <ScrollArea ref={scrollRef} className="flex-1 p-4">
                    <div className="space-y-4">
                        {messagesLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : messages?.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Start the conversation!</p>
                                <p className="text-sm mt-1">Use @name to mention a specific character</p>
                            </div>
                        ) : (
                            messages?.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div className={`flex gap-2 max-w-[80%] ${msg.sender_type === "user" ? "flex-row-reverse" : ""}`}>
                                        {msg.sender_type === "character" && msg.sender_character && (
                                            <Avatar className="h-8 w-8 shrink-0">
                                                <AvatarImage src={msg.sender_character.avatar_url || undefined} />
                                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                    {msg.sender_character.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}

                                        <div className={`space-y-1 ${msg.sender_type === "user" ? "items-end" : ""}`}>
                                            {msg.sender_type === "character" && msg.sender_character && (
                                                <p className="text-xs font-medium text-primary">{msg.sender_character.name}</p>
                                            )}
                                            <div className="group/msg relative">
                                                <div
                                                    className={`rounded-lg px-3 py-2 ${msg.sender_type === "user"
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted"
                                                        }`}
                                                >
                                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                </div>

                                                {/* Reaction button */}
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={`absolute -bottom-2 ${msg.sender_type === "user" ? "-left-8" : "-right-8"} h-6 w-6 opacity-0 group-hover/msg:opacity-100 transition-opacity bg-background shadow-sm border`}
                                                        >
                                                            <Smile className="h-3 w-3" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-2" side="top">
                                                        <div className="flex gap-1">
                                                            {REACTION_EMOJIS.map((emoji) => (
                                                                <button
                                                                    key={emoji}
                                                                    className="text-lg hover:scale-125 transition-transform p-1"
                                                                    onClick={() => reactToMessage.mutate({
                                                                        messageId: msg.id,
                                                                        groupId: group.id,
                                                                        emoji,
                                                                        reactorId: "user"
                                                                    })}
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>

                                                {/* Show existing reactions */}
                                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {Object.entries(msg.reactions).map(([emoji, reactors]) => (
                                                            <button
                                                                key={emoji}
                                                                className={`text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 hover:bg-muted transition-colors ${(reactors as string[]).includes("user") ? "bg-primary/10 border-primary/30" : "bg-background"}`}
                                                                onClick={() => reactToMessage.mutate({
                                                                    messageId: msg.id,
                                                                    groupId: group.id,
                                                                    emoji,
                                                                    reactorId: "user"
                                                                })}
                                                            >
                                                                <span>{emoji}</span>
                                                                <span className="text-muted-foreground">{(reactors as string[]).length}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(msg.created_at), "HH:mm")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Streaming message */}
                        {isStreaming && respondingCharacter && (
                            <div className="flex justify-start">
                                <div className="flex gap-2 max-w-[80%]">
                                    <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarImage src={respondingCharacter.avatar_url || undefined} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                            {respondingCharacter.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-primary">{respondingCharacter.name}</p>
                                        <div className="rounded-lg px-3 py-2 bg-muted">
                                            <p className="text-sm whitespace-pre-wrap">
                                                {streamingContent || (
                                                    <span className="flex items-center gap-1">
                                                        <span className="animate-pulse">typing</span>
                                                        <span className="animate-bounce">.</span>
                                                        <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                                                        <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-3 border-t border-border bg-card shrink-0">
                    <div className="relative">
                        {showMentionPopup && (
                            <CharacterMentionPopup
                                characters={groupCharacters}
                                searchTerm={mentionSearch}
                                onSelect={handleMentionSelect}
                                onClose={() => setShowMentionPopup(false)}
                            />
                        )}

                        <div className="flex items-center gap-2">
                            <Input
                                ref={inputRef}
                                value={message}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Type @ to mention..."
                                disabled={isStreaming}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!message.trim() || isStreaming}
                                size="icon"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <GroupProfileSheet
                group={group}
                open={profileOpen}
                onOpenChange={setProfileOpen}
                onCloseChat={onBack}
            />
        </>
    );
};
