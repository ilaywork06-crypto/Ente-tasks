import { useSyncExternalStore } from "react";

/** Small per-device preferences, kept in localStorage. */
export interface Prefs {
    showCompleted: boolean;
    confirmTrash: boolean;
}

const defaults: Prefs = { showCompleted: true, confirmTrash: false };
const KEY = "prefs";
const listeners = new Set<() => void>();

let current: Prefs = (() => {
    try {
        return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>) };
    } catch {
        return defaults;
    }
})();

export const setPref = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    current = { ...current, [key]: value };
    try {
        localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
        /* ignore */
    }
    listeners.forEach((l) => l());
};

export const usePrefs = () =>
    useSyncExternalStore(
        (l) => {
            listeners.add(l);
            return () => listeners.delete(l);
        },
        () => current,
    );
