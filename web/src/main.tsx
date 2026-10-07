import "@fontsource-variable/inter";
import "@fontsource-variable/outfit";
import { CssBaseline, ThemeProvider } from "@mui/material";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AppContextProvider } from "./app-context";
import { theme } from "./theme/theme";

createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ThemeProvider theme={theme} defaultMode="system" disableTransitionOnChange>
            <CssBaseline enableColorScheme />
            <BrowserRouter>
                <AppContextProvider>
                    <App />
                </AppContextProvider>
            </BrowserRouter>
        </ThemeProvider>
    </React.StrictMode>,
);
