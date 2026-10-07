// Adapted from ente's web/packages/base/components/utils/theme.ts, using the
// ente Photos accent (green) for this app.
import { createTheme } from "@mui/material";
import type { Components, TypographyVariantsOptions } from "@mui/material/styles";

const colors = {
    accent: { dark: "#00b33c", main: "#1db954", light: "#01de4d" },
    fixed: {
        white: "#fff",
        black: "#000",
        golden: "#ffc107",
        switchOn: "#2eca45",
        danger: { dark: "#f53434", main: "#ea3f3f", light: "#ff6565" },
    },
    light: {
        background: {
            default: "#fff",
            paper: "#fff",
            paper2: "#fbfbfb",
            searchInput: "#f3f3f3",
        },
        backdrop: {
            base: "rgba(255 255 255 / 0.92)",
            muted: "rgba(255 255 255 / 0.75)",
            faint: "rgba(255 255 255 / 0.30)",
        },
        text: {
            base: "#000",
            muted: "rgba(0 0 0 / 0.60)",
            faint: "rgba(0 0 0 / 0.50)",
        },
        fill: {
            base: "#000",
            muted: "rgba(0 0 0 / 0.12)",
            faint: "rgba(0 0 0 / 0.04)",
            faintHover: "rgba(0 0 0 / 0.08)",
            fainter: "rgba(0 0 0 / 0.02)",
        },
        secondary: { main: "#f5f5f5", hover: "#e9e9e9" },
        stroke: {
            base: "#000",
            muted: "rgba(0 0 0 / 0.24)",
            faint: "rgba(0 0 0 / 0.12)",
            fainter: "rgba(0 0 0 / 0.06)",
        },
        boxShadow: {
            paper: "0px 0px 10px rgba(0 0 0 / 0.25)",
            menu: "0px 0px 6px rgba(0 0 0 / 0.16), 0px 3px 6px rgba(0 0 0 / 0.12)",
        },
    },
    dark: {
        background: {
            default: "#000",
            paper: "#1b1b1b",
            paper2: "#252525",
            searchInput: "#1b1b1b",
        },
        backdrop: {
            base: "rgba(0 0 0 / 0.90)",
            muted: "rgba(0 0 0 / 0.65)",
            faint: "rgba(0 0 0 / 0.20)",
        },
        text: {
            base: "#fff",
            muted: "rgba(255 255 255 / 0.70)",
            faint: "rgba(255 255 255 / 0.50)",
        },
        fill: {
            base: "#fff",
            muted: "rgba(255 255 255 / 0.16)",
            faint: "rgba(255 255 255 / 0.12)",
            faintHover: "rgba(255 255 255 / 0.16)",
            fainter: "rgba(255 255 255 / 0.05)",
        },
        secondary: { main: "#2b2b2b", hover: "#373737" },
        stroke: {
            base: "#fff",
            muted: "rgba(255 255 255 / 0.24)",
            faint: "rgba(255 255 255 / 0.16)",
            fainter: "rgba(255 255 255 / 0.12)",
        },
        boxShadow: {
            paper: "0px 2px 12px rgba(0 0 0 / 0.75)",
            menu: "0px 0px 6px rgba(0 0 0 / 0.50), 0px 3px 6px rgba(0 0 0 / 0.25)",
        },
    },
};

const palette = (mode: "light" | "dark") => {
    const c = colors[mode];
    const isLight = mode == "light";
    return {
        background: {
            ...c.background,
            elevatedPaper: isLight ? c.background.paper2 : c.background.paper,
        },
        backdrop: c.backdrop,
        primary: {
            main: isLight ? colors.fixed.black : colors.fixed.white,
            contrastText: isLight ? colors.fixed.white : colors.fixed.black,
        },
        secondary: {
            main: c.secondary.main,
            dark: c.secondary.hover,
            contrastText: c.text.base,
        },
        success: { main: colors.accent.main },
        warning: { main: colors.fixed.golden },
        accent: { ...colors.accent, contrastText: colors.fixed.white },
        critical: { ...colors.fixed.danger, contrastText: colors.fixed.white },
        text: {
            primary: c.text.base,
            secondary: c.text.muted,
            disabled: c.text.faint,
            ...c.text,
        },
        fill: c.fill,
        stroke: c.stroke,
        divider: c.stroke.faint,
        fixed: {
            white: colors.fixed.white,
            black: colors.fixed.black,
            golden: colors.fixed.golden,
            switchOn: colors.fixed.switchOn,
        },
        boxShadow: c.boxShadow,
        action: {
            active: c.stroke.base,
            hover: c.fill.faintHover,
            hoverOpacity: isLight ? 0.08 : 0.16,
            disabled: c.text.faint,
            disabledBackground: c.fill.faint,
        },
        FilledInput: {
            bg: c.fill.faint,
            hoverBg: c.fill.faintHover,
            disabledBg: c.fill.fainter,
        },
    };
};

