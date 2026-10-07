import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweepOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";
import CheckIcon from "@mui/icons-material/Check";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOffOutlined";
import {
    Box,
    CircularProgress,
    Collapse,
    Dialog,
    DialogContent,
    IconButton,
    InputBase,
    Stack,
    styled,
    Tooltip,
    Typography,
    useMediaQuery,
} from "@mui/material";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "../app-context";
import { AddTaskBar } from "../components/home/AddTaskBar";
import { FilledIconButton, ListBar } from "../components/home/ListBar";
import { ListDialog } from "../components/home/ListDialog";
import { Sidebar } from "../components/home/Sidebar";
import { TaskDetail } from "../components/home/TaskDetail";
import { TaskRow } from "../components/home/TaskRow";
import { ShortcutsDialog } from "../components/home/Settings";
import {
    groupTasks,
    matchesSearch,
    sameView,
    smartViews,
    sortTasks,
    tasksInView,
    viewCount,
    viewTitle,
    type View,
} from "../components/home/views";
import { NavbarBase, OverflowMenu, OverflowMenuOption, RowButtonGroupTitle } from "../components/mui";
import { Wordmark } from "../components/Wordmark";
import { setPref, usePrefs } from "../prefs";
import type { SortOrder, Task, TaskList } from "../services/tasks";
import { TasksProvider, useTasks } from "../store";
import { formatDue, todayYMD, ymd } from "../utils/dates";
import dayjs from "dayjs";

export const HomePage: React.FC = () => {
    const { masterKey } = useAppContext();
    if (!masterKey) return null;
    return (
        <TasksProvider masterKey={masterKey}>
            <HomeContents />
        </TasksProvider>
    );
};

const sortLabels: Record<SortOrder, string> = {
    dueDate: "Due date",
    priority: "Priority",
    title: "Title",
    created: "Recently added",
    manual: "Oldest first",
};

const loadView = (): View => {
    try {
        const v = JSON.parse(localStorage.getItem("view") ?? "") as View;
        if (v && (v.kind == "smart" || v.kind == "list")) return v;
    } catch {
        /* ignore */
    }
    return { kind: "smart", id: "today" };
};

const loadSmartSorts = (): Record<string, SortOrder> => {
    try {
        return JSON.parse(localStorage.getItem("smartSorts") ?? "{}") as Record<string, SortOrder>;
    } catch {
        return {};
    }
};

