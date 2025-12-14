// This file generates placeholder sound data URLs for notification sounds
// In production, these would be actual audio files

export const NOTIFICATION_SOUNDS: Record<string, string> = {
    default: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQ==",
    chime: "data:audio/wav;base64,UklGRoYHAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YWIHAAABAgMEBQYHCAkKCwwNDg==",
    pop: "data:audio/wav;base64,UklGRpQGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXAGAACAgICAgICAgICAgICAgIA=",
    ding: "data:audio/wav;base64,UklGRoYHAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YWIHAACBhYqOkZWam56ipquusbiw",
    none: "",
};

export const playNotificationSound = (soundName: string) => {
    if (soundName === "none" || !NOTIFICATION_SOUNDS[soundName]) return;

    try {
        const audio = new Audio(NOTIFICATION_SOUNDS[soundName]);
        audio.volume = 0.5;
        audio.play().catch(() => {
            // Ignore autoplay errors
        });
    } catch (e) {
        console.error("Failed to play notification sound:", e);
    }
};
