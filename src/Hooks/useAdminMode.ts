import { useState } from "react";

const ADMIN_KEY = "app_admin_unlocked";

const _dt = (encoded: string): string => {
    const k = "myrecipes";
    const raw = atob(encoded);
    let out = "";
    for (let i = 0; i < raw.length; i++)
        out += String.fromCharCode(raw.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    return out;
};

const ADMIN_PIN = _dt(process.env.REACT_APP_ADMIN_PIN || "");

export const isAdminUnlocked = (): boolean => {
    return localStorage.getItem(ADMIN_KEY) === "1";
};

export interface UseAdminModeResult {
    isAdmin: boolean;
    tryUnlock: (pin: string) => boolean;
    lock: () => void;
}

export const useAdminMode = (): UseAdminModeResult => {
    const [isAdmin, setIsAdmin] = useState<boolean>(isAdminUnlocked);

    const tryUnlock = (pin: string): boolean => {
        if (pin === ADMIN_PIN) {
            localStorage.setItem(ADMIN_KEY, "1");
            setIsAdmin(true);
            return true;
        }
        return false;
    };

    const lock = () => {
        localStorage.removeItem(ADMIN_KEY);
        setIsAdmin(false);
    };

    return { isAdmin, tryUnlock, lock };
};
