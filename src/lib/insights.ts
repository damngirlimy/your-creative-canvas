import { addDays, differenceInCalendarDays, format, isSameDay, parseISO, startOfDay, subDays } from "date-fns";
import { Task, MonthEvent } from "./types";

export interface Slot { start: string; end: string; minutes: number; }
export interface Busy { start: string; end: string; title: string; }

const toMin = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + (m || 0);
};
const toHM = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** Tarefas/eventos que ocupam o dia selecionado. */
export function busyForDay(date: Date, tasks: Task[], events: MonthEvent[]): Busy[] {
  const out: Busy[] = [];
  for (const t of tasks) {
    if (!t.time) continue;
    const matches =
      t.recurring === "daily" ? true :
      t.recurring === "weekly" ? parseISO(t.date).getDay() === date.getDay() :
      isSameDay(parseISO(t.date), date);
    if (!matches) continue;
    const start = t.time;
    const end = t.endTime ?? toHM(Math.min(toMin(t.time) + 30, 24 * 60));
    out.push({ start, end, title: t.title });
  }
  for (const e of events) {
    if (!isSameDay(parseISO(e.date), date)) continue;
    out.push({ start: "00:00", end: "23:59", title: e.title });
  }
  return out.sort((a, b) => toMin(a.start) - toMin(b.start));
}

/** Slots livres dentro de uma janela do dia (default 07:00–23:00). */
export function freeSlots(
  date: Date,
  tasks: Task[],
  events: MonthEvent[],
  window: { start: string; end: string } = { start: "07:00", end: "23:00" },
  minMinutes = 30,
): Slot[] {
  const winStart = toMin(window.start);
  const winEnd = toMin(window.end);
  const busy = busyForDay(date, tasks, events)
    .map((b) => ({ s: Math.max(toMin(b.start), winStart), e: Math.min(toMin(b.end), winEnd) }))
    .filter((b) => b.e > b.s)
    .sort((a, b) => a.s - b.s);

  // merge overlapping
  const merged: { s: number; e: number }[] = [];
  for (const b of busy) {
    const last = merged[merged.length - 1];
    if (last && b.s <= last.e) last.e = Math.max(last.e, b.e);
    else merged.push({ ...b });
  }

  const slots: Slot[] = [];
  let cursor = winStart;
  for (const b of merged) {
    if (b.s > cursor) {
      const mins = b.s - cursor;
      if (mins >= minMinutes) slots.push({ start: toHM(cursor), end: toHM(b.s), minutes: mins });
    }
    cursor = Math.max(cursor, b.e);
  }
  if (winEnd > cursor) {
    const mins = winEnd - cursor;
    if (mins >= minMinutes) slots.push({ start: toHM(cursor), end: toHM(winEnd), minutes: mins });
  }
  return slots;
}

