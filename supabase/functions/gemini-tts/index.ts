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

    // Use Google Cloud TTS API (requires enabling in Google Cloud)
    // Fallback: Use browser TTS by returning empty
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