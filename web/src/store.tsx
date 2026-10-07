import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./services/api";
import {
    createRemoteList,
    createRemoteTask,
    decryptList,
    decryptTask,
    newTaskData,
    updateRemoteList,
    updateRemoteTask,
    type ListData,
    type Task,
    type TaskData,
    type TaskList,
} from "./services/tasks";
import { nextOccurrence } from "./utils/dates";

interface TasksContextT {
    loading: boolean;
    lists: TaskList[];
    tasks: Task[];
    refresh: () => Promise<void>;
    addList: (data: ListData) => Promise<TaskList>;
    updateList: (list: TaskList) => Promise<void>;
    deleteList: (id: number) => Promise<void>;
    addTask: (listId: number, data: Partial<TaskData>) => Promise<Task>;
    updateTask: (task: Task) => Promise<void>;
    toggleDone: (task: Task) => Promise<void>;
    moveTask: (task: Task, listId: number) => Promise<void>;
    trashTask: (task: Task) => Promise<void>;
    restoreTask: (task: Task) => Promise<void>;
    deleteTaskForever: (task: Task) => Promise<void>;
    emptyTrash: () => Promise<void>;
}

const TasksContext = createContext<TasksContextT | undefined>(undefined);

export const useTasks = () => {
    const ctx = useContext(TasksContext);
    if (!ctx) throw new Error("useTasks outside TasksProvider");
    return ctx;
};

const defaultLists: ListData[] = [
    { name: "Personal", color: "#1db954", emoji: "🏠", isDefault: true },
    { name: "Work", color: "#1071ff", emoji: "💼" },
];

export const TasksProvider: React.FC<
    React.PropsWithChildren<{ masterKey: Uint8Array }>
> = ({ masterKey, children }) => {
    const [loading, setLoading] = useState(true);
    const [lists, setLists] = useState<TaskList[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);

    const creatingDefaults = useRef<Promise<TaskList[]>>(undefined);

    const refresh = useCallback(async () => {
        const [remoteLists, remoteTasks] = await Promise.all([api.lists(), api.tasks()]);
        let lists = await Promise.all(remoteLists.map((l) => decryptList(l, masterKey)));
        if (lists.length == 0) {
            // New account: create some starter lists (once, even if two
            // refreshes race).
            creatingDefaults.current ??= (async () => {
                const created: TaskList[] = [];
                for (const d of defaultLists) created.push(await createRemoteList(d, masterKey));
                return created;
            })();
            lists = await creatingDefaults.current;
        }
        const keyOf = new Map(lists.map((l) => [l.id, l.key]));
        const tasks = (
            await Promise.all(
                remoteTasks.map(async (t) => {
                    const key = keyOf.get(t.listId);
                    if (!key) return undefined;
                    try {
                        return await decryptTask(t, key);
                    } catch {
                        return undefined;
                    }
                }),
            )
        ).filter((t): t is Task => !!t);
        setLists(lists);
        setTasks(tasks);
        setLoading(false);
    }, [masterKey]);

    useEffect(() => {
        void refresh().catch(() => {
            // Auth failures are handled globally (they sign the user out).
        });
        // Pick up changes from other devices when coming back to the tab.
        const onFocus = () => {
            if (document.visibilityState == "visible") void refresh().catch(() => {});
        };
        document.addEventListener("visibilitychange", onFocus);
        return () => document.removeEventListener("visibilitychange", onFocus);
    }, [refresh]);

    const listByID = useCallback(
        (id: number) => {
            const l = lists.find((l) => l.id == id);
            if (!l) throw new Error("Unknown list");
            return l;
        },
        [lists],
    );

    const replaceTask = (t: Task) =>
        setTasks((ts) => ts.map((x) => (x.id == t.id ? t : x)));

    const value = useMemo<TasksContextT>(() => {
        const updateTask = async (task: Task) => {
            // Optimistic: show the change immediately, then persist.
            const previous = tasks.find((t) => t.id == task.id);
            replaceTask(task);
            try {
                replaceTask(await updateRemoteTask(task, listByID(task.listId)));
            } catch (e) {
                if (previous) replaceTask(previous);
                throw e;
            }
        };

        const addTask = async (listId: number, data: Partial<TaskData>) => {
            const t = await createRemoteTask(newTaskData(data), listByID(listId));
            setTasks((ts) => [...ts, t]);
            return t;
        };

        return {
            loading,
            lists,
            tasks,
            refresh,
            addList: async (data) => {
                const l = await createRemoteList(data, masterKey);
                setLists((ls) => [...ls, l]);
                return l;
            },
            updateList: async (list) => {
                await updateRemoteList(list);
                setLists((ls) => ls.map((l) => (l.id == list.id ? list : l)));
            },
            deleteList: async (id) => {
                await api.deleteList(id);
                setLists((ls) => ls.filter((l) => l.id != id));
                setTasks((ts) => ts.filter((t) => t.listId != id));
            },
            addTask,
            updateTask,
            toggleDone: async (task) => {
                const done = !task.done;
                // Completing a repeating task schedules its next occurrence;
                // the completed instance itself no longer repeats.
                const repeats = done && task.recurrence != "none";
                await updateTask({
                    ...task,
                    done,
                    completedAt: done ? Date.now() : undefined,
                    recurrence: repeats ? "none" : task.recurrence,
                });
                if (repeats) {
                    await addTask(task.listId, {
                        ...task,
                        done: false,
                        completedAt: undefined,
                        dueDate: nextOccurrence(task.dueDate, task.recurrence),
                        subtasks: task.subtasks.map((s) => ({ ...s, done: false })),
                        createdAt: Date.now(),
                    });
                }
            },
            moveTask: async (task, listId) => {
                // Re-encrypted with the destination list's key.
                const moved = await updateRemoteTask({ ...task, listId }, listByID(listId));
                replaceTask(moved);
            },
            trashTask: async (task) => {
                const remote = await api.trashTask(task.id);
                replaceTask({ ...task, isTrashed: true, trashedAt: remote.trashedAt ?? undefined });
            },
            restoreTask: async (task) => {
                await api.restoreTask(task.id);
                replaceTask({ ...task, isTrashed: false, trashedAt: undefined });
            },
            deleteTaskForever: async (task) => {
                await api.deleteTask(task.id);
                setTasks((ts) => ts.filter((t) => t.id != task.id));
            },
            emptyTrash: async () => {
                await api.emptyTrash();
                setTasks((ts) => ts.filter((t) => !t.isTrashed));
            },
        };
    }, [loading, lists, tasks, refresh, masterKey, listByID]);

    return <TasksContext value={value}>{children}</TasksContext>;
};
