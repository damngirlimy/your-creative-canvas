import { useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Pencil, Trash2, GripVertical, ChevronDown, Plus } from "lucide-react";
import { Task, CategoryDef, PRIORITY_META, Subtask } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  selectedDate: Date;
  categories: CategoryDef[];
  onToggle: (id: string, dateKey: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onUpdate: (task: Task) => void;
  onReorder: (orderedIds: string[]) => void;
}

const isDoneOn = (t: Task, dateKey: string) => {
  if (t.recurring && t.recurring !== "none") {
    return (t.completedDates ?? []).includes(dateKey);
  }
  return !!t.completed;
};

export const TaskList = ({
  tasks, selectedDate, categories,
  onToggle, onEdit, onDelete, onUpdate, onReorder,
}: Props) => {
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
      const ao = a.order ?? 9999;
      const bo = b.order ?? 9999;
      if (ao !== bo) return ao - bo;
      const at = a.time ?? "99:99";
      const bt = b.time ?? "99:99";
      return at.localeCompare(bt);
    });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [newSubInput, setNewSubInput] = useState<Record<string, string>>({});

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSubtask = (task: Task, subId: string) => {
    const subs = (task.subtasks ?? []).map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
    onUpdate({ ...task, subtasks: subs });
  };

  const addSubtask = (task: Task) => {
    const text = (newSubInput[task.id] ?? "").trim();
    if (!text) return;
    const sub: Subtask = { id: crypto.randomUUID(), text, done: false };
    onUpdate({ ...task, subtasks: [...(task.subtasks ?? []), sub] });
    setNewSubInput((p) => ({ ...p, [task.id]: "" }));
  };

  const removeSubtask = (task: Task, subId: string) => {
    onUpdate({ ...task, subtasks: (task.subtasks ?? []).filter((s) => s.id !== subId) });
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = dayTasks.map((t) => t.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const reordered = [...ids];
    reordered.splice(to, 0, reordered.splice(from, 1)[0]);
    onReorder(reordered);
    setDragId(null);
    setOverId(null);
  };

  if (dayTasks.length === 0) {
    return (
      <div className="border-t hairline pt-16 sm:pt-20 pb-24 sm:pb-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-10 pointer-events-none" />
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          — agenda em branco —
        </p>
        <p className="mt-6 font-serif italic text-3xl sm:text-4xl text-foreground/40">
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
          const isOpen = expanded.has(task.id);
          const subs = task.subtasks ?? [];
          const subDone = subs.filter((s) => s.done).length;
          const tags = task.tags ?? [];
          const isOver = overId === task.id && dragId && dragId !== task.id;

          return (
            <motion.li
              key={task.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              draggable
              onDragStart={() => setDragId(task.id)}
              onDragOver={(e) => { e.preventDefault(); setOverId(task.id); }}
              onDragLeave={() => setOverId((id) => (id === task.id ? null : id))}
              onDrop={() => handleDrop(task.id)}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              className={cn(
                "group relative border-b hairline last:border-b-0 hover:bg-foreground/[0.03] transition-colors",
                dragId === task.id && "opacity-50",
                isOver && "bg-accent/10"
              )}
            >
              <div className="grid grid-cols-[auto_auto_1fr_auto] sm:grid-cols-[auto_auto_72px_1fr_auto] items-center gap-2 sm:gap-4 py-3 sm:py-5 px-2 sm:px-4">
                {/* Drag handle */}
                <button
                  type="button"
                  aria-label="Arrastar"
                  className="h-8 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground touch-none"
                  onPointerDown={(e) => e.currentTarget.parentElement?.parentElement?.setAttribute('draggable', 'true')}
                >
                  <GripVertical className="h-4 w-4" />
                </button>

                {/* Check */}
                <div className="flex items-center gap-2">
                  <span className="hidden md:inline font-mono text-[10px] text-muted-foreground tabular-nums w-5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <button
                    onClick={() => onToggle(task.id, dateKey)}
                    className={cn(
                      "h-6 w-6 shrink-0 border-2 flex items-center justify-center transition-smooth",
                      task._doneToday
                        ? "bg-accent border-accent shadow-accent"
                        : "border-foreground/30 hover:border-accent"
                    )}
                    aria-label="Concluir"
                  >
                    {task._doneToday && <Check className="h-3.5 w-3.5 text-accent-foreground" strokeWidth={3} />}
                  </button>
                </div>

                {/* TIME column (desktop) */}
                <div className="hidden sm:block font-mono tabular-nums">
                  {task.time ? (
                    <>
                      <div className={cn("text-lg md:text-xl font-medium leading-none", task._doneToday && "text-muted-foreground line-through")}>
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
                <div className="min-w-0 sm:border-l sm:hairline sm:pl-4 md:pl-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.time && (
                      <span className="sm:hidden font-mono text-sm tabular-nums font-medium">
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
                    {tags.map((t) => (
                      <span key={t} className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-foreground/8 text-foreground/70 rounded-sm">
                        #{t}
                      </span>
                    ))}
                    {subs.length > 0 && (
                      <button
                        onClick={() => toggleExpand(task.id)}
                        className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border hairline text-muted-foreground hover:text-foreground hover:border-foreground/40 flex items-center gap-1"
                      >
                        <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", isOpen && "rotate-180")} />
                        {subDone}/{subs.length}
                      </button>
                    )}
                  </div>
                  <h3
                    className={cn(
                      "font-serif text-lg sm:text-2xl md:text-3xl mt-1 leading-tight tracking-tight transition-smooth break-words",
                      task._doneToday && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </h3>
                  {task.notes && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{task.notes}</p>
                  )}
                  {/* Subtask progress bar */}
                  {subs.length > 0 && (
                    <div className="mt-2 h-[2px] bg-foreground/10 relative overflow-hidden max-w-xs">
                      <div
                        className="absolute inset-y-0 left-0 bg-accent transition-all"
                        style={{ width: `${(subDone / subs.length) * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-foreground/5 transition-smooth"
                    aria-label="Expandir subtarefas"
                    title="Subtarefas"
                  >
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  <button
                    onClick={() => onEdit(task)}
                    className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-foreground/5 transition-smooth"
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Apagar "${task.title}"?`)) onDelete(task.id);
                    }}
                    className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-foreground/5 transition-smooth"
                    aria-label="Apagar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded subtask editor */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-12 pb-4 space-y-2">
                      {subs.map((s) => (
                        <div key={s.id} className="flex items-center gap-3 group/sub">
                          <button
                            onClick={() => toggleSubtask(task, s.id)}
                            className={cn(
                              "h-4 w-4 shrink-0 border flex items-center justify-center transition-smooth",
                              s.done ? "bg-accent border-accent" : "border-foreground/30 hover:border-accent"
                            )}
                          >
                            {s.done && <Check className="h-2.5 w-2.5 text-accent-foreground" strokeWidth={3} />}
                          </button>
                          <span className={cn("text-sm flex-1", s.done && "line-through text-muted-foreground")}>{s.text}</span>
                          <button
                            onClick={() => removeSubtask(task, s.id)}
                            className="opacity-0 group-hover/sub:opacity-100 text-muted-foreground hover:text-destructive transition-smooth"
                            aria-label="Remover"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 pt-1">
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          value={newSubInput[task.id] ?? ""}
                          onChange={(e) => setNewSubInput((p) => ({ ...p, [task.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(task); } }}
                          placeholder="Nova subtarefa…"
                          className="flex-1 bg-transparent border-b hairline pb-1 text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Side accent */}
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
