import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type GroupMessage = Tables<"group_messages"> & {
    sender_character?: Tables<"characters"> | null;
    target_character?: Tables<"characters"> | null;
};

// Fetch messages for a group
export const useGroupMessages = (groupId: string | null) => {
    return useQuery({
        queryKey: ["group_messages", groupId],
        queryFn: async () => {
            if (!groupId) return [];

            const { data, error } = await supabase
                .from("group_messages")
                .select(`
          *,
          sender_character:characters!group_messages_sender_character_id_fkey(*),
          target_character:characters!group_messages_target_character_id_fkey(*)
        `)
                .eq("group_id", groupId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as GroupMessage[];
        },
        enabled: !!groupId,
    });
};

// Send a message in a group
export const useSendGroupMessage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            groupId,
            content,
            senderType,
            senderCharacterId,
            targetCharacterId,
            imageUrl,
            voiceUrl,
        }: {
            groupId: string;
            content: string;
            senderType: "user" | "character";
            senderCharacterId?: string | null;
            targetCharacterId?: string | null;
            imageUrl?: string | null;
            voiceUrl?: string | null;
        }) => {
            const { data, error } = await supabase
                .from("group_messages")
                .insert({
                    group_id: groupId,
                    content,
                    sender_type: senderType,
                    sender_character_id: senderCharacterId || null,
                    target_character_id: targetCharacterId || null,
                    image_url: imageUrl || null,
                    voice_url: voiceUrl || null,
                })
                .select(`
          *,
          sender_character:characters!group_messages_sender_character_id_fkey(*),
          target_character:characters!group_messages_target_character_id_fkey(*)
        `)
                .single();

            if (error) throw error;

            // Update the group's updated_at timestamp
            await supabase
                .from("groups")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", groupId);

            return data as GroupMessage;
        },
        onSuccess: (_, { groupId }) => {
            queryClient.invalidateQueries({ queryKey: ["group_messages", groupId] });
            queryClient.invalidateQueries({ queryKey: ["groups"] });
        },
    });
};

// Delete a message from a group
export const useDeleteGroupMessage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ messageId, groupId }: { messageId: string; groupId: string }) => {
            const { error } = await supabase
                .from("group_messages")
                .delete()
                .eq("id", messageId);

            if (error) throw error;
            return { messageId, groupId };
        },
        onSuccess: (_, { groupId }) => {
            queryClient.invalidateQueries({ queryKey: ["group_messages", groupId] });
        },
    });
};

// React to a group message with an emoji
export const useReactToGroupMessage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            messageId,
            groupId,
            emoji,
            reactorId, // "user" or character ID
        }: {
            messageId: string;
            groupId: string;
            emoji: string;
            reactorId: string;
        }) => {
            // First get current reactions
            const { data: message, error: fetchError } = await supabase
                .from("group_messages")
                .select("reactions")
                .eq("id", messageId)
                .single();

            if (fetchError) throw fetchError;

            const currentReactions = (message?.reactions as Record<string, string[]>) || {};
            const emojiReactors = currentReactions[emoji] || [];

            // Toggle reaction
            let newReactors: string[];
            if (emojiReactors.includes(reactorId)) {
                // Remove reaction
                newReactors = emojiReactors.filter(r => r !== reactorId);
            } else {
                // Add reaction
                newReactors = [...emojiReactors, reactorId];
            }

            // Update reactions object
            const newReactions = { ...currentReactions };
            if (newReactors.length === 0) {
                delete newReactions[emoji];
            } else {
                newReactions[emoji] = newReactors;
            }

            const { error: updateError } = await supabase
                .from("group_messages")
                .update({ reactions: newReactions })
                .eq("id", messageId);

            if (updateError) throw updateError;

            return { messageId, groupId, reactions: newReactions };
        },
        onSuccess: (_, { groupId }) => {
            queryClient.invalidateQueries({ queryKey: ["group_messages", groupId] });
        },
    });
};

// Helper function to parse @mentions from message
export const parseMentions = (message: string, characters: { id: string; name: string }[]): {
    mentions: { characterId: string; characterName: string }[];
    cleanMessage: string;
    isOnlyMention: boolean;
} => {
    const mentionRegex = /@(\w+)/gi;
    const mentions: { characterId: string; characterName: string }[] = [];
    let cleanMessage = message;

    let match;
    while ((match = mentionRegex.exec(message)) !== null) {
        const mentionedName = match[1].toLowerCase();
        const character = characters.find(
            (c) => c.name.toLowerCase().replace(/\s+/g, '') === mentionedName ||
                c.name.toLowerCase() === mentionedName
        );

        if (character) {
            mentions.push({ characterId: character.id, characterName: character.name });
            cleanMessage = cleanMessage.replace(match[0], '').trim();
        }
    }

    const isOnlyMention = mentions.length > 0 && cleanMessage.length === 0;

    return { mentions, cleanMessage, isOnlyMention };
};
