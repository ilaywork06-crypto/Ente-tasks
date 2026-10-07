import CheckIcon from "@mui/icons-material/Check";
import ChecklistIcon from "@mui/icons-material/ChecklistRtl";
import EventIcon from "@mui/icons-material/EventOutlined";
import FlagIcon from "@mui/icons-material/Flag";
import NotesIcon from "@mui/icons-material/NotesOutlined";
import RepeatIcon from "@mui/icons-material/Repeat";
import RestoreIcon from "@mui/icons-material/RestoreFromTrashOutlined";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import DeleteForeverIcon from "@mui/icons-material/DeleteForeverOutlined";
import { Box, IconButton, keyframes, Stack, styled, Tooltip, Typography } from "@mui/material";
import React from "react";
import type { Priority, Task, TaskList } from "../../services/tasks";
import { formatDue, isDueToday, isOverdue } from "../../utils/dates";

export const priorityColors: Record<Priority, string> = {
    0: "transparent",
    1: "#1071ff",
    2: "#f5a623",
    3: "#ea3f3f",
};

export const priorityLabels: Record<Priority, string> = { 0: "None", 1: "Low", 2: "Medium", 3: "High" };

interface TaskRowProps {
    task: Task;
    list?: TaskList;
    showList: boolean;
    selected: boolean;
    onToggle: () => void;
    onStar: () => void;
    onOpen: () => void;
    onTrash?: () => void;
    onRestore?: () => void;
    onDeleteForever?: () => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({
    task,
    list,
    showList,
    selected,
    onToggle,
    onStar,
    onOpen,
    onTrash,
    onRestore,
    onDeleteForever,
}) => {
    const doneSubtasks = task.subtasks.filter((s) => s.done).length;
    const overdue = isOverdue(task);
    const trashed = task.isTrashed;

    return (
        <Row
            onClick={trashed ? undefined : onOpen}
            className={selected ? "selected" : undefined}
            role={trashed ? undefined : "button"}
            tabIndex={trashed ? undefined : 0}
            onKeyDown={(e) => {
                if (!trashed && (e.key == "Enter" || e.key == " ") && e.target == e.currentTarget) {
                    e.preventDefault();
                    onOpen();
                }
            }}
        >
            {task.priority > 0 && <PriorityBar style={{ backgroundColor: priorityColors[task.priority] }} />}
            <RoundCheckbox
                checked={task.done}
                disabled={trashed}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                aria-label={task.done ? "Mark as not done" : "Mark as done"}
            />
            <Stack sx={{ flex: 1, minWidth: 0, gap: "6px", py: "2px" }}>
                <Typography
                    sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        transition: "color 200ms",
                        ...(task.done && { color: "text.faint", textDecoration: "line-through" }),
                    }}
                >
                    {task.title || "Untitled"}
                </Typography>
                <Meta>
                    {showList && list && (
                        <span>
                            <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: list.color, display: "inline-block" }} />
                            {list.name}
                        </span>
                    )}
                    {task.dueDate && (
                        <Box component="span" sx={overdue ? { color: "critical.main" } : isDueToday(task) && !task.done ? { color: "accent.main" } : undefined}>
                            <EventIcon />
                            {formatDue(task.dueDate, task.dueTime)}
                        </Box>
                    )}
                    {task.recurrence != "none" && (
                        <span>
                            <RepeatIcon />
                        </span>
                    )}
                    {task.subtasks.length > 0 && (
                        <span>
                            <ChecklistIcon />
                            {doneSubtasks}/{task.subtasks.length}
                        </span>
                    )}
                    {task.notes && (
                        <span>
                            <NotesIcon />
                        </span>
                    )}
                    {task.priority > 0 && (
                        <Box component="span" sx={{ color: priorityColors[task.priority] }}>
                            <FlagIcon />
                        </Box>
                    )}
                    {task.tags.map((t) => (
                        <Tag key={t}>#{t}</Tag>
                    ))}
                </Meta>
            </Stack>
            {trashed ? (
                <Stack direction="row">
                    <Tooltip title="Restore">
                        <IconButton color="secondary" onClick={onRestore} aria-label="Restore">
                            <RestoreIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete permanently">
                        <IconButton color="critical" onClick={onDeleteForever} aria-label="Delete permanently">
                            <DeleteForeverIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            ) : (
                <Stack direction="row">
                {onTrash && (
                    <Tooltip title="Move to trash">
                        <IconButton
                            className="trash"
                            color="secondary"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTrash();
                            }}
                            aria-label="Move to trash"
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                )}
                <IconButton
                    className={task.starred ? "star starred" : "star"}
                    onClick={(e) => {
                        e.stopPropagation();
                        onStar();
                    }}
                    aria-label={task.starred ? "Unstar" : "Star"}
                    sx={{ color: task.starred ? "fixed.golden" : "stroke.muted" }}
                >
                    {task.starred ? <StarIcon /> : <StarBorderIcon />}
                </IconButton>
                </Stack>
            )}
        </Row>
    );
};