export function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h${String(m).padStart(2, "0")}`;
  if (h) return `${h}h`;
  return `${m}min`;
}

/** Tarefas únicas (não recorrentes), de datas passadas, não concluídas. */
export function overdueTasks(tasks: Task[], today: Date): Task[] {
  const t0 = startOfDay(today);
  return tasks.filter((t) => {
    if (t.recurring && t.recurring !== "none") return false;
    if (t.completed) return false;
    try { return startOfDay(parseISO(t.date)) < t0; } catch { return false; }
  }).sort((a, b) => a.date.localeCompare(b.date));
}

/** Mapa dateKey -> { done, total } para o ano (heatmap). */
export function dailyCompletion(tasks: Task[], days = 365, endDate = new Date()): { date: string; done: number; total: number; pct: number }[] {
  const out: { date: string; done: number; total: number; pct: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(endDate, i);
    const key = format(d, "yyyy-MM-dd");
    let total = 0, done = 0;
    for (const t of tasks) {
      const matches =
        t.recurring === "daily" ? true :
        t.recurring === "weekly" ? parseISO(t.date).getDay() === d.getDay() :
        isSameDay(parseISO(t.date), d);
      if (!matches) continue;
      total++;
      const isDone = t.recurring && t.recurring !== "none"
        ? (t.completedDates ?? []).includes(key)
        : t.completed;
      if (isDone) done++;
    }
    out.push({ date: key, done, total, pct: total ? done / total : 0 });
  }
  return out;
}

/** Consistência: média de pct nos últimos N dias (ignora dias sem tarefa). */
export function consistency(tasks: Task[], days = 30): number {
  const data = dailyCompletion(tasks, days).filter((d) => d.total > 0);
  if (!data.length) return 0;
  return Math.round((data.reduce((s, d) => s + d.pct, 0) / data.length) * 100);
}

/** Taxa de conclusão por categoria nos últimos N dias. */
export function categoryRates(tasks: Task[], days = 30): { category: string; done: number; total: number; pct: number }[] {
  const end = new Date();
  const map = new Map<string, { done: number; total: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(end, i);
    const key = format(d, "yyyy-MM-dd");
    for (const t of tasks) {
      const matches =
        t.recurring === "daily" ? true :
        t.recurring === "weekly" ? parseISO(t.date).getDay() === d.getDay() :
        isSameDay(parseISO(t.date), d);
      if (!matches) continue;
      const cur = map.get(t.category) ?? { done: 0, total: 0 };
      cur.total++;
      const isDone = t.recurring && t.recurring !== "none"
        ? (t.completedDates ?? []).includes(key)
        : t.completed;
      if (isDone) cur.done++;
      map.set(t.category, cur);
    }
  }
  return Array.from(map.entries())
    .map(([category, v]) => ({ category, done: v.done, total: v.total, pct: v.total ? Math.round((v.done / v.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
}

/** Parser leve para captura rápida.
 * Reconhece: hoje/amanhã/seg-dom/dd-mm, "às 18h", "18:30", "por 1h", "todo dia"/"diário"/"semanal",
 * #categoria, "categoria X", "evento:" e prioridade ("urgente", "alta/média/baixa prioridade").
 */
export type Priority = "low" | "med" | "high";
export interface ParsedQuick {
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  recurring: "none" | "daily" | "weekly";
  categoryHint?: string;
  kind: "task" | "event";
  priority?: Priority;
}

interface CategoryLite { id: string; label: string; }

const WEEKDAYS: Record<string, number> = {
  domingo: 0, dom: 0,
  segunda: 1, seg: 1, "segunda-feira": 1,
  terca: 2, terça: 2, ter: 2, "terça-feira": 2, "terca-feira": 2,
  quarta: 3, qua: 3, "quarta-feira": 3,
  quinta: 4, qui: 4, "quinta-feira": 4,
  sexta: 5, sex: 5, "sexta-feira": 5,
  sabado: 6, sábado: 6, sab: 6, sáb: 6,
};

export function parseQuickInput(raw: string, today = new Date(), categories: CategoryLite[] = []): ParsedQuick {
  let s = " " + raw.trim() + " ";

  let date = format(today, "yyyy-MM-dd");
  let time: string | undefined;
  let endTime: string | undefined;
  let recurring: "none" | "daily" | "weekly" = "none";
  let categoryHint: string | undefined;
  let kind: "task" | "event" = "task";
  let priority: Priority | undefined;

  // kind: "evento:" / "marcar evento" / "agendar evento"
  if (/\b(evento\s*:|marcar\s+evento|agendar\s+evento|criar\s+evento)\b/i.test(s)) {
    kind = "event";
    s = s.replace(/\b(evento\s*:|marcar\s+evento|agendar\s+evento|criar\s+evento)\b/gi, "");
  }

  // priority
  if (/\b(urgente|alta\s+prioridade|prioridade\s+alta)\b/i.test(s)) {
    priority = "high";
    s = s.replace(/\b(urgente|alta\s+prioridade|prioridade\s+alta)\b/gi, "");
  } else if (/\b(baixa\s+prioridade|prioridade\s+baixa)\b/i.test(s)) {
    priority = "low";
    s = s.replace(/\b(baixa\s+prioridade|prioridade\s+baixa)\b/gi, "");
  } else if (/\b(m[eé]dia\s+prioridade|prioridade\s+m[eé]dia)\b/i.test(s)) {
    priority = "med";
    s = s.replace(/\b(m[eé]dia\s+prioridade|prioridade\s+m[eé]dia)\b/gi, "");
  }

  // recurring (expanded)
  if (/\b(todo dia|todos os dias|di[aá]rio|diariamente)\b/i.test(s)) {
    recurring = "daily";
    s = s.replace(/\b(todo dia|todos os dias|di[aá]rio|diariamente)\b/gi, "");
  } else if (/\b(toda semana|semanal|semanalmente|toda (segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo))\b/i.test(s)) {
    recurring = "weekly";
    s = s.replace(/\b(toda semana|semanal|semanalmente)\b/gi, "");
    // keep the weekday word so the date parser below can pick the day
  }

  // category hint #cat
  const catMatch = s.match(/#([\p{L}0-9_-]+)/u);
  if (catMatch) {
    categoryHint = catMatch[1].toLowerCase();
    s = s.replace(catMatch[0], "");
  }

  // category by name: "categoria treino" or matches a known label
  if (!categoryHint) {
    const named = s.match(/\bcategoria\s+([\p{L}0-9_-]+)/iu);
    if (named) {
      categoryHint = named[1].toLowerCase();
      s = s.replace(named[0], "");
    } else {
      for (const c of categories) {
        const re = new RegExp(`\\b${c.label.toLowerCase()}\\b`, "i");
        if (re.test(s)) { categoryHint = c.id; break; }
      }
    }
  }

  // date keywords
  if (/\bdepois de amanh[aã]\b/i.test(s)) {
    date = format(addDays(today, 2), "yyyy-MM-dd");
    s = s.replace(/\bdepois de amanh[aã]\b/gi, "");
  } else if (/\bhoje\b/i.test(s)) {
    s = s.replace(/\bhoje\b/gi, "");
  } else if (/\bamanh[aã]\b/i.test(s)) {
    date = format(addDays(today, 1), "yyyy-MM-dd");
    s = s.replace(/\bamanh[aã]\b/gi, "");
  } else {
    for (const [name, dow] of Object.entries(WEEKDAYS)) {
      const re = new RegExp(`\\b${name}\\b`, "i");
      if (re.test(s)) {
        const cur = today.getDay();
        let diff = (dow - cur + 7) % 7;
        if (diff === 0) diff = 7;
        date = format(addDays(today, diff), "yyyy-MM-dd");
        s = s.replace(re, "");
        break;
      }
    }
    const dm = s.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
    if (dm) {
      const dd = Number(dm[1]);
      const mm = Number(dm[2]) - 1;
      const yy = dm[3] ? (dm[3].length === 2 ? 2000 + Number(dm[3]) : Number(dm[3])) : today.getFullYear();
      const d = new Date(yy, mm, dd);
      if (!isNaN(d.getTime())) date = format(d, "yyyy-MM-dd");
      s = s.replace(dm[0], "");
    }
  }

  // duration
  const durMatch = s.match(/\bpor\s+(\d{1,2})\s*h(?:(\d{1,2}))?\b|\bpor\s+(\d{1,3})\s*min\b/i);
  let durMin: number | undefined;
  if (durMatch) {
    if (durMatch[1]) durMin = Number(durMatch[1]) * 60 + (durMatch[2] ? Number(durMatch[2]) : 0);
    else if (durMatch[3]) durMin = Number(durMatch[3]);
    s = s.replace(durMatch[0], "");
  }

  // time
  const timeMatch = s.match(/\b(?:às|as|@)?\s*(\d{1,2})(?:[:h](\d{2}))?\b(?!\s*min)/i);
  if (timeMatch) {
    const h = Number(timeMatch[1]);
    const m = timeMatch[2] ? Number(timeMatch[2]) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m < 60 && /\d{1,2}[:h]|\bh\b|às|as|@/i.test(timeMatch[0])) {
      time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      s = s.replace(timeMatch[0], "");
      if (durMin != null) {
        const totalEnd = Math.min(h * 60 + m + durMin, 24 * 60 - 1);
        endTime = toHM(totalEnd);
      }
    }
  }

  const title = s.replace(/\s+/g, " ").trim() || (kind === "event" ? "Evento" : "Tarefa");
  return { title, date, time, endTime, recurring, categoryHint, kind, priority };
}

/** Sugere o que fazer num slot livre baseado na categoria mais "esquecida". */
export function suggestForSlot(_slot: Slot, rates: ReturnType<typeof categoryRates>): string | null {
  if (!rates.length) return null;
  const weakest = [...rates].filter((r) => r.total >= 3).sort((a, b) => a.pct - b.pct)[0];
  return weakest ? weakest.category : null;
}

export { differenceInCalendarDays };
