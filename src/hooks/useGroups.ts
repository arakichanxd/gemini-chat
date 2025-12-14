import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Group = Tables<"groups"> & {
    members?: GroupMember[];
};

export type GroupMember = Tables<"group_members"> & {
    characters?: Tables<"characters">;
};

export type GroupWithMembers = Group & {
    group_members: (GroupMember & {
        characters: Tables<"characters">;
    })[];
};

// Fetch all groups with their members
export const useGroups = () => {
    return useQuery({
        queryKey: ["groups"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("groups")
                .select(`
          *,
          group_members (
            *,
            characters (*)
          )
        `)
                .order("updated_at", { ascending: false });

            if (error) throw error;
            return data as GroupWithMembers[];
        },
    });
};

// Fetch a single group by ID
export const useGroup = (groupId: string | null) => {
    return useQuery({
        queryKey: ["group", groupId],
        queryFn: async () => {
            if (!groupId) return null;

            const { data, error } = await supabase
                .from("groups")
                .select(`
          *,
          group_members (
            *,
            characters (*)
          )
        `)
                .eq("id", groupId)
                .single();

            if (error) throw error;
            return data as GroupWithMembers;
        },
        enabled: !!groupId,
    });
};
// Create a new group
export const useCreateGroup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ name, characterIds, avatar_url }: { name: string; characterIds: string[]; avatar_url?: string | null }) => {
            // Create the group
            const { data: group, error: groupError } = await supabase
                .from("groups")
                .insert({ name, avatar_url: avatar_url || null })
                .select()
                .single();

            if (groupError) throw groupError;

            // Add members to the group
            const members = characterIds.map((characterId) => ({
                group_id: group.id,
                character_id: characterId,
            }));

            const { error: membersError } = await supabase
                .from("group_members")
                .insert(members);

            if (membersError) throw membersError;

            return group;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["groups"] });
        },
    });
};

// Update a group
export const useUpdateGroup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string } & Partial<Tables<"groups">>) => {
            const { data, error } = await supabase
                .from("groups")
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["groups"] });
        },
    });
};

// Delete a group
export const useDeleteGroup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (groupId: string) => {
            const { error } = await supabase
                .from("groups")
                .delete()
                .eq("id", groupId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["groups"] });
        },
    });
};

// Add a member to a group
export const useAddGroupMember = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ groupId, characterId }: { groupId: string; characterId: string }) => {
            const { data, error } = await supabase
                .from("group_members")
                .insert({ group_id: groupId, character_id: characterId })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, { groupId }) => {
            queryClient.invalidateQueries({ queryKey: ["groups"] });
            queryClient.invalidateQueries({ queryKey: ["group", groupId] });
        },
    });
};

// Remove a member from a group
export const useRemoveGroupMember = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ groupId, characterId }: { groupId: string; characterId: string }) => {
            const { error } = await supabase
                .from("group_members")
                .delete()
                .eq("group_id", groupId)
                .eq("character_id", characterId);

            if (error) throw error;
        },
        onSuccess: (_, { groupId }) => {
            queryClient.invalidateQueries({ queryKey: ["groups"] });
            queryClient.invalidateQueries({ queryKey: ["group", groupId] });
        },
    });
};

// Update a member's model override
export const useUpdateMemberModel = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ groupId, characterId, modelOverride }: {
            groupId: string;
            characterId: string;
            modelOverride: string | null;
        }) => {
            const { error } = await supabase
                .from("group_members")
                .update({ model_override: modelOverride })
                .eq("group_id", groupId)
                .eq("character_id", characterId);

            if (error) throw error;
        },
        onSuccess: (_, { groupId }) => {
            queryClient.invalidateQueries({ queryKey: ["groups"] });
            queryClient.invalidateQueries({ queryKey: ["group", groupId] });
        },
    });
};
