import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface CharacterMemory {
    id: string;
    character_id: string;
    memory_type: 'fact' | 'preference' | 'event' | 'relationship';
    content: string;
    importance: number;
    metadata: Record<string, unknown>;
    created_at: string;
    last_accessed: string;
}

// Fetch memories for a character
export const useCharacterMemories = (characterId: string | undefined) => {
    return useQuery({
        queryKey: ["character-memories", characterId],
        queryFn: async () => {
            if (!characterId) return [];

            const { data, error } = await supabase
                .from("character_memories")
                .select("*")
                .eq("character_id", characterId)
                .order("importance", { ascending: false })
                .limit(20);

            if (error) throw error;
            return data as CharacterMemory[];
        },
        enabled: !!characterId,
    });
};

// Add a new memory
export const useAddMemory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            characterId,
            content,
            memoryType = 'fact',
            importance = 5,
        }: {
            characterId: string;
            content: string;
            memoryType?: 'fact' | 'preference' | 'event' | 'relationship';
            importance?: number;
        }) => {
            const { data, error } = await supabase
                .from("character_memories")
                .insert({
                    character_id: characterId,
                    memory_type: memoryType,
                    content,
                    importance,
                    metadata: {} as Json,
                })
                .select()
                .single();

            if (error) throw error;
            return data as CharacterMemory;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["character-memories", variables.characterId]
            });
        },
    });
};

// Delete a memory
export const useDeleteMemory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ memoryId, characterId }: { memoryId: string; characterId: string }) => {
            const { error } = await supabase
                .from("character_memories")
                .delete()
                .eq("id", memoryId);

            if (error) throw error;
            return { memoryId, characterId };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["character-memories", variables.characterId]
            });
        },
    });
};

// Extract memories from a conversation using AI
export const extractMemoriesFromConversation = async (
    characterId: string,
    characterName: string,
    messages: { role: string; content: string | null }[]
): Promise<string[]> => {
    // Only process if there are enough messages
    if (messages.length < 5) return [];

    // Get last 20 messages for context
    const recentMessages = messages.slice(-20);
    const conversationText = recentMessages
        .map(m => `${m.role === 'user' ? 'User' : characterName}: ${m.content}`)
        .join('\n');

    try {
        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({
                    messages: [{
                        role: "user",
                        content: `Analyze this conversation and extract 1-3 important facts about the user that ${characterName} should remember. Focus on:
- User's name if mentioned
- User's preferences (likes, dislikes)
- Important events or dates
- Relationship details

Conversation:
${conversationText}

Return ONLY a JSON array of strings with the facts. Example: ["User's name is John", "User loves pizza"]
If no important facts found, return: []`
                    }],
                    systemPrompt: "You are a memory extraction assistant. Extract key facts and return them as a JSON array of strings. Be concise.",
                    model: "gemini-2.5-flash",
                }),
            }
        );

        if (!response.ok) return [];

        // Read the streaming response
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
                            const content = data.choices?.[0]?.delta?.content || "";
                            fullContent += content;
                        } catch {
                            // Ignore parse errors
                        }
                    }
                }
            }
        }

        // Parse the JSON array from the response
        const jsonMatch = fullContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (error) {
        console.error("Error extracting memories:", error);
        return [];
    }
};

// Format memories for AI context injection
export const formatMemoriesForContext = (memories: CharacterMemory[]): string => {
    if (!memories || memories.length === 0) return "";

    const memoryTexts = memories.slice(0, 10).map(m => `- ${m.content}`);
    return `
[LONG-TERM MEMORY - Things you remember about the user:]
${memoryTexts.join('\n')}

Use these memories naturally in your responses when relevant. Don't mention that you have a "memory system" - just act like you naturally remember these things.
`;
};
