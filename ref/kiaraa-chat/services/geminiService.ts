
import { GoogleGenAI, Modality, Type, FunctionDeclaration, LiveServerMessage } from "@google/genai";
import { Message, Sender, MessageType } from "../types";
import { decodeAudioData, audioBufferToWavBlob, float32ToPcm16, encodeBase64 } from "../utils/audioUtils";

const API_KEY = process.env.API_KEY || '';

const getClient = () => {
  if (!API_KEY) {
    console.error("API_KEY is missing!");
    throw new Error("API Key is missing. Please check your configuration.");
  }
  return new GoogleGenAI({ apiKey: API_KEY });
};

// --- Tool Definitions ---

const sendPhotoTool: FunctionDeclaration = {
  name: "send_photo",
  description: "Generates and sends a photo/selfie. CRITICAL: Trigger this whenever the user asks for a picture, EVEN IF the previous message was a voice note. Phrases: 'apni picture send kro', 'photo bhejo', 'send me a picture', 'show me yourself', 'pic send kro'. Do NOT send text explaining you are sending a photo, just call the tool.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      description: { 
        type: Type.STRING, 
        description: "A detailed visual description of the photo to generate." 
      }
    },
    required: ["description"]
  }
};

const sendVoiceNoteTool: FunctionDeclaration = {
  name: "send_voice_note",
  description: "Sends a voice message/note. Trigger this when the user says: 'voice note send kro', 'voice message bhejo', 'send me a voice note', 'apni awaz sunao', or 'audio message'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      message_text: { 
        type: Type.STRING, 
        description: "The text content that will be spoken in the voice note." 
      }
    },
    required: ["message_text"]
  }
};

const startCallTool: FunctionDeclaration = {
    name: "start_call",
    description: "Initiates a call. Trigger this when the user says: 'call me', 'audio call kro', 'call lagao' (for Audio) OR 'videocall kr', 'video call me', 'video call kro' (for Video).",
    parameters: {
        type: Type.OBJECT,
        properties: {
            reason: { type: Type.STRING, description: "Reason for the call" },
            isVideo: { type: Type.BOOLEAN, description: "Set to true if the user said 'videocall' or 'video call', false otherwise." }
        }
    }
};

// --- API Service Methods ---

export interface ChatResponse {
    type: MessageType;
    content: string; // Text content or URL
    textDisplay?: string | null; // Optional text to display alongside media. If null, display nothing.
}

