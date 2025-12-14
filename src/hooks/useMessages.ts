import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Message = Tables<"messages">;

export const useMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (message: TablesInsert<"messages">) => {
      const { data, error } = await supabase
        .from("messages")
        .insert(message)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update conversation's last message
      await supabase
        .from("conversations")
        .update({
          last_message: message.content,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", message.conversation_id);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["messages", data.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};