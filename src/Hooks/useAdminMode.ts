import { useEffect, useState } from "react";
import { getStorageString, removeStorageItem, setStorageString } from "@common/Storage/AppStorage";

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

export const isAdminUnlocked = async (): Promise<boolean> => {
    return (await getStorageString(ADMIN_KEY)) === "1";
};

export interface UseAdminModeResult {
    isAdmin: boolean;
    tryUnlock: (pin: string) => Promise<boolean>;
    lock: () => Promise<void>;
}

export const useAdminMode = (): UseAdminModeResult => {
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    useEffect(() => {
        let cancelled = false;
        isAdminUnlocked().then(value => {
            if (!cancelled) setIsAdmin(value);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const tryUnlock = async (pin: string): Promise<boolean> => {
        if (pin === ADMIN_PIN) {
            await setStorageString(ADMIN_KEY, "1");
            setIsAdmin(true);
            return true;
        }
        return false;
    };

    const lock = async () => {
        await removeStorageItem(ADMIN_KEY);
        setIsAdmin(false);
    };

    return { isAdmin, tryUnlock, lock };
};
