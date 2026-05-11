import { useState } from "react";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, Plus, Sparkles, X } from "lucide-react";
import { Task, MonthEvent, CategoryDef } from "@/lib/types";
import { freeSlots, formatDuration, overdueTasks, categoryRates, suggestForSlot } from "@/lib/insights";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
  tasks: Task[];
  events: MonthEvent[];
  categories: CategoryDef[];
  onFillSlot: (start: string, end: string, suggestedCategory?: string) => void;
  onReschedule: (task: Task, newDate: string) => void;
  onDiscard: (id: string) => void;
}

export function FreeSlotsPanel({ date, tasks, events, categories, onFillSlot, onReschedule, onDiscard }: Props) {
  const slots = freeSlots(date, tasks, events);
  const overdue = overdueTasks(tasks, new Date());
  const rates = categoryRates(tasks, 30);
  const catLabel = (id?: string) => categories.find((c) => c.id === id)?.label ?? id ?? "—";

  const [openReschedule, setOpenReschedule] = useState<string | null>(null);

  const buildOptions = (t: Task) => {
    const today = new Date();
    const sameWeekday = addDays(today, 7);
    return [
      { label: "Hoje", date: format(today, "yyyy-MM-dd") },
      { label: "Amanhã", date: format(addDays(today, 1), "yyyy-MM-dd") },
      { label: format(sameWeekday, "EEE dd/MM", { locale: ptBR }), date: format(sameWeekday, "yyyy-MM-dd") },
    ];
  };

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="border hairline bg-surface-1 p-4 sm:p-5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-destructive">
              ⚠ Ficaram para trás
            </p>
            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
              {overdue.length}
            </span>
          </div>
          <ul className="mt-3 divide-y hairline">
            {overdue.slice(0, 6).map((t) => {
              const opts = buildOptions(t);
              return (
                <li key={t.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-base leading-tight truncate">{t.title}</p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                        {format(parseISO(t.date), "dd MMM", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setOpenReschedule(openReschedule === t.id ? null : t.id)}
                        className="font-mono text-[9px] uppercase tracking-[0.2em] px-2 py-1 border hairline hover:bg-accent hover:text-accent-foreground transition-smooth"
                      >
                        Reagendar
                      </button>
                      <button
                        onClick={() => onDiscard(t.id)}
                        className="font-mono text-[9px] uppercase tracking-[0.2em] px-2 py-1 text-muted-foreground hover:text-destructive transition-smooth"
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {openReschedule === t.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {opts.map((o) => (
                            <button
                              key={o.date}
                              onClick={() => { onReschedule(t, o.date); setOpenReschedule(null); }}
                              className="font-mono text-[9px] uppercase tracking-[0.2em] px-2.5 py-1 border hairline hover:bg-accent hover:text-accent-foreground transition-smooth"
                            >
                              {o.label}
                            </button>
                          ))}
                          <button
                            onClick={() => setOpenReschedule(null)}
                            className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </motion.div>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent flex items-center gap-2">
            <CalendarClock className="h-3 w-3" /> Horários livres
          </p>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            07h–23h
          </span>
        </div>
        {slots.length === 0 ? (
          <p className="font-serif italic text-foreground/50 text-sm">
            Sem brechas hoje. Dia cheio.
          </p>
        ) : (
          <ul className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2">
            {slots.map((s) => {
              const sug = suggestForSlot(s, rates);
              const sugRate = rates.find((r) => r.category === sug);
              return (
                <li key={s.start} className={cn(
                  "group border hairline p-3 flex flex-col gap-2",
                  "hover:border-accent/60 transition-smooth"
                )}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-mono tabular-nums">
                      <div className="text-sm">{s.start} <span className="text-muted-foreground">→</span> {s.end}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-0.5">
                        {formatDuration(s.minutes)} livre
                      </div>
                    </div>
                    <button
                      onClick={() => onFillSlot(s.start, s.end)}
                      className="h-8 w-8 flex items-center justify-center border hairline hover:bg-accent hover:text-accent-foreground hover:border-accent transition-smooth"
                      aria-label="Preencher horário"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {sug && sugRate && (
                    <button
                      onClick={() => onFillSlot(s.start, s.end, sug)}
                      className="text-left flex items-center gap-2 px-2 py-1.5 bg-surface-2 border hairline hover:border-accent/60 transition-smooth"
                    >
                      <Sparkles className="h-3 w-3 text-accent shrink-0" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate">
                        Sugestão: <span className="text-foreground">{catLabel(sug)}</span> · {sugRate.pct}% nos últimos 30d
                      </span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
