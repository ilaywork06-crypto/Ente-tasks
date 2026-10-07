import type { KeyAttributes } from "./crypto";

export class APIError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message);
    }
}

let authToken: string | undefined;
let onUnauthorized: (() => void) | undefined;

export const setAuthToken = (token: string | undefined) => {
    authToken = token;
};

export const setUnauthorizedHandler = (handler: () => void) => {
    onUnauthorized = handler;
};

export const request = async <T = void>(
    method: string,
    path: string,
    body?: unknown,
): Promise<T> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (authToken) headers["X-Auth-Token"] = authToken;
    const res = await fetch(`/api${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
        let message = res.statusText;
        try {
            const data = (await res.json()) as { detail?: unknown };
            if (typeof data.detail == "string") message = data.detail;
            else if (Array.isArray(data.detail)) message = "Invalid input";
        } catch {
            /* not JSON */
        }
        if (res.status == 401 && authToken) onUnauthorized?.();
        throw new APIError(res.status, message);
    }
    if (res.status == 204) return undefined as T;
    return (await res.json()) as T;
};

// --- Types --------------------------------------------------------------

export interface KeyDerivationParams {
    kekSalt: string;
    opsLimit: number;
    memLimit: number;
}

export interface AuthResponse {
    token?: string;
    keyAttributes?: KeyAttributes;
    twoFactorSessionId?: string;
}

export interface NewPasswordAttributes extends KeyDerivationParams {
    encryptedKey: string;
    keyDecryptionNonce: string;
    loginKey: string;
}

export interface UserDetails {
    id: number;
    email: string;
    createdAt: string;
    twoFactorEnabled: boolean;
}

export interface SessionInfo {
    id: number;
    userAgent: string;
    ip: string;
    createdAt: string;
    lastUsedAt: string;
    isCurrent: boolean;
}

export interface RemoteList {
    id: number;
    encryptedKey: string;
    keyDecryptionNonce: string;
    encryptedData: string;
    dataDecryptionNonce: string;
    createdAt: string;
    updatedAt: string;
}

export interface RemoteTask {
    id: number;
    listId: number;
    encryptedData: string;
    decryptionNonce: string;
    isTrashed: boolean;
    trashedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

// --- Endpoints ----------------------------------------------------------

export const api = {
    keyDerivationParams: (email: string) =>
        request<KeyDerivationParams>("POST", "/auth/params", { email }),
    signup: (body: {
        email: string;
        keyAttributes: KeyAttributes;
        loginKey: string;
        recoveryAuthKey: string;
    }) => request<AuthResponse>("POST", "/auth/signup", body),
    login: (email: string, loginKey: string) =>
        request<AuthResponse>("POST", "/auth/login", { email, loginKey }),
    verifyTwoFactor: (twoFactorSessionId: string, code: string) =>
        request<AuthResponse>("POST", "/auth/two-factor/verify", {
            twoFactorSessionId,
            code,
        }),
    recoveryParams: (email: string) =>
        request<{
            masterKeyEncryptedWithRecoveryKey: string;
            masterKeyDecryptionNonce: string;
        }>("POST", "/auth/recover/params", { email }),
    recover: (
        email: string,
        recoveryAuthKey: string,
        newPassword: NewPasswordAttributes,
    ) =>
        request<AuthResponse>("POST", "/auth/recover", {
            email,
            recoveryAuthKey,
            newPassword,
        }),

    me: () => request<UserDetails>("GET", "/users/me"),
    changePassword: (
        currentLoginKey: string,
        newPassword: NewPasswordAttributes,
    ) =>
        request("POST", "/users/me/password", { currentLoginKey, newPassword }),
    deleteAccount: (loginKey: string) =>
        request("DELETE", "/users/me", { loginKey }),
    logout: () => request("POST", "/users/me/logout"),
    sessions: () => request<SessionInfo[]>("GET", "/users/me/sessions"),
    revokeSession: (id: number) =>
        request("DELETE", `/users/me/sessions/${id}`),
    setupTwoFactor: () =>
        request<{ secret: string; uri: string }>(
            "POST",
            "/users/me/two-factor/setup",
        ),
    enableTwoFactor: (code: string) =>
        request<UserDetails>("POST", "/users/me/two-factor/enable", { code }),
    disableTwoFactor: (code: string) =>
        request<UserDetails>("POST", "/users/me/two-factor/disable", { code }),

    lists: () => request<RemoteList[]>("GET", "/lists"),
    createList: (
        body: Omit<RemoteList, "id" | "createdAt" | "updatedAt">,
    ) => request<RemoteList>("POST", "/lists", body),
    updateList: (
        id: number,
        body: Pick<RemoteList, "encryptedData" | "dataDecryptionNonce">,
    ) => request<RemoteList>("PUT", `/lists/${id}`, body),
    deleteList: (id: number) => request("DELETE", `/lists/${id}`),

    tasks: () => request<RemoteTask[]>("GET", "/tasks"),
    createTask: (
        body: Pick<RemoteTask, "listId" | "encryptedData" | "decryptionNonce">,
    ) => request<RemoteTask>("POST", "/tasks", body),
    updateTask: (
        id: number,
        body: Pick<RemoteTask, "listId" | "encryptedData" | "decryptionNonce">,
    ) => request<RemoteTask>("PUT", `/tasks/${id}`, body),
    trashTask: (id: number) => request<RemoteTask>("POST", `/tasks/${id}/trash`),
    restoreTask: (id: number) =>
        request<RemoteTask>("POST", `/tasks/${id}/restore`),
    deleteTask: (id: number) => request("DELETE", `/tasks/${id}`),
    emptyTrash: () => request("POST", "/trash/empty"),
};
