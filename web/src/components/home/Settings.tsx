import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ComputerIcon from "@mui/icons-material/ComputerOutlined";
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeIcon from "@mui/icons-material/LightModeOutlined";
import { Box, Chip, Dialog, DialogContent, IconButton, Stack, TextField, Typography, useColorScheme } from "@mui/material";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import QRCode from "qrcode";
import React, { useEffect, useState } from "react";
import { useAppContext } from "../../app-context";
import { RecoveryKeyWords } from "../../pages/auth";
import { setPref, usePrefs } from "../../prefs";
import { api, type SessionInfo, type UserDetails } from "../../services/api";
import {
    decryptRecoveryKey,
    deriveKey,
    deriveLoginKey,
    generateNewPasswordAttributes,
    recoveryKeyToMnemonic,
} from "../../services/crypto";
import { clearSession } from "../../services/session";
import {
    FocusVisibleButton,
    LoadingButton,
    RowButton,
    RowButtonDivider,
    RowButtonGroup,
    RowButtonGroupHint,
    RowButtonGroupTitle,
    RowSwitch,
    TitledNestedSidebarDrawer,
    type NestedDrawerProps,
} from "../mui";

dayjs.extend(relativeTime);

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/** Derive the login key for the signed in user from their password. */
const useLoginKeyFromPassword = () => {
    const { user } = useAppContext();
    return async (password: string) => {
        if (!user) throw new Error("Not signed in");
        const a = user.keyAttributes;
        return deriveLoginKey(await deriveKey(password, a.kekSalt, a.opsLimit, a.memLimit));
    };
};

// --- Account -------------------------------------------------------------

export const AccountSettings: React.FC<NestedDrawerProps> = (props) => {
    const { user, showMiniDialog } = useAppContext();
    const [details, setDetails] = useState<UserDetails>();
    const [dialog, setDialog] = useState<"recovery" | "password" | "2fa" | "delete">();
    const [showSessions, setShowSessions] = useState(false);

    useEffect(() => {
        if (props.open) void api.me().then(setDetails).catch(() => {});
    }, [props.open]);

    return (
        <>
            <TitledNestedSidebarDrawer {...props} title="Account" caption={user?.email}>
                <Stack>
                    <RowButtonGroupTitle>Security</RowButtonGroupTitle>
                    <RowButtonGroup>
                        <RowButton label="Recovery key" endIcon={<ChevronRightIcon />} onClick={() => setDialog("recovery")} />
                        <RowButtonDivider />
                        <RowSwitch label="Two-factor authentication" checked={!!details?.twoFactorEnabled} disabled={!details} onClick={() => setDialog("2fa")} />
                        <RowButtonDivider />
                        <RowButton label="Change password" endIcon={<ChevronRightIcon />} onClick={() => setDialog("password")} />
                        <RowButtonDivider />
                        <RowButton label="Active sessions" endIcon={<ChevronRightIcon />} onClick={() => setShowSessions(true)} />
                    </RowButtonGroup>
                    <RowButtonGroupHint>
                        Your password never leaves this device. Your tasks are encrypted with keys only you hold.
                    </RowButtonGroupHint>
                </Stack>
                <Stack>
                    <RowButtonGroupTitle>Danger zone</RowButtonGroupTitle>
                    <RowButtonGroup>
                        <RowButton
                            color="critical"
                            label="Delete account"
                            endIcon={<ChevronRightIcon />}
                            onClick={() =>
                                showMiniDialog({
                                    title: "Delete account?",
                                    message: "This will permanently delete your account and all your lists and tasks. This cannot be undone.",
                                    continue: { text: "Continue", color: "critical", action: () => setDialog("delete") },
                                })
                            }
                        />
                    </RowButtonGroup>
                </Stack>
                {details && (
                    <Typography variant="mini" sx={{ color: "text.faint", textAlign: "center" }}>
                        Member since {dayjs(details.createdAt).format("MMMM YYYY")}
                    </Typography>
                )}
            </TitledNestedSidebarDrawer>
            <SessionsDrawer open={showSessions} onClose={() => setShowSessions(false)} onRootClose={() => { setShowSessions(false); props.onRootClose(); }} />
            <RecoveryKeyDialog open={dialog == "recovery"} onClose={() => setDialog(undefined)} />
            <ChangePasswordDialog open={dialog == "password"} onClose={() => setDialog(undefined)} />
            <TwoFactorDialog open={dialog == "2fa"} details={details} onDetails={setDetails} onClose={() => setDialog(undefined)} />
            <DeleteAccountDialog open={dialog == "delete"} onClose={() => setDialog(undefined)} />
        </>
    );
};

