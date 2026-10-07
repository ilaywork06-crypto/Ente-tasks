import {
    Alert,
    Dialog,
    DialogContent,
    Snackbar,
    Stack,
    Typography,
} from "@mui/material";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { FocusVisibleButton, LoadingButton } from "./components/mui";
import { api, setUnauthorizedHandler } from "./services/api";
import {
    clearSession,
    localUser,
    masterKeyFromSession,
    saveLocalUser,
    saveMasterKey,
    type LocalUser,
} from "./services/session";

/** Attributes for ente-style "mini dialogs" (confirmations and alerts). */
export interface MiniDialogAttributes {
    title: string;
    message?: React.ReactNode;
    continue?: {
        text: string;
        color?: "accent" | "critical" | "primary";
        action: () => void | Promise<void>;
    };
    cancel?: string | false;
}

interface AppContextT {
    user: LocalUser | undefined;
    masterKey: Uint8Array | undefined;
    /** True until we've checked sessionStorage for a master key. */
    initializing: boolean;
    signIn: (user: LocalUser, masterKey: Uint8Array) => Promise<void>;
    logout: () => void;
    showMiniDialog: (attrs: MiniDialogAttributes) => void;
    notify: (message: string, severity?: "success" | "error" | "info") => void;
}

const AppContext = createContext<AppContextT | undefined>(undefined);

export const useAppContext = () => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useAppContext outside AppContextProvider");
    return ctx;
};

export const AppContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [user, setUser] = useState(localUser);
    const [masterKey, setMasterKey] = useState<Uint8Array>();
    const [initializing, setInitializing] = useState(true);
    const [dialog, setDialog] = useState<MiniDialogAttributes>();
    const [dialogBusy, setDialogBusy] = useState(false);
    const [toast, setToast] = useState<{ message: string; severity: "success" | "error" | "info" }>();

    useEffect(() => {
        void masterKeyFromSession().then((k) => {
            setMasterKey(k);
            setInitializing(false);
        });
    }, []);

    const logout = useCallback(() => {
        void api.logout().catch(() => {});
        clearSession();
        setUser(undefined);
        setMasterKey(undefined);
    }, []);

    useEffect(() => {
        setUnauthorizedHandler(() => {
            clearSession();
            setUser(undefined);
            setMasterKey(undefined);
            setDialog({
                title: "Session expired",
                message: "Your session has expired. Please sign in again.",
                cancel: "OK",
            });
        });
    }, []);

    const value = useMemo<AppContextT>(
        () => ({
            user,
            masterKey,
            initializing,
            signIn: async (u, key) => {
                saveLocalUser(u);
                await saveMasterKey(key);
                setUser(u);
                setMasterKey(key);
            },
            logout,
            showMiniDialog: setDialog,
            notify: (message, severity = "success") => setToast({ message, severity }),
        }),
        [user, masterKey, initializing, logout],
    );

    const closeDialog = () => {
        setDialog(undefined);
        setDialogBusy(false);
    };

    return (
        <AppContext value={value}>
            {children}
            <Dialog
                open={!!dialog}
                onClose={closeDialog}
                fullWidth
                slotProps={{ paper: { sx: { maxWidth: "360px" } } }}
            >
                {dialog && (
                    <DialogContent>
                        <Stack sx={{ gap: 2 }}>
                            <Typography variant="h5" sx={{ pt: 1 }}>
                                {dialog.title}
                            </Typography>
                            {dialog.message && (
                                <Typography component="div" sx={{ color: "text.muted", lineHeight: "22px" }}>
                                    {dialog.message}
                                </Typography>
                            )}
                            <Stack sx={{ gap: 1, pt: 2 }}>
                                {dialog.continue && (
                                    <LoadingButton
                                        fullWidth
                                        loading={dialogBusy}
                                        color={dialog.continue.color ?? "accent"}
                                        onClick={async () => {
                                            setDialogBusy(true);
                                            try {
                                                await dialog.continue?.action();
                                                closeDialog();
                                            } catch (e) {
                                                setDialogBusy(false);
                                                value.notify(e instanceof Error ? e.message : String(e), "error");
                                            }
                                        }}
                                    >
                                        {dialog.continue.text}
                                    </LoadingButton>
                                )}
                                {dialog.cancel !== false && (
                                    <FocusVisibleButton fullWidth color="secondary" onClick={closeDialog}>
                                        {dialog.cancel ?? "Cancel"}
                                    </FocusVisibleButton>
                                )}
                            </Stack>
                        </Stack>
                    </DialogContent>
                )}
            </Dialog>
            <Snackbar
                open={!!toast}
                autoHideDuration={3000}
                onClose={() => setToast(undefined)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    variant="filled"
                    severity={toast?.severity}
                    onClose={() => setToast(undefined)}
                    sx={(theme) => ({
                        borderRadius: "12px",
                        fontWeight: 600,
                        ...(toast?.severity == "success" && {
                            backgroundColor: theme.vars.palette.background.paper2,
                            color: theme.vars.palette.text.base,
                            boxShadow: theme.vars.palette.boxShadow.menu,
                            "& .MuiAlert-icon": { color: theme.vars.palette.accent.main },
                        }),
                    })}
                >
                    {toast?.message}
                </Alert>
            </Snackbar>
        </AppContext>
    );
};
