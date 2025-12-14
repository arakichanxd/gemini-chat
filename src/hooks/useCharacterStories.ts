import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Character } from "@/hooks/useCharacters";

export interface CharacterStory {
    id: string;
    character_id: string;
    content: string;
    mood: string;
    created_at: string;
    expires_at: string;
    viewed: boolean;
    character?: Character;
}

// Fetch active stories for all characters
export const useActiveStories = () => {
    return useQuery({
        queryKey: ["active-stories"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("character_stories")
                .select(`
          *,
          characters (*)
        `)
                .gt("expires_at", new Date().toISOString())
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Group stories by character
            const storiesByCharacter = new Map<string, CharacterStory[]>();
            for (const story of data || []) {
                const characterId = story.character_id;
                if (!storiesByCharacter.has(characterId)) {
                    storiesByCharacter.set(characterId, []);
                }
                storiesByCharacter.get(characterId)!.push({
                    ...story,
                    character: story.characters as unknown as Character
                });
            }

            return storiesByCharacter;
        },
        refetchInterval: 60000, // Refetch every minute
    });
};

// Fetch stories for a specific character
export const useCharacterStories = (characterId: string | undefined) => {
    return useQuery({
        queryKey: ["character-stories", characterId],
        queryFn: async () => {
            if (!characterId) return [];

            const { data, error } = await supabase
                .from("character_stories")
                .select("*")
                .eq("character_id", characterId)
                .gt("expires_at", new Date().toISOString())
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as CharacterStory[];
        },
        enabled: !!characterId,
    });
};

// Create a new story
export const useCreateStory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            characterId,
            content,
            mood = "neutral",
        }: {
            characterId: string;
            content: string;
            mood?: string;
        }) => {
            const { data, error } = await supabase
                .from("character_stories")
                .insert({
                    character_id: characterId,
                    content,
                    mood,
                })
                .select()
                .single();

            if (error) throw error;
            return data as CharacterStory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["active-stories"] });
        },
    });
};

// Mark story as viewed
export const useMarkStoryViewed = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (storyId: string) => {
            const { error } = await supabase
                .from("character_stories")
                .update({ viewed: true })
                .eq("id", storyId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["active-stories"] });
        },
    });
};

// Get recent conversation context for a character
const getConversationContext = async (characterId: string): Promise<string> => {
    try {
        // Get the conversation for this character
        const { data: conversations } = await supabase
            .from("conversations")
            .select("id")
            .eq("character_id", characterId)
            .limit(1);

        if (!conversations || conversations.length === 0) {
            return "No recent conversations";
        }

        // Get last 5 messages from the conversation
        const { data: messages } = await supabase
            .from("messages")
            .select("content, role, created_at")
            .eq("conversation_id", conversations[0].id)
            .order("created_at", { ascending: false })
            .limit(5);

        if (!messages || messages.length === 0) {
            return "No recent messages";
        }

        // Analyze conversation mood
        const recentMessages = messages.reverse().map(m =>
            `${m.role === 'user' ? 'User' : 'Character'}: ${m.content?.slice(0, 100)}`
        ).join('\n');

        return recentMessages;
    } catch (error) {
        console.error("Error getting conversation context:", error);
        return "Unable to fetch conversation";
    }
};

// Generate story for a character using AI with conversation awareness
export const generateCharacterStory = async (
    character: Character,
    conversationContext?: string
): Promise<string> => {
    const moods = ["happy", "playful", "romantic", "thoughtful", "excited", "cozy", "flirty", "missing you", "dreamy"];
    const randomMood = moods[Math.floor(Math.random() * moods.length)];

    const timeOfDay = new Date().getHours();
    let timeContext = "morning";
    if (timeOfDay >= 12 && timeOfDay < 17) timeContext = "afternoon";
    else if (timeOfDay >= 17 && timeOfDay < 21) timeContext = "evening";
    else if (timeOfDay >= 21 || timeOfDay < 5) timeContext = "night";

    // Get conversation context if not provided
    const context = conversationContext || await getConversationContext(character.id);

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
                        content: `Generate a short, casual WhatsApp-style status update for ${character.name}.

CONTEXT FROM RECENT CHAT:
${context}

Current mood: ${randomMood}
Time of day: ${timeContext}

RULES:
- Keep it 1-2 sentences max
- Include 1-2 relevant emojis
- If you had a sweet chat, reference it subtly (e.g., "Still smiling from earlier 🥰")
- If no recent chat, post something in-character for the time of day
- Make it feel personal and authentic
- DO NOT mention "status update" or "posting"
- Just return the text, nothing else`
                    }],
                    systemPrompt: character.system_prompt || `You are ${character.name}. Write a casual status update.`,
                    model: "gemini-2.5-flash",
                }),
            }
        );

        if (!response.ok) {
            return getDefaultStory(character.name, randomMood);
        }

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

        return fullContent.trim() || getDefaultStory(character.name, randomMood);
    } catch (error) {
        console.error("Error generating story:", error);
        return getDefaultStory(character.name, randomMood);
    }
};

