/**
 * The task editor, shown in a right-hand drawer in the style of ente's
 * file info panel and nested sidebar drawers.
 */
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import DriveFileMoveIcon from "@mui/icons-material/DriveFileMoveOutlined";
import EventIcon from "@mui/icons-material/EventOutlined";
import FlagIcon from "@mui/icons-material/Flag";
import RepeatIcon from "@mui/icons-material/Repeat";
import ScheduleIcon from "@mui/icons-material/Schedule";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import {
    Box,
    IconButton,
    InputBase,
    MenuItem,
    Select,
    Stack,
    styled,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from "@mui/material";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { useAppContext } from "../../app-context";
import type { Priority, Recurrence, Task, TaskList } from "../../services/tasks";
import { useTasks } from "../../store";
import { recurrenceLabel, todayYMD, ymd } from "../../utils/dates";
import {
    OverflowMenu,
    OverflowMenuOption,
    RowButtonGroup,
    RowButtonGroupTitle,
    SidebarDrawer,
} from "../mui";
import { priorityColors, priorityLabels, RoundCheckbox } from "./TaskRow";

interface TaskDetailProps {
    task: Task | undefined;
    onClose: () => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ task, onClose }) => (
    <SidebarDrawer anchor="right" open={!!task} onClose={onClose} maxWidth="420px">
        {task && <TaskEditor key={task.id} task={task} onClose={onClose} />}
    </SidebarDrawer>
);

