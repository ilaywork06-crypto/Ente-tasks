/**
 * The sign-in / sign-up page shell and form controls, recreating the look of
 * ente's web/packages/accounts/components/auth (brand panel on the left, form
 * sheet on the right, collapsing to a band + bottom sheet on mobile).
 */
import CheckIcon from "@mui/icons-material/Check";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOffOutlined";
import { CircularProgress, GlobalStyles, keyframes, styled } from "@mui/material";
import React, { useId, useState } from "react";
import { displayFontFamily } from "../theme/theme";
import { Wordmark } from "./Wordmark";

const mobile = "@media (max-width: 639.95px)";
const aboveMobile = "@media (min-width: 640px)";
const desktop = "@media (min-width: 1024px)";
const transient = { shouldForwardProp: (p: string) => !p.startsWith("$") };

const colorVariables = {
    ":where(:root)": {
        "--auth-ui-primary": "#08c225",
        "--auth-ui-primary-hover": "#069d1e",
        "--auth-ui-primary-active": "#057c18",
        "--auth-ui-focus": "#08c225",
        "--auth-ui-link": "#08c225",
        "--auth-ui-warning": "#f63a3a",
        "--auth-ui-caution": "#f08a1e",
        "--auth-ui-text": "#000",
        "--auth-ui-text-muted": "#666",
        "--auth-ui-text-faint": "#969696",
        "--auth-ui-text-disabled": "#d6d6d6",
        "--auth-ui-field": "#fff",
        "--auth-ui-fill": "#eaeaea",
        "--auth-ui-fill-hover": "#dedede",
        "--auth-ui-fill-active": "#d2d2d2",
        "--auth-ui-stroke": "#e0e0e0",
        "--auth-ui-button-secondary": "#eaeaea",
        "--auth-ui-button-secondary-hover": "#dedede",
        "--auth-ui-button-primary-stroke": "rgba(255, 255, 255, 0.14)",
    },
    "*:where(.dark)": {
        "--auth-ui-text": "#fff",
        "--auth-ui-text-muted": "#999",
        "--auth-ui-text-disabled": "#4d4d4d",
        "--auth-ui-field": "#1a1a1a",
        "--auth-ui-fill": "#0a0a0a",
        "--auth-ui-fill-hover": "#1a1a1a",
        "--auth-ui-fill-active": "#292929",
        "--auth-ui-stroke": "#3e3e3e",
        "--auth-ui-button-secondary": "#1e1e1e",
        "--auth-ui-button-secondary-hover": "#1a1a1a",
    },
};

const focusRing = { outline: "1px solid var(--auth-ui-focus)", outlineOffset: "2px" };
const bodyType = { fontSize: "14px", fontWeight: 500, lineHeight: "20px" };
const miniType = { fontSize: "12px", fontWeight: 500, lineHeight: "16px" };

// --- Shell -------------------------------------------------------------------

const brand = {
    headline: "Tasks that only you can read",
    subtitle: "Lists, reminders and plans, end-to-end encrypted.",
    bullets: ["Zero-knowledge encryption", "Open source", "No ads, no tracking"],
};

export const AuthLayout: React.FC<React.PropsWithChildren> = ({ children }) => (
    <PageRoot>
        <GlobalStyles styles={colorVariables} />
        <FrameCurves />
        <PageCard>
            <DesktopBrand>
                <BrandPanel size="desktop" />
            </DesktopBrand>
            <MobileBrand>
                <BrandPanel size="mobile" />
            </MobileBrand>
            <ContentSheet>
                <ContentColumn>{children}</ContentColumn>
            </ContentSheet>
        </PageCard>
    </PageRoot>
);

const reveal = keyframes({
    from: { opacity: 0, transform: "translateY(18px)" },
    to: { opacity: 1, transform: "translateY(0)" },
});

const copyReveal = keyframes({
    from: { opacity: 0, transform: "translateY(12px)" },
    to: { opacity: 1, transform: "translateY(0)" },
});

