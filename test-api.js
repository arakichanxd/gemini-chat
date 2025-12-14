// Test script to check Google AI API key status
// Run: node test-api.js

const API_KEY = "AIzaSyCDkrjc_O1-1gdmuXPTWi34ZmUBaGJIw6I";

async function testAPI() {
    console.log("Testing Google AI API...\n");

    const models = [
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
        "gemini-2.5-flash",
    ];

    for (const model of models) {
        console.log(`Testing ${model}...`);

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "Say hello in one word" }] }],
                        generationConfig: { maxOutputTokens: 10 }
                    }),
                }
            );

            const status = response.status;
            const data = await response.json();

            if (status === 200) {
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                console.log(`  ✅ SUCCESS (${status}): "${text.trim()}"`);
            } else if (status === 429) {
                console.log(`  ❌ RATE LIMITED (${status})`);
                console.log(`     Message: ${data.error?.message || "Unknown"}`);
            } else {
                console.log(`  ❌ ERROR (${status}): ${data.error?.message || JSON.stringify(data)}`);
            }
        } catch (error) {
            console.log(`  ❌ FETCH ERROR: ${error.message}`);
        }

        console.log("");
    }

    console.log("Done!");
}

testAPI();
