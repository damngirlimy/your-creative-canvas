import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, X, Wand2, Mic, MicOff, Calendar as CalendarIcon, ClipboardPaste, Trash2 } from "lucide-react";
import { Task, MonthEvent, CategoryDef, PRIORITY_META, Priority } from "@/lib/types";
import { parseQuickInput, ParsedQuick } from "@/lib/insights";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  initialMode?: "single" | "paste";
  onClose: () => void;
  categories: CategoryDef[];
  onCreateTask: (task: Task) => void;
  onCreateEvent: (event: MonthEvent) => void;
  onOpenFull: () => void;
}

interface Draft {
  title: string;
  date: string;
  time: string;
  endTime: string;
  category: string;
  priority: Priority;
  recurring: "none" | "daily" | "weekly";
  kind: "task" | "event";
}

const emptyDraft = (cats: CategoryDef[]): Draft => ({
  title: "",
  date: new Date().toISOString().slice(0, 10),
  time: "",
  endTime: "",
  category: cats[0]?.id ?? "other",
  priority: "med",
  recurring: "none",
  kind: "task",
});

const matchCategory = (cats: CategoryDef[], hint?: string) => {
  if (!hint) return cats[0]?.id ?? "other";
  const h = hint.toLowerCase();
  const found = cats.find((c) => c.id.toLowerCase() === h || c.label.toLowerCase().startsWith(h));
  return found?.id ?? cats[0]?.id ?? "other";
};

const draftFromParse = (p: ParsedQuick, cats: CategoryDef[]): Draft => ({
  title: p.title,
  date: p.date,
  time: p.time ?? "",
  endTime: p.endTime ?? "",
  category: matchCategory(cats, p.categoryHint),
  priority: p.priority ?? "med",
  recurring: p.recurring,
  kind: p.kind,
});

