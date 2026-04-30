import { format, isSameDay, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Pencil, Trash2 } from "lucide-react";
import { Task, CategoryDef, PRIORITY_META } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  selectedDate: Date;
  categories: CategoryDef[];
  onToggle: (id: string, dateKey: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const isDoneOn = (t: Task, dateKey: string) => {
  if (t.recurring && t.recurring !== "none") {
    return (t.completedDates ?? []).includes(dateKey);
  }
  return !!t.completed;
};

export const TaskList = ({ tasks, selectedDate, categories, onToggle, onEdit, onDelete }: Props) => {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const dayTasks = tasks
    .filter((t) => {
      if (t.recurring === "daily") return true;
      if (t.recurring === "weekly") return parseISO(t.date).getDay() === selectedDate.getDay();
      return isSameDay(parseISO(t.date), selectedDate);
    })
    .map((t) => ({ ...t, _doneToday: isDoneOn(t, dateKey) }))
    .sort((a, b) => {
      if (a._doneToday !== b._doneToday) return a._doneToday ? 1 : -1;
      const at = a.time ?? "99:99";
      const bt = b.time ?? "99:99";
      return at.localeCompare(bt);
    });

  if (dayTasks.length === 0) {
    return (
      <div className="border-t hairline pt-20 pb-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-10 pointer-events-none" />
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          — agenda em branco —
        </p>
        <p className="mt-6 font-serif italic text-4xl text-foreground/40">
          Um dia em branco.
          <br />
          <span className="text-foreground/70">Que luxo.</span>
        </p>
      </div>
    );
  }

  return (
    <ul className="border-t border-b hairline">
      <AnimatePresence initial={false}>
        {dayTasks.map((task, i) => {
          const cat = catMap.get(task.category);
          const hue = cat?.hue ?? "0 0% 60%";
          return (
            <motion.li
              key={task.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="group relative border-b hairline last:border-b-0 hover:bg-foreground/[0.03] transition-smooth"
            >
              <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_80px_1fr_auto] items-center gap-3 md:gap-6 py-4 md:py-5 px-2 md:px-4">
                {/* Index + check */}
                <div className="flex items-center gap-2 md:gap-4">
                  <span className="hidden sm:inline font-mono text-[10px] text-muted-foreground tabular-nums w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <button
                    onClick={() => onToggle(task.id)}
                    className={cn(
                      "h-6 w-6 shrink-0 border-2 flex items-center justify-center transition-smooth",
                      task.completed
                        ? "bg-accent border-accent shadow-accent"
                        : "border-foreground/30 hover:border-accent"
                    )}
                    aria-label="Concluir"
                  >
                    {task.completed && <Check className="h-3.5 w-3.5 text-accent-foreground" strokeWidth={3} />}
                  </button>
                </div>

                {/* TIME — bold visible (desktop column) */}
                <div className="hidden md:block font-mono tabular-nums">
                  {task.time ? (
                    <>
                      <div className={cn("text-xl font-medium leading-none", task.completed && "text-muted-foreground line-through")}>
                        {task.time}
                      </div>
                      {task.endTime && (
                        <div className="text-[10px] text-muted-foreground mt-1">→ {task.endTime}</div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground/50 italic">livre</div>
                  )}
                </div>

                {/* Body */}
                <div className="min-w-0 md:border-l md:hairline md:pl-6">
                  <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                    {/* mobile inline time */}
                    {task.time && (
                      <span className="md:hidden font-mono text-sm tabular-nums font-medium">
                        {task.time}{task.endTime && <span className="text-muted-foreground text-[10px]"> → {task.endTime}</span>}
                      </span>
                    )}
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${hue})` }} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {cat?.label ?? "—"}
                    </span>
                    <span className="hidden sm:inline font-mono text-[10px] text-muted-foreground">
                      {PRIORITY_META[task.priority].symbol} {PRIORITY_META[task.priority].label}
                    </span>
                    {task.recurring && task.recurring !== "none" && (
                      <span className="font-mono text-[9px] text-accent border border-accent/40 px-1.5 py-0.5 uppercase tracking-widest">
                        {task.recurring === "daily" ? "Diário" : "Semanal"}
                      </span>
                    )}
                  </div>
                  <h3
                    className={cn(
                      "font-serif text-xl md:text-3xl mt-1 leading-tight tracking-tight transition-smooth break-words",
                      task.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </h3>
                  {task.notes && (
                    <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{task.notes}</p>
                  )}
                </div>

                {/* Actions — always visible on mobile */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(task)}
                    className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-foreground/5 transition-smooth md:opacity-0 md:group-hover:opacity-100"
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Apagar "${task.title}"?`)) onDelete(task.id);
                    }}
                    className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-foreground/5 transition-smooth md:opacity-0 md:group-hover:opacity-100"
                    aria-label="Apagar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {/* Side accent line */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[2px] opacity-0 group-hover:opacity-100 transition-smooth"
                style={{ background: `hsl(${hue})` }}
              />
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
};
