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
        const { prompt, model, referenceImageUrl } = await req.json();

        if (!prompt) {
            throw new Error("Prompt is required");
        }

        const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
        if (!GOOGLE_AI_API_KEY) {
            throw new Error("GOOGLE_AI_API_KEY is not configured");
        }

        const selectedModel = model || "gemini-2.5-flash-image";
        console.log("Generating image with model:", selectedModel, "prompt:", prompt.slice(0, 50));

        // Check if it's an Imagen model (uses different API)
        const isImagenModel = selectedModel.startsWith("imagen-");

        if (isImagenModel) {
            // Use Imagen API
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:predict?key=${GOOGLE_AI_API_KEY}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        instances: [{ prompt }],
                        parameters: {
                            sampleCount: 1,
                            aspectRatio: "1:1",
                            personGeneration: "ALLOW_ALL",
                        },
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Imagen error:", response.status, errorText);
                try {
                    const errorJson = JSON.parse(errorText);
                    return new Response(
                        JSON.stringify({ error: "Image generation failed", details: errorJson?.error?.message || errorText }),
                        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                } catch {
                    return new Response(
                        JSON.stringify({ error: "Image generation failed", details: errorText }),
                        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }
            }

            const result = await response.json();
            const predictions = result.predictions || [];

            if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
                return new Response(
                    JSON.stringify({
                        imageContent: predictions[0].bytesBase64Encoded,
                        mimeType: "image/jpeg",
                        dataUrl: `data:image/jpeg;base64,${predictions[0].bytesBase64Encoded}`
                    }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({ error: "No image generated from Imagen" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Use Gemini image generation API (for gemini-2.5-flash-image, gemini-3-pro-image-preview)
        const parts: any[] = [];

        // If reference image provided, include it for style/subject consistency
        if (referenceImageUrl) {
            let base64Data = "";
            let mimeType = "image/jpeg";

            if (referenceImageUrl.startsWith("data:")) {
                base64Data = referenceImageUrl.split(",")[1];
                mimeType = referenceImageUrl.substring(5, referenceImageUrl.indexOf(";"));
            } else {
                try {
                    const imageResponse = await fetch(referenceImageUrl);
                    const imageBuffer = await imageResponse.arrayBuffer();
                    const uint8Array = new Uint8Array(imageBuffer);
                    let binary = "";
                    for (let i = 0; i < uint8Array.length; i++) {
                        binary += String.fromCharCode(uint8Array[i]);
                    }
                    base64Data = btoa(binary);
                    mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
                } catch (e) {
                    console.error("Failed to fetch reference image:", e);
                }
            }

            if (base64Data) {
                parts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType,
                    },
                });
                parts.push({
                    text: `Generate a new image of this exact same person/character shown in the reference image, but with the following scene/pose/setting: ${prompt}. Keep the subject's appearance, face, hair, and features exactly the same as in the reference.`,
                });
            } else {
                parts.push({ text: prompt });
            }
        } else {
            parts.push({ text: prompt });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GOOGLE_AI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts
                    }],
                    generationConfig: {
                        responseModalities: ["IMAGE", "TEXT"],
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Image generation error:", response.status, errorText);
            try {
                const errorJson = JSON.parse(errorText);
                const errorMessage = errorJson?.error?.message || errorText;
                return new Response(
                    JSON.stringify({ error: "Image generation failed", details: errorMessage }),
                    { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            } catch {
                return new Response(
                    JSON.stringify({ error: "Image generation failed", details: errorText }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        const result = await response.json();

        // Find image in response
        const candidateParts = result.candidates?.[0]?.content?.parts || [];
        for (const part of candidateParts) {
            if (part.inlineData) {
                const imageBase64 = part.inlineData.data;
                const imageMimeType = part.inlineData.mimeType || "image/png";

                return new Response(
                    JSON.stringify({
                        imageContent: imageBase64,
                        mimeType: imageMimeType,
                        dataUrl: `data:${imageMimeType};base64,${imageBase64}`
                    }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // No image found
        const textResponse = candidateParts.find((p: any) => p.text)?.text || "";
        return new Response(
            JSON.stringify({ error: "No image generated", text: textResponse }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: unknown) {
        console.error("Generate image error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