export const generateChatResponse = async (
  history: Message[],
  systemPrompt: string,
  voiceName: string = 'Kore',
  referenceImageUrl?: string
): Promise<ChatResponse> => {
  try {
    const client = getClient();
    
    // Check if the latest message from user is AUDIO to force audio response
    const lastMessage = history[history.length - 1];
    const userSentAudio = lastMessage.sender === Sender.USER && lastMessage.type === MessageType.AUDIO;

    // Convert history - Increased context window to 50
    const relevantHistory = history.slice(-50).map(msg => {
       const parts: any[] = [];
       
       // Handle User Images
       if (msg.sender === Sender.USER && msg.type === MessageType.IMAGE && msg.imageUrl) {
           const base64Data = msg.imageUrl.split(',')[1];
           const mimeType = msg.imageUrl.substring(5, msg.imageUrl.indexOf(';'));
           if (base64Data && mimeType) {
               parts.push({
                   inlineData: {
                       data: base64Data,
                       mimeType: mimeType
                   }
               });
           }
       }

       // Handle User Audio
       if (msg.sender === Sender.USER && msg.type === MessageType.AUDIO && msg.audioData) {
           parts.push({
               inlineData: {
                   data: msg.audioData,
                   mimeType: 'audio/wav' // Assuming wav/webm from browser
               }
           });
       }

       // Handle Text
       let textContent = "";
       if (msg.type === MessageType.TEXT) textContent = msg.text || "";
       
       // For Audio messages in history without data (legacy/cleared), use placeholder
       if (msg.type === MessageType.AUDIO && !msg.audioData && msg.sender === Sender.USER) textContent = "[Audio Message sent by user]";
       
       if (msg.type === MessageType.IMAGE && msg.sender === Sender.AI) textContent = "[Image sent]"; 
       
       if (msg.text && msg.type === MessageType.IMAGE) {
           textContent = msg.text; 
       }

       if (textContent) {
           parts.push({ text: textContent });
       }
       
       return {
            role: msg.sender === Sender.USER ? 'user' : 'model',
            parts: parts
       };
    });

    // If user sent audio, we force the AI to reply with a voice note
    let effectiveSystemPrompt = systemPrompt;
    if (userSentAudio) {
        effectiveSystemPrompt += "\n\n[SYSTEM INSTRUCTION]: The user just sent a VOICE NOTE (Audio). You MUST reply with a VOICE NOTE using the 'send_voice_note' tool. Do not send text. HOWEVER, if the user explicitly asks for a picture in their voice note, you MUST use the 'send_photo' tool instead.";
    }

    const result = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: relevantHistory,
        config: {
            systemInstruction: effectiveSystemPrompt,
            tools: [{ functionDeclarations: [sendPhotoTool, sendVoiceNoteTool, startCallTool] }]
        }
    });

    const candidate = result.candidates?.[0];
    
    // Check for Tool Calls
    const functionCalls = candidate?.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall);

    if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0]; 
        
        if (call?.name === 'send_photo') {
            const args = call.args as any;
            const imageUrl = await generateImage(args.description, referenceImageUrl);
            if (imageUrl) {
                return { type: MessageType.IMAGE, content: imageUrl, textDisplay: null };
            }
        } else if (call?.name === 'send_voice_note') {
            const args = call.args as any;
            const audioUrl = await generateVoiceNote(args.message_text, voiceName);
            if (audioUrl) {
                return { type: MessageType.AUDIO, content: audioUrl, textDisplay: null };
            }
        } else if (call?.name === 'start_call') {
            const args = call.args as any;
            return { 
                type: MessageType.SYSTEM, 
                content: args.isVideo ? 'INCOMING_VIDEO_CALL' : 'INCOMING_CALL' 
            };
        }
    }

    // Default Text Response
    return { type: MessageType.TEXT, content: candidate?.content?.parts?.[0]?.text || "..." };

  } catch (error) {
    console.error("Error generating chat response:", error);
    return { type: MessageType.TEXT, content: "Sorry, I'm having trouble connecting right now." };
  }
};

export const generateVoiceNote = async (text: string, voiceName: string = 'Kore'): Promise<string | null> => {
  try {
    const client = getClient();
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await decodeAudioData(base64Audio, audioContext);
    return audioBufferToWavBlob(audioBuffer);

  } catch (error) {
    console.error("Error generating voice note:", error);
    return null;
  }
};

