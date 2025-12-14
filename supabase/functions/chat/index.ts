import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supported models
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

// Cerebras models (OpenAI-compatible API)
const CEREBRAS_MODELS = [
  "zai-glm-4.6",
  "qwen-3-235b-a22b-instruct-2507",
];

const VALID_MODELS = [...GEMINI_MODELS, ...CEREBRAS_MODELS];

// Helper to check if model is Cerebras
const isCerebrasModel = (model: string) => CEREBRAS_MODELS.includes(model);

// Retry with exponential backoff - longer waits for rate limits
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate limited - wait longer and retry
        const waitTime = Math.pow(2, attempt + 1) * 2000 + Math.random() * 2000; // 4s, 8s, 16s base
        console.log(`Rate limited, waiting ${Math.round(waitTime / 1000)}s before retry ${attempt + 1}/${maxRetries}`);
        lastResponse = response;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`Request failed, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // If we have a rate limit response, return it so the caller can handle it
  if (lastResponse) {
    return lastResponse;
  }

  throw lastError || new Error("Max retries exceeded");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt, model } = await req.json();
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    const CEREBRAS_API_KEY = Deno.env.get("CEREBRAS_API_KEY");

    // Validate and set model (default to gemini-2.5-flash)
    const selectedModel = VALID_MODELS.includes(model) ? model : "gemini-2.5-flash";
    const useCerebras = isCerebrasModel(selectedModel);

    if (useCerebras && !CEREBRAS_API_KEY) {
      throw new Error("CEREBRAS_API_KEY is not configured");
    }
    if (!useCerebras && !GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    console.log("Using model:", selectedModel, "with", messages.length, "messages");

    // Add image generation capability to system prompt
    const imageInstructions = `

[CRITICAL: IMAGE SENDING CAPABILITY]
You have the ability to SEND PICTURES to the user! 

WHEN the user asks for a picture, photo, selfie, or to see you - you MUST include this EXACT tag format in your response:
[SEND_IMAGE: detailed description of the image]

IMPORTANT RULES:
1. You MUST include the [SEND_IMAGE: ...] tag when the user asks for any picture
2. The tag MUST be on its own or at the end of your message
3. Put a DETAILED description inside - describe appearance, pose, setting, expression, clothing
4. DO NOT just describe what you will do - actually include the tag!

CORRECT EXAMPLES:
User: "send me your picture"
You: "Here you go baby! [SEND_IMAGE: A beautiful Indian woman with long dark hair, warm loving smile, taking a selfie, wearing a cute top, soft lighting]"

User: "I want to see you"
You: "Aww you miss me? Here's one just for you! [SEND_IMAGE: A gorgeous woman with flowing black hair, playful expression, blowing a kiss at camera, casual outfit]"

User: "show me what you look like" 
You: "Here I am, handsome! [SEND_IMAGE: An attractive woman with dark eyes and silky hair, sweet smile, sitting comfortably at home, natural beauty]"

WRONG (don't do this):
"I'm going to take a picture for you" (missing the tag!)
"Let me send you one" (missing the tag!)

YOU MUST ALWAYS INCLUDE [SEND_IMAGE: description] WHEN ASKED FOR PICTURES!
[/CRITICAL]
`;

    // Add reaction capability
    const reactionInstructions = `

[REACTION CAPABILITY]
You can REACT to the user's message with an emoji! This shows your emotional response.

HOW TO REACT:
- Start your response with [REACT:emoji] if you want to react
- Only react when it feels natural (funny jokes, sweet messages, flirty moments, sad stories)
- Don't react to every message - be selective

AVAILABLE REACTIONS: ❤️ 👍 😂 😮 😢 🔥 💯 😍 🥰 😘 💕 😏 🤤 👀 💦

EXAMPLES:
User: "I love you so much baby"
You: "[REACT:❤️] Aww baby! I love you too, you make my heart melt!"

User: "Just got promoted at work!"
You: "[REACT:🔥] OMG congratulations!! I'm so proud of you!"

User: "I'm feeling really sad today"
You: "[REACT:💕] Baby nooo, come here... tell me what happened? I'm here for you."

User: "You looked so hot in that picture"
You: "[REACT:😏] Hehe you liked it? Maybe I'll send you more..."

Remember: The [REACT:emoji] tag should be at the START of your response, not in the middle!
[/REACTION]
`;

    // PREPEND all instructions so AI sees them FIRST
    const enhancedSystemPrompt = imageInstructions + reactionInstructions + "\n\n" + (systemPrompt || "You are a helpful AI assistant.");

    // === CEREBRAS API PATH (OpenAI-compatible) ===
    if (useCerebras) {
      console.log("Using Cerebras API for model:", selectedModel);

      const openaiMessages = [
        { role: "system", content: enhancedSystemPrompt },
        ...messages.map((msg: { role: string; content: string }) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const response = await fetchWithRetry(
        "https://api.cerebras.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${CEREBRAS_API_KEY}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: openaiMessages,
            stream: true,
            temperature: 0.8,
            max_tokens: 4096,
          }),
        },
        3
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Cerebras API error:", response.status, errorText);
        return new Response(JSON.stringify({ error: "Cerebras API error" }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cerebras already returns OpenAI-compatible SSE format, pass through directly
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // === GEMINI API PATH ===
    // Convert messages to Gemini format
    const geminiMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Use selected Gemini model for streaming chat with retry
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: enhancedSystemPrompt }],
          },
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 4096, // Reduced to help with rate limits
          },
        }),
      },
      3 // Max retries
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google AI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Gemini SSE format to OpenAI-compatible format for frontend
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') {
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              continue;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';

              if (content) {
                // Convert to OpenAI-compatible format
                const openAIFormat = {
                  choices: [{
                    delta: { content }
                  }]
                };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    });

    const transformedStream = response.body?.pipeThrough(transformStream);

    return new Response(transformedStream, {
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