const slideIn = keyframes({
    from: { opacity: 0, transform: "translateY(6px)" },
    to: { opacity: 1, transform: "translateY(0)" },
});

const Row = styled("div")(({ theme }) => ({
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 4px 8px 14px",
    borderRadius: "12px",
    backgroundColor: theme.vars.palette.fill.faint,
    cursor: "pointer",
    overflow: "hidden",
    animation: `${slideIn} 220ms ease-out both`,
    transition: "background-color 120ms",
    "&:hover, &.selected": { backgroundColor: theme.vars.palette.fill.faintHover },
    "&:focus-visible": { outline: `1px solid ${theme.vars.palette.stroke.base}`, outlineOffset: "1px" },
    "& .star:not(.starred), & .trash": { opacity: 0, transition: "opacity 120ms" },
    "&:hover .star, & .star:focus-visible, &:hover .trash, & .trash:focus-visible": { opacity: 1 },
    "@media (hover: none)": { "& .star:not(.starred)": { opacity: 1 }, "& .trash": { display: "none" } },
}));

const PriorityBar = styled("span")({
    position: "absolute",
    left: 0,
    top: "10px",
    bottom: "10px",
    width: "3px",
    borderRadius: "0 3px 3px 0",
});

const Meta = styled("div")(({ theme }) => ({
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: "10px",
    rowGap: "4px",
    color: theme.vars.palette.text.faint,
    fontSize: "12px",
    lineHeight: "15px",
    "&:empty": { display: "none" },
    "& > span": { display: "inline-flex", alignItems: "center", gap: "4px" },
    "& svg": { fontSize: "14px" },
}));

const Tag = styled("span")(({ theme }) => ({
    padding: "1px 6px",
    borderRadius: "6px",
    backgroundColor: theme.vars.palette.fill.faint,
    color: theme.vars.palette.text.muted,
}));

const pop = keyframes({
    "0%": { transform: "scale(0.6)" },
    "60%": { transform: "scale(1.15)" },
    "100%": { transform: "scale(1)" },
});

export const RoundCheckbox: React.FC<{
    checked: boolean;
    disabled?: boolean;
    size?: number;
    onClick: (e: React.MouseEvent) => void;
    "aria-label"?: string;
}> = ({ checked, disabled, size = 22, onClick, ...rest }) => (
    <CheckboxRoot
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={onClick}
        className={checked ? "checked" : undefined}
        style={{ width: size, height: size, flexBasis: size }}
        {...rest}
    >
        {checked && <CheckIcon style={{ fontSize: size * 0.7 }} />}
    </CheckboxRoot>
);

const CheckboxRoot = styled("button")(({ theme }) => ({
    flexShrink: 0,
    padding: 0,
    border: `2px solid ${theme.vars.palette.stroke.muted}`,
    borderRadius: "50%",
    background: "transparent",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "border-color 120ms, background-color 120ms",
    "&:hover:not(:disabled)": { borderColor: theme.vars.palette.accent.main },
    "&.checked": {
        borderColor: theme.vars.palette.accent.main,
        backgroundColor: theme.vars.palette.accent.main,
        animation: `${pop} 280ms ease-out`,
    },
    "&:focus-visible": { outline: `1px solid ${theme.vars.palette.stroke.base}`, outlineOffset: "2px" },
    "&:disabled": { cursor: "default", opacity: 0.6 },
}));
