import AddIcon from "@mui/icons-material/Add";
import EventIcon from "@mui/icons-material/EventOutlined";
import FlagIcon from "@mui/icons-material/Flag";
import RepeatIcon from "@mui/icons-material/Repeat";
import StarIcon from "@mui/icons-material/Star";
import { Box, InputBase, Stack, styled, Typography } from "@mui/material";
import React, { useState } from "react";
import { formatDue, recurrenceLabel } from "../../utils/dates";
import { parseQuickAdd } from "../../utils/quick-add";
import { priorityColors, priorityLabels } from "./TaskRow";

interface AddTaskBarProps {
    inputRef: React.Ref<HTMLInputElement>;
    placeholder: string;
    onAdd: (input: ReturnType<typeof parseQuickAdd>) => Promise<void>;
}

/** The "Add a task" field, with live previews of what quick-add parsed. */
export const AddTaskBar: React.FC<AddTaskBarProps> = ({ inputRef, placeholder, onAdd }) => {
    const [value, setValue] = useState("");
    const [busy, setBusy] = useState(false);
    const [focused, setFocused] = useState(false);
    const parsed = value.trim() ? parseQuickAdd(value) : undefined;

    const submit = async () => {
        if (!parsed || busy) return;
        setBusy(true);
        try {
            await onAdd(parsed);
            setValue("");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Root className={focused ? "focused" : undefined}>
            <Stack direction="row" sx={{ alignItems: "center", gap: "12px" }}>
                <AddIcon sx={{ color: "accent.main" }} />
                <InputBase
                    inputRef={inputRef}
                    fullWidth
                    value={value}
                    placeholder={placeholder}
                    disabled={busy}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key == "Enter") void submit();
                        if (e.key == "Escape") (e.target as HTMLInputElement).blur();
                    }}
                    inputProps={{ "aria-label": "Add a task" }}
                    sx={{ fontSize: "16px", "& input::placeholder": { color: "text.faint", opacity: 1 } }}
                />
            </Stack>
            {parsed && (parsed.dueDate || parsed.priority || parsed.tags?.length || parsed.recurrence || parsed.starred) ? (
                <Preview>
                    {parsed.dueDate && (
                        <span>
                            <EventIcon />
                            {formatDue(parsed.dueDate, parsed.dueTime)}
                        </span>
                    )}
                    {parsed.recurrence && (
                        <span>
                            <RepeatIcon />
                            {recurrenceLabel[parsed.recurrence]}
                        </span>
                    )}
                    {!!parsed.priority && (
                        <span style={{ color: priorityColors[parsed.priority] }}>
                            <FlagIcon />
                            {priorityLabels[parsed.priority]}
                        </span>
                    )}
                    {parsed.starred && (
                        <Box component="span" sx={{ color: "fixed.golden" }}>
                            <StarIcon />
                            Starred
                        </Box>
                    )}
                    {parsed.tags?.map((t) => <span key={t}>#{t}</span>)}
                </Preview>
            ) : (
                focused && (
                    <Typography variant="mini" sx={{ color: "text.faint", pl: "36px", pt: "6px" }}>
                        Try “Call mom tomorrow 6pm !high #family” — press Enter to add
                    </Typography>
                )
            )}
        </Root>
    );
};

const Root = styled("div")(({ theme }) => ({
    padding: "12px 16px",
    borderRadius: "12px",
    backgroundColor: theme.vars.palette.background.searchInput,
    border: "1px solid transparent",
    transition: "border-color 120ms",
    "&.focused": { borderColor: theme.vars.palette.stroke.faint },
}));

const Preview = styled("div")(({ theme }) => ({
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    paddingTop: "10px",
    paddingLeft: "36px",
    "& > span": {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        borderRadius: "8px",
        backgroundColor: theme.vars.palette.fill.faint,
        color: theme.vars.palette.text.muted,
        fontSize: "12px",
    },
    "& svg": { fontSize: "14px" },
}));
