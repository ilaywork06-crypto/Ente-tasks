import dayjs from "dayjs";
import type { Recurrence, Task } from "../services/tasks";

export const ymd = (d: dayjs.Dayjs) => d.format("YYYY-MM-DD");
export const todayYMD = () => ymd(dayjs());

export const isOverdue = (t: Task) => !!t.dueDate && !t.done && t.dueDate < todayYMD();
export const isDueToday = (t: Task) => t.dueDate == todayYMD();

/** "Today", "Tomorrow", "Mon", "12 Mar", "12 Mar 2027". */
export const formatDue = (dueDate: string, dueTime?: string) => {
    const d = dayjs(dueDate);
    const today = dayjs().startOf("day");
    const diff = d.diff(today, "day");
    let s: string;
    if (diff == 0) s = "Today";
    else if (diff == 1) s = "Tomorrow";
    else if (diff == -1) s = "Yesterday";
    else if (diff > 1 && diff < 7) s = d.format("dddd");
    else if (d.year() == today.year()) s = d.format("D MMM");
    else s = d.format("D MMM YYYY");
    return dueTime ? `${s}, ${dueTime}` : s;
};

export const nextOccurrence = (dueDate: string | undefined, r: Recurrence) => {
    const base = dayjs(dueDate ?? todayYMD());
    switch (r) {
        case "daily":
            return ymd(base.add(1, "day"));
        case "weekdays": {
            let d = base.add(1, "day");
            while (d.day() == 0 || d.day() == 6) d = d.add(1, "day");
            return ymd(d);
        }
        case "weekly":
            return ymd(base.add(1, "week"));
        case "monthly":
            return ymd(base.add(1, "month"));
        case "yearly":
            return ymd(base.add(1, "year"));
        default:
            return undefined;
    }
};

export const recurrenceLabel: Record<Recurrence, string> = {
    none: "Does not repeat",
    daily: "Every day",
    weekdays: "Every weekday",
    weekly: "Every week",
    monthly: "Every month",
    yearly: "Every year",
};
