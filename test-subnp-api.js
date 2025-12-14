// Test script to check available models from SubNP free image API
// Run with: node test-subnp-api.js

async function testSubNPApi() {
    console.log("Testing SubNP Free Image Generation API...\n");

    const BASE_URL = "https://subnp.com";

    // 1. Get available models
    console.log("1. Fetching available models...");
    try {
        const modelsResponse = await fetch(`${BASE_URL}/api/free/models`);
        const modelsData = await modelsResponse.json();
        console.log("Available Models:", JSON.stringify(modelsData, null, 2));
    } catch (error) {
        console.error("Error fetching models:", error.message);
    }

    console.log("\n");

    // 2. Get API stats
    console.log("2. Fetching API statistics...");
    try {
        const statsResponse = await fetch(`${BASE_URL}/api/free/stats`);
        const statsData = await statsResponse.json();
        console.log("API Stats:", JSON.stringify(statsData, null, 2));
    } catch (error) {
        console.error("Error fetching stats:", error.message);
    }

    console.log("\n");

    // 3. Test image generation with turbo model
    console.log("3. Testing image generation with 'turbo' model...");
    try {
        const generateResponse = await fetch(`${BASE_URL}/api/free/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: "A beautiful sunset over mountains",
                model: "turbo"
            })
        });

        // Read SSE stream
        const reader = generateResponse.body.getReader();
        const decoder = new TextDecoder();

        let result = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            console.log("Stream chunk:", chunk);
            result += chunk;

            // Parse SSE data lines
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
            for (const line of lines) {
                try {
                    const data = JSON.parse(line.slice(6));
                    console.log("Parsed:", data);

                    if (data.status === 'complete' && data.imageUrl) {
                        console.log("\n✅ Image generated successfully!");
                        console.log("Image URL:", data.imageUrl);
                    }
                } catch (e) {
                    // Not valid JSON, skip
                }
            }
        }
    } catch (error) {
        console.error("Error generating image:", error.message);
    }
}

testSubNPApi();
