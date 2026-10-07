import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import { Box, Checkbox, FormControlLabel, IconButton, Tooltip } from "@mui/material";
import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../app-context";
import {
    AuthButton,
    AuthForm,
    AuthLayout,
    AuthTextField,
    FormFields,
    FormFooter,
    Message,
    PasswordStrengthHint,
    passwordStrength,
    ScreenHeader,
    TextLink,
} from "../components/auth";
import { api, APIError, type AuthResponse } from "../services/api";
import {
    decryptBox,
    decryptMasterKey,
    deriveKey,
    deriveLoginKey,
    deriveRecoveryAuthKey,
    generateKeyAttributes,
    generateNewPasswordAttributes,
    mnemonicToRecoveryKey,
    recoveryKeyToMnemonic,
} from "../services/crypto";

const errorMessage = (e: unknown) =>
    e instanceof APIError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Something went wrong";

/** Finish signing in once we have a token and the KEK. */
const useCompleteSignIn = () => {
    const { signIn } = useAppContext();
    const navigate = useNavigate();
    return async (email: string, res: AuthResponse, kek: Uint8Array) => {
        if (!res.token || !res.keyAttributes) throw new Error("Unexpected response");
        const masterKey = await decryptMasterKey(kek, res.keyAttributes);
        await signIn({ email, token: res.token, keyAttributes: res.keyAttributes }, masterKey);
        navigate("/", { replace: true });
    };
};

// --- Login ---------------------------------------------------------------

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const completeSignIn = useCompleteSignIn();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [stage, setStage] = useState<"" | "deriving" | "signing">("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        const normalizedEmail = email.trim().toLowerCase();
        try {
            setStage("deriving");
            const params = await api.keyDerivationParams(normalizedEmail);
            const kek = await deriveKey(password, params.kekSalt, params.opsLimit, params.memLimit);
            setStage("signing");
            const res = await api.login(normalizedEmail, await deriveLoginKey(kek));
            if (res.twoFactorSessionId) {
                navigate("/two-factor", {
                    state: { email: normalizedEmail, sessionID: res.twoFactorSessionId, kek },
                });
                return;
            }
            await completeSignIn(normalizedEmail, res, kek);
        } catch (e) {
            setError(errorMessage(e));
            setStage("");
        }
    };

    return (
        <AuthLayout>
            <ScreenHeader title="Welcome back" subtitle="Sign in to your encrypted task lists" />
            <AuthForm onSubmit={submit}>
                <FormFields>
                    <AuthTextField label="Email" type="email" name="email" autoComplete="username" value={email} onChange={setEmail} placeholder="you@example.org" autoFocus />
                    <AuthTextField label="Password" password name="password" autoComplete="current-password" value={password} onChange={setPassword} placeholder="Enter your password" error={!!error} helperText={error} />
                </FormFields>
                <AuthButton type="submit" disabled={!email || !password} loading={!!stage} loadingMessage={stage == "deriving" ? "Deriving key…" : "Signing in…"}>
                    Sign in
                </AuthButton>
            </AuthForm>
            <FormFooter>
                <TextLink onClick={() => navigate("/recover")}>Forgot password?</TextLink>
                <span>
                    New here? <TextLink onClick={() => navigate("/signup")}>Create account</TextLink>
                </span>
            </FormFooter>
        </AuthLayout>
    );
};

// --- Two factor ----------------------------------------------------------

export const TwoFactorPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const completeSignIn = useCompleteSignIn();
    const state = location.state as { email: string; sessionID: string; kek: Uint8Array } | null;
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    if (!state) return <Navigate to="/login" replace />;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await api.verifyTwoFactor(state.sessionID, code.replace(/\s/g, ""));
            await completeSignIn(state.email, res, state.kek);
        } catch (e) {
            setError(e instanceof APIError && e.status == 410 ? "This sign in attempt expired, please start again" : errorMessage(e));
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <ScreenHeader title="Two-factor authentication" subtitle="Enter the 6-digit code from your authenticator app" />
            <AuthForm onSubmit={submit}>
                <AuthTextField label="Code" value={code} onChange={(v) => setCode(v.replace(/[^\d ]/g, "").slice(0, 7))} placeholder="123 456" inputMode="numeric" autoComplete="one-time-code" autoFocus error={!!error} helperText={error} />
                <AuthButton type="submit" disabled={code.replace(/\s/g, "").length != 6} loading={loading}>
                    Verify
                </AuthButton>
            </AuthForm>
            <FormFooter>
                <TextLink onClick={() => navigate("/login")}>Back to sign in</TextLink>
            </FormFooter>
        </AuthLayout>
    );
};

// --- Signup --------------------------------------------------------------