const typography: TypographyVariantsOptions = {
    fontFamily: '"Inter Variable", sans-serif',
    fontWeightLight: 500,
    fontWeightRegular: 500,
    fontWeightMedium: 600,
    fontWeightBold: 700,
    h1: { fontSize: "48px", lineHeight: "58px", fontWeight: 600 },
    h2: { fontSize: "32px", lineHeight: "39px", fontWeight: 500 },
    h3: { fontSize: "24px", lineHeight: "29px", fontWeight: 600 },
    h4: { fontSize: "22px", lineHeight: "27px", fontWeight: 500 },
    h5: { fontSize: "20px", lineHeight: "25px", fontWeight: 600 },
    h6: { fontSize: "18px", lineHeight: "22px", fontWeight: 600 },
    body: { fontSize: "16px", lineHeight: "20px" },
    small: { fontSize: "14px", lineHeight: "17px" },
    mini: { fontSize: "12px", lineHeight: "15px" },
    tiny: { fontSize: "10px", lineHeight: "12px" },
};

const components: Components = {
    MuiCssBaseline: {
        styleOverrides: { body: { letterSpacing: "-0.011em" } },
    },
    MuiTypography: {
        defaultProps: {
            variant: "body",
            variantMapping: { body: "p", small: "p", mini: "p", tiny: "p" },
        },
    },
    MuiDrawer: {
        styleOverrides: {
            root: {
                ".MuiBackdrop-root": {
                    backgroundColor: "var(--mui-palette-backdrop-muted)",
                },
            },
        },
    },
    MuiDialog: {
        defaultProps: { closeAfterTransition: false },
        styleOverrides: {
            root: {
                ".MuiBackdrop-root": {
                    backgroundColor: "var(--mui-palette-backdrop-muted)",
                },
                "& .MuiDialog-paper": { borderRadius: "16px" },
                "& .MuiDialogTitle-root": { padding: "16px" },
                "& .MuiDialogContent-root": { padding: "16px", overflowY: "auto" },
                "& .MuiDialogActions-root": { padding: "16px" },
                ".MuiDialogTitle-root + .MuiDialogContent-root": { paddingTop: "16px" },
            },
        },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                variants: [
                    {
                        props: { variant: "elevation" },
                        style: {
                            backgroundImage: "none",
                            boxShadow: "var(--mui-palette-boxShadow-paper)",
                        },
                    },
                    { props: { elevation: 0 }, style: { boxShadow: "none" } },
                ],
            },
        },
    },
    MuiLink: {
        defaultProps: { underline: "none" },
        styleOverrides: {
            root: { "&:hover": { color: "var(--mui-palette-accent-main)" } },
        },
    },
    MuiButton: {
        defaultProps: { variant: "contained", disableElevation: true },
        styleOverrides: {
            root: {
                padding: "12px 16px",
                borderRadius: "4px",
                textTransform: "none",
                fontSize: typography.body?.fontSize,
                lineHeight: typography.body?.lineHeight,
                fontWeight: 600,
            },
            startIcon: { marginRight: "12px", "&& >svg": { fontSize: "20px" } },
            endIcon: { marginLeft: "12px", "&& >svg": { fontSize: "20px" } },
        },
    },
    MuiInputBase: {
        styleOverrides: {
            formControl: {
                borderRadius: "8px",
                overflow: "hidden",
                "::before": { borderBottom: "none !important" },
            },
        },
    },
    MuiFilledInput: {
        styleOverrides: { root: { "::after": { borderBottom: "none !important" } } },
    },
    MuiTextField: {
        defaultProps: { variant: "filled", margin: "dense" },
        styleOverrides: {
            root: { "& .MuiInputAdornment-root": { marginRight: "8px" } },
        },
    },
    MuiCheckbox: { defaultProps: { disableRipple: true } },
    MuiSvgIcon: {
        styleOverrides: {
            root: {
                variants: [
                    {
                        props: { color: "primary" },
                        style: { color: "var(--mui-palette-stroke-base)" },
                    },
                    {
                        props: { color: "secondary" },
                        style: { color: "var(--mui-palette-stroke-muted)" },
                    },
                ],
            },
        },
    },
    MuiIconButton: {
        styleOverrides: {
            root: {
                padding: "12px",
                variants: [
                    {
                        props: { color: "primary" },
                        style: { color: "var(--mui-palette-stroke-base)" },
                    },
                    {
                        props: { color: "secondary" },
                        style: { color: "var(--mui-palette-stroke-muted)" },
                    },
                ],
                "&.Mui-disabled": { color: "var(--mui-palette-stroke-faint)" },
            },
        },
    },
    MuiMenu: {
        styleOverrides: {
            root: {
                ".MuiMenu-paper": { boxShadow: "var(--mui-palette-boxShadow-menu)" },
            },
        },
    },
    MuiTooltip: {
        styleOverrides: {
            tooltip: {
                backgroundColor: "var(--mui-palette-background-paper2)",
                color: "var(--mui-palette-text-base)",
                boxShadow: "var(--mui-palette-boxShadow-menu)",
                fontSize: "12px",
            },
        },
    },
    MuiSnackbar: { styleOverrides: { root: { borderRadius: "8px" } } },
    MuiAlert: { defaultProps: { variant: "outlined" } },
};

export const theme = createTheme({
    cssVariables: { colorSchemeSelector: "class" },
    colorSchemes: {
        light: { palette: palette("light") },
        dark: { palette: palette("dark") },
    },
    typography,
    components,
    shape: { borderRadius: 8 },
    transitions: { duration: { leavingScreen: 300 } },
});

export const displayFontFamily = '"Outfit Variable", sans-serif';
