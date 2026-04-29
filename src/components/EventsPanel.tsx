import { useState } from "react";
import { format, isAfter, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { MonthEvent, CategoryDef } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  events: MonthEvent[];
  categories: CategoryDef[];
  onAdd: (e: MonthEvent) => void;
  onDelete: (id: string) => void;
  month: Date;
}

export const EventsPanel = ({ events, categories, onAdd, onDelete, month }: Props) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(month, "yyyy-MM-dd"));
  const [category, setCategory] = useState<string>(categories[0]?.id ?? "uni");

  const catMap = new Map(categories.map((c) => [c.id, c]));

  const monthEvents = events
    .filter((e) => parseISO(e.date).getMonth() === month.getMonth() && parseISO(e.date).getFullYear() === month.getFullYear())
    .sort((a, b) => a.date.localeCompare(b.date));

  const today = startOfDay(new Date());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      title: title.trim(),
      date,
      category,
      createdAt: Date.now(),
    });
    setTitle("");
    setOpen(false);
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">№ 03 · Eventos do mês</p>
          <h3 className="font-serif text-3xl mt-2">Marcos & datas</h3>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="h-9 px-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-smooth"
        >
          <Plus className="h-3 w-3" /> Evento
        </button>
      </div>

      {monthEvents.length === 0 ? (
        <p className="font-mono text-xs text-muted-foreground italic py-10 text-center border hairline">
          Nenhum evento neste mês
        </p>
      ) : (
        <ul className="space-y-px">
          <AnimatePresence>
            {monthEvents.map((ev) => {
              const d = parseISO(ev.date);
              const past = isAfter(today, d);
              const cat = catMap.get(ev.category);
              return (
                <motion.li
                  key={ev.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={cn(
                    "group grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4 border hairline -mt-px hover:bg-foreground/5 transition-smooth",
                    past && "opacity-40"
                  )}
                >
                  <div className="text-center">
                    <div className="font-serif text-3xl leading-none tabular-nums">
                      {format(d, "dd")}
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                      {format(d, "EEE", { locale: ptBR })}
                    </div>
                  </div>
                  <div className="border-l hairline pl-4">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${cat?.hue ?? "0 0% 60%"})` }} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {cat?.label ?? "—"}
                      </span>
                    </div>
                    <p className="font-serif text-lg mt-0.5">{ev.title}</p>
                  </div>
                  <button
                    onClick={() => onDelete(ev.id)}
                    className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-smooth"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-background/85 backdrop-blur-md z-50"
            />
            <motion.form
              onSubmit={submit}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(480px,92vw)] bg-surface-1 border hairline shadow-lift p-8 space-y-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Novo · Evento</p>
                  <h2 className="font-serif text-3xl mt-1">Marcar uma data</h2>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="h-8 w-8 flex items-center justify-center hover:bg-foreground/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Prova de Cálculo II"
                className="w-full font-serif text-2xl bg-transparent border-b hairline pb-2 focus:outline-none focus:border-accent"
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full font-mono text-sm bg-transparent border-b hairline pb-2 focus:outline-none focus:border-accent"
              />
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      "px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] border-2 transition-smooth flex items-center gap-2",
                      category === c.id
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/50"
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${c.hue})` }} />
                    {c.label}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className="w-full py-3 font-mono text-xs uppercase tracking-[0.25em] bg-accent text-accent-foreground hover:glow-accent transition-smooth"
              >
                Adicionar evento
              </button>
            </motion.form>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