const curvesDrift = keyframes({
    "0%, 100%": { backgroundPosition: "calc(50% - 6px) calc(50% + 4px)" },
    "50%": { backgroundPosition: "calc(50% + 6px) calc(50% - 4px)" },
});

const checkPop = keyframes({
    "0%": { transform: "scale(0)" },
    "70%": { transform: "scale(1.2)" },
    "100%": { transform: "scale(1)" },
});

const copyAnimation = {
    animation: `${copyReveal} 520ms cubic-bezier(0.22, 1, 0.36, 1) both`,
    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
};

const BrandPanel: React.FC<{ size: "desktop" | "mobile" }> = ({ size }) => (
    <BrandRoot $size={size}>
        <Wordmark size={size == "desktop" ? 26 : 20} color="#fff" />
        <div style={{ position: "relative", zIndex: 1, marginTop: size == "desktop" ? 32 : 0 }}>
            <Headline $size={size}>{brand.headline}</Headline>
            {size == "desktop" && (
                <>
                    <Subtitle>{brand.subtitle}</Subtitle>
                    <Bullets>
                        {brand.bullets.map((b) => (
                            <li key={b}>
                                <span className="check">
                                    <CheckIcon sx={{ fontSize: 14 }} />
                                </span>
                                <span>{b}</span>
                            </li>
                        ))}
                    </Bullets>
                </>
            )}
        </div>
        {size == "desktop" && <Illustration />}
    </BrandRoot>
);

/** A little stack of checklist cards, in place of ente's ducky. */
const Illustration: React.FC = () => (
    <IllustrationRoot aria-hidden>
        {[
            { w: "70%", done: true },
            { w: "52%", done: true },
            { w: "64%", done: false },
        ].map((row, i) => (
            <div className="card" key={i} style={{ animationDelay: `${700 + i * 120}ms` }}>
                <span className={row.done ? "box done" : "box"} style={{ animationDelay: `${1100 + i * 180}ms` }}>
                    {row.done && <CheckIcon sx={{ fontSize: 16 }} />}
                </span>
                <span className="line" style={{ width: row.w, opacity: row.done ? 0.45 : 1 }} />
            </div>
        ))}
    </IllustrationRoot>
);

const PageRoot = styled("main")(({ theme }) => ({
    width: "100%",
    minHeight: "100svh",
    display: "flex",
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
    backgroundColor: "#f4f4f4",
    ...theme.applyStyles("dark", { backgroundColor: "#0a0a0a" }),
    [aboveMobile]: { padding: "40px" },
    [desktop]: { padding: 0, height: "100svh", alignItems: "center", justifyContent: "center" },
}));

const FrameCurves = styled("div")(({ theme }) => ({
    display: "none",
    opacity: 0.3,
    filter: "invert(1)",
    ...theme.applyStyles("dark", { opacity: 0.08, filter: "none" }),
    [aboveMobile]: {
        display: "block",
        position: "absolute",
        inset: 0,
        backgroundImage: 'url("/images/frame-curves.svg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        pointerEvents: "none",
    },
}));

const PageCard = styled("div")(({ theme }) => ({
    width: "100%",
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#fff",
    animation: `${reveal} 620ms cubic-bezier(0.22, 1, 0.36, 1) both`,
    ...theme.applyStyles("dark", { backgroundColor: "#252525" }),
    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
    [aboveMobile]: { borderRadius: "24px" },
    [desktop]: { width: "1032px", height: "min(780px, 100%)", minHeight: 0, flexDirection: "row" },
    "@media (min-width: 1600px)": { width: "1240px", height: "min(900px, 100%)" },
}));

const DesktopBrand = styled("div")({
    display: "none",
    [desktop]: { display: "block", flex: "0 0 440px", height: "100%" },
    "@media (min-width: 1600px)": { flexBasis: "496px" },
});

const MobileBrand = styled("div")({
    display: "block",
    flex: "0 0 168px",
    position: "relative",
    overflow: "hidden",
    [desktop]: { display: "none" },
});

