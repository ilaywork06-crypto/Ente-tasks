import dayjs from "dayjs";
import type { SortOrder, Task, TaskList } from "../../services/tasks";
import { todayYMD, ymd } from "../../utils/dates";

export type SmartViewID = "all" | "today" | "upcoming" | "starred" | "completed" | "trash";

export type View = { kind: "smart"; id: SmartViewID } | { kind: "list"; id: number };

export const smartViews: { id: SmartViewID; name: string; shortName?: string; emoji: string; color: string }[] = [
    { id: "today", name: "Today", emoji: "☀️", color: "#f5a623" },
    { id: "upcoming", name: "Upcoming", emoji: "📅", color: "#1071ff" },
    { id: "starred", name: "Starred", emoji: "⭐", color: "#ffc107" },
    { id: "all", name: "All tasks", emoji: "📋", color: "#8a8680" },
    { id: "completed", name: "Completed", shortName: "Done", emoji: "✅", color: "#1db954" },
];

export const sameView = (a: View, b: View) => a.kind == b.kind && a.id == b.id;

export const viewTitle = (view: View, lists: TaskList[]) =>
    view.kind == "list"
        ? (lists.find((l) => l.id == view.id)?.name ?? "List")
        : view.id == "trash"
          ? "Trash"
          : (smartViews.find((v) => v.id == view.id)?.name ?? "");

/** Tasks shown in a view, before splitting off the completed ones. */
export const tasksInView = (view: View, tasks: Task[]) => {
    const today = todayYMD();
    if (view.kind == "smart" && view.id == "trash") return tasks.filter((t) => t.isTrashed);
    const live = tasks.filter((t) => !t.isTrashed);
    if (view.kind == "list") return live.filter((t) => t.listId == view.id);
    switch (view.id) {
        case "all":
            return live;
        case "today":
            // Today also gathers anything overdue, and tasks completed today.
            return live.filter((t) =>
                t.done
                    ? !!t.completedAt && ymd(dayjs(t.completedAt)) == today
                    : !!t.dueDate && t.dueDate <= today,
            );
        case "upcoming":
            return live.filter((t) => !!t.dueDate && t.dueDate > today && !t.done);
        case "starred":
            return live.filter((t) => t.starred);
        case "completed":
            return live.filter((t) => t.done);
        default:
            return live;
    }
};

export const viewCount = (view: View, tasks: Task[]) => {
    const ts = tasksInView(view, tasks);
    if (view.kind == "smart" && (view.id == "completed" || view.id == "trash")) return ts.length;
    return ts.filter((t) => !t.done).length;
};

const byDue = (a: Task, b: Task) => {
    if (a.dueDate != b.dueDate) {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate < b.dueDate ? -1 : 1;
    }
    return (a.dueTime ?? "99").localeCompare(b.dueTime ?? "99");
};

export const sortTasks = (tasks: Task[], order: SortOrder) => {
    const ts = [...tasks];
    switch (order) {
        case "manual":
            return ts.sort((a, b) => a.order - b.order);
        case "dueDate":
            return ts.sort((a, b) => byDue(a, b) || b.priority - a.priority || a.order - b.order);
        case "priority":
            return ts.sort((a, b) => b.priority - a.priority || byDue(a, b));
        case "title":
            return ts.sort((a, b) => a.title.localeCompare(b.title));
        case "created":
            return ts.sort((a, b) => b.createdAt - a.createdAt);
    }
};

export interface TaskGroup {
    key: string;
    title?: string;
    tasks: Task[];
    tone?: "critical" | "accent";
}

/** Group by due date ("Overdue", "Today", ...) when sorting by due date. */
export const groupTasks = (tasks: Task[], order: SortOrder): TaskGroup[] => {
    if (order != "dueDate") return [{ key: "all", tasks }];
    const today = dayjs().startOf("day");
    const groups = new Map<string, TaskGroup>();
    const add = (key: string, title: string, t: Task, tone?: TaskGroup["tone"]) => {
        if (!groups.has(key)) groups.set(key, { key, title, tasks: [], tone });
        groups.get(key)!.tasks.push(t);
    };
    for (const t of tasks) {
        if (!t.dueDate) add("zz-none", "No date", t);
        else {
            const diff = dayjs(t.dueDate).diff(today, "day");
            if (diff < 0) add("a-overdue", "Overdue", t, "critical");
            else if (diff == 0) add("b-today", "Today", t, "accent");
            else if (diff == 1) add("c-tomorrow", "Tomorrow", t);
            else if (diff < 7) add("d-week", "Next 7 days", t);
            else add("e-later", "Later", t);
        }
    }
    return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
};

export const matchesSearch = (t: Task, lists: TaskList[], q: string) => {
    const s = q.toLowerCase();
    return (
        t.title.toLowerCase().includes(s) ||
        t.notes.toLowerCase().includes(s) ||
        t.tags.some((tag) => tag.includes(s.replace(/^#/, ""))) ||
        t.subtasks.some((st) => st.title.toLowerCase().includes(s)) ||
        !!lists.find((l) => l.id == t.listId)?.name.toLowerCase().includes(s)
    );
};