const SimpleDialog: React.FC<React.PropsWithChildren<{ open: boolean; onClose: () => void; title: string; subtitle?: React.ReactNode }>> = ({
    open,
    onClose,
    title,
    subtitle,
    children,
}) => (
    <Dialog open={open} onClose={onClose} fullWidth slotProps={{ paper: { sx: { maxWidth: "420px" } } }}>
        <DialogContent>
            <Stack sx={{ gap: 2 }}>
                <Typography variant="h5" sx={{ pt: 1 }}>
                    {title}
                </Typography>
                {subtitle && <Typography sx={{ color: "text.muted", lineHeight: "22px" }}>{subtitle}</Typography>}
                {open && children}
            </Stack>
        </DialogContent>
    </Dialog>
);

const RecoveryKeyDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const { user, masterKey } = useAppContext();
    const [mnemonic, setMnemonic] = useState<string>();
    useEffect(() => {
        if (open && user && masterKey)
            void decryptRecoveryKey(masterKey, user.keyAttributes).then((k) => setMnemonic(recoveryKeyToMnemonic(k)));
    }, [open, user, masterKey]);
    return (
        <SimpleDialog open={open} onClose={onClose} title="Recovery key" subtitle="If you forget your password, the only way you can recover your data is with this key.">
            {mnemonic && <RecoveryKeyWords mnemonic={mnemonic} />}
            <FocusVisibleButton color="secondary" fullWidth onClick={onClose}>
                Done
            </FocusVisibleButton>
        </SimpleDialog>
    );
};

const ChangePasswordDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const { user, masterKey, signIn, notify } = useAppContext();
    const loginKeyFromPassword = useLoginKeyFromPassword();
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setCurrent("");
            setNext("");
            setConfirm("");
            setError("");
        }
    }, [open]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !masterKey) return;
        setBusy(true);
        setError("");
        try {
            const currentLoginKey = await loginKeyFromPassword(current);
            const attrs = await generateNewPasswordAttributes(next, masterKey);
            await api.changePassword(currentLoginKey, attrs);
            const { loginKey: _loginKey, ...keyAttrs } = attrs;
            await signIn({ ...user, keyAttributes: { ...user.keyAttributes, ...keyAttrs } }, masterKey);
            notify("Password changed. Other devices have been signed out.");
            onClose();
        } catch (e) {
            setError(errorText(e));
        }
        setBusy(false);
    };

    return (
        <SimpleDialog open={open} onClose={onClose} title="Change password">
            <form onSubmit={submit}>
                <Stack sx={{ gap: 1 }}>
                    <TextField type="password" label="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
                    <TextField type="password" label="New password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
                    <TextField
                        type="password"
                        label="Confirm new password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        error={(!!confirm && confirm != next) || !!error}
                        helperText={confirm && confirm != next ? "Passwords don't match" : error}
                    />
                    <Stack sx={{ gap: 1, mt: 2 }}>
                        <LoadingButton type="submit" color="accent" fullWidth loading={busy} disabled={!current || next.length < 8 || next != confirm}>
                            Change password
                        </LoadingButton>
                        <FocusVisibleButton color="secondary" fullWidth onClick={onClose}>
                            Cancel
                        </FocusVisibleButton>
                    </Stack>
                </Stack>
            </form>
        </SimpleDialog>
    );
};