const ContentSheet = styled("section")(({ theme }) => ({
    flex: 1,
    marginTop: "-28px",
    padding: "40px 24px 24px",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    zIndex: 1,
    overflowY: "auto",
    borderRadius: "24px 24px 0 0",
    backgroundColor: "#fff",
    color: "var(--auth-ui-text)",
    ...theme.applyStyles("dark", { backgroundColor: "#252525" }),
    [aboveMobile]: { padding: "48px" },
    [desktop]: {
        marginTop: 0,
        padding: "48px 96px",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 0,
    },
}));

const ContentColumn = styled("div")({
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    [aboveMobile]: { width: "420px", maxWidth: "100%", marginBlock: "auto", alignSelf: "center" },
});

const BrandRoot = styled("div", transient)<{ $size: "desktop" | "mobile" }>(({ $size }) => ({
    width: "100%",
    height: "100%",
    padding: $size == "desktop" ? "44px" : "24px 24px 44px",
    display: "flex",
    flexDirection: "column",
    justifyContent: $size == "desktop" ? "flex-start" : "space-between",
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
    color: "#fff",
    backgroundColor: "var(--auth-ui-primary)",
    backgroundImage: 'url("/images/surface-noise.svg")',
    "@supports (color: color(display-p3 1 1 1))": {
        backgroundColor: "color(display-p3 0.03137 0.76078 0.1451)",
    },
    "&::before": {
        content: '""',
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: 'url("/images/frame-curves.svg")',
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
        maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.55) 42%, #000 100%)",
        animation: `${curvesDrift} 20s ease-in-out infinite`,
    },
    "@media (prefers-reduced-motion: reduce)": { "&::before": { animation: "none" } },
}));

const Headline = styled("h1", transient)<{ $size: "desktop" | "mobile" }>(({ $size }) => ({
    maxWidth: $size == "desktop" ? "320px" : "260px",
    margin: 0,
    fontFamily: displayFontFamily,
    fontSize: $size == "desktop" ? "42px" : "26px",
    fontWeight: 600,
    lineHeight: $size == "desktop" ? "50px" : "32px",
    letterSpacing: "-0.02em",
    textWrap: "pretty",
    ...copyAnimation,
    animationDelay: "80ms",
}));

const Subtitle = styled("p")({
    margin: "16px 0 0",
    fontSize: "20px",
    fontWeight: 500,
    lineHeight: "28px",
    color: "rgba(255, 255, 255, 0.88)",
    ...copyAnimation,
    animationDelay: "170ms",
});

const Bullets = styled("ul")({
    margin: "24px 0 0",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    listStyle: "none",
    "& li": {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        fontSize: "17px",
        fontWeight: 500,
        lineHeight: "24px",
        ...copyAnimation,
    },
    "& li:nth-of-type(1)": { animationDelay: "280ms" },
    "& li:nth-of-type(2)": { animationDelay: "350ms" },
    "& li:nth-of-type(3)": { animationDelay: "420ms" },
    "& .check": {
        width: 24,
        height: 24,
        flex: "0 0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        backgroundColor: "rgba(255, 255, 255, 0.14)",
    },
});

const IllustrationRoot = styled("div")({
    marginTop: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    position: "relative",
    zIndex: 1,
    "& .card": {
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "14px 16px",
        borderRadius: "16px",
        backgroundColor: "rgba(255, 255, 255, 0.16)",
        backdropFilter: "blur(6px)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
        animation: `${reveal} 500ms cubic-bezier(0.22, 1, 0.36, 1) both`,
    },
    "& .card:nth-of-type(2)": { marginLeft: "24px" },
    "& .card:nth-of-type(3)": { marginLeft: "12px" },
    "& .box": {
        width: 24,
        height: 24,
        flex: "0 0 24px",
        borderRadius: "50%",
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    "& .box.done": {
        backgroundColor: "#fff",
        color: "#08c225",
        boxShadow: "none",
        animation: `${checkPop} 360ms ease-out both`,
    },
    "& .line": { height: 10, borderRadius: 5, backgroundColor: "#fff" },
    "@media (prefers-reduced-motion: reduce)": {
        "& .card, & .box.done": { animation: "none" },
    },
});

// --- Form controls -------------------------------------------------------

export const ScreenHeader: React.FC<{ title: React.ReactNode; subtitle?: React.ReactNode }> = ({
    title,
    subtitle,
}) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ScreenTitle>{title}</ScreenTitle>
        {subtitle && <ScreenSubtitle>{subtitle}</ScreenSubtitle>}
    </div>
);

