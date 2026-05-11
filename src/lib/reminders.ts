import { differenceInMinutes, format, isSameDay, parseISO } from "date-fns";
import { Task, MonthEvent } from "./types";

export interface UpcomingItem {
  id: string;
  kind: "task" | "event";
  title: string;
  time: string;
  minutesAway: number;
  category?: string;
}

const toDate = (dateStr: string, time: string) => {
  const [h, m] = time.split(":").map(Number);
  const d = parseISO(dateStr);
  d.setHours(h, m || 0, 0, 0);
  return d;
};

const taskMatchesToday = (t: Task, now: Date) => {
  if (t.recurring === "daily") return true;
  if (t.recurring === "weekly") return parseISO(t.date).getDay() === now.getDay();
  return isSameDay(parseISO(t.date), now);
};

const taskDoneOn = (t: Task, dateKey: string) =>
  t.recurring && t.recurring !== "none"
    ? (t.completedDates ?? []).includes(dateKey)
    : t.completed;

/** Itens com horário definido nos próximos `minutes` minutos (futuro). */
export function upcoming(
  tasks: Task[],
  events: MonthEvent[],
  now: Date,
  minutes = 60,
): UpcomingItem[] {
  const dateKey = format(now, "yyyy-MM-dd");
  const out: UpcomingItem[] = [];

  for (const t of tasks) {
    if (!t.time) continue;
    if (!taskMatchesToday(t, now)) continue;
    if (taskDoneOn(t, dateKey)) continue;
    const when = toDate(format(now, "yyyy-MM-dd"), t.time);
    const diff = differenceInMinutes(when, now);
    if (diff >= 0 && diff <= minutes) {
      out.push({ id: t.id, kind: "task", title: t.title, time: t.time, minutesAway: diff, category: t.category });
    }
  }

  for (const e of events) {
    if (!isSameDay(parseISO(e.date), now)) continue;
    out.push({ id: e.id, kind: "event", title: e.title, time: "00:00", minutesAway: 0, category: e.category });
  }

  return out.sort((a, b) => a.minutesAway - b.minutesAway);
}

export function notify(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico", tag: title });
  } catch { /* noop */ }
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}
