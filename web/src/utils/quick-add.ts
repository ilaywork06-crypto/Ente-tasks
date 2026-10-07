/**
 * A small natural-language parser for the "Add a task" field.
 *
 *     "Pay rent tomorrow !high #home every month *"
 *
 * becomes a task titled "Pay rent", due tomorrow, high priority, tagged
 * "home", repeating monthly and starred.
 */
import dayjs from "dayjs";
import type { Priority, Recurrence, TaskData } from "../services/tasks";
import { ymd } from "./dates";

const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const priorities: Record<string, Priority> = {
    "!1": 3, "!high": 3, "!2": 2, "!medium": 2, "!med": 2, "!3": 1, "!low": 1,
};

const recurrences: [RegExp, Recurrence][] = [
    [/\bevery ?day\b|\bdaily\b/i, "daily"],
    [/\bevery weekday\b/i, "weekdays"],
    [/\bevery week\b|\bweekly\b/i, "weekly"],
    [/\bevery month\b|\bmonthly\b/i, "monthly"],
    [/\bevery year\b|\byearly\b/i, "yearly"],
];

export const parseQuickAdd = (input: string): Partial<TaskData> & { title: string } => {
    let s = ` ${input} `;
    const out: Partial<TaskData> = {};

    const tags: string[] = [];
    s = s.replace(/\s#([\p{L}\p{N}_-]+)/gu, (_, tag: string) => {
        tags.push(tag.toLowerCase());
        return " ";
    });
    if (tags.length) out.tags = [...new Set(tags)];

    s = s.replace(/\s(![a-z0-9]+)(?=\s)/gi, (m, p: string) => {
        const v = priorities[p.toLowerCase()];
        if (v === undefined) return m;
        out.priority = v;
        return " ";
    });

    s = s.replace(/\s\*(?=\s)/, () => {
        out.starred = true;
        return " ";
    });

    for (const [re, r] of recurrences) {
        if (re.test(s)) {
            out.recurrence = r;
            s = s.replace(re, " ");
            break;
        }
    }

    const today = dayjs().startOf("day");
    const setDue = (d: dayjs.Dayjs) => {
        out.dueDate = ymd(d);
    };
    s = s.replace(/\s(today|tod)(?=\s)/i, () => (setDue(today), " "));
    s = s.replace(/\s(tomorrow|tmr|tom)(?=\s)/i, () => (setDue(today.add(1, "day")), " "));
    s = s.replace(/\snext week(?=\s)/i, () => (setDue(today.add(1, "week").day(1)), " "));
    s = s.replace(/\s(?:on\s)?(sun|mon|tue|wed|thu|fri|sat)[a-z]*(?=\s)/i, (m, w: string) => {
        const idx = weekdays.findIndex((d) => d.startsWith(w.toLowerCase()));
        if (idx < 0) return m;
        let d = today.day(idx);
        if (!d.isAfter(today)) d = d.add(1, "week");
        setDue(d);
        return " ";
    });
    s = s.replace(/\s(?:at\s)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)/i, (_, h: string, m: string | undefined, ap: string) => {
        let hour = Number(h) % 12;
        if (ap.toLowerCase() == "pm") hour += 12;
        out.dueTime = `${String(hour).padStart(2, "0")}:${m ?? "00"}`;
        if (!out.dueDate) setDue(today);
        return " ";
    });

    if (out.recurrence && !out.dueDate) setDue(today);

    return { ...out, title: s.replace(/\s+/g, " ").trim() || input.trim() };
};