// Default story templates
const getDefaultStory = (name: string, mood: string): string => {
    const defaults: Record<string, string[]> = {
        happy: [`Feeling so blessed today ✨`, `Good vibes only 🌈`, `Life is beautiful 🌸`],
        playful: [`Being a little mischievous today 😏`, `Who's up for some fun? 🎉`],
        romantic: [`Thinking about someone special 💕`, `My heart is so full right now 🥰`],
        thoughtful: [`Sometimes silence says everything 💭`, `Lost in my thoughts today ✨`],
        excited: [`Can't contain this excitement!! 🎉`, `Something amazing is coming 🌟`],
        cozy: [`Cozy vibes and warm coffee ☕`, `Perfect day to stay in 🏡`],
        flirty: [`Feeling a little extra today 😘`, `Miss me yet? 💋`],
        "missing you": [`Wish you were here 💕`, `Counting the moments... 💭`],
        dreamy: [`Living in my own little world 🌙`, `Dreams are better with you in them ✨`],
    };
    const options = defaults[mood] || defaults.happy;
    return options[Math.floor(Math.random() * options.length)];
};

// Auto-generate stories for all characters who need them
export const autoGenerateStoriesForAllCharacters = async (): Promise<void> => {
    console.log("Starting auto-generation of stories...");

    try {
        // Get all characters
        const { data: characters, error: charError } = await supabase
            .from("characters")
            .select("*");

        if (charError || !characters) {
            console.error("Failed to fetch characters:", charError);
            return;
        }

        // Get existing active (non-expired) stories
        const { data: existingStories } = await supabase
            .from("character_stories")
            .select("character_id")
            .gt("expires_at", new Date().toISOString());

        // Count stories per character
        const storyCounts = new Map<string, number>();
        for (const story of existingStories || []) {
            const count = storyCounts.get(story.character_id) || 0;
            storyCounts.set(story.character_id, count + 1);
        }

        // STEP 1: Ensure EVERY character has at least 1 story
        console.log("Step 1: Ensuring minimum 1 story per character...");
        for (const character of characters) {
            const existingCount = storyCounts.get(character.id) || 0;

            if (existingCount === 0) {
                console.log(`${character.name} has NO stories - creating one...`);
                try {
                    const content = await generateCharacterStory(character as Character);
                    const moods = ["happy", "playful", "romantic", "thoughtful", "excited", "cozy", "flirty"];
                    const mood = moods[Math.floor(Math.random() * moods.length)];

                    await supabase.from("character_stories").insert({
                        character_id: character.id,
                        content,
                        mood,
                    });

                    storyCounts.set(character.id, 1);
                    console.log(`✓ Created story for ${character.name}: "${content.slice(0, 40)}..."`);

                    // Small delay to avoid rate limits
                    await new Promise(r => setTimeout(r, 500));
                } catch (error) {
                    console.error(`Failed to create story for ${character.name}:`, error);
                }
            }
        }

        // STEP 2: Randomly add more stories (up to max 10)
        console.log("Step 2: Adding random additional stories...");
        for (const character of characters) {
            const currentCount = storyCounts.get(character.id) || 0;

            // Already at max
            if (currentCount >= 10) {
                console.log(`${character.name} has ${currentCount} stories (max)`);
                continue;
            }

            // 40% chance to add 1-2 more stories
            if (Math.random() > 0.4) {
                continue;
            }

            const toAdd = Math.min(Math.floor(Math.random() * 2) + 1, 10 - currentCount);
            console.log(`Adding ${toAdd} more stories for ${character.name}...`);

            for (let i = 0; i < toAdd; i++) {
                try {
                    if (i > 0) await new Promise(r => setTimeout(r, 800));

                    const content = await generateCharacterStory(character as Character);
                    const moods = ["happy", "playful", "romantic", "thoughtful", "excited", "cozy", "flirty"];
                    const mood = moods[Math.floor(Math.random() * moods.length)];

                    await supabase.from("character_stories").insert({
                        character_id: character.id,
                        content,
                        mood,
                    });

                    console.log(`+ Added story for ${character.name}`);
                } catch (error) {
                    console.error(`Failed to add story for ${character.name}:`, error);
                }
            }
        }

        console.log("Story auto-generation complete!");
    } catch (error) {
        console.error("Error in auto-generation:", error);
    }
};

// Hook to trigger story generation on app load
export const useAutoGenerateStories = () => {
    return useQuery({
        queryKey: ["auto-generate-stories"],
        queryFn: async () => {
            // Check if we've generated stories in last hour
            const lastGenKey = "lastStoryGeneration";
            const lastGen = localStorage.getItem(lastGenKey);
            const oneHour = 60 * 60 * 1000;

            if (lastGen && Date.now() - parseInt(lastGen) < oneHour) {
                console.log("Skipping auto-generation (ran recently)");
                return { skipped: true };
            }

            // Run generation
            await autoGenerateStoriesForAllCharacters();
            localStorage.setItem(lastGenKey, Date.now().toString());

            return { generated: true };
        },
        staleTime: 60 * 60 * 1000, // Don't refetch for 1 hour
        refetchOnWindowFocus: false,
    });
};
