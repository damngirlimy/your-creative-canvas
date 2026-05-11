import { useEffect, useRef, useState } from "react";
import { Task, MonthEvent } from "@/lib/types";
import { upcoming, notify, UpcomingItem } from "@/lib/reminders";

export function useReminders(tasks: Task[], events: MonthEvent[]) {
  const [upcomingList, setUpcomingList] = useState<UpcomingItem[]>([]);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tick = () => {
      const now = new Date();
      const list = upcoming(tasks, events, now, 60);
      setUpcomingList(list);
      // dispatch native notif when item is within 10 minutes
      for (const it of list) {
        if (it.minutesAway > 10) continue;
        const key = `${it.id}:${now.toDateString()}`;
        if (notifiedRef.current.has(key)) continue;
        notifiedRef.current.add(key);
        notify(
          it.kind === "event" ? "Evento hoje" : "Tarefa em breve",
          `${it.title} · ${it.time}${it.minutesAway > 0 ? ` (em ${it.minutesAway}min)` : ""}`,
        );
      }
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [tasks, events]);

  return upcomingList;
}
