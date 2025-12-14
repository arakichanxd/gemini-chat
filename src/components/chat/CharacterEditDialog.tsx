import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Camera, Loader2, Volume2, ImageIcon, X, Lock, Bell, Palette, BarChart3, Wand2 } from "lucide-react";
import type { Character } from "@/hooks/useCharacters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AVAILABLE_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Default)" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "gemini-flash-latest", label: "Gemini Flash (Latest)" },
  { value: "gemini-flash-lite-latest", label: "Gemini Flash Lite (Latest)" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
  { value: "zai-glm-4.6", label: "GLM 4.6" },
  { value: "qwen-3-235b-a22b-instruct-2507", label: "Qwen3 235b" },
];

const IMAGE_MODELS = [
  { value: "gemini-2.5-flash-image", label: "Nano Banana (gemini-2.5-flash-image)" },
  { value: "gemini-3-pro-image-preview", label: "Nano Banana Pro (gemini-3-pro-image-preview)" },
  { value: "imagen-4.0-generate-001", label: "Imagen 4.0 (imagen-4.0-generate-001)" },
  { value: "imagen-4.0-ultra-generate-001", label: "Imagen 4.0 Ultra (imagen-4.0-ultra-generate-001)" },
  { value: "imagen-4.0-fast-generate-001", label: "Imagen 4.0 Fast (imagen-4.0-fast-generate-001)" },
];

const TTS_MODELS = [
  { value: "gemini-2.5-flash-preview-tts", label: "Gemini 2.5 Flash TTS (Default)" },
  { value: "gemini-2.5-pro-preview-tts", label: "Gemini 2.5 Pro TTS (Higher Quality)" },
];

const AVAILABLE_VOICES = {
  female: [
    { value: "Kore", label: "Kore (Firm)" },
    { value: "Aoede", label: "Aoede (Breezy)" },
    { value: "Zephyr", label: "Zephyr (Bright)" },
    { value: "Leda", label: "Leda" },
    { value: "Callirrhoe", label: "Callirrhoe" },
    { value: "Autonoe", label: "Autonoe" },
    { value: "Despina", label: "Despina" },
    { value: "Erinome", label: "Erinome" },
    { value: "Laomedeia", label: "Laomedeia" },
  ],
  male: [
    { value: "Puck", label: "Puck (Upbeat)" },
    { value: "Charon", label: "Charon" },
    { value: "Fenrir", label: "Fenrir (Excitable)" },
    { value: "Orus", label: "Orus (Firm)" },
    { value: "Enceladus", label: "Enceladus" },
    { value: "Iapetus", label: "Iapetus" },
    { value: "Umbriel", label: "Umbriel" },
    { value: "Algieba", label: "Algieba" },
    { value: "Algenib", label: "Algenib" },
    { value: "Rasalgethi", label: "Rasalgethi" },
    { value: "Achernar", label: "Achernar" },
    { value: "Alnilam", label: "Alnilam" },
  ],
};

interface CharacterEditDialogProps {
  character: Character | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Character>) => Promise<void>;
  isCreating?: boolean;
}

