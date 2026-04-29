import { useMemo } from "react";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Task, MonthEvent, CategoryDef } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  month: Date;
  setMonth: (d: Date) => void;
  selected: Date;
  setSelected: (d: Date) => void;
  tasks: Task[];
  events: MonthEvent[];
  categories: CategoryDef[];
}

export const Calendar = ({ month, setMonth, selected, setSelected, tasks, events, categories }: Props) => {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const catMap = new Map(categories.map((c) => [c.id, c]));

  const dotsFor = (day: Date) => {
    const cats = new Set<string>();
    tasks.forEach((t) => {
      if (t.recurring === "daily") cats.add(t.category);
      else if (t.recurring === "weekly" && parseISO(t.date).getDay() === day.getDay()) cats.add(t.category);
      else if (isSameDay(parseISO(t.date), day)) cats.add(t.category);
    });
    events.forEach((e) => {
      if (isSameDay(parseISO(e.date), day)) cats.add(e.category);
    });
    return Array.from(cats).slice(0, 4);
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
            № 02 · Calendário
          </p>
          <h3 className="font-serif text-4xl mt-2 capitalize leading-none">
            {format(month, "MMMM", { locale: ptBR })}
          </h3>
          <p className="font-mono text-xs text-muted-foreground mt-1 tabular-nums">
            {format(month, "yyyy")}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setMonth(subMonths(month, 1))}
            className="h-9 w-9 flex items-center justify-center border hairline hover:bg-foreground/5 hover:border-accent transition-smooth"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="h-9 w-9 flex items-center justify-center border hairline hover:bg-foreground/5 hover:border-accent transition-smooth"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px mb-2">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <div
            key={i}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center py-2"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border/40">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const isSel = isSameDay(day, selected);
          const dots = dotsFor(day);
          const today = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelected(day)}
              className={cn(
                "relative aspect-square bg-background flex flex-col items-center justify-center transition-smooth group",
                !inMonth && "text-muted-foreground/30 bg-background/40",
                isSel && "bg-accent text-accent-foreground",
                !isSel && "hover:bg-foreground/5"
              )}
            >
              {today && !isSel && (
                <motion.span
                  layoutId="today-ring"
                  className="absolute inset-1 border border-accent pointer-events-none"
                />
              )}
              <span className={cn("font-serif text-base sm:text-lg tabular-nums", isSel && "font-semibold")}>
                {format(day, "d")}
              </span>
              {dots.length > 0 && (
                <div className="absolute bottom-1.5 flex gap-0.5">
                  {dots.map((c) => (
                    <span
                      key={c}
                      className="h-1 w-1 rounded-full"
                      style={{ background: isSel ? "hsl(var(--accent-foreground))" : `hsl(${catMap.get(c)?.hue ?? "0 0% 60%"})` }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