const ScreenTitle = styled("h1")({
    margin: 0,
    fontFamily: displayFontFamily,
    fontSize: "30px",
    fontWeight: 600,
    lineHeight: "38px",
    color: "var(--auth-ui-text)",
    [mobile]: { fontSize: "26px", lineHeight: "34px" },
});

const ScreenSubtitle = styled("p")({
    margin: 0,
    fontSize: "16px",
    fontWeight: 500,
    lineHeight: "24px",
    color: "var(--auth-ui-text-muted)",
    [mobile]: { fontSize: "14px", lineHeight: "20px" },
});

export const AuthForm = styled("form")({ display: "flex", flexDirection: "column", gap: "24px" });

export const FormFields = styled("div")({ display: "flex", flexDirection: "column", gap: "20px" });

export const FormFooter = styled("div")({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    ...bodyType,
    color: "var(--auth-ui-text-muted)",
    "& > :only-child": { marginInline: "auto" },
});

interface AuthTextFieldProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
    autoFocus?: boolean;
    autoComplete?: string;
    name?: string;
    error?: boolean;
    helperText?: React.ReactNode;
    password?: boolean;
    multiline?: boolean;
    disabled?: boolean;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

export const AuthTextField: React.FC<AuthTextFieldProps> = ({
    label,
    value,
    onChange,
    type = "text",
    password,
    multiline,
    error,
    helperText,
    ...rest
}) => {
    const id = useId();
    const [visible, setVisible] = useState(false);
    return (
        <FieldRoot>
            {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
            <FieldBox $error={!!error} $multiline={!!multiline}>
                {multiline ? (
                    <TextArea id={id} value={value} rows={4} onChange={(e) => onChange(e.target.value)} {...rest} />
                ) : (
                    <Input
                        id={id}
                        value={value}
                        type={password ? (visible ? "text" : "password") : type}
                        onChange={(e) => onChange(e.target.value)}
                        aria-invalid={error || undefined}
                        {...rest}
                    />
                )}
                {password && (
                    <PasswordToggle
                        type="button"
                        aria-label="Show or hide password"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setVisible((v) => !v)}
                    >
                        {visible ? <VisibilityOffIcon sx={{ fontSize: 20 }} /> : <VisibilityIcon sx={{ fontSize: 20 }} />}
                    </PasswordToggle>
                )}
            </FieldBox>
            {helperText && <Message $kind={error ? "error" : "info"}>{helperText}</Message>}
        </FieldRoot>
    );
};

const FieldRoot = styled("div")({
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "9px",
    "&:focus-within > label": { color: "var(--auth-ui-text)" },
});

const FieldLabel = styled("label")({
    ...miniType,
    color: "var(--auth-ui-text-muted)",
    transition: "color 100ms ease-in",
});

const FieldBox = styled("div", transient)<{ $error: boolean; $multiline: boolean }>(({ $error, $multiline }) => ({
    width: "100%",
    height: $multiline ? "auto" : "52px",
    padding: $multiline ? "16px" : "0 16px",
    borderRadius: "16px",
    display: "flex",
    alignItems: $multiline ? "flex-start" : "center",
    gap: "8px",
    boxSizing: "border-box",
    backgroundColor: "var(--auth-ui-field)",
    boxShadow: `inset 0 0 0 1px ${$error ? "var(--auth-ui-warning)" : "var(--auth-ui-stroke)"}`,
    "&:focus-within": {
        boxShadow: `inset 0 0 0 1px ${$error ? "var(--auth-ui-warning)" : "var(--auth-ui-primary)"}`,
    },
}));

const controlStyles = {
    ...bodyType,
    width: "100%",
    minWidth: 0,
    flex: 1,
    padding: 0,
    border: 0,
    outline: 0,
    background: "transparent",
    fontFamily: "inherit",
    color: "var(--auth-ui-text)",
    "&::placeholder": { color: "var(--auth-ui-text-faint)", opacity: 1 },
};

