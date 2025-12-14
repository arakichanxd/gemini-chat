import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCharacters, type Character } from "@/hooks/useCharacters";
import { useCreateGroup } from "@/hooks/useGroups";
import { Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GroupCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGroupCreated?: (groupId: string) => void;
}

export const GroupCreateDialog = ({ open, onOpenChange, onGroupCreated }: GroupCreateDialogProps) => {
    const [groupName, setGroupName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());

    const { data: characters, isLoading: charactersLoading } = useCharacters();
    const createGroup = useCreateGroup();

    const toggleCharacter = (characterId: string) => {
        const newSelected = new Set(selectedCharacters);
        if (newSelected.has(characterId)) {
            newSelected.delete(characterId);
        } else {
            newSelected.add(characterId);
        }
        setSelectedCharacters(newSelected);
    };

    const handleCreate = async () => {
        if (!groupName.trim()) {
            toast.error("Please enter a group name");
            return;
        }

        if (selectedCharacters.size < 2) {
            toast.error("Please select at least 2 characters");
            return;
        }

        try {
            const group = await createGroup.mutateAsync({
                name: groupName.trim(),
                avatar_url: avatarUrl.trim() || null,
                characterIds: Array.from(selectedCharacters),
            });

            toast.success(`Group "${groupName}" created!`);
            onGroupCreated?.(group.id);
            handleClose();
        } catch (error) {
            toast.error("Failed to create group");
            console.error(error);
        }
    };

    const handleClose = () => {
        setGroupName("");
        setAvatarUrl("");
        setSelectedCharacters(new Set());
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Create Group
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Group Name */}
                    <div className="space-y-2">
                        <Label htmlFor="groupName">Group Name</Label>
                        <Input
                            id="groupName"
                            placeholder="Squad 🔥"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                    </div>

                    {/* Group Avatar URL */}
                    <div className="space-y-2">
                        <Label htmlFor="avatarUrl">Avatar URL (Optional)</Label>
                        <Input
                            id="avatarUrl"
                            placeholder="https://example.com/avatar.png"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                        />
                    </div>

                    {/* Character Selection */}
                    <div className="space-y-2">
                        <Label>Select Characters (min 2)</Label>
                        <p className="text-xs text-muted-foreground">
                            {selectedCharacters.size} selected
                        </p>

                        <ScrollArea className="h-64 rounded-md border p-2">
                            {charactersLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {characters?.map((character) => (
                                        <div
                                            key={character.id}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedCharacters.has(character.id)
                                                ? "bg-primary/10 border border-primary/30"
                                                : "hover:bg-muted"
                                                }`}
                                            onClick={() => toggleCharacter(character.id)}
                                        >
                                            <Checkbox
                                                checked={selectedCharacters.has(character.id)}
                                                onCheckedChange={() => toggleCharacter(character.id)}
                                            />
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={character.avatar_url || undefined} />
                                                <AvatarFallback className="bg-primary/10 text-primary">
                                                    {character.name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{character.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {character.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={createGroup.isPending || selectedCharacters.size < 2}
                    >
                        {createGroup.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Group"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
