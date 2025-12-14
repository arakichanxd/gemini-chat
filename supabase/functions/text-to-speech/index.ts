import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert PCM to WAV format
function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcmData.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;

  const wav = new Uint8Array(fileSize);
  const view = new DataView(wav.buffer);

  // RIFF header
  wav.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  view.setUint32(4, fileSize - 8, true);  // File size - 8
  wav.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

  // fmt subchunk
  wav.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  view.setUint32(16, 16, true);           // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);            // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);  // NumChannels
  view.setUint32(24, sampleRate, true);   // SampleRate
  view.setUint32(28, byteRate, true);     // ByteRate
  view.setUint16(32, blockAlign, true);   // BlockAlign
  view.setUint16(34, bitsPerSample, true);// BitsPerSample

  // data subchunk
  wav.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  view.setUint32(40, dataSize, true);     // Subchunk2Size
  wav.set(pcmData, 44);                   // PCM data

  return wav;
}

// Decode base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Encode Uint8Array to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, voice, tts_model } = await req.json();

    if (!text) {
      throw new Error("Text is required");
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    // Select TTS model (default to gemini-2.5-flash-preview-tts)
    const selectedModel = tts_model === "gemini-2.5-pro-preview-tts"
      ? "gemini-2.5-pro-preview-tts"
      : "gemini-2.5-flash-preview-tts";

    console.log("Generating TTS with model:", selectedModel, "text:", text.slice(0, 50) + "...");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: text }] }],
          generationConfig: {
            response_modalities: ["AUDIO"],
            speech_config: {
              voice_config: {
                prebuilt_voice_config: {
                  voice_name: voice || "Kore",
                },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini TTS error:", errorText);
      return new Response(
        JSON.stringify({ audioContent: "", error: "TTS failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const part = result.candidates?.[0]?.content?.parts?.[0];
    const audioBase64 = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType || "";

    if (!audioBase64) {
      console.error("No audio data in response");
      return new Response(
        JSON.stringify({ audioContent: "", error: "No audio" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Got audio, mimeType:", mimeType, "length:", audioBase64.length);

    // Convert PCM to WAV for browser playback
    const pcmData = base64ToUint8Array(audioBase64);
    const wavData = pcmToWav(pcmData, 24000);
    const wavBase64 = uint8ArrayToBase64(wavData);

    return new Response(
      JSON.stringify({
        audioContent: wavBase64,
        mimeType: "audio/wav"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Text-to-speech error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});