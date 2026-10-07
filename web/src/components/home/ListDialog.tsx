import CheckIcon from "@mui/icons-material/Check";
import { Box, Dialog, DialogContent, Stack, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import { listColors, type ListData } from "../../services/tasks";
import { FocusVisibleButton, LoadingButton } from "../mui";

const emojis = [
    "📝", "🏠", "💼", "🛒", "🎯", "📚", "💪", "✈️", "🎨", "💡", "🧘", "🍳",
    "🎵", "💰", "🌱", "🐾", "🎁", "🔧", "🧪", "🎮", "📦", "❤️", "🚀", "⭐",
];

interface ListDialogProps {
    open: boolean;
    initial?: ListData;
    onClose: () => void;
    onSubmit: (data: ListData) => Promise<void>;
}

export const ListDialog: React.FC<ListDialogProps> = ({ open, onClose, ...rest }) => (
    <Dialog open={open} onClose={onClose} fullWidth slotProps={{ paper: { sx: { maxWidth: "380px" } } }}>
        {open && <ListForm onClose={onClose} {...rest} />}
    </Dialog>
);

const ListForm: React.FC<Omit<ListDialogProps, "open">> = ({ initial, onClose, onSubmit }) => {
    const [name, setName] = useState(initial?.name ?? "");
    const [emoji, setEmoji] = useState(initial?.emoji ?? "📝");
    const [color, setColor] = useState(initial?.color ?? listColors[0]!);
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
            await onSubmit({ ...initial, name: name.trim(), emoji, color });
            onClose();
        } finally {
            setBusy(false);
        }
    };

    return (
        <DialogContent>
            <form onSubmit={submit}>
                <Stack sx={{ gap: 2 }}>
                    <Typography variant="h5" sx={{ pt: 1 }}>
                        {initial ? "Edit list" : "New list"}
                    </Typography>
                    <Stack direction="row" sx={{ gap: 2, alignItems: "center" }}>
                        <Box
                            sx={{
                                width: 64,
                                height: 64,
                                flexShrink: 0,
                                borderRadius: "4px",
                                backgroundColor: color,
                                backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 60%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 28,
                            }}
                        >
                            {emoji}
                        </Box>
                        <TextField fullWidth autoFocus label="List name" value={name} onChange={(e) => setName(e.target.value)} slotProps={{ htmlInput: { maxLength: 60 } }} />
                    </Stack>
                    <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                        {listColors.map((c) => (
                            <Box
                                key={c}
                                component="button"
                                type="button"
                                aria-label={`Colour ${c}`}
                                onClick={() => setColor(c)}
                                sx={{
                                    width: 28,
                                    height: 28,
                                    border: 0,
                                    borderRadius: "50%",
                                    backgroundColor: c,
                                    cursor: "pointer",
                                    color: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    outline: color == c ? "2px solid" : "none",
                                    outlineColor: "stroke.base",
                                    outlineOffset: "2px",
                                }}
                            >
                                {color == c && <CheckIcon sx={{ fontSize: 16 }} />}
                            </Box>
                        ))}
                    </Stack>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "4px", p: 1, borderRadius: "8px", backgroundColor: "fill.faint" }}>
                        {emojis.map((e) => (
                            <Box
                                key={e}
                                component="button"
                                type="button"
                                onClick={() => setEmoji(e)}
                                sx={{
                                    aspectRatio: "1",
                                    border: 0,
                                    borderRadius: "6px",
                                    fontSize: 20,
                                    cursor: "pointer",
                                    backgroundColor: emoji == e ? "fill.muted" : "transparent",
                                    "&:hover": { backgroundColor: "fill.faintHover" },
                                }}
                            >
                                {e}
                            </Box>
                        ))}
                    </Box>
                    <Stack sx={{ gap: 1, pt: 1 }}>
                        <LoadingButton type="submit" color="accent" fullWidth loading={busy} disabled={!name.trim()}>
                            {initial ? "Save" : "Create list"}
                        </LoadingButton>
                        <FocusVisibleButton color="secondary" fullWidth onClick={onClose}>
                            Cancel
                        </FocusVisibleButton>
                    </Stack>
                </Stack>
            </form>
        </DialogContent>
    );
};
