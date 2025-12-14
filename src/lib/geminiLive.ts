/**
 * Gemini Live Session Manager
 * Real-time bidirectional audio streaming with Gemini AI
 */

import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { encodeBase64, float32ToPcm16, decodeAudioData } from "./audioUtils";

const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY || '';

interface MessageContext {
    role: string;
    content: string;
}

export class GeminiLiveSession {
    private client: GoogleGenAI | null = null;
    private audioContext: AudioContext | null = null;
    private inputSource: MediaStreamAudioSourceNode | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private stream: MediaStream | null = null;
    private nextStartTime: number = 0;
    private session: Promise<any> | null = null;
    private isConnected: boolean = false;
    private inputAudioContext: AudioContext | null = null;

    constructor() {
        if (API_KEY) {
            this.client = new GoogleGenAI({ apiKey: API_KEY });
        }
    }

    async start(
        systemInstruction: string,
        history: MessageContext[],
        voiceName: string = 'Kore',
        onClose?: () => void,
        onError?: (err: any) => void
    ) {
        await this.stop();

        if (!API_KEY) {
            onError?.(new Error("VITE_GOOGLE_AI_API_KEY is not configured"));
            return;
        }

        this.client = new GoogleGenAI({ apiKey: API_KEY });

        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            await this.audioContext.resume();
            this.nextStartTime = this.audioContext.currentTime;

            // Build context from recent messages
            const contextString = history.slice(-10).map(m =>
                `${m.role === 'user' ? 'User' : 'Character'}: ${m.content}`
            ).join("\n");

            const fullInstruction = `${systemInstruction}

[Recent Chat Context]
${contextString}

[Call Instructions]
You are now in a voice call. Respond naturally as if speaking. Keep responses concise and conversational. Start by greeting the user warmly.`;

            // Get microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

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
                        console.log("Gemini Live: Connected");
                        this.isConnected = true;
                        this.startAudioInput(sessionPromise);
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
                        console.log("Gemini Live: Closed");
                        this.isConnected = false;
                        onClose?.();
                    },
                    onerror: (err) => {
                        console.error("Gemini Live: Error", err);
                        this.isConnected = false;
                        onError?.(err);
                    }
                }
            });

            this.session = sessionPromise;
            await sessionPromise.catch(e => { throw e; });

        } catch (err) {
            console.error("Failed to start Gemini Live session:", err);
            await this.stop();
            onError?.(err);
        }
    }

    private startAudioInput(sessionPromise: Promise<any>) {
        if (!this.stream) return;

        this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
        this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

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
        this.scriptProcessor.connect(this.inputAudioContext.destination);
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

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.scriptProcessor) {
            try { this.scriptProcessor.disconnect(); } catch (e) { }
            this.scriptProcessor = null;
        }
        if (this.inputSource) {
            try { this.inputSource.disconnect(); } catch (e) { }
            this.inputSource = null;
        }
        if (this.inputAudioContext) {
            try { await this.inputAudioContext.close(); } catch (e) { }
            this.inputAudioContext = null;
        }
        if (this.audioContext) {
            try { await this.audioContext.close(); } catch (e) { }
            this.audioContext = null;
        }
        this.session = null;
    }

    get connected(): boolean {
        return this.isConnected;
    }
}

// Singleton instance
export const geminiLive = new GeminiLiveSession();
