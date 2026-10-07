/**
 * The app sidebar, following the structure of ente Photos' sidebar: header
 * with the wordmark, the user's email and a summary card, shortcuts, utility
 * rows, and a critical "Log out" row at the end.
 */
import AccountCircleIcon from "@mui/icons-material/AccountCircleOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import KeyboardIcon from "@mui/icons-material/KeyboardOutlined";
import LockIcon from "@mui/icons-material/LockOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import TuneIcon from "@mui/icons-material/Tune";
import { Box, Divider, IconButton, LinearProgress, Stack, styled, Typography } from "@mui/material";
import dayjs from "dayjs";
import React, { useMemo, useState } from "react";
import { useAppContext } from "../../app-context";
import { useTasks } from "../../store";
import { RowButton, SidebarDrawer } from "../mui";
import { Wordmark } from "../Wordmark";
import { AccountSettings, Preferences, ShortcutsDialog } from "./Settings";
import { smartViews, tasksInView, viewCount, type View } from "./views";

interface SidebarProps {
    open: boolean;
    onClose: () => void;
    onSelectView: (view: View) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose, onSelectView }) => {
    const { user, logout, showMiniDialog } = useAppContext();
    const { tasks, lists } = useTasks();
    const [nested, setNested] = useState<"account" | "preferences">();
    const [showShortcuts, setShowShortcuts] = useState(false);

    const select = (view: View) => {
        onSelectView(view);
        onClose();
    };

    const exportData = () => {
        const data = {
            exportedAt: new Date().toISOString(),
            lists: lists.map(({ key: _key, ...l }) => ({
                ...l,
                tasks: tasks
                    .filter((t) => t.listId == l.id && !t.isTrashed)
                    .map(({ listId: _l, isTrashed: _t, trashedAt: _ta, ...t }) => t),
            })),
        };
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
        a.download = `ente-tasks-export-${dayjs().format("YYYY-MM-DD")}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const trashCount = viewCount({ kind: "smart", id: "trash" }, tasks);

    return (
        <>
            <SidebarDrawer open={open} onClose={onClose}>
                <Stack sx={{ gap: 0.5, mb: 3 }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: "6px", pl: "12px" }}>
                        <Wordmark size={20} />
                        <IconButton aria-label="Close" onClick={onClose} color="primary">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                    <Box sx={{ px: 0.5, mt: 1.5, pb: 1.5, mb: 1 }}>
                        <Typography sx={{ px: 1, pb: 1, color: "text.muted", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {user?.email}
                        </Typography>
                        <SummaryCard />
                    </Box>
                    {smartViews.map((v) => (
                        <RowButton
                            key={v.id}
                            variant="secondary"
                            startIcon={<span style={{ fontSize: 18, width: 20, textAlign: "center" }}>{v.emoji}</span>}
                            label={v.name}
                            caption={viewCount({ kind: "smart", id: v.id }, tasks) || undefined}
                            onClick={() => select({ kind: "smart", id: v.id })}
                        />
                    ))}
                    <RowButton
                        variant="secondary"
                        startIcon={<DeleteIcon />}
                        label="Trash"
                        caption={trashCount || undefined}
                        onClick={() => select({ kind: "smart", id: "trash" })}
                    />
                    <Divider sx={{ my: "6px", opacity: 0.6 }} />
                    <RowButton variant="secondary" startIcon={<AccountCircleIcon />} label="Account" endIcon={<ChevronRightIcon />} onClick={() => setNested("account")} />
                    <RowButton variant="secondary" startIcon={<TuneIcon />} label="Preferences" endIcon={<ChevronRightIcon />} onClick={() => setNested("preferences")} />
                    <RowButton variant="secondary" startIcon={<DownloadIcon />} label="Export data" onClick={exportData} />
                    <RowButton variant="secondary" startIcon={<KeyboardIcon />} label="Keyboard shortcuts" onClick={() => setShowShortcuts(true)} />
                    <Divider sx={{ my: "6px", opacity: 0.6 }} />
                    <RowButton
                        variant="secondary"
                        color="critical"
                        startIcon={<LogoutIcon />}
                        label="Log out"
                        onClick={() =>
                            showMiniDialog({
                                title: "Log out",
                                message: "Are you sure you want to log out?",
                                continue: { text: "Log out", color: "critical", action: logout },
                            })
                        }
                    />
                    <Stack direction="row" sx={{ gap: 1, alignItems: "center", justifyContent: "center", mt: 3, color: "text.faint" }}>
                        <LockIcon sx={{ fontSize: 14 }} />
                        <Typography variant="mini" sx={{ color: "text.faint" }}>
                            End-to-end encrypted · v1.0.0
                        </Typography>
                    </Stack>
                </Stack>
            </SidebarDrawer>
            <AccountSettings open={nested == "account"} onClose={() => setNested(undefined)} onRootClose={() => { setNested(undefined); onClose(); }} />
            <Preferences open={nested == "preferences"} onClose={() => setNested(undefined)} onRootClose={() => { setNested(undefined); onClose(); }} />
            <ShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />
        </>
    );
};

/** In the spot where ente shows the storage/subscription card. */
const SummaryCard: React.FC = () => {
    const { tasks } = useTasks();
    const stats = useMemo(() => {
        const today = tasksInView({ kind: "smart", id: "today" }, tasks);
        const live = tasks.filter((t) => !t.isTrashed);
        return {
            todayDone: today.filter((t) => t.done).length,
            todayTotal: today.length,
            open: live.filter((t) => !t.done).length,
            done: live.filter((t) => t.done).length,
        };
    }, [tasks]);
    const pct = stats.todayTotal ? (100 * stats.todayDone) / stats.todayTotal : 0;

    return (
        <Card>
            <Typography variant="small" sx={{ opacity: 0.75 }}>
                Today
            </Typography>
            <Typography variant="h3" sx={{ mt: 0.5 }}>
                {stats.todayTotal ? `${stats.todayDone} of ${stats.todayTotal}` : "All clear"}
                <Typography component="span" variant="small" sx={{ opacity: 0.75, ml: 1 }}>
                    {stats.todayTotal ? "done" : "🎉"}
                </Typography>
            </Typography>
            <LinearProgress
                variant="determinate"
                value={pct}
                sx={{ mt: 2, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.24)", "& .MuiLinearProgress-bar": { backgroundColor: "#fff", borderRadius: 3 } }}
            />
            <Stack direction="row" sx={{ justifyContent: "space-between", mt: 1.5 }}>
                <Typography variant="mini" sx={{ opacity: 0.85 }}>
                    {stats.open} open
                </Typography>
                <Typography variant="mini" sx={{ opacity: 0.85 }}>
                    {stats.done} completed
                </Typography>
            </Stack>
        </Card>
    );
};

const Card = styled("div")({
    padding: "20px 16px 16px",
    borderRadius: "12px",
    color: "#fff",
    backgroundColor: "#1db954",
    backgroundImage:
        "url('/images/frame-curves.svg'), linear-gradient(135deg, #01de4d 0%, #1db954 45%, #00872d 100%)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
});