const HomeContents: React.FC = () => {
    const { notify, showMiniDialog } = useAppContext();
    const store = useTasks();
    const { loading, lists, tasks } = store;
    const prefs = usePrefs();
    const isSmall = useMediaQuery("(max-width: 600px)");

    const [view, setViewState] = useState<View>(loadView);
    const [search, setSearch] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedID, setSelectedID] = useState<number>();
    const [listDialog, setListDialog] = useState<{ edit?: TaskList }>();
    const [allListsOpen, setAllListsOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [showCompleted, setShowCompleted] = useState(true);
    const [smartSorts, setSmartSorts] = useState(loadSmartSorts);

    const addInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const setView = useCallback((v: View) => {
        setViewState(v);
        setSearch("");
        localStorage.setItem("view", JSON.stringify(v));
    }, []);

    // If the persisted list no longer exists, fall back to Today.
    useEffect(() => {
        if (!loading && view.kind == "list" && !lists.some((l) => l.id == view.id)) setView({ kind: "smart", id: "today" });
    }, [loading, lists, view, setView]);

    const currentList = view.kind == "list" ? lists.find((l) => l.id == view.id) : undefined;
    const defaultList = currentList ?? lists.find((l) => l.isDefault) ?? lists[0];
    const sort: SortOrder = currentList?.sort ?? smartSorts[view.id] ?? "dueDate";

    const setSort = (s: SortOrder) => {
        if (currentList) void store.updateList({ ...currentList, sort: s });
        else {
            const next = { ...smartSorts, [view.id]: s };
            setSmartSorts(next);
            localStorage.setItem("smartSorts", JSON.stringify(next));
        }
    };

    const isTrash = view.kind == "smart" && view.id == "trash";
    const isCompletedView = view.kind == "smart" && view.id == "completed";
    const searching = search.trim().length > 0;

    const visible = useMemo(() => {
        const base = searching ? tasks.filter((t) => !t.isTrashed && matchesSearch(t, lists, search.trim())) : tasksInView(view, tasks);
        const sorted = sortTasks(base, isTrash ? "created" : isCompletedView ? "created" : sort);
        if (isCompletedView) sorted.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
        return {
            open: isTrash || isCompletedView ? sorted : sorted.filter((t) => !t.done),
            done: isTrash || isCompletedView ? [] : sorted.filter((t) => t.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
        };
    }, [tasks, lists, view, search, searching, sort, isTrash, isCompletedView]);

    const groups = isTrash || isCompletedView ? [{ key: "all", tasks: visible.open }] : groupTasks(visible.open, sort);
    const selected = tasks.find((t) => t.id == selectedID);

    const fail = (e: unknown) => notify(e instanceof Error ? e.message : "Something went wrong", "error");

    const trash = (t: Task) => {
        const doTrash = () =>
            store.trashTask(t).then(() => {
                if (selectedID == t.id) setSelectedID(undefined);
                notify("Moved to trash");
            });
        if (prefs.confirmTrash)
            showMiniDialog({ title: "Move to trash?", message: `"${t.title}" will be moved to the trash.`, continue: { text: "Move to trash", color: "critical", action: doTrash } });
        else void doTrash().catch(fail);
    };

    // --- Keyboard shortcuts ------------------------------------------------

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (target.closest("input, textarea, select, [contenteditable=true]")) return;
            if (document.querySelector(".MuiDialog-root, .MuiDrawer-root, .MuiMenu-root")) {
                return;
            }
            const go = (v: View) => {
                e.preventDefault();
                setView(v);
            };
            switch (e.key) {
                case "n":
                    e.preventDefault();
                    addInputRef.current?.focus();
                    break;
                case "/":
                    e.preventDefault();
                    searchInputRef.current?.focus();
                    break;
                case "l":
                    e.preventDefault();
                    setListDialog({});
                    break;
                case "t":
                    go({ kind: "smart", id: "today" });
                    break;
                case "u":
                    go({ kind: "smart", id: "upcoming" });
                    break;
                case "a":
                    go({ kind: "smart", id: "all" });
                    break;
                case "?":
                    setShortcutsOpen(true);
                    break;
                default:
                    if (/^[1-9]$/.test(e.key)) {
                        const l = lists[Number(e.key) - 1];
                        if (l) go({ kind: "list", id: l.id });
                    }
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lists, setView]);

    if (loading) {
        return (
            <Stack sx={{ minHeight: "100svh", alignItems: "center", justifyContent: "center", gap: 2 }}>
                <CircularProgress color="accent" size={32} />
                <Typography variant="small" sx={{ color: "text.muted" }}>
                    Decrypting your tasks…
                </Typography>
            </Stack>
        );
    }

    const title = searching ? "Search results" : viewTitle(view, lists);
    const emoji = searching ? "🔍" : currentList?.emoji ?? (isTrash ? "🗑️" : smartViews.find((v) => v.id == view.id)?.emoji);
    const count = searching ? visible.open.length + visible.done.length : viewCount(view, tasks);

    const addTask = async (input: Parameters<React.ComponentProps<typeof AddTaskBar>["onAdd"]>[0]) => {
        if (!defaultList) return;
        const extra: Partial<Task> = {};
        if (view.kind == "smart") {
            if (view.id == "today" && !input.dueDate) extra.dueDate = todayYMD();
            if (view.id == "upcoming" && !input.dueDate) extra.dueDate = ymd(dayjs().add(1, "day"));
            if (view.id == "starred") extra.starred = true;
        }
        try {
            const t = await store.addTask(defaultList.id, { ...extra, ...input });
            // Let the user know where it went if it isn't shown here.
            if (!tasksInView(view, [t]).length)
                notify(`Added to ${defaultList.name}${t.dueDate ? ` · due ${formatDue(t.dueDate, t.dueTime)}` : ""}`);
        } catch (e) {
            fail(e);
        }
    };

    return (
        <Stack sx={{ minHeight: "100svh" }}>
            <NavbarBase
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 3,
                    px: { xs: 1, sm: 3 },
                    gap: 1,
                    justifyContent: "space-between",
                    backgroundColor: "backdrop.muted",
                    backdropFilter: "blur(7px)",
                }}
            >
                <Stack direction="row" sx={{ alignItems: "center", gap: 1, flex: { md: 1 } }}>
                    <IconButton onClick={() => setSidebarOpen(true)} aria-label="Menu">
                        <MenuIcon />
                    </IconButton>
                    {!isSmall && <Wordmark size={20} />}
                </Stack>
                <SearchBox>
                    <SearchIcon sx={{ color: "stroke.muted", fontSize: 20 }} />
                    <InputBase
                        inputRef={searchInputRef}
                        fullWidth
                        value={search}
                        placeholder={isSmall ? "Search" : "Search tasks, notes, #tags, lists"}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key == "Escape") {
                                setSearch("");
                                (e.target as HTMLElement).blur();
                            }
                        }}
                        inputProps={{ "aria-label": "Search" }}
                        sx={{ fontSize: 14 }}
                    />
                    {search && (
                        <IconButton size="small" onClick={() => setSearch("")} aria-label="Clear search" sx={{ p: "2px" }}>
                            <CloseIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    )}
                </SearchBox>
                <Stack direction="row" sx={{ flex: { md: 1 }, justifyContent: "flex-end" }}>
                    <Tooltip title="New task (N)">
                        <IconButton
                            onClick={() => {
                                if (isTrash || isCompletedView) setView({ kind: "smart", id: "today" });
                                setTimeout(() => addInputRef.current?.focus(), 50);
                            }}
                            aria-label="New task"
                            sx={{ backgroundColor: "accent.main", color: "#fff", p: "8px", "&:hover": { backgroundColor: "accent.dark" } }}
                        >
                            <AddIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </NavbarBase>

            <Box sx={{ pt: 2 }}>
                <ListBar lists={lists} tasks={tasks} view={view} onSelect={setView} onNewList={() => setListDialog({})} onShowAll={() => setAllListsOpen(true)} />
            </Box>

            <Stack sx={{ width: "100%", maxWidth: "800px", mx: "auto", px: { xs: 1, sm: 3 }, pb: 10, gap: 2 }}>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", minHeight: 48 }}>
                    <Stack sx={{ gap: "4px", minWidth: 0 }}>
                        <Typography variant="h3" sx={{ display: "flex", gap: 1, alignItems: "center", overflow: "hidden" }}>
                            <span>{emoji}</span>
                            <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {title}
                            </Box>
                        </Typography>
                        <Typography variant="small" sx={{ color: "text.muted" }}>
                            {isTrash
                                ? `${count} item${count == 1 ? "" : "s"} · Items are deleted permanently after 30 days`
                                : isCompletedView || searching
                                  ? `${count} task${count == 1 ? "" : "s"}`
                                  : view.id == "today" && view.kind == "smart"
                                    ? `${dayjs().format("dddd, D MMMM")} · ${count} open`
                                    : `${count} open`}
                        </Typography>
                    </Stack>
                    <Stack direction="row" sx={{ gap: 1 }}>
                        {isTrash ? (
                            count > 0 && (
                                <Tooltip title="Empty trash">
                                    <FilledIconButton
                                        aria-label="Empty trash"
                                        onClick={() =>
                                            showMiniDialog({
                                                title: "Empty trash?",
                                                message: "All items in the trash will be permanently deleted. This cannot be undone.",
                                                continue: { text: "Empty trash", color: "critical", action: () => store.emptyTrash() },
                                            })
                                        }
                                    >
                                        <DeleteSweepIcon />
                                    </FilledIconButton>
                                </Tooltip>
                            )
                        ) : (
                            !isCompletedView && (
                                <OverflowMenu ariaID="sort-options" triggerButtonIcon={<SortIcon />} triggerButtonProps={{ sx: { p: "8px", backgroundColor: "fill.faint", "&:hover": { backgroundColor: "fill.faintHover" } } }}>
                                    {(Object.keys(sortLabels) as SortOrder[]).map((s) => (
                                        <OverflowMenuOption key={s} onClick={() => setSort(s)} endIcon={sort == s ? <CheckIcon /> : undefined}>
                                            {sortLabels[s]}
                                        </OverflowMenuOption>
                                    ))}
                                    <OverflowMenuOption
                                        onClick={() => setPref("showCompleted", !prefs.showCompleted)}
                                        startIcon={prefs.showCompleted ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    >
                                        {prefs.showCompleted ? "Hide completed" : "Show completed"}
                                    </OverflowMenuOption>
                                </OverflowMenu>
                            )
                        )}
                        {currentList && (
                            <OverflowMenu ariaID="list-options" triggerButtonProps={{ sx: { p: "8px", backgroundColor: "fill.faint", "&:hover": { backgroundColor: "fill.faintHover" } } }}>
                                <OverflowMenuOption startIcon={<EditIcon />} onClick={() => setListDialog({ edit: currentList })}>
                                    Edit list
                                </OverflowMenuOption>
                                <OverflowMenuOption
                                    color="critical"
                                    startIcon={<DeleteIcon />}
                                    onClick={() =>
                                        lists.length <= 1
                                            ? notify("You need at least one list", "info")
                                            : showMiniDialog({
                                                  title: `Delete "${currentList.name}"?`,
                                                  message: "The list and all of its tasks will be permanently deleted.",
                                                  continue: {
                                                      text: "Delete list",
                                                      color: "critical",
                                                      action: async () => {
                                                          await store.deleteList(currentList.id);
                                                          setView({ kind: "smart", id: "today" });
                                                      },
                                                  },
                                              })
                                    }
                                >
                                    Delete list
                                </OverflowMenuOption>
                            </OverflowMenu>
                        )}
                    </Stack>
                </Stack>

                {!isTrash && !isCompletedView && !searching && (
                    <AddTaskBar
                        inputRef={addInputRef}
                        placeholder={`Add a task${currentList ? ` to ${currentList.name}` : view.id == "today" ? " for today" : ""}`}
                        onAdd={addTask}
                    />
                )}

                {groups.map((g) => (
                    <Stack key={g.key} sx={{ gap: "6px" }}>
                        {g.title && (
                            <Box sx={{ "& p": { color: g.tone == "critical" ? "critical.main" : g.tone == "accent" ? "accent.main" : undefined } }}>
                                <RowButtonGroupTitle>
                                    {g.title} · {g.tasks.length}
                                </RowButtonGroupTitle>
                            </Box>
                        )}
                        {g.tasks.map((t) => (
                            <TaskRow
                                key={t.id}
                                task={t}
                                list={lists.find((l) => l.id == t.listId)}
                                showList={view.kind == "smart" || searching}
                                selected={t.id == selectedID}
                                onOpen={() => setSelectedID(t.id)}
                                onToggle={() => void store.toggleDone(t).catch(fail)}
                                onStar={() => void store.updateTask({ ...t, starred: !t.starred }).catch(fail)}
                                onTrash={() => trash(t)}
                                onRestore={() => void store.restoreTask(t).then(() => notify("Task restored")).catch(fail)}
                                onDeleteForever={() =>
                                    showMiniDialog({
                                        title: "Delete permanently?",
                                        message: "This task will be deleted forever.",
                                        continue: { text: "Delete", color: "critical", action: () => store.deleteTaskForever(t) },
                                    })
                                }
                            />
                        ))}
                    </Stack>
                ))}

                {visible.open.length == 0 && <EmptyState view={view} searching={searching} hasDone={visible.done.length > 0} />}

                {prefs.showCompleted && visible.done.length > 0 && (
                    <Stack sx={{ gap: "6px" }}>
                        <Box
                            component="button"
                            onClick={() => setShowCompleted((s) => !s)}
                            sx={{ border: 0, background: "transparent", p: 0, cursor: "pointer", display: "flex", alignItems: "center", color: "text.muted", fontFamily: "inherit" }}
                        >
                            <RowButtonGroupTitle>Completed · {visible.done.length}</RowButtonGroupTitle>
                            <ExpandMoreIcon sx={{ fontSize: 18, transition: "transform 200ms", transform: showCompleted ? "none" : "rotate(-90deg)" }} />
                        </Box>
                        <Collapse in={showCompleted}>
                            <Stack sx={{ gap: "6px" }}>
                                {visible.done.map((t) => (
                                    <TaskRow
                                        key={t.id}
                                        task={t}
                                        list={lists.find((l) => l.id == t.listId)}
                                        showList={view.kind == "smart" || searching}
                                        selected={t.id == selectedID}
                                        onOpen={() => setSelectedID(t.id)}
                                        onToggle={() => void store.toggleDone(t).catch(fail)}
                                        onStar={() => void store.updateTask({ ...t, starred: !t.starred }).catch(fail)}
                                        onTrash={() => trash(t)}
                                    />
                                ))}
                            </Stack>
                        </Collapse>
                    </Stack>
                )}
            </Stack>

            <TaskDetail task={selected?.isTrashed ? undefined : selected} onClose={() => setSelectedID(undefined)} />
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onSelectView={setView} />
            <ListDialog
                open={!!listDialog}
                initial={listDialog?.edit}
                onClose={() => setListDialog(undefined)}
                onSubmit={async (data) => {
                    try {
                        if (listDialog?.edit) await store.updateList({ ...listDialog.edit, ...data });
                        else setView({ kind: "list", id: (await store.addList(data)).id });
                    } catch (e) {
                        fail(e);
                        throw e;
                    }
                }}
            />
            <AllListsDialog
                open={allListsOpen}
                onClose={() => setAllListsOpen(false)}
                lists={lists}
                tasks={tasks}
                view={view}
                onSelect={(v) => {
                    setView(v);
                    setAllListsOpen(false);
                }}
            />
            <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        </Stack>
    );
};

