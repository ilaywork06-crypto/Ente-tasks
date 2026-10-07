/**
 * Small building blocks ported from ente's web/packages/base/components.
 */
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import {
    Box,
    Button,
    CircularProgress,
    Divider,
    Drawer,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    styled,
    Switch,
    Typography,
    type ButtonProps,
    type DrawerProps,
    type IconButtonProps,
} from "@mui/material";
import React, { createContext, useContext, useMemo, useState } from "react";

// --- Buttons -------------------------------------------------------------

export const FocusVisibleButton = styled((props: ButtonProps) => (
    <Button disableRipple {...props} />
))(
    ({ theme }) => `
    &.Mui-focusVisible {
        outline: 1px solid ${theme.vars.palette.stroke.base};
        outline-offset: 2px;
    }
    &:active {
        outline: 1px solid ${theme.vars.palette.stroke.faint};
        outline-offset: 1px;
    }
`,
);

export const LoadingButton: React.FC<ButtonProps & { loading?: boolean }> = ({
    loading,
    disabled,
    color,
    children,
    ...rest
}) =>
    loading ? (
        <FocusVisibleButton {...{ color }} {...rest} disabled sx={{ "&.Mui-disabled": { backgroundColor: `${color ?? "primary"}.main` }, ...rest.sx }}>
            <CircularProgress size={20} sx={{ color: "inherit" }} />
        </FocusVisibleButton>
    ) : (
        <FocusVisibleButton {...{ color, disabled }} {...rest}>
            {children}
        </FocusVisibleButton>
    );

// --- Navbar --------------------------------------------------------------

export const NavbarBase = styled("div")(
    ({ theme }) => `
    flex: 0 0 64px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-bottom: 1px solid ${theme.vars.palette.divider};
`,
);

// --- Drawers -------------------------------------------------------------

type SidebarDrawerProps = DrawerProps & { maxWidth?: string };

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
    slotProps,
    children,
    maxWidth = "375px",
    ...rest
}) => (
    <Drawer
        {...rest}
        slotProps={{
            ...(slotProps ?? {}),
            paper: {
                sx: {
                    maxWidth,
                    width: "100%",
                    scrollbarWidth: "thin",
                    "&&": { padding: 0 },
                },
            },
        }}
    >
        <Box sx={{ p: 1 }}>{children}</Box>
    </Drawer>
);

export interface NestedDrawerProps {
    open: boolean;
    onClose: () => void;
    onRootClose: () => void;
}

