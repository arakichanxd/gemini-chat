# WhatsApp-Style AI Chat - Backend Documentation

Complete documentation for migrating the backend to another Supabase project.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Storage Buckets](#storage-buckets)
4. [Edge Functions](#edge-functions)
5. [Required Secrets](#required-secrets)
6. [AI Models Used](#ai-models-used)
7. [Setup Instructions](#setup-instructions)
8. [Sample Data](#sample-data)

---

## Overview

This is a WhatsApp-style AI chatbot application with the following features:

- **Text Chat**: Send messages and receive AI responses using Gemini 2.5 Flash
- **Voice Calls**: Real-time voice conversations with AI characters
- **Voice Notes**: Record and send voice messages, AI responds with voice
- **Image Attachments**: Send images in chat
- **Character Management**: Create, edit, delete AI characters with custom system prompts
- **Avatar Upload**: Upload custom profile pictures for characters

---

## Database Schema

### 1. Helper Function - Update Timestamp

Run this first as it's used by triggers:

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
```

### 2. Characters Table

Stores AI character definitions with their system prompts.

```sql
-- Create characters table
CREATE TABLE public.characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL DEFAULT 'You are a helpful assistant.',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public access for demo - add auth for production)
CREATE POLICY "Allow public read access to characters" 
ON public.characters FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to characters" 
ON public.characters FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to characters" 
ON public.characters FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to characters" 
ON public.characters FOR DELETE USING (true);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### 3. Conversations Table

Stores chat sessions between users and characters.

```sql
-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to conversations" 
ON public.conversations FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to conversations" 
ON public.conversations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to conversations" 
ON public.conversations FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to conversations" 
ON public.conversations FOR DELETE USING (true);
```

### 4. Messages Table

Stores individual messages in conversations.

```sql
-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,  -- 'user' or 'assistant'
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',  -- 'text', 'image', 'voice'
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to messages" 
ON public.messages FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to messages" 
ON public.messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to messages" 
ON public.messages FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to messages" 
ON public.messages FOR DELETE USING (true);

-- Enable Realtime for messages (optional - for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

---

## Storage Buckets

### 1. Avatars Bucket

For character profile pictures.

```sql
-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow public upload
CREATE POLICY "Anyone can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');
```

### 2. Chat Images Bucket

For image attachments and voice notes in chat.

```sql
-- Create chat-images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Chat images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

-- Allow public upload
CREATE POLICY "Anyone can upload chat images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-images');
```

---

## Edge Functions

### Configuration File (supabase/config.toml)

```toml
project_id = "YOUR_PROJECT_ID"

[functions.chat]
verify_jwt = false

[functions.gemini-live]
verify_jwt = false

[functions.gemini-tts]
verify_jwt = false
```

---

### Function 1: `chat` - Text Chat with Streaming

**Purpose**: Handles text chat with AI using Lovable AI Gateway (Gemini 2.5 Flash)
**AI Model**: `google/gemini-2.5-flash` via Lovable AI Gateway
**Streaming**: Yes (Server-Sent Events)

**File**: `supabase/functions/chat/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Sending request to Lovable AI with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt || "You are a helpful AI assistant." },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

**Usage from frontend**:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages, systemPrompt }),
});
// Handle SSE streaming response
```

---

### Function 2: `gemini-live` - Voice Transcription & Chat

**Purpose**: Handles audio transcription and voice conversation
**AI Model**: `gemini-2.5-flash` via Google AI API
**Features**: 
- Transcribe audio (WebM format) to text
- Generate conversational AI responses for voice calls

**File**: `supabase/functions/gemini-live/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, audio, messages, systemPrompt } = await req.json();
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    // Transcribe audio
    if (type === "transcribe" && audio) {
      console.log("Transcribing audio...");
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: "audio/webm",
                      data: audio,
                    },
                  },
                  {
                    text: "Transcribe this audio accurately. Output only the transcription text, nothing else. If there's no speech or it's unclear, output empty string.",
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini transcribe error:", response.status, errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      console.log("Transcription result:", text);
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chat with AI
    if (type === "chat" && messages) {
      console.log("Processing chat with", messages.length, "messages");
      
      const geminiMessages = messages.map((msg: { role: string; content: string }) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt || "You are a helpful AI assistant." }],
            },
            contents: geminiMessages,
            generationConfig: {
              maxOutputTokens: 200,
              temperature: 0.8,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini chat error:", response.status, errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const result = await response.json();
      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      console.log("Chat response:", responseText.substring(0, 100));
      return new Response(JSON.stringify({ response: responseText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid request type");
  } catch (error: unknown) {
    console.error("Gemini live error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

**Usage from frontend**:
```typescript
// Transcribe audio
const { data } = await supabase.functions.invoke("gemini-live", {
  body: { type: "transcribe", audio: base64AudioData }
});
// Returns: { text: "transcribed text" }

// Chat for voice call
const { data } = await supabase.functions.invoke("gemini-live", {
  body: { 
    type: "chat", 
    messages: [{ role: "user", content: "Hello" }],
    systemPrompt: "You are a friendly assistant"
  }
});
// Returns: { response: "AI response text" }
```

---

### Function 3: `gemini-tts` - Text-to-Speech

**Purpose**: Convert text to speech audio
**AI Model**: Google Cloud TTS API (with browser fallback)
**Output Format**: MP3 audio as base64

**File**: `supabase/functions/gemini-tts/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text) {
      throw new Error("Text is required");
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    console.log("Generating TTS for:", text.substring(0, 50));

    // Use Google Cloud TTS API
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: "en-US",
            name: "en-US-Neural2-F",
            ssmlGender: "FEMALE",
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log("Google TTS not available, using fallback:", errorText);
      // Return empty to trigger browser fallback
      return new Response(
        JSON.stringify({ audioContent: "", useFallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("TTS generated successfully");

    return new Response(
      JSON.stringify({ audioContent: result.audioContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ audioContent: "", useFallback: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

**Usage from frontend**:
```typescript
const { data } = await supabase.functions.invoke("gemini-tts", {
  body: { text: "Hello, how are you?" }
});

if (data.audioContent) {
  // Play audio
  const audioBytes = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0));
  const audioBlob = new Blob([audioBytes], { type: "audio/mp3" });
  const audio = new Audio(URL.createObjectURL(audioBlob));
  audio.play();
} else if (data.useFallback) {
  // Use browser's Web Speech API
  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}
```

---

## Required Secrets

Set these secrets in your Supabase project dashboard under **Project Settings > Edge Functions > Secrets**:

| Secret Name | Description | Required For | How to Get |
|-------------|-------------|--------------|------------|
| `LOVABLE_API_KEY` | Lovable AI Gateway key | `chat` function | Auto-provided by Lovable Cloud |
| `GOOGLE_AI_API_KEY` | Google AI Studio API key | `gemini-live`, `gemini-tts` | [Google AI Studio](https://aistudio.google.com/apikey) |

### Getting Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it as a secret named `GOOGLE_AI_API_KEY`

**Note**: For Google Cloud TTS to work, you may also need to enable the Cloud Text-to-Speech API in your Google Cloud Console.

---

## AI Models Used

| Feature | Model | Provider | Purpose |
|---------|-------|----------|---------|
| Text Chat | `google/gemini-2.5-flash` | Lovable AI Gateway | Fast, accurate text responses with streaming |
| Voice Transcription | `gemini-2.5-flash` | Google AI | Transcribe audio to text for voice messages |
| Voice Chat | `gemini-2.5-flash` | Google AI | Generate short conversational responses for voice calls |
| Text-to-Speech | `en-US-Neural2-F` | Google Cloud TTS | Convert AI text responses to natural speech |

### Why These Models?

- **Gemini 2.5 Flash**: Fast, cost-effective, good at multimodal (text + audio)
- **Neural2 TTS**: Natural-sounding voices, low latency
- **Browser TTS Fallback**: Works without API if TTS fails

---

## Setup Instructions

### Step 1: Create Supabase Project

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### Step 2: Run Database Migrations

Run these SQL commands in order in the SQL Editor:

1. Create helper function (see [Helper Function](#1-helper-function---update-timestamp))
2. Create characters table (see [Characters Table](#2-characters-table))
3. Create conversations table (see [Conversations Table](#3-conversations-table))
4. Create messages table (see [Messages Table](#4-messages-table))
5. Create storage buckets (see [Storage Buckets](#storage-buckets))

### Step 3: Deploy Edge Functions

1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref YOUR_PROJECT_ID`
4. Create functions folder structure:
   ```
   supabase/
   ├── config.toml
   └── functions/
       ├── chat/
       │   └── index.ts
       ├── gemini-live/
       │   └── index.ts
       └── gemini-tts/
           └── index.ts
   ```
5. Deploy: `supabase functions deploy`

### Step 4: Set Secrets

```bash
# Set Google AI API key
supabase secrets set GOOGLE_AI_API_KEY=your_google_ai_key

# LOVABLE_API_KEY is auto-provided in Lovable Cloud
# For external Supabase, you'll need to use your own AI gateway or replace with OpenAI
```

### Step 5: Update Frontend Environment

Create/update `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

---

## Sample Data

Insert some default characters to get started:

```sql
INSERT INTO public.characters (name, description, system_prompt) VALUES
(
  'Max', 
  'Friendly tech expert', 
  'You are Max, a friendly and knowledgeable tech expert. You explain complex technical concepts in simple terms and are always eager to help with coding, debugging, and tech recommendations. Keep responses concise and helpful.'
),
(
  'Luna', 
  'Creative artist and storyteller', 
  'You are Luna, a creative artist and storyteller. You have a vivid imagination and love crafting stories, poems, and creative content. You speak in an expressive, artistic manner and encourage creativity in others.'
),
(
  'Sage', 
  'Wise life coach and advisor', 
  'You are Sage, a wise and empathetic life coach. You provide thoughtful advice on personal growth, relationships, and life decisions. You listen carefully and offer balanced, supportive guidance without being preachy.'
);
```

---

## Frontend Code Structure

Key files for the chat functionality:

```
src/
├── components/
│   └── chat/
│       ├── CharacterList.tsx    # Sidebar with character list
│       ├── CharacterEditDialog.tsx # Create/edit character modal
│       ├── ChatWindow.tsx       # Main chat interface
│       └── VoiceCallDialog.tsx  # Voice call modal
├── hooks/
│   ├── useCharacters.ts         # Character CRUD operations
│   ├── useConversations.ts      # Conversation management
│   └── useMessages.ts           # Message operations
├── lib/
│   └── streamChat.ts            # SSE streaming helper
└── pages/
    └── Index.tsx                # Main page layout
```

---

## Troubleshooting

### Voice features not working?
- Ensure `GOOGLE_AI_API_KEY` is set correctly
- Check browser microphone permissions
- Enable Cloud Text-to-Speech API in Google Cloud Console

### Chat not responding?
- Check if `LOVABLE_API_KEY` is set (Lovable Cloud) or replace with OpenAI
- Verify edge functions are deployed: `supabase functions list`
- Check function logs: `supabase functions logs chat`

### Images not uploading?
- Ensure storage buckets exist and have correct policies
- Check file size (max 10MB for images)

---

## Production Considerations

For production deployment, consider:

1. **Authentication**: Add user authentication and update RLS policies to `auth.uid() = user_id`
2. **Rate Limiting**: Add rate limiting to edge functions
3. **Error Monitoring**: Add Sentry or similar for error tracking
4. **Analytics**: Track usage for cost management
5. **Backup**: Set up regular database backups