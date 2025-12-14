import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessages, useSendMessage, type Message } from "@/hooks/useMessages";
import type { Conversation } from "@/hooks/useConversations";
import { Send, Sparkles, ArrowLeft, Paperclip, Phone, Video, X, Mic, Square, Play, Pause, Search, Smile, ImagePlus, Reply, CornerUpLeft } from "lucide-react";
import { format } from "date-fns";
import { streamChat } from "@/lib/streamChat";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VoiceCallDialog } from "./VoiceCallDialog";
import { VideoCallDialog } from "./VideoCallDialog";
import { playNotificationSound } from "@/lib/notificationSounds";
import { CharacterProfileSheet } from "./CharacterProfileSheet";
import { CharacterEditDialog } from "./CharacterEditDialog";
import { useUpdateCharacter } from "@/hooks/useCharacters";

interface ChatWindowProps {
  conversation: Conversation | null;
  onBack?: () => void;
}

export const ChatWindow = ({ conversation, onBack }: ChatWindowProps) => {
  const [message, setMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [voiceCallOpen, setVoiceCallOpen] = useState(false);
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [requestPicture, setRequestPicture] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [chatStats, setChatStats] = useState<{ total: number; firstDate: string | null; lastDate: string | null }>({ total: 0, firstDate: null, lastDate: null });
  const [isCharacterOnline, setIsCharacterOnline] = useState(false);
  const onlineTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const updateCharacter = useUpdateCharacter();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const { data: messages, isLoading, refetch } = useMessages(conversation?.id || null);
  const sendMessage = useSendMessage();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  }, [messages, streamingContent]);

  useEffect(() => {
    if (conversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [conversation]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Fetch chat stats for profile sheet
  useEffect(() => {
    const fetchStats = async () => {
      if (!conversation?.id) return;

      const { data: msgData, count } = await supabase
        .from('messages')
        .select('created_at', { count: 'exact' })
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (msgData && msgData.length > 0) {
        setChatStats({
          total: count || msgData.length,
          firstDate: msgData[0].created_at,
          lastDate: msgData[msgData.length - 1].created_at
        });
      }
    };

    fetchStats();
  }, [conversation?.id, messages]);

  // Helper to set character online and start 2-min timeout to go offline
  const setCharacterOnlineWithTimeout = () => {
    // Clear any existing timeout
    if (onlineTimeoutRef.current) {
      clearTimeout(onlineTimeoutRef.current);
    }

    // Set online
    setIsCharacterOnline(true);

    // Set timeout to go offline after 2 minutes
    onlineTimeoutRef.current = setTimeout(() => {
      setIsCharacterOnline(false);
    }, 2 * 60 * 1000); // 2 minutes
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (onlineTimeoutRef.current) {
        clearTimeout(onlineTimeoutRef.current);
      }
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileName = `chat-${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("chat-images")
      .upload(fileName, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("chat-images")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1 }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (audioChunksRef.current.length > 0) {
          await processVoiceNote();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);

    } catch (error) {
      console.error("Recording error:", error);
      toast.error("Failed to access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const processVoiceNote = async () => {
    if (!conversation || audioChunksRef.current.length === 0) return;

    setIsUploading(true);
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

      // Upload voice note
      const fileName = `voice-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("voice-messages")
        .upload(fileName, audioBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("voice-messages")
        .getPublicUrl(uploadData.path);

      // Convert to base64 for transcription
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];

        // Transcribe the voice note
        const { data: transcribeData } = await supabase.functions.invoke("gemini-live", {
          body: { type: "transcribe", audio: base64Audio }
        });

        const transcribedText = transcribeData?.text || "[Voice message]";

        // Save user voice message
        await sendMessage.mutateAsync({
          conversation_id: conversation.id,
          content: transcribedText,
          role: "user",
          message_type: "voice",
          media_url: urlData.publicUrl,
        });

        // Get AI response
        const history = (messages || []).map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content || "",
        }));
        history.push({ role: "user", content: transcribedText });

        setIsStreaming(true);
        setStreamingContent("");
        let fullResponse = "";

        await streamChat({
          messages: history,
          systemPrompt: conversation.characters?.system_prompt || "You are a helpful AI assistant.",
          model: conversation.characters?.model || "gemini-2.5-flash",
          onDelta: (delta) => {
            fullResponse += delta;
            setStreamingContent(fullResponse);
          },
          onDone: async () => {
            setIsStreaming(false);
            setStreamingContent("");

            if (fullResponse.trim()) {
              // Generate TTS for AI response
              const { data: ttsData } = await supabase.functions.invoke("gemini-tts", {
                body: { text: fullResponse }
              });

              let voiceUrl = null;
              if (ttsData?.audioContent) {
                const audioBytes = Uint8Array.from(atob(ttsData.audioContent), c => c.charCodeAt(0));
                const audioBlob = new Blob([audioBytes], { type: "audio/wav" });
                const fileName = `ai-voice-${Date.now()}.wav`;

                const { data: uploadData } = await supabase.storage
                  .from("voice-messages")
                  .upload(fileName, audioBlob, { upsert: true });

                if (uploadData) {
                  const { data: url } = supabase.storage
                    .from("chat-images")
                    .getPublicUrl(uploadData.path);
                  voiceUrl = url.publicUrl;
                }
              }

              await sendMessage.mutateAsync({
                conversation_id: conversation.id,
                content: fullResponse,
                role: "assistant",
                message_type: voiceUrl ? "voice" : "text",
                media_url: voiceUrl,
              });
            }
          },
          onError: (error) => {
            setIsStreaming(false);
            setStreamingContent("");
            toast.error(error);
          },
        });
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error("Voice note error:", error);
      toast.error("Failed to send voice note");
    } finally {
      setIsUploading(false);
    }
  };

  const playVoiceMessage = (mediaUrl: string, messageId: string) => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    if (playingVoiceId === messageId) {
      setPlayingVoiceId(null);
      return;
    }

    const audio = new Audio(mediaUrl);
    audioElementRef.current = audio;

    audio.onended = () => setPlayingVoiceId(null);
    audio.onerror = () => {
      setPlayingVoiceId(null);
      toast.error("Failed to play audio");
    };

    audio.play();
    setPlayingVoiceId(messageId);
  };

  const handleSend = async () => {
    if ((!message.trim() && !selectedImage) || !conversation || isStreaming) return;

    // Set character online when user sends a message
    setCharacterOnlineWithTimeout();

    const content = message.trim();
    setMessage("");

    // Handle picture request mode
    if (requestPicture && content) {
      setRequestPicture(false);
      setIsUploading(true);

      try {
        console.log("Picture mode: Generating image for:", content);
        const character = conversation.characters;

        // Call generate-image function
        const { data: imageData, error: imageError } = await supabase.functions.invoke("generate-image", {
          body: {
            prompt: content,
            model: character?.image_model || "gemini-2.5-flash-image",
            referenceImageUrl: character?.reference_image_url || null,
          }
        });

        if (imageError) {
          console.error("Image generation error:", imageError);
          toast.error("Failed to generate image");
          setIsUploading(false);
          return;
        }

        if (imageData?.imageContent) {
          // Convert base64 to blob and upload
          const imageBytes = Uint8Array.from(atob(imageData.imageContent), c => c.charCodeAt(0));
          const imageBlob = new Blob([imageBytes], { type: imageData.mimeType || "image/png" });
          const fileName = `ai-image-${Date.now()}.png`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("chat-images")
            .upload(fileName, imageBlob, { upsert: true });

          if (uploadError) {
            console.error("Image upload error:", uploadError);
            toast.error("Failed to upload generated image");
            setIsUploading(false);
            return;
          }

          const { data: urlData } = supabase.storage
            .from("chat-images")
            .getPublicUrl(uploadData.path);

          // Save user's request
          await sendMessage.mutateAsync({
            conversation_id: conversation.id,
            content: `📸 ${content}`,
            role: "user",
            message_type: "text",
          });

          // Save AI image response
          await sendMessage.mutateAsync({
            conversation_id: conversation.id,
            content: "Here's your picture! 😊",
            role: "assistant",
            message_type: "image",
            media_url: urlData.publicUrl,
          });

          toast.success("Picture generated!");
        } else {
          console.error("No image in response:", imageData);
          toast.error("AI couldn't generate the image. Try a different description.");
        }
      } catch (error) {
        console.error("Picture generation error:", error);
        toast.error("Failed to generate picture");
      } finally {
        setIsUploading(false);
      }
      return;
    }

    let mediaUrl: string | null = null;

    if (selectedImage) {
      setIsUploading(true);
      try {
        mediaUrl = await uploadImage(selectedImage);
        clearSelectedImage();
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload image");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const userMessage = await sendMessage.mutateAsync({
      conversation_id: conversation.id,
      content: content || (mediaUrl ? "[Image]" : ""),
      role: "user",
      message_type: mediaUrl ? "image" : "text",
      media_url: mediaUrl,
    });

    // Capture user message ID for AI reaction
    const userMessageId = userMessage?.id;

    if (!content && mediaUrl) return;

    const history = (messages || []).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content || "",
    }));
    history.push({ role: "user", content });

    setIsStreaming(true);
    setStreamingContent("");
    let fullResponse = "";

    await streamChat({
      messages: history,
      systemPrompt: conversation.characters?.system_prompt || "You are a helpful AI assistant.",
      model: conversation.characters?.model || "gemini-2.5-flash",
      onDelta: (delta) => {
        fullResponse += delta;
        setStreamingContent(fullResponse);
      },
      onDone: async () => {
        setIsStreaming(false);
        setStreamingContent("");

        if (fullResponse.trim()) {
          const character = conversation.characters;
          let voiceUrl = null;

          console.log("Voice check:", { voice_enabled: character?.voice_enabled, voice_name: character?.voice_name });

          // Generate TTS if voice is enabled for this character
          if (character?.voice_enabled) {
            console.log("Generating TTS for response...");
            try {
              const { data: ttsData, error: ttsError } = await supabase.functions.invoke("text-to-speech", {
                body: {
                  text: fullResponse,
                  voice: character.voice_name || "Kore",
                  tts_model: character.tts_model || "gemini-2.5-flash-preview-tts"
                }
              });

              if (ttsError) {
                console.error("TTS function error:", ttsError);
              }

              if (ttsData?.audioContent) {
                console.log("TTS audio received, length:", ttsData.audioContent.length);
                const audioBytes = Uint8Array.from(atob(ttsData.audioContent), c => c.charCodeAt(0));
                const audioBlob = new Blob([audioBytes], { type: "audio/wav" });
                const fileName = `ai-voice-${Date.now()}.wav`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from("voice-messages")
                  .upload(fileName, audioBlob, { upsert: true });

                if (uploadError) {
                  console.error("Voice upload error:", uploadError);
                }

                if (uploadData) {
                  // Fix: use same bucket for getPublicUrl
                  const { data: url } = supabase.storage
                    .from("voice-messages")
                    .getPublicUrl(uploadData.path);
                  voiceUrl = url.publicUrl;
                  console.log("Voice URL:", voiceUrl);
                }
              } else {
                console.log("No audioContent in TTS response:", ttsData);
              }
            } catch (e) {
              console.error("TTS error:", e);
            }
          }

          // Check for image generation request in response
          let imageUrl = null;
          const imageMatch = fullResponse.match(/\[SEND_IMAGE:\s*([^\]]+)\]/i);
          if (imageMatch) {
            const imageDescription = imageMatch[1].trim();
            console.log("Image generation requested:", imageDescription);

            try {
              const { data: imageData, error: imageError } = await supabase.functions.invoke("generate-image", {
                body: {
                  prompt: imageDescription,
                  model: character?.image_model || "gemini-2.5-flash-image",
                  referenceImageUrl: character?.reference_image_url || null
                }
              });

              if (imageError) {
                console.error("Image generation error:", imageError);
              }

              if (imageData?.imageContent) {
                console.log("Image generated successfully");
                // Convert base64 to blob
                const imageBytes = Uint8Array.from(atob(imageData.imageContent), c => c.charCodeAt(0));
                const imageBlob = new Blob([imageBytes], { type: imageData.mimeType || "image/png" });
                const fileName = `ai-image-${Date.now()}.png`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from("chat-images")
                  .upload(fileName, imageBlob, { upsert: true });

                if (uploadError) {
                  console.error("Image upload error:", uploadError);
                }

                if (uploadData) {
                  const { data: url } = supabase.storage
                    .from("chat-images")
                    .getPublicUrl(uploadData.path);
                  imageUrl = url.publicUrl;
                  console.log("Image URL:", imageUrl);
                }
              } else {
                console.log("No image in response:", imageData);
              }
            } catch (e) {
              console.error("Image generation error:", e);
            }
          }

          // Check for reaction in response (e.g., [REACT:❤️])
          const reactMatch = fullResponse.match(/\[REACT:([^\]]+)\]/i);
          if (reactMatch && userMessageId) {
            const emoji = reactMatch[1].trim();
            console.log("AI reaction detected:", emoji);

            // Get current reactions and add the AI's reaction
            const { data: userMsg } = await supabase
              .from('messages')
              .select('reactions')
              .eq('id', userMessageId)
              .single();

            const currentReactions = userMsg?.reactions || [];
            if (!currentReactions.includes(emoji)) {
              await supabase
                .from('messages')
                .update({ reactions: [...currentReactions, emoji] })
                .eq('id', userMessageId);
            }
          }

          // Remove the image tag and reaction tag from the response text
          const cleanResponse = fullResponse
            .replace(/\[SEND_IMAGE:\s*[^\]]+\]/gi, '')
            .replace(/\[REACT:[^\]]+\]/gi, '')
            .trim();

          await sendMessage.mutateAsync({
            conversation_id: conversation.id,
            content: cleanResponse || fullResponse,
            role: "assistant",
            message_type: imageUrl ? "image" : (voiceUrl ? "voice" : "text"),
            media_url: imageUrl || voiceUrl,
          });

          // Play notification sound
          playNotificationSound(character?.notification_sound || "default");
        }
      },
      onError: (error) => {
        setIsStreaming(false);
        setStreamingContent("");
        toast.error(error);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-chat-bg p-8">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse-soft">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Welcome to AI Chat</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Select a character from the sidebar to start a conversation, or create a new one.
        </p>
      </div>
    );
  }

  const character = conversation.characters;
  const allMessages = [...(messages || [])];
  const messageHistory = (messages || []).map((msg) => ({
    role: msg.role,
    content: msg.content || "",
  }));

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-chat-bg">
      {/* Header - Fixed at top */}
      <div className="shrink-0 flex items-center gap-3 p-4 bg-card border-b border-border">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div
          className="cursor-pointer"
          onClick={() => setProfileOpen(true)}
          title="View Profile"
        >
          <Avatar className="h-10 w-10 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
            <AvatarImage src={character?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {character?.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{character?.name}</h3>
          <p className="text-xs flex items-center gap-1" style={{ color: isStreaming || isCharacterOnline ? '#00a884' : '#9ca3af' }}>
            {isStreaming ? (
              <>
                <span>typing</span>
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
              </>
            ) : isCharacterOnline ? "online" : chatStats.lastDate ?
              `last seen ${new Date(chatStats.lastDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` :
              "offline"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSearch(!showSearch)}
          className={`hover:text-primary/80 ${showSearch ? 'text-primary' : 'text-muted-foreground'}`}
          title="Search Messages"
        >
          <Search className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVideoCallOpen(true)}
          className="text-primary hover:text-primary/80"
          title="Video Call"
        >
          <Video className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVoiceCallOpen(true)}
          className="text-primary hover:text-primary/80"
          title="Voice Call"
        >
          <Phone className="h-5 w-5" />
        </Button>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="shrink-0 px-4 py-2 bg-card border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-1">
              {allMessages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase())).length} results
            </p>
          )}
        </div>
      )}

      {/* Messages - Scrollable area */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse-soft text-muted-foreground">Loading messages...</div>
          </div>
        ) : allMessages.length > 0 || streamingContent ? (
          <div className="space-y-4">
            {allMessages.map((msg, index) => {
              const isUser = msg.role === "user";
              const showTimestamp = index === 0 ||
                new Date(msg.created_at).getTime() - new Date(allMessages[index - 1].created_at).getTime() > 300000;

              return (
                <div key={msg.id} className="animate-fade-in">
                  {showTimestamp && (
                    <div className="flex justify-center mb-4">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {format(new Date(msg.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isUser ? "justify-end" : "justify-start"} group`}>
                    <div className="relative">
                      {/* Reply button - appears on hover */}
                      <button
                        onClick={() => setReplyToMessage(msg)}
                        className="absolute -top-2 right-8 opacity-0 group-hover:opacity-100 transition-opacity bg-card border rounded-full p-1 shadow-sm z-10"
                        title="Reply"
                      >
                        <CornerUpLeft className="h-4 w-4 text-muted-foreground" />
                      </button>

                      {/* Reaction button - appears on hover */}
                      <button
                        onClick={() => setReactionMessageId(reactionMessageId === msg.id ? null : msg.id)}
                        className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-card border rounded-full p-1 shadow-sm z-10"
                      >
                        <Smile className="h-4 w-4 text-muted-foreground" />
                      </button>

                      {/* Reaction popup */}
                      {reactionMessageId === msg.id && (
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-card border rounded-xl px-3 py-2 shadow-lg z-20 animate-in zoom-in-95 duration-150">
                          <div className="grid grid-cols-8 gap-1">
                            {['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '💯',
                              '😍', '🥰', '😘', '💕', '😏', '🤤', '👀', '💦'].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={async () => {
                                    const currentReactions = msg.reactions || [];
                                    const newReactions = currentReactions.includes(emoji)
                                      ? currentReactions.filter((r: string) => r !== emoji)
                                      : [...currentReactions, emoji];
                                    await supabase.from('messages').update({ reactions: newReactions }).eq('id', msg.id);
                                    refetch();
                                    setReactionMessageId(null);
                                  }}
                                  className="text-lg hover:scale-125 transition-transform p-1 hover:bg-muted rounded"
                                >
                                  {emoji}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      <div
                        className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${isUser
                          ? "text-white rounded-br-md"
                          : "bg-chat-incoming text-foreground rounded-bl-md shadow-sm"
                          } ${searchQuery && msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
                            ? 'ring-2 ring-primary'
                            : ''}`}
                        style={isUser ? { backgroundColor: character?.theme_color || '#00a884' } : undefined}
                      >
                        {msg.message_type === "voice" && msg.media_url && (
                          <button
                            onClick={() => playVoiceMessage(msg.media_url!, msg.id)}
                            className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                          >
                            {playingVoiceId === msg.id ? (
                              <Pause className="h-5 w-5 text-primary" />
                            ) : (
                              <Play className="h-5 w-5 text-primary" />
                            )}
                            <span className="text-sm font-medium">Voice message</span>
                          </button>
                        )}
                        {msg.message_type === "image" && msg.media_url && (
                          <div className="mb-2">
                            <img
                              src={msg.media_url}
                              alt="Attached image"
                              className="max-w-full rounded-lg max-h-64 object-cover"
                            />
                          </div>
                        )}
                        {msg.content && msg.content !== "[Image]" && msg.content !== "[Voice message]" && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        )}

                        {/* Message footer with time and read receipts */}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(msg.created_at), "h:mm a")}
                          </span>
                          {/* Read receipt ticks - only for user messages */}
                          {isUser && (
                            <span className={`text-xs ${msg.read_at ? 'text-blue-500' : 'text-muted-foreground'}`}>
                              ✓✓
                            </span>
                          )}
                        </div>

                        {/* Reactions display */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {msg.reactions.map((emoji: string, idx: number) => (
                              <span key={idx} className="text-xs bg-background/50 rounded-full px-1.5 py-0.5 border">
                                {emoji}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {streamingContent && (
              <div className="animate-fade-in">
                <div className="flex justify-start">
                  <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-chat-incoming text-foreground rounded-bl-md shadow-sm">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{streamingContent}</p>
                    <p className="text-[10px] mt-1 text-muted-foreground">Now</p>
                  </div>
                </div>
              </div>
            )}
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Avatar className="h-20 w-20 mb-4 ring-4 ring-primary/20">
              <AvatarImage src={character?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                {character?.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-lg mb-2">{character?.name}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {character?.description || "Start a conversation with this AI character!"}
            </p>
          </div>
        )}
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="shrink-0 px-4 py-2 bg-card border-t border-border">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Selected" className="h-20 rounded-lg object-cover" />
            <button
              onClick={clearSelectedImage}
              className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="shrink-0 px-4 py-3 bg-destructive/10 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium">Recording... {formatRecordingTime(recordingDuration)}</span>
          </div>
          <Button variant="destructive" size="sm" onClick={stopRecording}>
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
        </div>
      )}

      {/* Reply Preview Bar */}
      {replyToMessage && (
        <div className="shrink-0 px-4 py-2 bg-muted/50 border-t border-border flex items-center gap-3">
          <div className="w-1 h-10 bg-primary rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">
              Replying to {replyToMessage.role === 'user' ? 'yourself' : character?.name}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {replyToMessage.content || (replyToMessage.message_type === 'image' ? '📷 Photo' : '🎤 Voice message')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setReplyToMessage(null)}
            className="shrink-0 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input - Fixed at bottom */}
      <div className="shrink-0 p-4 bg-card border-t border-border">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming || isUploading || isRecording}
            className="shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isStreaming || isUploading}
            className={`shrink-0 ${isRecording ? "text-destructive" : ""}`}
          >
            <Mic className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRequestPicture(!requestPicture)}
            disabled={isStreaming || isUploading || isRecording}
            className={`shrink-0 ${requestPicture ? "text-primary bg-primary/10" : ""}`}
            title={requestPicture ? "Picture mode ON - click to disable" : "Request a picture"}
          >
            <ImagePlus className="h-5 w-5" />
          </Button>
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={requestPicture ? "Describe the picture you want..." : "Type a message..."}
            disabled={isStreaming || isUploading || isRecording}
            className={`flex-1 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary ${requestPicture ? 'ring-1 ring-primary' : ''}`}
          />
          <Button
            onClick={handleSend}
            disabled={(!message.trim() && !selectedImage) || sendMessage.isPending || isStreaming || isUploading || isRecording}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Voice Call Dialog */}
      {character && (
        <VoiceCallDialog
          character={character}
          open={voiceCallOpen}
          onOpenChange={setVoiceCallOpen}
          conversationId={conversation.id}
          messageHistory={messageHistory}
          onNewMessage={async (role, content) => {
            await sendMessage.mutateAsync({
              conversation_id: conversation.id,
              content,
              role,
              message_type: "text",
            });
            refetch();
          }}
        />
      )}

      {/* Video Call Dialog */}
      {conversation && (
        <VideoCallDialog
          character={character}
          open={videoCallOpen}
          onOpenChange={setVideoCallOpen}
          conversationId={conversation.id}
          messageHistory={messageHistory}
          onNewMessage={async (role, content) => {
            await sendMessage.mutateAsync({
              conversation_id: conversation.id,
              content,
              role,
              message_type: "text",
            });
            refetch();
          }}
        />
      )}

      {/* Character Profile Sheet */}
      <CharacterProfileSheet
        character={character}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onCall={() => {
          setProfileOpen(false);
          setVoiceCallOpen(true);
        }}
        onVideoCall={() => {
          setProfileOpen(false);
          setVideoCallOpen(true);
        }}
        onSettings={() => {
          setProfileOpen(false);
          setEditDialogOpen(true);
        }}
        chatStats={chatStats}
        isTyping={isStreaming}
        isCharacterOnline={isCharacterOnline}
      />

      {/* Character Edit Dialog */}
      {character && (
        <CharacterEditDialog
          character={character}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={async (updates) => {
            await updateCharacter.mutateAsync({ id: character.id, ...updates });
            toast.success("Character updated!");
          }}
          isCreating={false}
        />
      )}
    </div>
  );
};