const SearchBox = styled("div")(({ theme }) => ({
    flex: "0 1 520px",
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    height: "44px",
    padding: "0 12px",
    borderRadius: "8px",
    backgroundColor: theme.vars.palette.background.searchInput,
    border: "1px solid transparent",
    "&:focus-within": { borderColor: theme.vars.palette.stroke.faint },
}));

const EmptyState: React.FC<{ view: View; searching: boolean; hasDone: boolean }> = ({ view, searching, hasDone }) => {
    const [emoji, title, text] = searching
        ? ["🔍", "No results", "Try a different search."]
        : view.kind == "smart" && view.id == "trash"
          ? ["🗑️", "Trash is empty", "Deleted tasks will appear here."]
          : view.kind == "smart" && view.id == "completed"
            ? ["🏁", "Nothing completed yet", "Tasks you complete will show up here."]
            : hasDone
              ? ["🎉", "All done!", "Nice work, everything here is complete."]
              : view.kind == "smart" && view.id == "today"
                ? ["☀️", "Nothing due today", "Enjoy your day, or add something above."]
                : ["📝", "No tasks yet", "Add your first task above."];
    return (
        <Stack sx={{ alignItems: "center", textAlign: "center", py: 6, gap: 1 }}>
            <Typography sx={{ fontSize: 48, lineHeight: 1, mb: 1 }}>{emoji}</Typography>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="small" sx={{ color: "text.muted" }}>
                {text}
            </Typography>
        </Stack>
    );
};