export const SidebarDrawerTitlebar: React.FC<{
    title: string;
    caption?: string;
    onClose: () => void;
    onRootClose?: () => void;
    actionButton?: React.ReactNode;
}> = ({ title, caption, onClose, onRootClose, actionButton }) => (
    <Stack sx={{ gap: "4px" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <IconButton aria-label="Back" onClick={onClose} color="primary" sx={{ ml: "0.5rem" }}>
                <ArrowBackIcon />
            </IconButton>
            <Stack direction="row" sx={{ gap: "4px" }}>
                {actionButton}
                {onRootClose && (
                    <IconButton aria-label="Close" onClick={onRootClose} color="secondary">
                        <CloseIcon />
                    </IconButton>
                )}
            </Stack>
        </Stack>
        <Stack sx={{ pl: "calc(16px + 0.5rem)", pr: "16px", gap: "4px" }}>
            <Typography variant="h3" sx={{ fontSize: "22px" }}>
                {title}
            </Typography>
            <Typography variant="small" sx={{ color: "text.muted", wordBreak: "break-all", minHeight: "17px" }}>
                {caption}
            </Typography>
        </Stack>
    </Stack>
);

export const TitledNestedSidebarDrawer: React.FC<
    React.PropsWithChildren<NestedDrawerProps & { title: string; caption?: string; anchor?: DrawerProps["anchor"] }>
> = ({ open, onClose, onRootClose, title, caption, anchor = "left", children }) => (
    <SidebarDrawer
        open={open}
        anchor={anchor}
        transitionDuration={0}
        slotProps={{ backdrop: { sx: { "&&&": { backgroundColor: "transparent" } } } }}
        onClose={(_, reason) => {
            onClose();
            if (reason == "backdropClick") onRootClose();
        }}
    >
        <Stack sx={{ gap: "4px", py: "12px" }}>
            <SidebarDrawerTitlebar {...{ title, caption, onClose, onRootClose }} />
            <Stack sx={{ px: "16px", py: "20px", gap: "24px" }}>{children}</Stack>
        </Stack>
    </SidebarDrawer>
);

// --- Row buttons ---------------------------------------------------------

export const RowButtonGroupTitle: React.FC<React.PropsWithChildren<{ icon?: React.ReactNode }>> = ({
    children,
    icon,
}) => (
    <Stack direction="row" sx={{ px: "8px", py: "6px", gap: "8px", "& > svg": { fontSize: "17px", color: "stroke.muted" } }}>
        {icon}
        <Typography variant="small" sx={{ color: "text.muted" }}>
            {children}
        </Typography>
    </Stack>
);

export const RowButtonGroupHint: React.FC<React.PropsWithChildren> = ({ children }) => (
    <Typography variant="small" sx={{ color: "text.faint", px: "16px", py: "6px" }}>
        {children}
    </Typography>
);

export const RowButtonDivider = () => <Divider sx={{ opacity: 0.4 }} />;

export const RowButtonGroup = styled("div")(
    ({ theme }) => `
    background-color: ${theme.vars.palette.fill.faint};
    border-radius: 8px;
    & > button {
        border-radius: 8px;
        background-color: transparent;
    }
    & > button:not(:last-of-type) {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }
    & > button:not(:first-of-type) {
        border-top-left-radius: 0;
        border-top-right-radius: 0;
    }
    & > button:hover {
        background-color: ${theme.vars.palette.fill.faintHover};
    }
`,
);

const RowButtonRoot = styled(FocusVisibleButton, {
    shouldForwardProp: (p) => p !== "rbVariant",
})<{ rbVariant: "primary" | "secondary" }>(({ theme, rbVariant }) => ({
    padding: 0,
    justifyContent: "flex-start",
    fontWeight: "inherit",
    ...(rbVariant == "primary"
        ? {
              backgroundColor: theme.vars.palette.fill.faint,
              "&:hover": { backgroundColor: theme.vars.palette.fill.faintHover },
          }
        : {
              backgroundColor: "transparent",
              "&:hover": { backgroundColor: theme.vars.palette.fill.faint },
          }),
    borderRadius: "8px",
}));

export interface RowButtonProps {
    variant?: "primary" | "secondary";
    color?: "primary" | "critical" | "accent";
    disabled?: boolean;
    onClick: () => void;
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
    label: React.ReactNode;
    caption?: React.ReactNode;
    selected?: boolean;
}

export const RowButton: React.FC<RowButtonProps> = ({
    variant = "primary",
    color = "primary",
    disabled,
    startIcon,
    endIcon,
    label,
    caption,
    onClick,
    selected,
}) => (
    <RowButtonRoot
        rbVariant={variant}
        fullWidth
        {...{ disabled, onClick }}
        sx={selected ? { "&&": { backgroundColor: "fill.faintHover" } } : undefined}
    >
        <Stack
            direction="row"
            sx={[
                {
                    flex: 1,
                    justifyContent: "space-between",
                    alignItems: "center",
                    px: "16px",
                    pr: "12px",
                    color: "text.base",
                    "& svg": { fontSize: "20px" },
                },
                color == "critical" && { color: "critical.main" },
                color == "accent" && { color: "accent.main" },
                !!disabled && { color: "text.muted" },
            ]}
        >
            <Stack direction="row" sx={{ py: "14px", gap: "10px", alignItems: "center", minWidth: 0 }}>
                {startIcon}
                <Box sx={{ px: "2px", minWidth: 0 }}>
                    {typeof label != "string" ? (
                        label
                    ) : (
                        <Typography sx={{ textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {label}
                        </Typography>
                    )}
                </Box>
            </Stack>
            <Stack direction="row" sx={{ gap: "8px", alignItems: "center", color: "text.faint" }}>
                {caption !== undefined && (
                    <Typography variant="small" sx={{ color: "text.faint" }}>
                        {caption}
                    </Typography>
                )}
                {endIcon}
            </Stack>
        </Stack>
    </RowButtonRoot>
);

export const RowSwitch: React.FC<{
    label: string;
    checked: boolean;
    onClick: () => void;
    disabled?: boolean;
}> = ({ label, checked, onClick, disabled }) => (
    <RowButton
        label={label}
        onClick={onClick}
        disabled={disabled}
        endIcon={<EnteSwitch checked={checked} disabled={disabled} tabIndex={-1} />}
    />
);

/** iOS style switch, as used throughout ente. */
export const EnteSwitch = styled(Switch)(({ theme }) => ({
    width: 40,
    height: 24,
    padding: 0,
    "& .MuiSwitch-switchBase": {
        padding: 0,
        margin: 2,
        transitionDuration: "300ms",
        "&.Mui-checked": {
            transform: "translateX(16px)",
            color: "#fff",
            "& + .MuiSwitch-track": {
                backgroundColor: theme.vars.palette.fixed.switchOn,
                opacity: 1,
                border: 0,
            },
        },
    },
    "& .MuiSwitch-thumb": { boxSizing: "border-box", width: 20, height: 20 },
    "& .MuiSwitch-track": {
        borderRadius: 12,
        backgroundColor: theme.vars.palette.fill.muted,
        opacity: 1,
    },
}));

// --- Overflow menu -------------------------------------------------------

const OverflowMenuContext = createContext<{ close: () => void } | undefined>(undefined);

export const OverflowMenu: React.FC<
    React.PropsWithChildren<{ ariaID: string; triggerButtonIcon?: React.ReactNode; triggerButtonProps?: IconButtonProps }>
> = ({ ariaID, triggerButtonIcon, triggerButtonProps, children }) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement>();
    const context = useMemo(() => ({ close: () => setAnchorEl(undefined) }), []);
    return (
        <OverflowMenuContext value={context}>
            <IconButton
                onClick={(e) => {
                    e.stopPropagation();
                    setAnchorEl(e.currentTarget);
                }}
                aria-label="More options"
                aria-controls={anchorEl ? ariaID : undefined}
                aria-haspopup="true"
                {...triggerButtonProps}
            >
                {triggerButtonIcon ?? <MoreHorizIcon />}
            </IconButton>
            <Menu
                id={ariaID}
                anchorEl={anchorEl}
                open={!!anchorEl}
                onClose={() => setAnchorEl(undefined)}
                onClick={(e) => e.stopPropagation()}
                slotProps={{ list: { disablePadding: true } }}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
                {children}
            </Menu>
        </OverflowMenuContext>
    );
};

export const OverflowMenuOption: React.FC<
    React.PropsWithChildren<{
        onClick: () => void;
        color?: "primary" | "critical";
        startIcon?: React.ReactNode;
        endIcon?: React.ReactNode;
        selected?: boolean;
    }>
> = ({ onClick, color = "primary", startIcon, endIcon, selected, children }) => {
    const menuContext = useContext(OverflowMenuContext);
    return (
        <MenuItem
            onClick={() => {
                onClick();
                menuContext?.close();
            }}
            selected={selected}
            sx={(theme) => ({
                minWidth: 220,
                color: theme.vars.palette[color].main,
                "& .MuiSvgIcon-root": { fontSize: "20px" },
            })}
        >
            <Stack direction="row" sx={{ gap: 1.5, alignItems: "center", width: "100%", py: "6px" }}>
                {startIcon}
                <Typography sx={{ flex: 1, fontWeight: "medium" }}>{children}</Typography>
                {endIcon}
            </Stack>
        </MenuItem>
    );
};
