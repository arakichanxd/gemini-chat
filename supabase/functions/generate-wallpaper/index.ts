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
        const { prompt, model } = await req.json();

        if (!prompt) {
            throw new Error("Prompt is required");
        }

        const selectedModel = model || "turbo";
        console.log("Generating wallpaper with model:", selectedModel, "prompt:", prompt.slice(0, 50));

        // Try SubNP API first
        let imageUrl = "";
        let subNpError = "";

        try {
            const response = await fetch("https://subnp.com/api/free/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, model: selectedModel })
            });

            if (response.ok) {
                const reader = response.body?.getReader();
                if (reader) {
                    const decoder = new TextDecoder();
                    let fullResponse = "";

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        fullResponse += decoder.decode(value, { stream: true });

                        const lines = fullResponse.split('\n').filter(line => line.startsWith('data: '));
                        for (const line of lines) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.status === 'complete' && data.imageUrl) {
                                    imageUrl = data.imageUrl;
                                } else if (data.status === 'error') {
                                    subNpError = data.message || "SubNP error";
                                }
                            } catch (e) {
                                // Not valid JSON, continue
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("SubNP API error:", e);
            subNpError = e instanceof Error ? e.message : "SubNP failed";
        }

        // If SubNP succeeded, return the image URL
        if (imageUrl) {
            console.log("SubNP succeeded:", imageUrl);
            return new Response(
                JSON.stringify({ imageUrl, success: true, source: "subnp" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Fallback to Gemini image generation
        console.log("SubNP failed, trying Gemini fallback. Error:", subNpError);

        const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
        if (!GOOGLE_AI_API_KEY) {
            return new Response(
                JSON.stringify({ error: "SubNP failed and no Gemini API key for fallback", subNpError }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: `Generate a beautiful wallpaper image: ${prompt}` }] }],
                    generationConfig: {
                        responseModalities: ["IMAGE", "TEXT"],
                    }
                })
            }
        );

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error("Gemini fallback error:", errorText);
            return new Response(
                JSON.stringify({ error: "Both SubNP and Gemini failed", subNpError, geminiError: errorText }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const geminiResult = await geminiResponse.json();
        const parts = geminiResult.candidates?.[0]?.content?.parts || [];

        for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith("image/")) {
                console.log("Gemini generated image successfully");
                return new Response(
                    JSON.stringify({
                        imageContent: part.inlineData.data,
                        mimeType: part.inlineData.mimeType,
                        success: true,
                        source: "gemini"
                    }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        return new Response(
            JSON.stringify({ error: "No image generated", subNpError }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: unknown) {
        console.error("Generate wallpaper error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
