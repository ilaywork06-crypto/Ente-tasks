/**
 * End-to-end encryption, modelled on ente's scheme
 * (see ente/web/packages/base/crypto).
 *
 * - A random 256-bit master key is generated on signup.
 * - The password is stretched with Argon2id into a key-encryption-key (KEK),
 *   which encrypts the master key. Only the encrypted master key leaves the
 *   device.
 * - A "login key" is derived from the KEK with a KDF and sent to the server,
 *   so the server can authenticate us without ever seeing the password.
 * - A recovery key (shown as a 24-word mnemonic) also encrypts the master key.
 * - Each list gets its own random key, encrypted with the master key, and the
 *   list's tasks are encrypted with that list key.
 */
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import sodium from "libsodium-wrappers-sumo";

export const ready = async () => {
    await sodium.ready;
    return sodium;
};

export const toB64 = (b: Uint8Array) =>
    sodium.to_base64(b, sodium.base64_variants.ORIGINAL);

export const fromB64 = (s: string) =>
    sodium.from_base64(s, sodium.base64_variants.ORIGINAL);

export interface KeyAttributes {
    kekSalt: string;
    opsLimit: number;
    memLimit: number;
    encryptedKey: string;
    keyDecryptionNonce: string;
    masterKeyEncryptedWithRecoveryKey: string;
    masterKeyDecryptionNonce: string;
    recoveryKeyEncryptedWithMasterKey: string;
    recoveryKeyDecryptionNonce: string;
}

export interface EncryptedBox {
    encryptedData: string;
    nonce: string;
}

export const generateKey = async () => {
    await ready();
    return sodium.crypto_secretbox_keygen();
};

export const encryptBox = async (
    data: Uint8Array,
    key: Uint8Array,
): Promise<EncryptedBox> => {
    await ready();
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    return {
        encryptedData: toB64(sodium.crypto_secretbox_easy(data, nonce, key)),
        nonce: toB64(nonce),
    };
};

export const decryptBox = async (
    encryptedData: string,
    nonce: string,
    key: Uint8Array,
) => {
    await ready();
    return sodium.crypto_secretbox_open_easy(
        fromB64(encryptedData),
        fromB64(nonce),
        key,
    );
};

export const encryptJSON = async (value: unknown, key: Uint8Array) =>
    encryptBox(new TextEncoder().encode(JSON.stringify(value)), key);

export const decryptJSON = async <T>(
    encryptedData: string,
    nonce: string,
    key: Uint8Array,
): Promise<T> =>
    JSON.parse(
        new TextDecoder().decode(await decryptBox(encryptedData, nonce, key)),
    ) as T;

let worker: Worker | undefined;
let nextRequestID = 0;
const pending = new Map<
    number,
    { resolve: (k: Uint8Array) => void; reject: (e: Error) => void }
>();

const kdfWorker = () => {
    if (!worker) {
        worker = new Worker(new URL("./kdf.worker.ts", import.meta.url), {
            type: "module",
        });
        worker.onmessage = (
            e: MessageEvent<{ id: number; key?: Uint8Array; error?: string }>,
        ) => {
            const p = pending.get(e.data.id);
            pending.delete(e.data.id);
            if (e.data.key) p?.resolve(e.data.key);
            else p?.reject(new Error(e.data.error ?? "Key derivation failed"));
        };
    }
    return worker;
};

/** Argon2id, in a web worker. */
export const deriveKey = (
    password: string,
    salt: string,
    opsLimit: number,
    memLimit: number,
) =>
    new Promise<Uint8Array>((resolve, reject) => {
        const id = nextRequestID++;
        pending.set(id, { resolve, reject });
        kdfWorker().postMessage({ id, password, salt, opsLimit, memLimit });
    });

/**
 * Derive a KEK with the strongest parameters this device can handle.
 *
 * Like ente, start at libsodium's "moderate" limits and, if the device
 * can't allocate that much memory, halve memory and double the ops so the
 * total work stays the same.
 */
