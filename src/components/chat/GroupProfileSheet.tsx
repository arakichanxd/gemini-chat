import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, LogOut, Trash2, Edit2, Save, X, Settings } from "lucide-react";
import { useState } from "react";
import { useGroup, useUpdateGroup, useAddGroupMember, useRemoveGroupMember, useDeleteGroup, useUpdateMemberModel, type GroupWithMembers } from "@/hooks/useGroups";
import { useCharacters } from "@/hooks/useCharacters";
import { toast } from "sonner";

const AVAILABLE_MODELS = [
    { value: "default", label: "Use Character Default" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
    { value: "zai-glm-4.6", label: "GLM 4.6" },
    { value: "qwen-3-235b-a22b-instruct-2507", label: "Qwen3 235b" },
];

interface GroupProfileSheetProps {
    group: GroupWithMembers;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCloseChat?: () => void;
}

export const GroupProfileSheet = ({ group, open, onOpenChange, onCloseChat }: GroupProfileSheetProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(group.name);
    const [editAvatarUrl, setEditAvatarUrl] = useState(group.avatar_url || "");
    const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
    const [selectedNewMembers, setSelectedNewMembers] = useState<Set<string>>(new Set());

    const { data: characters } = useCharacters();
    const updateGroup = useUpdateGroup();
    const addMember = useAddGroupMember();
    const removeMember = useRemoveGroupMember();
    const deleteGroup = useDeleteGroup();
    const updateMemberModel = useUpdateMemberModel();
    // Fetch fresh group data to ensure members list is up to date
    const { data: freshGroup } = useGroup(group.id);

    const currentGroup = freshGroup || group;
    const currentMemberIds = new Set(currentGroup.group_members.map(m => m.character_id));
    const availableCharacters = characters?.filter(c => !currentMemberIds.has(c.id)) || [];

    const handleSave = async () => {
        try {
            await updateGroup.mutateAsync({
                id: group.id,
                name: editName,
                avatar_url: editAvatarUrl || null
            });
            setIsEditing(false);
            toast.success("Group updated!");
        } catch (error) {
            toast.error("Failed to update group");
        }
    };

    const handleDeleteGroup = async () => {
        if (confirm("Are you sure you want to delete this group? This cannot be undone.")) {
            try {
                await deleteGroup.mutateAsync(group.id);
                toast.success("Group deleted");
                onOpenChange(false);
                onCloseChat?.();
            } catch (error) {
                toast.error("Failed to delete group");
            }
        }
    };

    const handleAddMembers = async () => {
        try {
            // Add all selected members
            const promises = Array.from(selectedNewMembers).map(charId =>
                addMember.mutateAsync({ groupId: group.id, characterId: charId })
            );
            await Promise.all(promises);

            toast.success(`Added ${selectedNewMembers.size} members`);
            setAddMemberDialogOpen(false);
            setSelectedNewMembers(new Set());
        } catch (error) {
            toast.error("Failed to add members");
        }
    };

    const handleRemoveMember = async (characterId: string, name: string) => {
        if (confirm(`Remove ${name} from the group?`)) {
            try {
                await removeMember.mutateAsync({ groupId: group.id, characterId });
                toast.success(`Removed ${name}`);
            } catch (error) {
                toast.error("Failed to remove member");
            }
        }
    };

    const handleModelChange = async (characterId: string, model: string) => {
        try {
            const modelValue = model === "default" ? null : model;
            await updateMemberModel.mutateAsync({
                groupId: group.id,
                characterId,
                modelOverride: modelValue
            });
            toast.success("Model updated!");
        } catch (error) {
            toast.error("Failed to update model");
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-[350px] sm:w-[540px] flex flex-col p-0">
                    <SheetHeader className="p-6 border-b border-border">
                        <SheetTitle>Group Info</SheetTitle>
                    </SheetHeader>

                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-8">
                            {/* Header / Basic Info */}
                            <div className="flex flex-col items-center gap-4">
                                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                                    <AvatarImage src={currentGroup.avatar_url || undefined} />
                                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                        {currentGroup.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                {isEditing ? (
                                    <div className="w-full space-y-3">
                                        <div className="space-y-1">
                                            <Label htmlFor="editName">Group Name</Label>
                                            <Input
                                                id="editName"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="editAvatar">Avatar URL</Label>
                                            <Input
                                                id="editAvatar"
                                                value={editAvatarUrl}
                                                onChange={e => setEditAvatarUrl(e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div className="flex gap-2 justify-center pt-2">
                                            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                                            <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Save</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-2">
                                        <h2 className="text-2xl font-bold">{currentGroup.name}</h2>
                                        <p className="text-muted-foreground">{currentGroup.group_members.length} members</p>
                                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                                            <Edit2 className="h-4 w-4 mr-2" />
                                            Edit Info
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Members Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">
                                        Members
                                    </h3>
                                    <Button variant="ghost" size="sm" onClick={() => setAddMemberDialogOpen(true)}>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Add Member
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {currentGroup.group_members.map((member) => (
                                        <div key={member.character_id} className="p-3 rounded-lg border border-border hover:bg-muted/50 group">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={member.characters?.avatar_url || undefined} />
                                                        <AvatarFallback>{member.characters?.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{member.characters?.name}</p>
                                                        <p className="text-xs text-muted-foreground line-clamp-1">{member.characters?.description}</p>
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => member.characters && handleRemoveMember(member.character_id, member.characters.name)}
                                                >
                                                    <LogOut className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {/* Model selector */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <Label className="text-xs text-muted-foreground">Model:</Label>
                                                <Select
                                                    value={member.model_override || "default"}
                                                    onValueChange={(value) => handleModelChange(member.character_id, value)}
                                                >
                                                    <SelectTrigger className="h-7 text-xs flex-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {AVAILABLE_MODELS.map(m => (
                                                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="pt-8 border-t border-border">
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={handleDeleteGroup}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Group
                                </Button>
                            </div>

                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            {/* Add Member Dialog */}
            <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Members to {currentGroup.name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Search characters..."
                            className="mb-4"
                        />
                        <ScrollArea className="h-[300px]">
                            {availableCharacters.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No other characters available to add.</p>
                            ) : (
                                <div className="space-y-2">
                                    {availableCharacters.map(char => (
                                        <div
                                            key={char.id}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedNewMembers.has(char.id) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}`}
                                            onClick={() => {
                                                const newSet = new Set(selectedNewMembers);
                                                if (newSet.has(char.id)) newSet.delete(char.id);
                                                else newSet.add(char.id);
                                                setSelectedNewMembers(newSet);
                                            }}
                                        >
                                            <Checkbox checked={selectedNewMembers.has(char.id)} />
                                            <Avatar>
                                                <AvatarImage src={char.avatar_url || undefined} />
                                                <AvatarFallback>{char.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="font-medium">{char.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setAddMemberDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddMembers} disabled={selectedNewMembers.size === 0}>
                            Add {selectedNewMembers.size > 0 ? `(${selectedNewMembers.size})` : ''}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
