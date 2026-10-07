/**
 * Decrypted task and list models, and conversion to/from the server's
 * encrypted representation.
 */
import { api, type RemoteList, type RemoteTask } from "./api";
import { decryptBox, decryptJSON, encryptBox, encryptJSON, generateKey } from "./crypto";

export type Priority = 0 | 1 | 2 | 3;
export type Recurrence = "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly";

export interface Subtask {
    id: string;
    title: string;
    done: boolean;
}

export interface TaskData {
    title: string;
    notes: string;
    done: boolean;
    completedAt?: number;
    /** YYYY-MM-DD */
    dueDate?: string;
    /** HH:mm */
    dueTime?: string;
    priority: Priority;
    starred: boolean;
    tags: string[];
    subtasks: Subtask[];
    recurrence: Recurrence;
    createdAt: number;
    /** Manual sort position. */
    order: number;
}

export interface ListData {
    name: string;
    color: string;
    emoji: string;
    sort?: SortOrder;
    isDefault?: boolean;
}

export type SortOrder = "manual" | "dueDate" | "priority" | "title" | "created";

export interface TaskList extends ListData {
    id: number;
    key: Uint8Array;
}

export interface Task extends TaskData {
    id: number;
    listId: number;
    isTrashed: boolean;
    trashedAt?: string;
    updatedAt: string;
}

export const listColors = [
    "#1db954",
    "#1071ff",
    "#9610d6",
    "#ff6b3d",
    "#f5c518",
    "#ea3f3f",
    "#00b8a9",
    "#e84393",
    "#8a8680",
];

export const newTaskData = (partial: Partial<TaskData> = {}): TaskData => ({
    title: "",
    notes: "",
    done: false,
    priority: 0,
    starred: false,
    tags: [],
    subtasks: [],
    recurrence: "none",
    createdAt: Date.now(),
    order: Date.now(),
    ...partial,
});

const taskDataOf = (t: Task | TaskData): TaskData => ({
    title: t.title,
    notes: t.notes,
    done: t.done,
    completedAt: t.completedAt,
    dueDate: t.dueDate,
    dueTime: t.dueTime,
    priority: t.priority,
    starred: t.starred,
    tags: t.tags,
    subtasks: t.subtasks,
    recurrence: t.recurrence,
    createdAt: t.createdAt,
    order: t.order,
});

export const decryptList = async (
    remote: RemoteList,
    masterKey: Uint8Array,
): Promise<TaskList> => {
    const key = await decryptBox(
        remote.encryptedKey,
        remote.keyDecryptionNonce,
        masterKey,
    );
    const data = await decryptJSON<ListData>(
        remote.encryptedData,
        remote.dataDecryptionNonce,
        key,
    );
    return { ...data, id: remote.id, key };
};

export const decryptTask = async (
    remote: RemoteTask,
    listKey: Uint8Array,
): Promise<Task> => {
    const data = await decryptJSON<TaskData>(
        remote.encryptedData,
        remote.decryptionNonce,
        listKey,
    );
    return {
        ...newTaskData(),
        ...data,
        id: remote.id,
        listId: remote.listId,
        isTrashed: remote.isTrashed,
        trashedAt: remote.trashedAt ?? undefined,
        updatedAt: remote.updatedAt,
    };
};

export const createRemoteList = async (data: ListData, masterKey: Uint8Array) => {
    const key = await generateKey();
    const encKey = await encryptBox(key, masterKey);
    const encData = await encryptJSON(data, key);
    const remote = await api.createList({
        encryptedKey: encKey.encryptedData,
        keyDecryptionNonce: encKey.nonce,
        encryptedData: encData.encryptedData,
        dataDecryptionNonce: encData.nonce,
    });
    return { ...data, id: remote.id, key } satisfies TaskList;
};

export const updateRemoteList = async (list: TaskList) => {
    const { id, key, ...data } = list;
    const enc = await encryptJSON(data, key);
    await api.updateList(id, {
        encryptedData: enc.encryptedData,
        dataDecryptionNonce: enc.nonce,
    });
    return list;
};

export const createRemoteTask = async (data: TaskData, list: TaskList) => {
    const enc = await encryptJSON(taskDataOf(data), list.key);
    const remote = await api.createTask({
        listId: list.id,
        encryptedData: enc.encryptedData,
        decryptionNonce: enc.nonce,
    });
    return decryptTask(remote, list.key);
};

export const updateRemoteTask = async (task: Task, list: TaskList) => {
    const enc = await encryptJSON(taskDataOf(task), list.key);
    const remote = await api.updateTask(task.id, {
        listId: list.id,
        encryptedData: enc.encryptedData,
        decryptionNonce: enc.nonce,
    });
    return decryptTask(remote, list.key);
};