const TaskEditor: React.FC<{ task: Task; onClose: () => void }> = ({ task, onClose }) => {
    const { lists, updateTask, toggleDone, moveTask, trashTask, addTask } = useTasks();
    const { notify } = useAppContext();
    const [title, setTitle] = useState(task.title);
    const [notes, setNotes] = useState(task.notes);
    const [newSubtask, setNewSubtask] = useState("");
    const [newTag, setNewTag] = useState("");

    useEffect(() => setTitle(task.title), [task.title]);
    useEffect(() => setNotes(task.notes), [task.notes]);

    const save = (patch: Partial<Task>) =>
        void updateTask({ ...task, ...patch }).catch((e: unknown) =>
            notify(e instanceof Error ? e.message : "Failed to save", "error"),
        );

    const list = lists.find((l) => l.id == task.listId);

    const addSubtask = () => {
        const t = newSubtask.trim();
        if (!t) return;
        save({ subtasks: [...task.subtasks, { id: crypto.randomUUID(), title: t, done: false }] });
        setNewSubtask("");
    };

    const addTag = () => {
        const t = newTag.trim().replace(/^#/, "").toLowerCase();
        if (t && !task.tags.includes(t)) save({ tags: [...task.tags, t] });
        setNewTag("");
    };

    return (
        <Stack sx={{ gap: "16px", pb: 2 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", pl: 1 }}>
                <Typography variant="small" sx={{ color: "text.muted", display: "flex", alignItems: "center", gap: 1 }}>
                    {list && <Box component="span" sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: list.color }} />}
                    {list?.emoji} {list?.name}
                </Typography>
                <Stack direction="row">
                    <Tooltip title={task.starred ? "Unstar" : "Star"}>
                        <IconButton onClick={() => save({ starred: !task.starred })} sx={{ color: task.starred ? "fixed.golden" : "stroke.muted" }}>
                            {task.starred ? <StarIcon /> : <StarBorderIcon />}
                        </IconButton>
                    </Tooltip>
                    <OverflowMenu ariaID="task-options">
                        <OverflowMenuOption
                            startIcon={<ContentCopyIcon />}
                            onClick={() =>
                                void addTask(task.listId, { ...task, title: `${task.title} (copy)`, done: false, createdAt: Date.now(), order: Date.now() }).then(() =>
                                    notify("Task duplicated"),
                                )
                            }
                        >
                            Duplicate
                        </OverflowMenuOption>
                        <OverflowMenuOption
                            color="critical"
                            startIcon={<DeleteIcon />}
                            onClick={() => {
                                void trashTask(task).then(() => notify("Moved to trash"));
                                onClose();
                            }}
                        >
                            Move to trash
                        </OverflowMenuOption>
                    </OverflowMenu>
                    <IconButton onClick={onClose} color="secondary" aria-label="Close">
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </Stack>

            <Stack direction="row" sx={{ gap: "12px", alignItems: "flex-start", px: 1 }}>
                <Box sx={{ pt: "5px" }}>
                    <RoundCheckbox checked={task.done} size={26} onClick={() => void toggleDone(task)} aria-label="Done" />
                </Box>
                <InputBase
                    multiline
                    fullWidth
                    value={title}
                    placeholder="Task title"
                    onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
                    onBlur={() => title.trim() != task.title && save({ title: title.trim() || task.title })}
                    onKeyDown={(e) => e.key == "Enter" && (e.target as HTMLElement).blur()}
                    sx={{
                        fontSize: "22px",
                        lineHeight: "28px",
                        fontWeight: 600,
                        ...(task.done && { color: "text.faint", textDecoration: "line-through" }),
                    }}
                />
            </Stack>

            <Section title="Schedule">
                <FieldRow icon={<EventIcon />} label="Due date">
                    <DateInput
                        type="date"
                        value={task.dueDate ?? ""}
                        onChange={(e) => save({ dueDate: e.target.value || undefined, ...(e.target.value ? {} : { dueTime: undefined }) })}
                    />
                </FieldRow>
                <QuickDates>
                    {[
                        ["Today", todayYMD()],
                        ["Tomorrow", ymd(dayjs().add(1, "day"))],
                        ["Next week", ymd(dayjs().add(1, "week").day(1))],
                    ].map(([label, d]) => (
                        <button key={label} className={task.dueDate == d ? "active" : undefined} onClick={() => save({ dueDate: d })}>
                            {label}
                        </button>
                    ))}
                    {task.dueDate && <button onClick={() => save({ dueDate: undefined, dueTime: undefined })}>Clear</button>}
                </QuickDates>
                <FieldRow icon={<ScheduleIcon />} label="Time">
                    <DateInput
                        type="time"
                        value={task.dueTime ?? ""}
                        disabled={!task.dueDate}
                        onChange={(e) => save({ dueTime: e.target.value || undefined })}
                    />
                </FieldRow>
                <FieldRow icon={<RepeatIcon />} label="Repeat">
                    <InlineSelect value={task.recurrence} onChange={(v) => save({ recurrence: v as Recurrence, ...(v != "none" && !task.dueDate ? { dueDate: todayYMD() } : {}) })} options={Object.entries(recurrenceLabel)} />
                </FieldRow>
            </Section>

            <Section title="Details">
                <FieldRow icon={<FlagIcon sx={{ color: priorityColors[task.priority] == "transparent" ? undefined : priorityColors[task.priority] }} />} label="Priority">
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={task.priority}
                        onChange={(_, v: Priority | null) => v !== null && save({ priority: v })}
                        sx={{ "& .MuiToggleButton-root": { px: 1, py: "3px", textTransform: "none", fontSize: 12, border: 0, borderRadius: "6px !important" } }}
                    >
                        {([0, 1, 2, 3] as Priority[]).map((p) => (
                            <ToggleButton key={p} value={p} sx={{ "&.Mui-selected": { color: p ? priorityColors[p] : "text.base" } }}>
                                {priorityLabels[p]}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </FieldRow>
                <FieldRow icon={<DriveFileMoveIcon />} label="List">
                    <InlineSelect
                        value={String(task.listId)}
                        onChange={(v) => void moveTask(task, Number(v)).then(() => notify("Task moved"))}
                        options={lists.map((l: TaskList) => [String(l.id), `${l.emoji} ${l.name}`])}
                    />
                </FieldRow>
            </Section>

            <Section title={`Subtasks${task.subtasks.length ? ` · ${task.subtasks.filter((s) => s.done).length}/${task.subtasks.length}` : ""}`}>
                {task.subtasks.map((st) => (
                    <SubtaskRow key={st.id}>
                        <RoundCheckbox
                            size={18}
                            checked={st.done}
                            onClick={() => save({ subtasks: task.subtasks.map((s) => (s.id == st.id ? { ...s, done: !s.done } : s)) })}
                        />
                        <InputBase
                            fullWidth
                            defaultValue={st.title}
                            onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (v && v != st.title) save({ subtasks: task.subtasks.map((s) => (s.id == st.id ? { ...s, title: v } : s)) });
                            }}
                            sx={{ fontSize: 14, ...(st.done && { textDecoration: "line-through", color: "text.faint" }) }}
                        />
                        <IconButton size="small" color="secondary" onClick={() => save({ subtasks: task.subtasks.filter((s) => s.id != st.id) })} aria-label="Remove subtask">
                            <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </SubtaskRow>
                ))}
                <SubtaskRow>
                    <AddIcon sx={{ fontSize: 18, color: "text.faint" }} />
                    <InputBase fullWidth value={newSubtask} placeholder="Add subtask" onChange={(e) => setNewSubtask(e.target.value)} onKeyDown={(e) => e.key == "Enter" && addSubtask()} onBlur={addSubtask} sx={{ fontSize: 14 }} />
                </SubtaskRow>
            </Section>

            <Section title="Tags">
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: "6px", p: "12px" }}>
                    {task.tags.map((t) => (
                        <TagChip key={t}>
                            #{t}
                            <button onClick={() => save({ tags: task.tags.filter((x) => x != t) })} aria-label={`Remove ${t}`}>
                                <CloseIcon sx={{ fontSize: 12 }} />
                            </button>
                        </TagChip>
                    ))}
                    <InputBase
                        value={newTag}
                        placeholder="Add tag"
                        onChange={(e) => setNewTag(e.target.value.replace(/\s/g, ""))}
                        onKeyDown={(e) => e.key == "Enter" && addTag()}
                        onBlur={addTag}
                        sx={{ fontSize: 13, minWidth: 80, flex: 1 }}
                    />
                </Stack>
            </Section>

            <Section title="Notes">
                <InputBase
                    multiline
                    minRows={4}
                    fullWidth
                    value={notes}
                    placeholder="Add notes…"
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => notes != task.notes && save({ notes })}
                    sx={{ p: "12px", fontSize: 14, lineHeight: "21px", alignItems: "flex-start" }}
                />
            </Section>

            <Typography variant="mini" sx={{ color: "text.faint", px: 1, textAlign: "center" }}>
                Created {dayjs(task.createdAt).format("D MMM YYYY, HH:mm")}
                {task.completedAt && ` · Completed ${dayjs(task.completedAt).format("D MMM YYYY, HH:mm")}`}
                <br />
                🔒 End-to-end encrypted
            </Typography>
        </Stack>
    );
};