export const generateImage = async (prompt: string, referenceImageUrl?: string): Promise<string | null> => {
  try {
    const client = getClient();
    const parts: any[] = [{ text: prompt }];

    // If a reference image is provided, pass it to the model to guide generation (Image Variation/Context)
    if (referenceImageUrl) {
        const base64Data = referenceImageUrl.split(',')[1];
        const mimeType = referenceImageUrl.substring(5, referenceImageUrl.indexOf(';'));
        if (base64Data && mimeType) {
            parts.unshift({
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            });
            parts[parts.length - 1].text = `Generate a new image based on this person, but with the following details: ${prompt}`;
        }
    }

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts,
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};

export const generateWallpaper = async (prompt: string): Promise<string | null> => {
    return generateImage(`Abstract, artistic, whatsapp wallpaper style, subtle pattern: ${prompt}`);
};


// --- Live API Session Manager (Call Feature) ---

export class GeminiLiveSession {
    private client: GoogleGenAI;
    private audioContext: AudioContext | null = null;
    private inputSource: MediaStreamAudioSourceNode | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private stream: MediaStream | null = null;
    private videoInterval: any = null;
    private nextStartTime: number = 0;
    private session: Promise<any> | null = null;
    private isConnected: boolean = false;
    
    constructor() {
        this.client = getClient();
    }

    async start(
        systemInstruction: string, 
        history: Message[], 
        voiceName: string = 'Kore',
        isVideo: boolean = false, 
        onVideoStream?: (stream: MediaStream) => void,
        onClose?: () => void,
        onError?: (err: any) => void
    ) {
        await this.stop();
        this.client = getClient(); 

        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            await this.audioContext.resume();
            
            this.nextStartTime = this.audioContext.currentTime;

            const contextString = history.slice(-3).map(m => 
                `${m.sender === Sender.USER ? 'User' : 'Kiaraa'}: ${m.text || (m.type === 'AUDIO' ? 'Voice Note' : 'Image')}`
            ).join("\n");

            // CRITICAL: Enforce vision capabilities and greeting in system instruction
            const videoContext = isVideo ? "CRITICAL: You are in a VIDEO call. You can SEE the user through their camera. React to what they show you visually. If they show an object, describe it or comment on it. If they show their face, compliment them." : "You are in a Voice call.";

            // STRICT Greeting Instruction
            const fullInstruction = `${systemInstruction}\n\n[Recent Chat Context]\n${contextString}\n\n[Instructions]\n${videoContext}\n\nCRITICAL RULE: As soon as the connection opens, you MUST IMMEDIATELY say "Hello babyyyyy" in an excited, flirty tone. Do not wait for the user. Just say it. Then wait for their response.`;

            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
            
            if (isVideo && onVideoStream && this.stream) {
                onVideoStream(this.stream);
            }

            const sessionPromise = this.client.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }
                    },
                    systemInstruction: fullInstruction,
                },
                callbacks: {
                    onopen: () => {
                        console.log("Live Session Connected");
                        this.isConnected = true;
                        this.startAudioInput(sessionPromise);
                        if (isVideo) {
                            this.startVideoStreaming(sessionPromise);
                        }
                        // The audio stream from startAudioInput (even background noise) plus the strict system instruction
                        // will trigger the "Hello babyyyyy" greeting immediately.
                    },
                    onmessage: async (message: LiveServerMessage) => {
                       const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                       if (audioData && this.audioContext) {
                           try {
                               const audioBuffer = await decodeAudioData(audioData, this.audioContext, 24000);
                               this.playAudio(audioBuffer);
                           } catch (e) {
                               console.error("Error decoding audio", e);
                           }
                       }
                    },
                    onclose: () => {
                        console.log("Live Session Closed");
                        this.isConnected = false;
                        if (onClose) onClose();
                    },
                    onerror: (err) => {
                        console.error("Live Session Error", err);
                        this.isConnected = false;
                        if (onError) onError(err);
                    }
                }
            });
            
            this.session = sessionPromise;
            
            await sessionPromise.catch(e => {
                throw e; 
            });

        } catch (err) {
            console.error("Failed to start session:", err);
            await this.stop();
            if (onError) onError(err);
        }
    }

    private startAudioInput(sessionPromise: Promise<any>) {
        if (!this.audioContext || !this.stream) return;
        
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        this.inputSource = inputCtx.createMediaStreamSource(this.stream);
        this.scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
        
        this.scriptProcessor.onaudioprocess = (e) => {
            if (!this.isConnected) return;
            
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = float32ToPcm16(inputData);
            const base64Data = encodeBase64(new Uint8Array(pcm16.buffer));
            
            sessionPromise.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64Data
                    }
                });
            });
        };

        this.inputSource.connect(this.scriptProcessor);
        this.scriptProcessor.connect(inputCtx.destination);
    }

    private startVideoStreaming(sessionPromise: Promise<any>) {
        if (!this.stream) return;
        
        const videoTrack = this.stream.getVideoTracks()[0];
        if (!videoTrack) return;

        const videoEl = document.createElement('video');
        videoEl.srcObject = this.stream;
        videoEl.muted = true;
        videoEl.play();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        this.videoInterval = setInterval(() => {
            if (!this.isConnected || !ctx || videoEl.readyState !== 4) return;
            
            const scale = 640 / videoEl.videoWidth;
            canvas.width = 640;
            canvas.height = videoEl.videoHeight * scale;
            
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            
            const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
            
            sessionPromise.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: 'image/jpeg',
                        data: base64Data
                    }
                });
            });

        }, 1000);
    }

    private playAudio(buffer: AudioBuffer) {
        if (!this.audioContext) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        
        const startTime = Math.max(this.audioContext.currentTime, this.nextStartTime);
        source.start(startTime);
        this.nextStartTime = startTime + buffer.duration;
    }

    async stop() {
        this.isConnected = false;
        
        if (this.videoInterval) {
            clearInterval(this.videoInterval);
            this.videoInterval = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.scriptProcessor) {
            try {
                this.scriptProcessor.disconnect();
            } catch (e) {}
            this.scriptProcessor = null;
        }
        if (this.inputSource) {
            try {
                this.inputSource.disconnect();
            } catch (e) {}
            this.inputSource = null;
        }
        if (this.audioContext) {
            try {
                await this.audioContext.close();
            } catch (e) {}
            this.audioContext = null;
        }
        this.session = null;
    }
}
