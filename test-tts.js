// Test TTS and check audio format (CommonJS version)
const API_KEY = "AIzaSyCDkrjc_O1-1gdmuXPTWi34ZmUBaGJIw6I";

async function testTTS() {
    console.log("Testing Gemini TTS API...\n");

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }],
                generationConfig: {
                    response_modalities: ["AUDIO"],
                    speech_config: {
                        voice_config: {
                            prebuilt_voice_config: { voice_name: "Kore" }
                        }
                    }
                }
            }),
        }
    );

    console.log("Status:", response.status);
    const data = await response.json();

    if (response.ok) {
        const part = data.candidates?.[0]?.content?.parts?.[0];
        console.log("MIME Type:", part?.inlineData?.mimeType);
        const audioData = part?.inlineData?.data;

        if (audioData) {
            console.log("Audio data length:", audioData.length, "chars");
        }
    } else {
        console.log("Error:", JSON.stringify(data, null, 2));
    }
}

testTTS();
