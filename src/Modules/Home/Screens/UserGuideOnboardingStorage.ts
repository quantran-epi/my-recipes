export const USER_GUIDE_WELCOME_STORAGE_KEY = 'my-recipes-welcome-complete-v1';

export const isUserGuideWelcomeComplete = (): boolean => {
    if (typeof window === 'undefined') return true;
    try {
        return window.localStorage.getItem(USER_GUIDE_WELCOME_STORAGE_KEY) === '1';
    } catch {
        return true;
    }
};

export const markUserGuideWelcomeComplete = () => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(USER_GUIDE_WELCOME_STORAGE_KEY, '1');
    } catch {
        // The app still works if localStorage is unavailable; the welcome flow just cannot persist completion.
    }
};
