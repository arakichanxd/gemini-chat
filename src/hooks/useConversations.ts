import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Conversation = Tables<"conversations"> & {
  characters?: Tables<"characters">;
};

export const useConversations = () => {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          characters (*)
        `)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      return data as Conversation[];
    },
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (characterId: string) => {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ character_id: characterId })
        .select(`
          *,
          characters (*)
        `)
        .single();
      
      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};