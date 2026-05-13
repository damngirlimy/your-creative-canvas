import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, ArrowRight } from "lucide-react";
import { CategoryDef, Task } from "@/lib/types";

export interface CommandAction {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  categories: CategoryDef[];
  actions: CommandAction[];
  onJumpDate: (d: Date) => void;
  onEditTask: (t: Task) => void;
  onFilter: (categoryId: string) => void;
}

export function CommandPalette({ open, onClose, tasks, categories, actions, onJumpDate, onEditTask, onFilter }: Props) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQ(""); setIdx(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const items = useMemo(() => {
    const list: CommandAction[] = [];
    list.push(...actions);
    // Date jumps
    const now = new Date();
    [
      { d: now, label: "Ir para hoje" },
      { d: addDays(now, 1), label: "Ir para amanhã" },
      { d: addDays(now, 7), label: "Ir para próxima semana" },
    ].forEach(({ d, label }) => {
      list.push({
        id: `jump-${label}`, label, hint: format(d, "dd MMM", { locale: ptBR }),
        group: "Navegar", run: () => onJumpDate(d),
      });
    });
    // Filter by category
    list.push({ id: "filter-all", label: "Filtrar: Todas", group: "Filtrar", run: () => onFilter("all") });
    categories.forEach((c) =>
      list.push({ id: `filter-${c.id}`, label: `Filtrar: ${c.label}`, group: "Filtrar", run: () => onFilter(c.id) })
    );
    // Tasks
    tasks.slice(0, 50).forEach((t) =>
      list.push({
        id: `task-${t.id}`, label: t.title, hint: t.time ?? t.date,
        group: "Tarefas", run: () => onEditTask(t),
      })
    );
    if (!q.trim()) return list;
    const ql = q.toLowerCase();
    return list.filter((i) => i.label.toLowerCase().includes(ql) || i.group.toLowerCase().includes(ql));
  }, [q, actions, categories, tasks, onJumpDate, onEditTask, onFilter]);

  useEffect(() => { if (idx >= items.length) setIdx(0); }, [items.length, idx]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); const it = items[idx]; if (it) { it.run(); onClose(); } }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, idx, onClose]);

  // Group items
  const groups = useMemo(() => {
    const m = new Map<string, CommandAction[]>();
    items.forEach((it) => { if (!m.has(it.group)) m.set(it.group, []); m.get(it.group)!.push(it); });
    return Array.from(m.entries());
  }, [items]);

  let runningIdx = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md flex items-start justify-center p-4 pt-[12vh]"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-surface-1 border hairline shadow-lift"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b hairline">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }}
                placeholder="Buscar comandos, tarefas, datas…"
                className="flex-1 bg-transparent outline-none font-mono text-sm placeholder:text-muted-foreground"
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">esc</span>
            </div>
            <div className="max-h-[55vh] overflow-y-auto py-2">
              {groups.length === 0 && (
                <p className="px-4 py-8 text-center font-serif italic text-foreground/50">Nada encontrado.</p>
              )}
              {groups.map(([group, list]) => (
                <div key={group} className="mb-2">
                  <p className="px-4 py-1 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">{group}</p>
                  {list.map((it) => {
                    runningIdx += 1;
                    const active = runningIdx === idx;
                    const myIdx = runningIdx;
                    return (
                      <button
                        key={it.id}
                        onMouseEnter={() => setIdx(myIdx)}
                        onClick={() => { it.run(); onClose(); }}
                        className={`w-full flex items-center justify-between px-4 py-2 text-left transition-smooth ${active ? "bg-accent text-accent-foreground" : "hover:bg-foreground/5"}`}
                      >
                        <span className="font-mono text-xs truncate">{it.label}</span>
                        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] opacity-70">
                          {it.hint}
                          {active && <ArrowRight className="h-3 w-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="border-t hairline px-4 py-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
              <span>↑ ↓ navegar · ⏎ executar</span>
              <span>⌘K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
