/**
 * Audio utilities for Gemini Live API
 */

/**
 * Decodes a base64 string into a Uint8Array.
 */
function decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Encodes a Uint8Array to base64 string.
 */
export function encodeBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Converts Float32Array (Web Audio API) to PCM Int16Array (Gemini API)
 */
export function float32ToPcm16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
}

/**
 * Decodes raw PCM data into an AudioBuffer.
 * Gemini typically returns PCM 24kHz.
 */
export async function decodeAudioData(
    base64Data: string,
    ctx: AudioContext,
    sampleRate: number = 24000
): Promise<AudioBuffer> {
    const bytes = decodeBase64(base64Data);

    // Convert Uint8Array bytes to Int16 PCM samples
    const dataInt16 = new Int16Array(bytes.buffer);

    // Create AudioBuffer (1 channel - Mono)
    const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Normalize Int16 to Float32 (-1.0 to 1.0)
    for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }

    return buffer;
}