/** Like ente's "All albums" dialog. */
const AllListsDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    lists: TaskList[];
    tasks: Task[];
    view: View;
    onSelect: (v: View) => void;
}> = ({ open, onClose, lists, tasks, view, onSelect }) => (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogContent>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Stack>
                    <Typography variant="h5">All lists</Typography>
                    <Typography variant="small" sx={{ color: "text.muted" }}>
                        {lists.length} list{lists.length == 1 ? "" : "s"}
                    </Typography>
                </Stack>
                <IconButton onClick={onClose} color="secondary" aria-label="Close">
                    <CloseIcon />
                </IconButton>
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 1.5 }}>
                {lists.map((l) => {
                    const total = tasks.filter((t) => t.listId == l.id && !t.isTrashed).length;
                    const open = viewCount({ kind: "list", id: l.id }, tasks);
                    const active = sameView(view, { kind: "list", id: l.id });
                    return (
                        <Box
                            key={l.id}
                            component="button"
                            onClick={() => onSelect({ kind: "list", id: l.id })}
                            sx={{
                                border: 0,
                                p: 0,
                                textAlign: "left",
                                cursor: "pointer",
                                borderRadius: "8px",
                                overflow: "hidden",
                                backgroundColor: "fill.faint",
                                color: "text.base",
                                fontFamily: "inherit",
                                outline: active ? "2px solid" : "none",
                                outlineColor: "accent.main",
                                "&:hover": { backgroundColor: "fill.faintHover" },
                            }}
                        >
                            <Box
                                sx={{
                                    height: 90,
                                    backgroundColor: l.color,
                                    backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 60%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 36,
                                }}
                            >
                                {l.emoji}
                            </Box>
                            <Box sx={{ p: 1.5 }}>
                                <Typography variant="small" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {l.name}
                                </Typography>
                                <Typography variant="mini" sx={{ color: "text.faint", mt: 0.5 }}>
                                    {open} open · {total - open} done
                                </Typography>
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </DialogContent>
    </Dialog>
);