const TwoFactorDialog: React.FC<{
    open: boolean;
    details: UserDetails | undefined;
    onDetails: (d: UserDetails) => void;
    onClose: () => void;
}> = ({ open, details, onDetails, onClose }) => {
    const { notify } = useAppContext();
    const [setup, setSetup] = useState<{ secret: string; qr: string }>();
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const enabled = !!details?.twoFactorEnabled;

    useEffect(() => {
        if (!open) return;
        setCode("");
        setError("");
        setSetup(undefined);
        if (!enabled)
            void api
                .setupTwoFactor()
                .then(async ({ secret, uri }) => setSetup({ secret, qr: await QRCode.toDataURL(uri, { margin: 1, width: 200 }) }))
                .catch((e: unknown) => setError(errorText(e)));
    }, [open, enabled]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            const d = enabled ? await api.disableTwoFactor(code) : await api.enableTwoFactor(code);
            onDetails(d);
            notify(enabled ? "Two-factor authentication disabled" : "Two-factor authentication enabled");
            onClose();
        } catch (e) {
            setError(errorText(e));
        }
        setBusy(false);
    };

    return (
        <SimpleDialog
            open={open}
            onClose={onClose}
            title={enabled ? "Disable two-factor" : "Enable two-factor"}
            subtitle={enabled ? "Enter a code from your authenticator app to disable two-factor authentication." : "Scan this QR code with an authenticator app (like ente Auth), then enter the 6-digit code."}
        >
            {!enabled && setup && (
                <Stack sx={{ alignItems: "center", gap: 1 }}>
                    <Box component="img" src={setup.qr} alt="Two-factor QR code" sx={{ width: 200, height: 200, borderRadius: "12px", backgroundColor: "#fff" }} />
                    <Typography variant="mini" sx={{ color: "text.faint", fontFamily: "monospace", wordBreak: "break-all", textAlign: "center" }}>
                        {setup.secret}
                    </Typography>
                </Stack>
            )}
            <form onSubmit={submit}>
                <TextField
                    fullWidth
                    label="Code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    slotProps={{ htmlInput: { inputMode: "numeric", autoComplete: "one-time-code" } }}
                    error={!!error}
                    helperText={error}
                    autoFocus
                />
                <Stack sx={{ gap: 1, mt: 2 }}>
                    <LoadingButton type="submit" color={enabled ? "critical" : "accent"} fullWidth loading={busy} disabled={code.length != 6}>
                        {enabled ? "Disable" : "Enable"}
                    </LoadingButton>
                    <FocusVisibleButton color="secondary" fullWidth onClick={onClose}>
                        Cancel
                    </FocusVisibleButton>
                </Stack>
            </form>
        </SimpleDialog>
    );
};

const DeleteAccountDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const { logout } = useAppContext();
    const loginKeyFromPassword = useLoginKeyFromPassword();
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            await api.deleteAccount(await loginKeyFromPassword(password));
            clearSession();
            logout();
        } catch (e) {
            setError(errorText(e));
            setBusy(false);
        }
    };

    return (
        <SimpleDialog open={open} onClose={onClose} title="Delete account" subtitle="Enter your password to confirm.">
            <form onSubmit={submit}>
                <TextField fullWidth type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} error={!!error} helperText={error} autoFocus />
                <Stack sx={{ gap: 1, mt: 2 }}>
                    <LoadingButton type="submit" color="critical" fullWidth loading={busy} disabled={!password}>
                        Delete my account
                    </LoadingButton>
                    <FocusVisibleButton color="secondary" fullWidth onClick={onClose}>
                        Cancel
                    </FocusVisibleButton>
                </Stack>
            </form>
        </SimpleDialog>
    );
};

const describeUserAgent = (ua: string) => {
    const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /python|curl|httpx/i.test(ua) ? "API client" : "Browser";
    const os = /Windows/.test(ua) ? "Windows" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : "";
    return os ? `${browser} on ${os}` : browser;
};

