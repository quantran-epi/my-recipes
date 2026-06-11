// Tracks cooking sessions whose timer is currently shown on-screen (the cooking widget is mounted
// and visible). The app-root notifier (CookingTimerNotifier) consults this to decide who owns the
// overtime alert: while the cooking screen is mounted it plays the loud in-app ring, so the notifier
// stays silent to avoid a duplicate; once the user navigates away the widget unregisters and the
// notifier takes over with a system Notification. Module-level state on purpose — it must be shared
// across two independently-mounted React trees without going through Redux (this is ephemeral UI
// coordination, not persisted app state).
const onScreenSessions = new Set<string>();

export const markCookingSessionOnScreen = (sessionId: string): void => {
    onScreenSessions.add(sessionId);
};

export const unmarkCookingSessionOnScreen = (sessionId: string): void => {
    onScreenSessions.delete(sessionId);
};

export const isCookingSessionOnScreen = (sessionId: string): boolean => {
    return onScreenSessions.has(sessionId);
};

// Best-effort Notification permission request. Must be triggered from a user gesture (the start-cook
// tap) — browsers reject permission prompts that aren't tied to one. Swallows everything: notifications
// are a progressive enhancement, never required for the timer to work.
export const requestCookingNotificationPermission = (): void => {
    try {
        if (typeof Notification === "undefined") return;
        if (Notification.permission === "default") {
            Notification.requestPermission().catch(() => { /* ignore */ });
        }
    } catch {
        /* Notification API unavailable */
    }
};
