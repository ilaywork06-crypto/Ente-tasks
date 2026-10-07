import { CircularProgress, Stack } from "@mui/material";
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAppContext } from "./app-context";
import { LoginPage, RecoverPage, SignupPage, TwoFactorPage, UnlockPage } from "./pages/auth";
import { HomePage } from "./pages/Home";

export const App: React.FC = () => {
    const { user, masterKey, initializing } = useAppContext();

    if (initializing)
        return (
            <Stack sx={{ minHeight: "100svh", alignItems: "center", justifyContent: "center" }}>
                <CircularProgress color="accent" size={32} />
            </Stack>
        );

    const signedIn = !!user && !!masterKey;
    // Signed in, but the master key isn't in this browser session yet.
    const locked = !!user && !masterKey;

    const publicOnly = (el: React.ReactElement) => (signedIn ? <Navigate to="/" replace /> : locked ? <Navigate to="/unlock" replace /> : el);

    return (
        <Routes>
            <Route path="/" element={signedIn ? <HomePage /> : <Navigate to={locked ? "/unlock" : "/login"} replace />} />
            <Route path="/login" element={publicOnly(<LoginPage />)} />
            <Route path="/signup" element={publicOnly(<SignupPage />)} />
            <Route path="/two-factor" element={publicOnly(<TwoFactorPage />)} />
            <Route path="/recover" element={signedIn ? <Navigate to="/" replace /> : <RecoverPage />} />
            <Route path="/unlock" element={locked ? <UnlockPage /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};