const SessionsDrawer: React.FC<NestedDrawerProps> = (props) => {
    const { notify } = useAppContext();
    const [sessions, setSessions] = useState<SessionInfo[]>();

    useEffect(() => {
        if (props.open) void api.sessions().then(setSessions).catch(() => {});
    }, [props.open]);

    const revoke = async (s: SessionInfo) => {
        await api.revokeSession(s.id);
        setSessions((ss) => ss?.filter((x) => x.id != s.id));
        notify("Session signed out");
    };

    return (
        <TitledNestedSidebarDrawer {...props} title="Active sessions" caption={sessions ? `${sessions.length} device${sessions.length == 1 ? "" : "s"}` : ""}>
            <RowButtonGroup>
                {sessions?.map((s, i) => (
                    <React.Fragment key={s.id}>
                        {i > 0 && <RowButtonDivider />}
                        <Stack direction="row" sx={{ alignItems: "center", px: 2, py: 1.5, gap: 1.5 }}>
                            <ComputerIcon sx={{ color: "stroke.muted" }} />
                            <Stack sx={{ flex: 1, minWidth: 0, gap: 0.5 }}>
                                <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
                                    <Typography>{describeUserAgent(s.userAgent)}</Typography>
                                    {s.isCurrent && <Chip size="small" label="This device" color="success" sx={{ height: 20, fontSize: 11 }} />}
                                </Stack>
                                <Typography variant="mini" sx={{ color: "text.faint" }}>
                                    {s.ip || "Unknown IP"} · Active {dayjs(s.lastUsedAt).fromNow()}
                                </Typography>
                            </Stack>
                            {!s.isCurrent && (
                                <FocusVisibleButton size="small" color="critical" sx={{ py: "6px", px: "10px", fontSize: 13 }} onClick={() => void revoke(s)}>
                                    Sign out
                                </FocusVisibleButton>
                            )}
                        </Stack>
                    </React.Fragment>
                ))}
            </RowButtonGroup>
        </TitledNestedSidebarDrawer>
    );
};

// --- Preferences ---------------------------------------------------------

export const Preferences: React.FC<NestedDrawerProps> = (props) => {
    const { mode, setMode } = useColorScheme();
    const prefs = usePrefs();
    const themes = [
        { id: "system", label: "System", icon: <ComputerIcon /> },
        { id: "light", label: "Light", icon: <LightModeIcon /> },
        { id: "dark", label: "Dark", icon: <DarkModeIcon /> },
    ] as const;
    return (
        <TitledNestedSidebarDrawer {...props} title="Preferences">
            <Stack>
                <RowButtonGroupTitle>Theme</RowButtonGroupTitle>
                <RowButtonGroup>
                    {themes.map((t, i) => (
                        <React.Fragment key={t.id}>
                            {i > 0 && <RowButtonDivider />}
                            <RowButton startIcon={t.icon} label={t.label} endIcon={mode == t.id ? <CheckIcon sx={{ color: "accent.main" }} /> : undefined} onClick={() => setMode(t.id)} />
                        </React.Fragment>
                    ))}
                </RowButtonGroup>
            </Stack>
            <Stack>
                <RowButtonGroupTitle>Tasks</RowButtonGroupTitle>
                <RowButtonGroup>
                    <RowSwitch label="Show completed tasks" checked={prefs.showCompleted} onClick={() => setPref("showCompleted", !prefs.showCompleted)} />
                    <RowButtonDivider />
                    <RowSwitch label="Confirm before deleting" checked={prefs.confirmTrash} onClick={() => setPref("confirmTrash", !prefs.confirmTrash)} />
                </RowButtonGroup>
            </Stack>
        </TitledNestedSidebarDrawer>
    );
};

// --- Keyboard shortcuts ----------------------------------------------------

export const shortcuts: [string, string][] = [
    ["N", "New task"],
    ["/", "Search"],
    ["L", "New list"],
    ["T", "Go to Today"],
    ["U", "Go to Upcoming"],
    ["A", "Go to All tasks"],
    ["1 – 9", "Switch to list"],
    ["Esc", "Close panel"],
    ["?", "Show shortcuts"],
];

export const ShortcutsDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
    <Dialog open={open} onClose={onClose} fullWidth slotProps={{ paper: { sx: { maxWidth: "360px" } } }}>
        <DialogContent>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="h5">Keyboard shortcuts</Typography>
                <IconButton onClick={onClose} color="secondary" aria-label="Close">
                    <CloseIcon />
                </IconButton>
            </Stack>
            <RowButtonGroup>
                {shortcuts.map(([k, label], i) => (
                    <React.Fragment key={k}>
                        {i > 0 && <RowButtonDivider />}
                        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1.25 }}>
                            <Typography variant="small">{label}</Typography>
                            <Box component="kbd" sx={{ fontFamily: "inherit", fontSize: 12, fontWeight: 600, px: 1, py: 0.25, borderRadius: "6px", border: "1px solid", borderColor: "stroke.faint", backgroundColor: "fill.faint" }}>
                                {k}
                            </Box>
                        </Stack>
                    </React.Fragment>
                ))}
            </RowButtonGroup>
        </DialogContent>
    </Dialog>
);
