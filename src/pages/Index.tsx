import { useState, useEffect } from "react";
import { CharacterList } from "@/components/chat/CharacterList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { GroupChatWindow } from "@/components/chat/GroupChatWindow";
import { useConversations, type Conversation } from "@/hooks/useConversations";
import { useGroups, type GroupWithMembers } from "@/hooks/useGroups";

type ChatMode = "conversation" | "group";

const Index = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>("conversation");
  const [showChat, setShowChat] = useState(false);

  const { data: conversations } = useConversations();
  const { data: groups } = useGroups();

  // Get fresh data from query
  const selectedConversation = conversations?.find(c => c.id === selectedConversationId) || null;
  const selectedGroup = groups?.find(g => g.id === selectedGroupId) || null;

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    setSelectedGroupId(null);
    setChatMode("conversation");
    setShowChat(true);
  };

  const handleSelectGroup = (group: GroupWithMembers) => {
    setSelectedGroupId(group.id);
    setSelectedConversationId(null);
    setChatMode("group");
    setShowChat(true);
  };

  const handleBack = () => {
    setShowChat(false);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-border shrink-0 ${showChat ? 'hidden md:flex' : 'flex'} flex-col`}>
        <CharacterList
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
          selectedGroup={selectedGroup}
          onSelectGroup={handleSelectGroup}
        />
      </div>

      {/* Chat Window */}
      <div className={`flex-1 ${showChat ? 'flex' : 'hidden md:flex'} flex-col overflow-hidden`}>
        {chatMode === "group" && selectedGroup ? (
          <GroupChatWindow
            group={selectedGroup}
            onBack={handleBack}
          />
        ) : (
          <ChatWindow
            conversation={selectedConversation}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
};

export default Index;