export const deriveInteractiveKEK = async (password: string) => {
    await ready();
    const salt = toB64(sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES));
    let opsLimit = sodium.crypto_pwhash_OPSLIMIT_MODERATE;
    let memLimit = sodium.crypto_pwhash_MEMLIMIT_MODERATE;
    while (memLimit >= sodium.crypto_pwhash_MEMLIMIT_MIN) {
        try {
            const key = await deriveKey(password, salt, opsLimit, memLimit);
            return { key, salt, opsLimit, memLimit };
        } catch {
            opsLimit *= 2;
            memLimit /= 2;
        }
    }
    throw new Error("This device cannot derive a secure key");
};

const deriveSubKey = async (key: Uint8Array, id: number, context: string) => {
    await ready();
    return toB64(sodium.crypto_kdf_derive_from_key(32, id, context, key));
};

/** The value sent to the server in place of the password. */
export const deriveLoginKey = (kek: Uint8Array) =>
    deriveSubKey(kek, 1, "loginctx");

/** Proof of possession of the recovery key, for account recovery. */
export const deriveRecoveryAuthKey = (recoveryKey: Uint8Array) =>
    deriveSubKey(recoveryKey, 2, "recovery");

export const recoveryKeyToMnemonic = (recoveryKey: Uint8Array) =>
    entropyToMnemonic(recoveryKey, wordlist);

export const mnemonicToRecoveryKey = (mnemonic: string) => {
    const normalized = mnemonic.trim().toLowerCase().split(/\s+/).join(" ");
    if (!validateMnemonic(normalized, wordlist))
        throw new Error("Invalid recovery key");
    return mnemonicToEntropy(normalized, wordlist);
};

/** Generate everything needed for a fresh account. */
export const generateKeyAttributes = async (password: string) => {
    const masterKey = await generateKey();
    const recoveryKey = await generateKey();
    const kek = await deriveInteractiveKEK(password);

    const encryptedMaster = await encryptBox(masterKey, kek.key);
    const masterWithRecovery = await encryptBox(masterKey, recoveryKey);
    const recoveryWithMaster = await encryptBox(recoveryKey, masterKey);

    const keyAttributes: KeyAttributes = {
        kekSalt: kek.salt,
        opsLimit: kek.opsLimit,
        memLimit: kek.memLimit,
        encryptedKey: encryptedMaster.encryptedData,
        keyDecryptionNonce: encryptedMaster.nonce,
        masterKeyEncryptedWithRecoveryKey: masterWithRecovery.encryptedData,
        masterKeyDecryptionNonce: masterWithRecovery.nonce,
        recoveryKeyEncryptedWithMasterKey: recoveryWithMaster.encryptedData,
        recoveryKeyDecryptionNonce: recoveryWithMaster.nonce,
    };
    return {
        masterKey,
        recoveryKey,
        keyAttributes,
        loginKey: await deriveLoginKey(kek.key),
        recoveryAuthKey: await deriveRecoveryAuthKey(recoveryKey),
    };
};

/** Re-wrap an existing master key under a new password. */
export const generateNewPasswordAttributes = async (
    password: string,
    masterKey: Uint8Array,
) => {
    const kek = await deriveInteractiveKEK(password);
    const box = await encryptBox(masterKey, kek.key);
    return {
        kekSalt: kek.salt,
        opsLimit: kek.opsLimit,
        memLimit: kek.memLimit,
        encryptedKey: box.encryptedData,
        keyDecryptionNonce: box.nonce,
        loginKey: await deriveLoginKey(kek.key),
    };
};

export const decryptMasterKey = async (
    kek: Uint8Array,
    attrs: Pick<KeyAttributes, "encryptedKey" | "keyDecryptionNonce">,
) => decryptBox(attrs.encryptedKey, attrs.keyDecryptionNonce, kek);

export const decryptRecoveryKey = async (
    masterKey: Uint8Array,
    attrs: KeyAttributes,
) =>
    decryptBox(
        attrs.recoveryKeyEncryptedWithMasterKey,
        attrs.recoveryKeyDecryptionNonce,
        masterKey,
    );