export const CharacterEditDialog = ({
  character,
  open,
  onOpenChange,
  onSave,
  isCreating = false,
}: CharacterEditDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant.");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceName, setVoiceName] = useState("Kore");
  const [ttsModel, setTtsModel] = useState("gemini-2.5-flash-preview-tts");
  const [imageModel, setImageModel] = useState("gemini-2.5-flash-image");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockPin, setLockPin] = useState("");
  const [notificationSound, setNotificationSound] = useState("default");
  const [themeColor, setThemeColor] = useState("#00a884");
  const [chatStats, setChatStats] = useState<{ total: number; firstDate: string | null; lastDate: string | null }>({ total: 0, firstDate: null, lastDate: null });
  const [isGeneratingWallpaper, setIsGeneratingWallpaper] = useState(false);
  const [wallpaperPrompt, setWallpaperPrompt] = useState("");
  const [wallpaperModel, setWallpaperModel] = useState("turbo");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens or character changes
  useEffect(() => {
    if (open) {
      setName(character?.name || "");
      setDescription(character?.description || "");
      setSystemPrompt(character?.system_prompt || "You are a helpful AI assistant.");
      setAvatarUrl(character?.avatar_url || "");
      setModel(character?.model || "gemini-2.5-flash");
      setVoiceEnabled(character?.voice_enabled || false);
      setVoiceName(character?.voice_name || "Kore");
      setTtsModel(character?.tts_model || "gemini-2.5-flash-preview-tts");
      setImageModel(character?.image_model || "gemini-2.5-flash-image");
      setReferenceImageUrl(character?.reference_image_url || "");
      setIsLocked(character?.is_locked || false);
      setLockPin("");
      setNotificationSound(character?.notification_sound || "default");
      setThemeColor(character?.theme_color || "#00a884");

      // Fetch chat statistics
      if (character?.id) {
        fetchChatStats(character.id);
      }
    }
  }, [open, character]);

  // Fetch chat statistics
  const fetchChatStats = async (characterId: string) => {
    try {
      // Find conversation for this character
      const { data: convData } = await supabase
        .from('conversations')
        .select('id')
        .eq('character_id', characterId)
        .single();

      if (convData) {
        const { data: messages, count } = await supabase
          .from('messages')
          .select('created_at', { count: 'exact' })
          .eq('conversation_id', convData.id)
          .order('created_at', { ascending: true });

        if (messages && messages.length > 0) {
          setChatStats({
            total: count || messages.length,
            firstDate: messages[0].created_at,
            lastDate: messages[messages.length - 1].created_at
          });
        } else {
          setChatStats({ total: 0, firstDate: null, lastDate: null });
        }
      }
    } catch (e) {
      console.error("Error fetching chat stats:", e);
    }
  };

  // Generate wallpaper using Edge Function proxy to SubNP API
  const generateWallpaper = async (customPrompt?: string) => {
    if (!character) return;

    setIsGeneratingWallpaper(true);
    toast.info("Generating wallpaper... This may take a moment.");

    try {
      const prompt = customPrompt || wallpaperPrompt ||
        `Beautiful aesthetic wallpaper for chat background, ${character.description || character.name}, artistic, high quality, 4k`;

      // Call Edge Function that proxies to SubNP
      const { data, error } = await supabase.functions.invoke("generate-wallpaper", {
        body: { prompt, model: wallpaperModel }
      });

      if (error) {
        throw new Error(error.message || "Generation failed");
      }

      let imgBlob: Blob;

      if (data?.imageUrl) {
        // SubNP returned a URL - download it
        const imgResponse = await fetch(data.imageUrl);
        imgBlob = await imgResponse.blob();
      } else if (data?.imageContent) {
        // Gemini fallback returned base64 - convert to blob
        const imgBytes = Uint8Array.from(atob(data.imageContent), c => c.charCodeAt(0));
        imgBlob = new Blob([imgBytes], { type: data.mimeType || "image/png" });
      } else {
        toast.error(data?.error || "Failed to generate wallpaper");
        return;
      }

      const fileName = `wallpaper-${character.id}-${Date.now()}.png`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, imgBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData.path);

      // Update character with wallpaper URL
      await supabase.from('characters').update({
        reference_image_url: urlData.publicUrl
      }).eq('id', character.id);

      setReferenceImageUrl(urlData.publicUrl);
      setWallpaperPrompt("");
      toast.success(`Wallpaper generated${data.source === 'gemini' ? ' (via Gemini)' : ''}!`);
    } catch (error: any) {
      console.error("Wallpaper generation error:", error);
      toast.error(error.message || "Failed to generate wallpaper");
    } finally {
      setIsGeneratingWallpaper(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `character-${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(data.path);

      setAvatarUrl(urlData.publicUrl);
      toast.success("Avatar uploaded!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRefImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `reference-${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(data.path);

      setReferenceImageUrl(urlData.publicUrl);
      toast.success("Reference image uploaded!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload reference image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        system_prompt: systemPrompt.trim() || "You are a helpful AI assistant.",
        avatar_url: avatarUrl || null,
        model: model,
        voice_enabled: voiceEnabled,
        voice_name: voiceName,
        tts_model: ttsModel,
        image_model: imageModel,
        reference_image_url: referenceImageUrl || null,
        is_locked: isLocked,
        lock_pin: lockPin || null,
        notification_sound: notificationSound,
        theme_color: themeColor,
      });
      onOpenChange(false);
      toast.success(isCreating ? "Character created!" : "Character updated!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save character");
    } finally {
      setIsSaving(false);
    }
  };

  const testVoice = async () => {
    toast.info(`Testing voice: ${voiceName}`);
    try {
      const { data } = await supabase.functions.invoke("text-to-speech", {
        body: { text: `Hello! I'm ${name || "your AI assistant"}. This is how I sound.`, voice: voiceName }
      });

      if (data?.audioContent) {
        const audioBytes = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0));
        const audioBlob = new Blob([audioBytes], { type: "audio/wav" });
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.play();
      } else {
        toast.error("Voice preview not available");
      }
    } catch (error) {
      console.error("Voice test error:", error);
      toast.error("Failed to test voice");
    }
  };

  const clearChatHistory = async () => {
    if (!character?.id) return;

    const confirmed = window.confirm("Are you sure you want to delete all chat messages for this character? This cannot be undone.");
    if (!confirmed) return;

    try {
      // Get conversation for this character
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .eq("character_id", character.id);

      if (conversations && conversations.length > 0) {
        // Delete all messages for these conversations
        for (const conv of conversations) {
          await supabase
            .from("messages")
            .delete()
            .eq("conversation_id", conv.id);
        }
        toast.success("Chat history cleared!");
      } else {
        toast.info("No chat history to clear");
      }
    } catch (error) {
      console.error("Clear history error:", error);
      toast.error("Failed to clear chat history");
    }
  };

  const backupCharacter = () => {
    if (!character?.id) {
      toast.error("Save the character first before backing up");
      return;
    }

    const backup = {
      name,
      description,
      system_prompt: systemPrompt,
      avatar_url: avatarUrl,
      model,
      voice_enabled: voiceEnabled,
      voice_name: voiceName,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name || "character"}-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Character backup downloaded!");
  };

  const restoreCharacter = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const backup = JSON.parse(text);

        if (backup.name) setName(backup.name);
        if (backup.description) setDescription(backup.description);
        if (backup.system_prompt) setSystemPrompt(backup.system_prompt);
        if (backup.avatar_url) setAvatarUrl(backup.avatar_url);
        if (backup.model) setModel(backup.model);
        if (typeof backup.voice_enabled === "boolean") setVoiceEnabled(backup.voice_enabled);
        if (backup.voice_name) setVoiceName(backup.voice_name);

        toast.success("Character restored from backup!");
      } catch (error) {
        console.error("Restore error:", error);
        toast.error("Failed to restore from backup. Invalid file format.");
      }
    };
    input.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreating ? "Create Character" : "Edit Character"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                  {name ? name.charAt(0).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">Click camera to upload avatar</p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Character name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Voice Settings */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="voiceEnabled" className="font-medium">Voice Responses</Label>
                <p className="text-xs text-muted-foreground">AI will respond with voice messages</p>
              </div>
              <Switch
                id="voiceEnabled"
                checked={voiceEnabled}
                onCheckedChange={setVoiceEnabled}
              />
            </div>

            {voiceEnabled && (
              <div className="space-y-3 pt-2 border-t">
                <Label>Voice Selection</Label>
                <Select value={voiceName} onValueChange={setVoiceName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Female Voices</div>
                    {AVAILABLE_VOICES.female.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Male Voices</div>
                    {AVAILABLE_VOICES.male.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* TTS Model Selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="ttsModel" className="text-sm text-muted-foreground">TTS Model</Label>
                  <Select value={ttsModel} onValueChange={setTtsModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select TTS model" />
                    </SelectTrigger>
                    <SelectContent>
                      {TTS_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testVoice}
                  className="w-full"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Test Voice
                </Button>
              </div>
            )}
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Instructions for the AI character..."
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This defines how the AI character behaves and responds
            </p>
          </div>

          {/* Image Generation Settings */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              <Label className="font-medium">Image Generation</Label>
            </div>

            {/* Image Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="imageModel" className="text-sm">Image Model</Label>
              <Select value={imageModel} onValueChange={setImageModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select image model" />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Model used when AI generates pictures
              </p>
            </div>

            {/* Reference Image */}
            <div className="space-y-2">
              <Label className="text-sm">Reference Image (Optional)</Label>
              <p className="text-xs text-muted-foreground">
                Upload a reference to keep character appearance consistent in generated images
              </p>

              {referenceImageUrl ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={referenceImageUrl}
                    alt="Reference"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => setReferenceImageUrl("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div
                  className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => refImageInputRef.current?.click()}
                >
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Click to upload reference image</span>
                </div>
              )}

              <input
                ref={refImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleRefImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Privacy Lock */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <Label className="font-medium">Privacy Lock</Label>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="lock-chat" className="text-sm">Lock this chat</Label>
                <p className="text-xs text-muted-foreground">
                  Require PIN to view this conversation
                </p>
              </div>
              <Switch
                id="lock-chat"
                checked={isLocked}
                onCheckedChange={setIsLocked}
              />
            </div>

            {isLocked && (
              <div className="space-y-2">
                <Label htmlFor="pin" className="text-sm">PIN Code</Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                  value={lockPin}
                  onChange={(e) => setLockPin(e.target.value.replace(/\D/g, ''))}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  {character?.lock_pin ? "Leave blank to keep existing PIN" : "Set a 4-digit PIN"}
                </p>
              </div>
            )}
          </div>

          {/* Notification Sound */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <Label className="font-medium">Notification Sound</Label>
            </div>

            <Select value={notificationSound} onValueChange={setNotificationSound}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select notification sound" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="chime">Chime</SelectItem>
                <SelectItem value="pop">Pop</SelectItem>
                <SelectItem value="ding">Ding</SelectItem>
                <SelectItem value="none">None (Silent)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sound played when receiving a message from this character
            </p>
          </div>

          {/* Theme Color */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <Label className="font-medium">Chat Theme</Label>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Bubble Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <div className="flex gap-1 flex-wrap">
                  {["#00a884", "#1976d2", "#9c27b0", "#f44336", "#ff9800", "#4caf50", "#e91e63"].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setThemeColor(color)}
                      className={`w-6 h-6 rounded-full border-2 ${themeColor === color ? 'border-white ring-2 ring-offset-2 ring-primary' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Custom color for this character's chat bubbles
              </p>
            </div>
          </div>

          {/* Chat Statistics - only show for existing characters with conversations */}
          {!isCreating && character?.id && chatStats.total > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <Label className="font-medium">Chat Statistics</Label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{chatStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Messages</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-sm font-medium">
                    {chatStats.firstDate ? new Date(chatStats.firstDate).toLocaleDateString() : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">First Chat</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-sm font-medium">
                    {chatStats.lastDate ? new Date(chatStats.lastDate).toLocaleDateString() : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">Last Chat</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Wallpaper Generator - only for existing characters */}
          {!isCreating && character?.id && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                <Label className="font-medium">AI Wallpaper Generator</Label>
              </div>

              <p className="text-xs text-muted-foreground">
                Generate a unique wallpaper/background image for this character using free AI
              </p>

              <Input
                placeholder="Describe your wallpaper (or leave empty for auto)"
                value={wallpaperPrompt}
                onChange={(e) => setWallpaperPrompt(e.target.value)}
                disabled={isGeneratingWallpaper}
              />

              <div className="flex gap-2">
                <Select value={wallpaperModel} onValueChange={setWallpaperModel}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="turbo">Turbo (Fast)</SelectItem>
                    <SelectItem value="flux">Flux</SelectItem>
                    <SelectItem value="flux-schnell">Flux Schnell</SelectItem>
                    <SelectItem value="magic">Magic</SelectItem>
                    <SelectItem value="wan">Wan (Qwen)</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => generateWallpaper()}
                  disabled={isGeneratingWallpaper}
                  className="flex-1"
                >
                  {isGeneratingWallpaper ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Wallpaper
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Data Management - only show for existing characters */}
          {!isCreating && character?.id && (
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-medium">Data Management</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearChatHistory}
                  className="text-destructive border-destructive/50 hover:bg-destructive/10"
                >
                  Clear History
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={backupCharacter}
                >
                  Backup
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={restoreCharacter}
                >
                  Restore
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Clear all messages, backup settings to file, or restore from backup
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={isSaving || isUploading}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isCreating ? (
                "Create"
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};