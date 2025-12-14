
export enum MessageType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM'
}

export enum Sender {
  USER = 'USER',
  AI = 'AI'
}

export interface Message {
  id: string;
  text?: string;
  audioUrl?: string; // Blob URL for TTS playback in browser
  audioData?: string; // Base64 string (raw data) for sending to Gemini API
  imageUrl?: string; // Base64 data URL
  sender: Sender;
  timestamp: Date;
  type: MessageType;
  status: 'sent' | 'delivered' | 'read';
  reaction?: string; // New: Emoji reaction
}

export interface ChatConfig {
  systemPrompt: string;
  wallpaperUrl: string | null;
  avatarUrl: string;
  referenceImageUrl?: string; // New: For maintaining character consistency in generated images
  voiceName: string; // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'
}

export interface UserSettings {
  userName: string;
}

export interface SavedPrompt {
  name: string;
  content: string;
}

export interface ChatSession {
  id: string;
  name: string;
  avatar: string;
  messages: Message[];
  config: ChatConfig;
  isTyping: boolean;
  unreadCount: number;
}
