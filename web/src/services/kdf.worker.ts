// Argon2id is deliberately slow and memory hungry; run it off the main thread
// so the UI stays responsive (ente does the same in its crypto worker).
import sodium from "libsodium-wrappers-sumo";

interface Request {
    id: number;
    password: string;
    salt: string;
    opsLimit: number;
    memLimit: number;
}

self.onmessage = async (e: MessageEvent<Request>) => {
    const { id, password, salt, opsLimit, memLimit } = e.data;
    try {
        await sodium.ready;
        const key = sodium.crypto_pwhash(
            sodium.crypto_secretbox_KEYBYTES,
            sodium.from_string(password),
            sodium.from_base64(salt, sodium.base64_variants.ORIGINAL),
            opsLimit,
            memLimit,
            sodium.crypto_pwhash_ALG_ARGON2ID13,
        );
        self.postMessage({ id, key });
    } catch (err) {
        self.postMessage({ id, error: String(err) });
    }
};