export const SignupPage: React.FC = () => {
    const navigate = useNavigate();
    const { signIn } = useAppContext();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [accepted, setAccepted] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [created, setCreated] = useState<{ mnemonic: string; finish: () => Promise<void> }>();

    const mismatch = !!confirm && password != confirm;
    const weak = !!password && passwordStrength(password) == "weak";

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const { masterKey, recoveryKey, keyAttributes, loginKey, recoveryAuthKey } =
                await generateKeyAttributes(password);
            const res = await api.signup({ email: normalizedEmail, keyAttributes, loginKey, recoveryAuthKey });
            if (!res.token) throw new Error("Unexpected response");
            // Show the recovery key before entering the app.
            setCreated({
                mnemonic: recoveryKeyToMnemonic(recoveryKey),
                finish: () => signIn({ email: normalizedEmail, token: res.token!, keyAttributes }, masterKey),
            });
        } catch (e) {
            setError(errorMessage(e));
            setLoading(false);
        }
    };

    if (created) return <RecoveryKeyScreen mnemonic={created.mnemonic} onContinue={created.finish} />;

    return (
        <AuthLayout>
            <ScreenHeader title="Create account" subtitle="Your tasks are encrypted before they leave this device" />
            <AuthForm onSubmit={submit}>
                <FormFields>
                    <AuthTextField label="Email" type="email" name="email" autoComplete="username" value={email} onChange={setEmail} placeholder="you@example.org" autoFocus />
                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        <AuthTextField label="Password" password autoComplete="new-password" value={password} onChange={setPassword} placeholder="Choose a strong password" />
                        <PasswordStrengthHint password={password} />
                    </div>
                    <AuthTextField label="Confirm password" password autoComplete="new-password" value={confirm} onChange={setConfirm} placeholder="Re-enter password" error={mismatch} helperText={mismatch ? "Passwords don't match" : undefined} />
                    <FormControlLabel
                        sx={{ alignItems: "flex-start", mx: 0, "& .MuiTypography-root": { fontSize: 13, lineHeight: "20px", color: "var(--auth-ui-text-muted)" } }}
                        control={<Checkbox size="small" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} sx={{ p: 0, mr: 1, mt: "2px", "&.Mui-checked": { color: "var(--auth-ui-primary)" } }} />}
                        label="I understand that if I lose my password and recovery key, my data cannot be recovered since it is end-to-end encrypted"
                    />
                    {error && <Message $kind="error">{error}</Message>}
                </FormFields>
                <AuthButton type="submit" disabled={!email || !password || password != confirm || weak || !accepted} loading={loading} loadingMessage="Generating encryption keys…">
                    Create account
                </AuthButton>
            </AuthForm>
            <FormFooter>
                <span>
                    Already have an account? <TextLink onClick={() => navigate("/login")}>Sign in</TextLink>
                </span>
            </FormFooter>
        </AuthLayout>
    );
};

// --- Recovery key display (after signup) --------------------------------

export const RecoveryKeyWords: React.FC<{ mnemonic: string }> = ({ mnemonic }) => {
    const [copied, setCopied] = useState(false);
    const download = () => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([mnemonic], { type: "text/plain" }));
        a.download = "ente-tasks-recovery-key.txt";
        a.click();
        URL.revokeObjectURL(a.href);
    };
    return (
        <Box
            sx={{
                position: "relative",
                p: "20px",
                pr: "56px",
                borderRadius: "16px",
                border: "1px dashed var(--mui-palette-accent-main)",
                backgroundColor: "fill.fainter",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "14px",
                lineHeight: "24px",
                wordSpacing: "4px",
                color: "text.base",
            }}
        >
            {mnemonic}
            <Box sx={{ position: "absolute", top: 4, right: 4, display: "flex", flexDirection: "column" }}>
                <Tooltip title={copied ? "Copied" : "Copy"} placement="left">
                    <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => void navigator.clipboard.writeText(mnemonic).then(() => setCopied(true))}
                    >
                        <ContentCopyIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Download" placement="left">
                    <IconButton size="small" color="secondary" onClick={download}>
                        <DownloadIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
};

const RecoveryKeyScreen: React.FC<{ mnemonic: string; onContinue: () => Promise<void> }> = ({ mnemonic, onContinue }) => {
    const [loading, setLoading] = useState(false);
    return (
        <AuthLayout>
            <ScreenHeader
                title="Your recovery key"
                subtitle="If you forget your password, the only way to recover your tasks is with this key. Store it somewhere safe."
            />
            <RecoveryKeyWords mnemonic={mnemonic} />
            <AuthButton
                loading={loading}
                onClick={() => {
                    setLoading(true);
                    void onContinue();
                }}
            >
                I've saved it, continue
            </AuthButton>
        </AuthLayout>
    );
};

