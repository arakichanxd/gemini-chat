import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCharacters, useCreateCharacter, useUpdateCharacter, type Character } from "@/hooks/useCharacters";
import { useConversations, useCreateConversation, type Conversation } from "@/hooks/useConversations";
import { useGroups, type GroupWithMembers } from "@/hooks/useGroups";
import { MessageCircle, Plus, Sparkles, MoreVertical, UserPlus, Lock, Users } from "lucide-react";
import { CharacterEditDialog } from "./CharacterEditDialog";
import { PinUnlockDialog } from "./PinUnlockDialog";
import { GroupCreateDialog } from "./GroupCreateDialog";
import { StoriesBar } from "./StoriesBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";

interface CharacterListProps {
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  selectedGroup?: GroupWithMembers | null;
  onSelectGroup?: (group: GroupWithMembers) => void;
}

export const CharacterList = ({
  selectedConversation,
  onSelectConversation,
  selectedGroup,
  onSelectGroup,
}: CharacterListProps) => {
  const { data: characters, isLoading: charactersLoading } = useCharacters();
  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const { data: groups } = useGroups();
  const createConversation = useCreateConversation();
  const createCharacter = useCreateCharacter();
  const updateCharacter = useUpdateCharacter();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pendingConversation, setPendingConversation] = useState<Conversation | null>(null);
  const [unlockedChats, setUnlockedChats] = useState<Set<string>>(new Set());
  const [groupCreateDialogOpen, setGroupCreateDialogOpen] = useState(false);

  const handleStartChat = async (character: Character) => {
    const existing = conversations?.find(c => c.character_id === character.id);

    if (character.is_locked && character.lock_pin) {
      if (!unlockedChats.has(character.id)) {
        if (existing) {
          setPendingConversation(existing);
        } else {
          const newConversation = await createConversation.mutateAsync(character.id);
          setPendingConversation(newConversation);
        }
        setSelectedCharacter(character);
        setPinDialogOpen(true);
        return;
      }
    }

    if (existing) {
      onSelectConversation(existing);
      return;
    }

    const newConversation = await createConversation.mutateAsync(character.id);
    onSelectConversation(newConversation);
  };

  const handleUnlock = () => {
    if (pendingConversation && selectedCharacter) {
      setUnlockedChats(prev => new Set([...prev, selectedCharacter.id]));
      onSelectConversation(pendingConversation);
      setPendingConversation(null);
    }
  };

  const handleEditCharacter = (character: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCharacter(character);
    setIsCreatingNew(false);
    setEditDialogOpen(true);
  };

  const handleCreateCharacter = () => {
    setSelectedCharacter(null);
    setIsCreatingNew(true);
    setEditDialogOpen(true);
  };

  const handleSaveCharacter = async (data: Partial<Character>) => {
    if (isCreatingNew) {
      await createCharacter.mutateAsync({
        name: data.name!,
        description: data.description || null,
        system_prompt: data.system_prompt || "You are a helpful AI assistant.",
        avatar_url: data.avatar_url || null,
        model: data.model || "gemini-2.5-flash",
        voice_enabled: data.voice_enabled || false,
        voice_name: data.voice_name || "Kore",
        tts_model: data.tts_model || "gemini-2.5-flash-preview-tts",
        image_model: data.image_model || "gemini-2.5-flash-image",
        reference_image_url: data.reference_image_url || null,
        is_locked: data.is_locked || false,
        lock_pin: data.lock_pin || null,
        notification_sound: data.notification_sound || "default",
        theme_color: data.theme_color || "#00a884",
      });
    } else if (selectedCharacter) {
      await updateCharacter.mutateAsync({
        id: selectedCharacter.id,
        ...data,
      });
    }
  };

  const isLoading = charactersLoading || conversationsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Chats</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse-soft text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  const hasCharacters = characters && characters.length > 0;
  const hasConversations = conversations && conversations.length > 0;

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Chats Section Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Chats
          </h2>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Create New"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCreateCharacter}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Character
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupCreateDialogOpen(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  New Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Stories Bar */}
      <StoriesBar />

      <ScrollArea className="flex-1 scrollbar-thin">
        {/* Conversations */}
        {hasConversations ? (
          <div className="p-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-sidebar-accent cursor-pointer group ${selectedConversation?.id === conversation.id ? "bg-sidebar-accent" : ""
                  }`}
                onClick={() => conversation.characters && handleStartChat(conversation.characters)}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/20">
                    <AvatarImage src={conversation.characters?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {conversation.characters?.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.characters?.is_locked && (
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium block truncate">
                    {conversation.characters?.name}
                  </span>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.last_message || conversation.characters?.description || "Start chatting..."}
                  </p>
                </div>
                {conversation.characters && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => handleEditCharacter(conversation.characters!, e as any)}
                      >
                        Edit Character
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No chats yet</p>
            <p className="text-xs">Click + to create a character</p>
          </div>
        )}

        {/* Groups Section */}
        <div className="border-t border-border">
          <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-sidebar z-10">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Groups
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGroupCreateDialogOpen(true)}
              className="h-7 px-2 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              title="New Group"
            >
              <Plus className="h-3 w-3 mr-1" />
              New
            </Button>
          </div>

          {groups && groups.length > 0 ? (
            <div className="px-2 pb-2">
              {groups.map((group) => {
                const memberAvatars = group.group_members.slice(0, 3).map(m => m.characters);
                return (
                  <div
                    key={group.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-sidebar-accent cursor-pointer ${selectedGroup?.id === group.id ? "bg-sidebar-accent" : ""
                      }`}
                    onClick={() => onSelectGroup?.(group)}
                  >
                    <div className="relative h-12 w-12 shrink-0">
                      {group.avatar_url ? (
                        <Avatar className="h-full w-full ring-2 ring-primary/20">
                          <AvatarImage src={group.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {group.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ) : memberAvatars.length >= 3 ? (
                        <div className="relative h-full w-full">
                          <Avatar className="absolute h-7 w-7 top-0 left-0 ring-2 ring-background">
                            <AvatarImage src={memberAvatars[0]?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {memberAvatars[0]?.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <Avatar className="absolute h-7 w-7 top-0 right-0 ring-2 ring-background">
                            <AvatarImage src={memberAvatars[1]?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {memberAvatars[1]?.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <Avatar className="absolute h-7 w-7 bottom-0 left-1/2 -translate-x-1/2 ring-2 ring-background">
                            <AvatarImage src={memberAvatars[2]?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {memberAvatars[2]?.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      ) : (
                        <div className="h-full w-full rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block truncate">{group.name}</span>
                      <p className="text-sm text-muted-foreground truncate">
                        {group.group_members.map(m => m.characters.name).join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {group.group_members.length}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 pb-4 text-center text-muted-foreground">
              <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No groups yet</p>
            </div>
          )}
        </div>

        {/* Available Characters */}
        {hasCharacters && (
          <div className="border-t border-border">
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Available Characters
              </p>
            </div>
            <div className="px-2 pb-2 space-y-1">
              {characters
                .filter(char => !conversations?.some(c => c.character_id === char.id))
                .map((character) => (
                  <div
                    key={character.id}
                    className="flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-sidebar-accent cursor-pointer group"
                    onClick={() => handleStartChat(character)}
                  >
                    <Avatar className="h-10 w-10 shrink-0 ring-2 ring-primary/20">
                      <AvatarImage src={character.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {character.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block truncate">{character.name}</span>
                      <p className="text-sm text-muted-foreground truncate">
                        {character.description || "No description"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleEditCharacter(character, e as any)}>
                          Edit Character
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasCharacters && !hasConversations && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Sparkles className="h-12 w-12 text-primary/50 mb-4" />
            <h3 className="font-medium mb-2">No characters yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first AI character to start chatting
            </p>
            <Button onClick={handleCreateCharacter}>
              <Plus className="h-4 w-4 mr-2" />
              Create Character
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Character Edit Dialog */}
      <CharacterEditDialog
        character={selectedCharacter}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveCharacter}
        isCreating={isCreatingNew}
      />

      {/* PIN Unlock Dialog */}
      {selectedCharacter && (
        <PinUnlockDialog
          open={pinDialogOpen}
          onOpenChange={setPinDialogOpen}
          onUnlock={handleUnlock}
          correctPin={selectedCharacter.lock_pin || ""}
          characterName={selectedCharacter.name}
        />
      )}

      {/* Group Create Dialog */}
      <GroupCreateDialog
        open={groupCreateDialogOpen}
        onOpenChange={setGroupCreateDialogOpen}
        onGroupCreated={() => {
          // Group created - dialog will close and list will refresh
        }}
      />
    </div>
  );
};
