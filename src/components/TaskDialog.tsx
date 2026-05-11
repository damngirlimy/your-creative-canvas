import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Calendar as CalendarIcon, Clock, Repeat, Flag, Tag, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CategoryDef, Priority, Task, PRIORITY_META, PALETTE_HUES } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  defaultDate: Date;
  editing?: Task | null;
  categories: CategoryDef[];
  onAddCategory: (c: CategoryDef) => void;
  onDeleteCategory: (id: string) => void;
  prefill?: { time?: string; endTime?: string; date?: string; category?: string } | null;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

export const TaskDialog = ({
  open, onClose, onSave, defaultDate, editing,
  categories, onAddCategory, onDeleteCategory, prefill,
}: Props) => {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<string>(categories[0]?.id ?? "work");
  const [priority, setPriority] = useState<Priority>("med");
  const [date, setDate] = useState(format(defaultDate, "yyyy-MM-dd"));
  const [hour, setHour] = useState<number | null>(null);
  const [minute, setMinute] = useState<number>(0);
  const [endHour, setEndHour] = useState<number | null>(null);
  const [endMinute, setEndMinute] = useState<number>(0);
  const [recurring, setRecurring] = useState<"none" | "daily" | "weekly">("none");
  const [showCatCreator, setShowCatCreator] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatHue, setNewCatHue] = useState(PALETTE_HUES[0]);

  const hourScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setNotes(editing.notes ?? "");
      setCategory(editing.category);
      setPriority(editing.priority);
      setDate(editing.date);
      if (editing.time) {
        const [h, m] = editing.time.split(":").map(Number);
        setHour(h); setMinute(m);
      } else {
        setHour(null); setMinute(0);
      }
      if (editing.endTime) {
        const [h, m] = editing.endTime.split(":").map(Number);
        setEndHour(h); setEndMinute(m);
      } else {
        setEndHour(null); setEndMinute(0);
      }
      setRecurring(editing.recurring ?? "none");
    } else {
      setTitle("");
      setNotes("");
      setCategory(prefill?.category ?? categories[0]?.id ?? "work");
      setPriority("med");
      setDate(prefill?.date ?? format(defaultDate, "yyyy-MM-dd"));
      if (prefill?.time) {
        const [h, m] = prefill.time.split(":").map(Number);
        setHour(h); setMinute(m);
      } else {
        setHour(null); setMinute(0);
      }
      if (prefill?.endTime) {
        const [h, m] = prefill.endTime.split(":").map(Number);
        setEndHour(h); setEndMinute(m);
      } else {
        setEndHour(null); setEndMinute(0);
      }
      setRecurring("none");
    }
    setShowCatCreator(false);
  }, [editing, defaultDate, open, categories, prefill]);

  // Auto-scroll hour rail to selected
  useEffect(() => {
    if (!open || hour == null) return;
    const el = hourScrollRef.current?.querySelector<HTMLButtonElement>(`[data-h="${hour}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [hour, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const time = hour != null ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` : undefined;
    const endTime = endHour != null ? `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}` : undefined;
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      title: title.trim(),
      notes: notes.trim() || undefined,
      category,
      priority,
      date,
      time,
      endTime,
      completed: editing?.completed ?? false,
      recurring,
      createdAt: editing?.createdAt ?? Date.now(),
    });
    onClose();
  };

  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + crypto.randomUUID().slice(0, 4);
    const cat: CategoryDef = { id, label: name, hue: newCatHue };
    onAddCategory(cat);
    setCategory(id);
    setNewCatName("");
    setShowCatCreator(false);
  };

  const dateLabel = useMemo(() => {
    try { return format(parseISO(date), "EEE, dd 'de' MMM", { locale: ptBR }); } catch { return date; }
  }, [date]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/85 backdrop-blur-md z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(680px,94vw)] max-h-[92vh] overflow-y-auto bg-surface-1 border hairline shadow-lift"
          >
            {/* Header */}
            <div className="relative border-b hairline px-8 py-6 bg-gradient-ink">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                    {editing ? "Edição" : "Novo Registro"} · № {String(Date.now()).slice(-4)}
                  </p>
                  <h2 className="font-serif text-4xl mt-2 leading-none">
                    {editing ? (
                      <>Refinar <span className="italic font-light text-foreground/60">o plano</span></>
                    ) : (
                      <>Compor <span className="italic font-light text-foreground/60">o dia</span></>
                    )}
                  </h2>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-3">
                    {dateLabel}{hour != null && ` · ${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`}
                  </p>
                </div>
                <button onClick={onClose} className="h-9 w-9 flex items-center justify-center hover:bg-foreground/10 transition-smooth">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* Title */}
              <div>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome da tarefa…"
                  className="w-full font-serif text-4xl bg-transparent border-b hairline pb-3 placeholder:text-foreground/25 focus:outline-none focus:border-accent transition-smooth"
                />
              </div>

              {/* Date + Recurring row */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label icon={<CalendarIcon className="h-3 w-3" />}>Data</Label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-2 w-full font-mono text-sm bg-transparent border-b hairline pb-2 focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <Label icon={<Repeat className="h-3 w-3" />}>Repetição</Label>
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    {(["none", "daily", "weekly"] as const).map((r) => (
                      <Chip key={r} active={recurring === r} onClick={() => setRecurring(r)}>
                        {r === "none" ? "Única" : r === "daily" ? "Diário" : "Semanal"}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time picker — luxury rail */}
              <div>
                <div className="flex items-baseline justify-between">
                  <Label icon={<Clock className="h-3 w-3" />}>Horário</Label>
                  {hour != null && (
                    <button
                      type="button"
                      onClick={() => { setHour(null); setEndHour(null); }}
                      className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Big time display */}
                <div className="mt-3 flex items-center gap-4">
                  <div className="font-serif text-6xl tabular-nums leading-none">
                    {hour != null ? (
                      <>
                        <span>{String(hour).padStart(2, "0")}</span>
                        <span className="text-accent">:</span>
                        <span>{String(minute).padStart(2, "0")}</span>
                      </>
                    ) : (
                      <span className="text-foreground/20">--:--</span>
                    )}
                  </div>
                  {endHour != null && (
                    <>
                      <div className="font-mono text-xs text-muted-foreground">→</div>
                      <div className="font-serif text-3xl tabular-nums leading-none text-foreground/70">
                        {String(endHour).padStart(2, "0")}:{String(endMinute).padStart(2, "0")}
                      </div>
                    </>
                  )}
                </div>

                {/* Hour rail */}
                <div ref={hourScrollRef} className="mt-4 overflow-x-auto marquee-mask -mx-2 px-2 pb-2">
                  <div className="flex gap-1 min-w-max">
                    {HOURS.map((h) => (
                      <button
                        type="button"
                        key={h}
                        data-h={h}
                        onClick={() => setHour(h)}
                        className={cn(
                          "shrink-0 w-12 h-14 flex flex-col items-center justify-center font-mono text-xs border transition-smooth",
                          hour === h
                            ? "bg-accent text-accent-foreground border-accent shadow-accent"
                            : "border-border/60 hover:border-foreground/40 text-foreground/70"
                        )}
                      >
                        <span className="text-base tabular-nums">{String(h).padStart(2, "0")}</span>
                        <span className="text-[8px] uppercase tracking-widest opacity-60">
                          {h < 12 ? "AM" : "PM"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minutes */}
                <div className="mt-3 flex gap-1">
                  {MINUTES.map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setMinute(m)}
                      disabled={hour == null}
                      className={cn(
                        "flex-1 py-2 font-mono text-xs border transition-smooth tabular-nums disabled:opacity-30",
                        minute === m && hour != null
                          ? "bg-foreground text-background border-foreground"
                          : "border-border/60 hover:border-foreground/40"
                      )}
                    >
                      :{String(m).padStart(2, "0")}
                    </button>
                  ))}
                </div>

                {/* End time toggle */}
                {hour != null && (
                  <div className="mt-4 pt-4 border-t hairline">
                    <button
                      type="button"
                      onClick={() => setEndHour(endHour == null ? Math.min(hour + 1, 23) : null)}
                      className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground flex items-center gap-2"
                    >
                      {endHour == null ? <Plus className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {endHour == null ? "Adicionar fim" : "Remover horário de fim"}
                    </button>
                    {endHour != null && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {HOURS.filter((h) => h >= hour).map((h) => (
                          <button
                            type="button"
                            key={h}
                            onClick={() => setEndHour(h)}
                            className={cn(
                              "w-10 h-9 font-mono text-xs border tabular-nums transition-smooth",
                              endHour === h
                                ? "bg-accent text-accent-foreground border-accent"
                                : "border-border/60 hover:border-foreground/40"
                            )}
                          >
                            {String(h).padStart(2, "0")}
                          </button>
                        ))}
                        <div className="basis-full h-1" />
                        {MINUTES.map((m) => (
                          <button
                            type="button"
                            key={m}
                            onClick={() => setEndMinute(m)}
                            className={cn(
                              "px-3 h-8 font-mono text-xs border tabular-nums",
                              endMinute === m ? "bg-foreground text-background border-foreground" : "border-border/60"
                            )}
                          >
                            :{String(m).padStart(2, "0")}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <div className="flex items-baseline justify-between">
                  <Label icon={<Tag className="h-3 w-3" />}>Categoria</Label>
                  <button
                    type="button"
                    onClick={() => setShowCatCreator((v) => !v)}
                    className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Nova categoria
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <div key={c.id} className="relative group">
                      <button
                        type="button"
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
                      {!c.builtin && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDeleteCategory(c.id); if (category === c.id) setCategory(categories[0]?.id ?? "work"); }}
                          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-smooth"
                          aria-label="Apagar categoria"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <AnimatePresence>
                  {showCatCreator && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 overflow-hidden"
                    >
                      <div className="border hairline p-4 bg-surface-2">
                        <input
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
                          placeholder="Ex: Leitura, Meditação…"
                          className="w-full font-serif text-xl bg-transparent border-b hairline pb-2 focus:outline-none focus:border-accent"
                        />
                        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Cor</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {PALETTE_HUES.map((h) => (
                            <button
                              type="button"
                              key={h}
                              onClick={() => setNewCatHue(h)}
                              className={cn(
                                "h-7 w-7 transition-smooth border-2",
                                newCatHue === h ? "border-foreground scale-110" : "border-transparent"
                              )}
                              style={{ background: `hsl(${h})` }}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          className="mt-4 w-full py-2 font-mono text-[10px] uppercase tracking-[0.2em] bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                          Criar categoria
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Priority */}
              <div>
                <Label icon={<Flag className="h-3 w-3" />}>Prioridade</Label>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
                    <Chip key={p} active={priority === p} onClick={() => setPriority(p)}>
                      <span className="mr-1.5">{PRIORITY_META[p].symbol}</span>
                      {PRIORITY_META[p].label}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>Notas</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Detalhes opcionais…"
                  className="mt-2 w-full bg-transparent border hairline p-3 text-sm focus:outline-none focus:border-accent transition-smooth resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t hairline -mx-8 px-8 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 font-mono text-xs uppercase tracking-[0.25em] border hairline hover:bg-foreground/5 transition-smooth"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 font-mono text-xs uppercase tracking-[0.25em] bg-accent text-accent-foreground hover:glow-accent transition-smooth"
                >
                  {editing ? "Salvar alterações" : "Adicionar ao cronograma"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const Label = ({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) => (
  <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground flex items-center gap-2">
    {icon}{children}
  </label>
);

const Chip = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "py-2 font-mono text-[10px] uppercase tracking-[0.18em] border transition-smooth",
      active ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/40"
    )}
  >
    {children}
  </button>
);