// --- Recover account -----------------------------------------------------

export const RecoverPage: React.FC = () => {
    const navigate = useNavigate();
    const { signIn } = useAppContext();
    const [email, setEmail] = useState("");
    const [mnemonic, setMnemonic] = useState("");
    const [recovered, setRecovered] = useState<{ masterKey: Uint8Array; recoveryAuthKey: string }>();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const verifyKey = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const recoveryKey = mnemonicToRecoveryKey(mnemonic);
            const params = await api.recoveryParams(email.trim().toLowerCase());
            let masterKey: Uint8Array;
            try {
                masterKey = await decryptBox(params.masterKeyEncryptedWithRecoveryKey, params.masterKeyDecryptionNonce, recoveryKey);
            } catch {
                throw new Error("Incorrect email or recovery key");
            }
            setRecovered({ masterKey, recoveryAuthKey: await deriveRecoveryAuthKey(recoveryKey) });
        } catch (e) {
            setError(errorMessage(e));
        }
        setLoading(false);
    };

    const setNewPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recovered) return;
        setError("");
        setLoading(true);
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const attrs = await generateNewPasswordAttributes(password, recovered.masterKey);
            const res = await api.recover(normalizedEmail, recovered.recoveryAuthKey, attrs);
            if (!res.token || !res.keyAttributes) throw new Error("Unexpected response");
            await signIn({ email: normalizedEmail, token: res.token, keyAttributes: res.keyAttributes }, recovered.masterKey);
            navigate("/", { replace: true });
        } catch (e) {
            setError(errorMessage(e));
            setLoading(false);
        }
    };

    if (recovered) {
        const mismatch = !!confirm && password != confirm;
        return (
            <AuthLayout>
                <ScreenHeader title="Set new password" subtitle="Recovery key verified. Choose a new password for your account." />
                <AuthForm onSubmit={setNewPassword}>
                    <FormFields>
                        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                            <AuthTextField label="New password" password autoComplete="new-password" value={password} onChange={setPassword} autoFocus />
                            <PasswordStrengthHint password={password} />
                        </div>
                        <AuthTextField label="Confirm password" password autoComplete="new-password" value={confirm} onChange={setConfirm} error={mismatch || !!error} helperText={mismatch ? "Passwords don't match" : error} />
                    </FormFields>
                    <AuthButton type="submit" disabled={!password || password != confirm || passwordStrength(password) == "weak"} loading={loading} loadingMessage="Re-encrypting keys…">
                        Set password
                    </AuthButton>
                </AuthForm>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <ScreenHeader title="Recover account" subtitle="Enter the 24-word recovery key you saved when you signed up" />
            <AuthForm onSubmit={verifyKey}>
                <FormFields>
                    <AuthTextField label="Email" type="email" autoComplete="username" value={email} onChange={setEmail} autoFocus />
                    <AuthTextField label="Recovery key" multiline value={mnemonic} onChange={setMnemonic} placeholder="word word word …" error={!!error} helperText={error} />
                </FormFields>
                <AuthButton type="submit" disabled={!email || !mnemonic} loading={loading}>
                    Recover
                </AuthButton>
            </AuthForm>
            <FormFooter>
                <TextLink onClick={() => navigate("/login")}>Back to sign in</TextLink>
            </FormFooter>
        </AuthLayout>
    );
};

// --- Unlock (new browser session, still signed in) -----------------------

export const UnlockPage: React.FC = () => {
    const { user, logout, signIn } = useAppContext();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    if (!user) return <Navigate to="/login" replace />;
    const attrs = user.keyAttributes;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const kek = await deriveKey(password, attrs.kekSalt, attrs.opsLimit, attrs.memLimit);
            let masterKey: Uint8Array;
            try {
                masterKey = await decryptMasterKey(kek, attrs);
            } catch {
                throw new Error("Incorrect password");
            }
            await signIn(user, masterKey);
            navigate("/", { replace: true });
        } catch (e) {
            setError(errorMessage(e));
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <ScreenHeader title="Unlock" subtitle={<>Enter your password to decrypt your tasks for <b>{user.email}</b></>} />
            <AuthForm onSubmit={submit}>
                <AuthTextField label="Password" password autoComplete="current-password" value={password} onChange={setPassword} autoFocus error={!!error} helperText={error} />
                <AuthButton type="submit" disabled={!password} loading={loading} loadingMessage="Decrypting…">
                    Unlock
                </AuthButton>
            </AuthForm>
            <FormFooter>
                <TextLink onClick={() => navigate("/recover")}>Forgot password?</TextLink>
                <TextLink onClick={logout}>Sign out</TextLink>
            </FormFooter>
        </AuthLayout>
    );
};