export function QuickCapture({ open, initialMode = "single", onClose, categories, onCreateTask, onCreateEvent, onOpenFull }: Props) {
  const [mode, setMode] = useState<"single" | "paste">(initialMode);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(categories));
  const [pasteText, setPasteText] = useState("");
  const [pasteRows, setPasteRows] = useState<{ keep: boolean; draft: Draft }[]>([]);

  useEffect(() => { if (open) setMode(initialMode); }, [open, initialMode]);

  const parsed = useMemo(() => text.trim() ? parseQuickInput(text, new Date(), categories) : null, [text, categories]);

  // sync parsed → draft (preserves edits the user already made? we overwrite all on text change for simplicity, except title is replaced)
  useEffect(() => {
    if (!parsed) return;
    setDraft((d) => ({
      ...draftFromParse(parsed, categories),
      // keep user-edited values that diverge meaningfully
      kind: d.kind === parsed.kind ? d.kind : parsed.kind,
    }));
  }, [parsed, categories]);

  const speech = useSpeechRecognition({
    onFinal: (t) => setText((cur) => (cur ? cur + " " : "") + t),
  });

  const reset = () => {
    setText("");
    setDraft(emptyDraft(categories));
    setPasteText("");
    setPasteRows([]);
  };

  const close = () => { reset(); onClose(); };

  const submitOne = () => {
    if (!draft.title.trim()) return;
    if (draft.kind === "event") {
      onCreateEvent({
        id: crypto.randomUUID(),
        title: draft.title.trim(),
        date: draft.date,
        category: draft.category,
        createdAt: Date.now(),
      });
    } else {
      onCreateTask({
        id: crypto.randomUUID(),
        title: draft.title.trim(),
        category: draft.category,
        priority: draft.priority,
        date: draft.date,
        time: draft.time || undefined,
        endTime: draft.endTime || undefined,
        completed: false,
        recurring: draft.recurring,
        createdAt: Date.now(),
      });
    }
    close();
  };

  const previewPaste = () => {
    const lines = pasteText.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
    const rows = lines.map((l) => ({ keep: true, draft: draftFromParse(parseQuickInput(l, new Date(), categories), categories) }));
    setPasteRows(rows);
  };

  const importPaste = () => {
    for (const r of pasteRows) {
      if (!r.keep || !r.draft.title.trim()) continue;
      if (r.draft.kind === "event") {
        onCreateEvent({
          id: crypto.randomUUID(),
          title: r.draft.title.trim(),
          date: r.draft.date,
          category: r.draft.category,
          createdAt: Date.now(),
        });
      } else {
        onCreateTask({
          id: crypto.randomUUID(),
          title: r.draft.title.trim(),
          category: r.draft.category,
          priority: r.draft.priority,
          date: r.draft.date,
          time: r.draft.time || undefined,
          endTime: r.draft.endTime || undefined,
          completed: false,
          recurring: r.draft.recurring,
          createdAt: Date.now(),
        });
      }
    }
    close();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-background/85 backdrop-blur-md z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 sm:left-1/2 sm:bottom-12 sm:-translate-x-1/2 z-50 w-full sm:w-[min(720px,94vw)] max-h-[92vh] overflow-y-auto bg-surface-1 border hairline shadow-lift"
          >
            <div className="border-b hairline px-5 py-3 flex items-center justify-between gap-3 sticky top-0 bg-surface-1 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent flex items-center gap-2 shrink-0">
                  <Wand2 className="h-3 w-3" /> Captura rápida
                </p>
                <div className="flex border hairline">
                  <button
                    onClick={() => setMode("single")}
                    className={cn("px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em]", mode === "single" ? "bg-accent text-accent-foreground" : "hover:bg-foreground/5")}
                  >Uma</button>
                  <button
                    onClick={() => setMode("paste")}
                    className={cn("px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] flex items-center gap-1", mode === "paste" ? "bg-accent text-accent-foreground" : "hover:bg-foreground/5")}
                  ><ClipboardPaste className="h-3 w-3" /> Lote</button>
                </div>
              </div>
              <button onClick={close} className="h-7 w-7 flex items-center justify-center hover:bg-foreground/10">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {mode === "single" ? (
              <div className="p-5 space-y-5">
                <div className="relative">
                  <input
                    autoFocus
                    value={text + (speech.listening && speech.interim ? " " + speech.interim : "")}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitOne(); } }}
                    placeholder='Ex: "treino perna amanhã 18h por 1h, semanal, categoria treino"'
                    className="w-full font-serif text-xl sm:text-2xl bg-transparent border-b hairline pb-3 pr-12 placeholder:text-foreground/25 focus:outline-none focus:border-accent transition-smooth"
                  />
                  {speech.supported && (
                    <button
                      onClick={speech.listening ? speech.stop : speech.start}
                      className={cn(
                        "absolute right-0 top-1 h-9 w-9 flex items-center justify-center border hairline transition-smooth",
                        speech.listening ? "bg-destructive text-destructive-foreground border-destructive animate-pulse" : "hover:bg-accent hover:text-accent-foreground"
                      )}
                      aria-label={speech.listening ? "Parar" : "Falar"}
                      title={speech.listening ? "Parar de ouvir" : "Falar"}
                    >
                      {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}
                </div>

                {/* Voice help */}
                <details className="border hairline bg-surface-2">
                  <summary className="cursor-pointer px-3 py-2 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground">
                    Como falar / digitar rápido
                  </summary>
                  <div className="px-3 pb-3 font-mono text-[10px] text-muted-foreground space-y-1">
                    <p>• <span className="text-foreground">Treino perna amanhã às 18h, semanal, categoria treino</span></p>
                    <p>• <span className="text-foreground">Reunião sexta 14:30 #trabalho urgente</span></p>
                    <p>• <span className="text-foreground">Evento: aniversário 25/12</span></p>
                    <p className="pt-1">Reconhece: hoje · amanhã · seg–dom · dd/mm · 18h · por 1h · diário · semanal · #cat · categoria X · evento: · urgente / alta-baixa prioridade</p>
                  </div>
                </details>

                {/* Editable draft */}
                <div className="border hairline bg-surface-2 p-4 space-y-4">
                  <div className="flex items-baseline justify-between">
                    <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-accent">Pré-visualização editável</p>
                    <div className="flex border hairline">
                      <button
                        onClick={() => setDraft((d) => ({ ...d, kind: "task" }))}
                        className={cn("px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]", draft.kind === "task" ? "bg-foreground text-background" : "hover:bg-foreground/5")}
                      >Tarefa</button>
                      <button
                        onClick={() => setDraft((d) => ({ ...d, kind: "event" }))}
                        className={cn("px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]", draft.kind === "event" ? "bg-foreground text-background" : "hover:bg-foreground/5")}
                      >Evento</button>
                    </div>
                  </div>

                  <input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="Título…"
                    className="w-full font-serif text-lg bg-transparent border-b hairline pb-2 focus:outline-none focus:border-accent"
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="Data">
                      <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="w-full font-mono text-xs bg-transparent border-b hairline pb-1 focus:outline-none focus:border-accent" />
                    </Field>
                    {draft.kind === "task" && (
                      <>
                        <Field label="Início">
                          <input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className="w-full font-mono text-xs bg-transparent border-b hairline pb-1 focus:outline-none focus:border-accent" />
                        </Field>
                        <Field label="Fim">
                          <input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} className="w-full font-mono text-xs bg-transparent border-b hairline pb-1 focus:outline-none focus:border-accent" />
                        </Field>
                      </>
                    )}
                    <Field label="Categoria">
                      <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="w-full font-mono text-xs bg-transparent border-b hairline pb-1 focus:outline-none focus:border-accent">
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </Field>
                  </div>

                  {draft.kind === "task" && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Repetição">
                        <div className="flex gap-1 mt-1">
                          {(["none", "daily", "weekly"] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => setDraft({ ...draft, recurring: r })}
                              className={cn("flex-1 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.15em] border hairline", draft.recurring === r ? "bg-accent text-accent-foreground border-accent" : "hover:bg-foreground/5")}
                            >{r === "none" ? "Única" : r === "daily" ? "Diário" : "Semanal"}</button>
                          ))}
                        </div>
                      </Field>
                      <Field label="Prioridade">
                        <div className="flex gap-1 mt-1">
                          {(["low", "med", "high"] as Priority[]).map((p) => (
                            <button
                              key={p}
                              onClick={() => setDraft({ ...draft, priority: p })}
                              className={cn("flex-1 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.15em] border hairline flex items-center justify-center gap-1", draft.priority === p ? "bg-foreground text-background border-foreground" : "hover:bg-foreground/5")}
                            >
                              <span>{PRIORITY_META[p].symbol}</span>
                              {PRIORITY_META[p].label}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button
                    onClick={() => { onClose(); onOpenFull(); }}
                    className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground flex items-center gap-2"
                  >
                    <Plus className="h-3 w-3" /> Modo completo
                  </button>
                  <button
                    onClick={submitOne}
                    disabled={!draft.title.trim()}
                    className="bg-accent text-accent-foreground font-mono text-xs uppercase tracking-[0.25em] px-5 py-2.5 disabled:opacity-30 hover:glow-accent transition-smooth flex items-center gap-2"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Adicionar {draft.kind === "event" ? "evento" : "tarefa"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Cole anotações (1 linha = 1 item). Você revisa antes de importar.
                </p>
                <textarea
                  autoFocus
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={6}
                  placeholder={"Vídeo YouTube hoje 21h por 30min #estudos\nDentista 25/12 14h #saúde\nTreino perna semanal 18h #treino"}
                  className="w-full font-mono text-xs bg-transparent border hairline p-3 focus:outline-none focus:border-accent transition-smooth"
                />
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={previewPaste}
                    disabled={!pasteText.trim()}
                    className="font-mono text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 border hairline hover:bg-accent hover:text-accent-foreground transition-smooth disabled:opacity-30"
                  >Analisar</button>
                  {pasteRows.length > 0 && (
                    <button
                      onClick={importPaste}
                      className="bg-accent text-accent-foreground font-mono text-xs uppercase tracking-[0.25em] px-5 py-2.5 hover:glow-accent transition-smooth"
                    >Importar {pasteRows.filter((r) => r.keep).length}</button>
                  )}
                </div>

                {pasteRows.length > 0 && (
                  <ul className="border hairline divide-y hairline max-h-[40vh] overflow-y-auto">
                    {pasteRows.map((r, i) => (
                      <li key={i} className="p-2.5 flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={r.keep}
                          onChange={(e) => setPasteRows((rs) => rs.map((x, j) => j === i ? { ...x, keep: e.target.checked } : x))}
                          className="accent-accent shrink-0"
                        />
                        <input
                          value={r.draft.title}
                          onChange={(e) => setPasteRows((rs) => rs.map((x, j) => j === i ? { ...x, draft: { ...x.draft, title: e.target.value } } : x))}
                          className="flex-1 min-w-0 font-serif bg-transparent border-b hairline focus:outline-none focus:border-accent"
                        />
                        <input
                          type="date"
                          value={r.draft.date}
                          onChange={(e) => setPasteRows((rs) => rs.map((x, j) => j === i ? { ...x, draft: { ...x.draft, date: e.target.value } } : x))}
                          className="font-mono text-[10px] bg-transparent border-b hairline focus:outline-none focus:border-accent shrink-0"
                        />
                        <input
                          type="time"
                          value={r.draft.time}
                          onChange={(e) => setPasteRows((rs) => rs.map((x, j) => j === i ? { ...x, draft: { ...x.draft, time: e.target.value } } : x))}
                          className="font-mono text-[10px] bg-transparent border-b hairline focus:outline-none focus:border-accent shrink-0 w-16"
                        />
                        <button
                          onClick={() => setPasteRows((rs) => rs.filter((_, j) => j !== i))}
                          className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
                          aria-label="Remover"
                        ><Trash2 className="h-3 w-3" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[8px] uppercase tracking-[0.25em] text-muted-foreground flex items-center gap-1">
        <CalendarIcon className="h-2.5 w-2.5 opacity-0" aria-hidden />{label}
      </p>
      {children}
    </div>
  );
}
