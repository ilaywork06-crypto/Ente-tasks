/**
 * Local session state.
 *
 * Like ente, the auth token and (encrypted) key attributes are kept in
 * localStorage, while the decrypted master key only lives in sessionStorage.
 * Opening the app in a new browser session therefore asks for the password
 * again to unlock the master key, without needing to sign in again.
 */
import { setAuthToken } from "./api";
import { fromB64, ready, toB64, type KeyAttributes } from "./crypto";

const USER_KEY = "user";
const MASTER_KEY = "masterKey";

export interface LocalUser {
    email: string;
    token: string;
    keyAttributes: KeyAttributes;
}

export const localUser = (): LocalUser | undefined => {
    try {
        const s = localStorage.getItem(USER_KEY);
        return s ? (JSON.parse(s) as LocalUser) : undefined;
    } catch {
        return undefined;
    }
};

export const saveLocalUser = (user: LocalUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setAuthToken(user.token);
};

export const saveMasterKey = async (key: Uint8Array) => {
    await ready();
    sessionStorage.setItem(MASTER_KEY, toB64(key));
};

export const masterKeyFromSession = async () => {
    const s = sessionStorage.getItem(MASTER_KEY);
    if (!s) return undefined;
    await ready();
    return fromB64(s);
};

export const clearSession = () => {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(MASTER_KEY);
    setAuthToken(undefined);
};

// Restore the token on load.
setAuthToken(localUser()?.token);