const Section: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
    <Box sx={{ px: 1 }}>
        <RowButtonGroupTitle>{title}</RowButtonGroupTitle>
        <RowButtonGroup>{children}</RowButtonGroup>
    </Box>
);

const FieldRow: React.FC<React.PropsWithChildren<{ icon: React.ReactNode; label: string }>> = ({ icon, label, children }) => (
    <Stack
        direction="row"
        sx={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: "16px",
            pr: "12px",
            minHeight: "52px",
            "&:not(:last-of-type)": { borderBottom: "1px solid", borderColor: "stroke.fainter" },
            "& > .label svg": { fontSize: 20, color: "stroke.muted" },
        }}
    >
        <Stack className="label" direction="row" sx={{ gap: "10px", alignItems: "center" }}>
            {icon}
            <Typography>{label}</Typography>
        </Stack>
        {children}
    </Stack>
);

const InlineSelect: React.FC<{ value: string; onChange: (v: string) => void; options: [string, string][] }> = ({ value, onChange, options }) => (
    <Select
        variant="standard"
        disableUnderline
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ fontSize: 14, color: "text.muted", "& .MuiSelect-select": { py: "4px", pr: "28px !important" }, "&.MuiInputBase-root": { borderRadius: 0 } }}
    >
        {options.map(([v, label]) => (
            <MenuItem key={v} value={v}>
                {label}
            </MenuItem>
        ))}
    </Select>
);

const DateInput = styled("input")(({ theme }) => ({
    border: 0,
    background: "transparent",
    color: theme.vars.palette.text.muted,
    fontFamily: "inherit",
    fontSize: "14px",
    colorScheme: "light dark",
    outline: "none",
    "&:disabled": { opacity: 0.4 },
}));

const QuickDates = styled("div")(({ theme }) => ({
    display: "flex",
    gap: "6px",
    padding: "0 16px 12px 46px",
    borderBottom: `1px solid ${theme.vars.palette.stroke.fainter}`,
    "& button": {
        border: 0,
        borderRadius: "8px",
        padding: "4px 10px",
        fontFamily: "inherit",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        color: theme.vars.palette.text.muted,
        backgroundColor: theme.vars.palette.fill.faint,
    },
    "& button:hover": { backgroundColor: theme.vars.palette.fill.faintHover },
    "& button.active": { color: "#fff", backgroundColor: theme.vars.palette.accent.main },
}));

const SubtaskRow = styled("div")(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "6px 8px 6px 16px",
    minHeight: "44px",
    "&:not(:last-of-type)": { borderBottom: `1px solid ${theme.vars.palette.stroke.fainter}` },
}));

const TagChip = styled("span")(({ theme }) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 6px 4px 10px",
    borderRadius: "8px",
    fontSize: "13px",
    backgroundColor: theme.vars.palette.fill.faintHover,
    "& button": {
        border: 0,
        padding: 2,
        display: "flex",
        background: "transparent",
        color: theme.vars.palette.text.muted,
        cursor: "pointer",
        borderRadius: "50%",
    },
}));