const Input = styled("input")(controlStyles);
const TextArea = styled("textarea")({ ...controlStyles, resize: "none", lineHeight: "22px" });

const PasswordToggle = styled("button")({
    width: 20,
    height: 20,
    flex: "0 0 20px",
    padding: 0,
    border: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    color: "var(--auth-ui-text-faint)",
    cursor: "pointer",
    "&:focus-visible": focusRing,
});

export const Message = styled("p", transient)<{ $kind: "error" | "info" | "success" | "caution" }>(({ $kind }) => ({
    ...miniType,
    margin: 0,
    color:
        $kind == "error"
            ? "var(--auth-ui-warning)"
            : $kind == "success"
              ? "var(--auth-ui-primary)"
              : $kind == "caution"
                ? "var(--auth-ui-caution)"
                : "var(--auth-ui-text-muted)",
}));

export const AuthButton: React.FC<
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> & {
        variant?: "primary" | "secondary";
        loading?: boolean;
        loadingMessage?: string;
    }
> = ({ variant = "primary", loading, loadingMessage, disabled, type = "button", children, ...rest }) => (
    <ButtonRoot type={type} disabled={disabled || loading} aria-busy={loading || undefined} $variant={variant} $loading={!!loading} {...rest}>
        {loading ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <CircularProgress size={20} color="inherit" />
                {loadingMessage && <span>{loadingMessage}</span>}
            </span>
        ) : (
            children
        )}
    </ButtonRoot>
);

const ButtonRoot = styled("button", transient)<{ $variant: "primary" | "secondary"; $loading: boolean }>(({ $variant, $loading }) => ({
    ...bodyType,
    width: "100%",
    height: "52px",
    padding: "14px 24px",
    border: 0,
    borderRadius: "20px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
    fontWeight: 600,
    color: $variant == "primary" ? "#fff" : "var(--auth-ui-text)",
    backgroundColor: $variant == "primary" ? "var(--auth-ui-primary)" : "var(--auth-ui-button-secondary)",
    boxShadow: $variant == "primary" ? "inset 0 0 0 1px var(--auth-ui-button-primary-stroke)" : "none",
    cursor: $loading ? "default" : "pointer",
    transition: "background-color 160ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
    "&:hover:not(:disabled)": {
        backgroundColor: $variant == "primary" ? "var(--auth-ui-primary-hover)" : "var(--auth-ui-button-secondary-hover)",
        transform: "translateY(-2px)",
    },
    "&:active:not(:disabled)": {
        backgroundColor: $variant == "primary" ? "var(--auth-ui-primary-active)" : "var(--auth-ui-fill-active)",
        transform: "translateY(0) scale(0.985)",
    },
    "&:focus-visible": focusRing,
    "&:disabled": $loading
        ? {}
        : {
              color: "var(--auth-ui-text-disabled)",
              backgroundColor: "var(--auth-ui-fill-hover)",
              boxShadow: "none",
              cursor: "not-allowed",
          },
}));

export const TextLink = styled("button")({
    ...bodyType,
    padding: 0,
    border: 0,
    background: "transparent",
    fontFamily: "inherit",
    fontWeight: 600,
    color: "var(--auth-ui-link)",
    cursor: "pointer",
    "&:hover": { textDecoration: "underline", textUnderlineOffset: "3px" },
    "&:focus-visible": { ...focusRing, borderRadius: 4 },
});

// --- Password strength ---------------------------------------------------

export const passwordStrength = (p: string): "weak" | "moderate" | "strong" => {
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score <= 2 ? "weak" : score <= 3 ? "moderate" : "strong";
};

export const PasswordStrengthHint: React.FC<{ password: string }> = ({ password }) => {
    if (!password) return null;
    const s = passwordStrength(password);
    return (
        <Message $kind={s == "weak" ? "error" : s == "moderate" ? "caution" : "success"}>
            Password strength: {s}
        </Message>
    );
};
