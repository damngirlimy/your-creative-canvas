import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { CalendarClock, Plus } from "lucide-react";
import { Task } from "@/lib/types";
import { freeSlots, formatDuration, overdueTasks } from "@/lib/insights";
import { MonthEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
  tasks: Task[];
  events: MonthEvent[];
  onFillSlot: (start: string, end: string) => void;
  onReschedule: (task: Task) => void;
  onDiscard: (id: string) => void;
}

export function FreeSlotsPanel({ date, tasks, events, onFillSlot, onReschedule, onDiscard }: Props) {
  const slots = freeSlots(date, tasks, events);
  const overdue = overdueTasks(tasks, new Date());

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
            {overdue.slice(0, 6).map((t) => (
              <li key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-base leading-tight truncate">{t.title}</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    {format(parseISO(t.date), "dd MMM", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onReschedule(t)}
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
              </li>
            ))}
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
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {slots.map((s) => (
              <li key={s.start} className={cn(
                "group border hairline p-3 flex items-center justify-between gap-3",
                "hover:border-accent/60 transition-smooth"
              )}>
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
