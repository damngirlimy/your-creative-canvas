import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Sparkles, X, Wand2, Mic, MicOff, ClipboardPaste, Trash2,
  ChevronDown, ChevronRight, Copy, CheckSquare, Square, Wand,
} from "lucide-react";
import { toast } from "sonner";
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
  onUndoCreated: (taskIds: string[], eventIds: string[]) => void;
  onOpenFull: () => void;
}

interface Draft {
  title: string;
  notes: string;
  date: string;
  time: string;
  endTime: string;
  category: string;
  priority: Priority;
  recurring: "none" | "daily" | "weekly";
  kind: "task" | "event";
}

interface Row { id: string; keep: boolean; expanded: boolean; draft: Draft; }

const emptyDraft = (cats: CategoryDef[]): Draft => ({
  title: "",
  notes: "",
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
  notes: "",
  date: p.date,
  time: p.time ?? "",
  endTime: p.endTime ?? "",
  category: matchCategory(cats, p.categoryHint),
  priority: p.priority ?? "med",
  recurring: p.recurring,
  kind: p.kind,
});

export function QuickCapture({ open, initialMode = "single", onClose, categories, onCreateTask, onCreateEvent, onUndoCreated, onOpenFull }: Props) {
  const [mode, setMode] = useState<"single" | "paste">(initialMode);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(categories));
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => { if (open) setMode(initialMode); }, [open, initialMode]);

  const parsed = useMemo(() => text.trim() ? parseQuickInput(text, new Date(), categories) : null, [text, categories]);

  useEffect(() => {
    if (!parsed) return;
    setDraft((d) => ({
      ...draftFromParse(parsed, categories),
      notes: d.notes,
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
    setRows([]);
  };
  const close = () => { reset(); onClose(); };

  const buildTask = (d: Draft): Task => ({
    id: crypto.randomUUID(),
    title: d.title.trim(),
    notes: d.notes.trim() || undefined,
    category: d.category,
    priority: d.priority,
    date: d.date,
    time: d.time || undefined,
    endTime: d.endTime || undefined,
    completed: false,
    recurring: d.recurring,
    createdAt: Date.now(),
  });
  const buildEvent = (d: Draft): MonthEvent => ({
    id: crypto.randomUUID(),
    title: d.title.trim(),
    notes: d.notes.trim() || undefined,
    date: d.date,
    category: d.category,
    createdAt: Date.now(),
  });

  const undoToast = (label: string, taskIds: string[], eventIds: string[]) => {
    toast.success(label, {
      action: { label: "Desfazer", onClick: () => onUndoCreated(taskIds, eventIds) },
      duration: 6000,
    });
  };

  const submitOne = () => {
    if (!draft.title.trim()) return;
    if (draft.kind === "event") {
      const ev = buildEvent(draft);
      onCreateEvent(ev);
      undoToast("Evento adicionado", [], [ev.id]);
    } else {
      const t = buildTask(draft);
      onCreateTask(t);
      undoToast("Tarefa adicionada", [t.id], []);
    }
    close();
  };

  const previewPaste = () => {
    const lines = pasteText.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
    setRows(lines.map((l) => ({
      id: crypto.randomUUID(),
      keep: true,
      expanded: false,
      draft: draftFromParse(parseQuickInput(l, new Date(), categories), categories),
    })));
  };

  const importPaste = () => {
    const taskIds: string[] = [];
    const eventIds: string[] = [];
    for (const r of rows) {
      if (!r.keep || !r.draft.title.trim()) continue;
      if (r.draft.kind === "event") {
        const ev = buildEvent(r.draft);
        onCreateEvent(ev);
        eventIds.push(ev.id);
      } else {
        const t = buildTask(r.draft);
        onCreateTask(t);
        taskIds.push(t.id);
      }
    }
    const total = taskIds.length + eventIds.length;
    if (total === 0) { toast.error("Nada selecionado para importar"); return; }
    undoToast(`${total} ${total === 1 ? "item adicionado" : "itens adicionados"}`, taskIds, eventIds);
    close();
  };

  // Bulk helpers
  const updateRow = (id: string, patch: Partial<Row> | ((r: Row) => Row)) =>
    setRows((rs) => rs.map((r) => r.id === id ? (typeof patch === "function" ? patch(r) : { ...r, ...patch }) : r));
  const updateDraft = (id: string, patch: Partial<Draft>) =>
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, draft: { ...r.draft, ...patch } } : r));
  const selectedRows = rows.filter((r) => r.keep);
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const toggleAll = () => setRows((rs) => rs.map((r) => ({ ...r, keep: !allSelected })));
  const bulkPatch = (patch: Partial<Draft>) =>
    setRows((rs) => rs.map((r) => r.keep ? { ...r, draft: { ...r.draft, ...patch } } : r));
  const removeSelected = () => setRows((rs) => rs.filter((r) => !r.keep));
  const duplicateRow = (id: string) => setRows((rs) => {
    const i = rs.findIndex((r) => r.id === id);
    if (i < 0) return rs;
    const copy: Row = { ...rs[i], id: crypto.randomUUID(), draft: { ...rs[i].draft } };
    return [...rs.slice(0, i + 1), copy, ...rs.slice(i + 1)];
  });

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
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed z-50 bg-surface-1 border hairline shadow-lift flex flex-col",
              // mobile: full-screen sheet
              "inset-0 max-h-[100dvh]",
              // desktop: centered modal
              "sm:inset-auto sm:left-1/2 sm:bottom-12 sm:-translate-x-1/2 sm:w-[min(760px,94vw)] sm:max-h-[92vh] sm:rounded-none"
            )}
          >
            {/* Header */}
            <div className="border-b hairline px-4 sm:px-5 py-3 flex items-center justify-between gap-3 bg-surface-1">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent flex items-center gap-2 shrink-0">
                  <Wand2 className="h-3 w-3" /> <span className="hidden xs:inline sm:inline">Captura</span>
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
              <button onClick={close} className="h-8 w-8 flex items-center justify-center hover:bg-foreground/10" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body (scroll) */}
            <div className="flex-1 overflow-y-auto">
              {mode === "single" ? (
                <div className="p-4 sm:p-5 space-y-5">
                  <div className="relative">
                    <input
                      autoFocus
                      value={text + (speech.listening && speech.interim ? " " + speech.interim : "")}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitOne(); } }}
                      placeholder='Ex: "treino perna amanhã 18h por 1h, semanal, categoria treino"'
                      className="w-full font-serif text-lg sm:text-2xl bg-transparent border-b hairline pb-3 pr-12 placeholder:text-foreground/25 focus:outline-none focus:border-accent transition-smooth"
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

                  <div className="border hairline bg-surface-2 p-4 space-y-4">
                    <div className="flex items-baseline justify-between flex-wrap gap-2">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Repetição">
                          <div className="flex gap-1 mt-1">
                            {(["none", "daily", "weekly"] as const).map((r) => (
                              <button
                                key={r}
                                onClick={() => setDraft({ ...draft, recurring: r })}
                                className={cn("flex-1 px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] border hairline", draft.recurring === r ? "bg-accent text-accent-foreground border-accent" : "hover:bg-foreground/5")}
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
                                className={cn("flex-1 px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] border hairline flex items-center justify-center gap-1", draft.priority === p ? "bg-foreground text-background border-foreground" : "hover:bg-foreground/5")}
                              >
                                <span>{PRIORITY_META[p].symbol}</span>
                                {PRIORITY_META[p].label}
                              </button>
                            ))}
                          </div>
                        </Field>
                      </div>
                    )}

                    <Field label="Notas (opcional)">
                      <textarea
                        value={draft.notes}
                        onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                        rows={2}
                        placeholder="Detalhes…"
                        className="w-full font-mono text-xs bg-transparent border-b hairline pb-1 focus:outline-none focus:border-accent resize-none"
                      />
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-5 space-y-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    Cole anotações (1 linha = 1 item). Você revisa antes de importar.
                  </p>
                  <textarea
                    autoFocus
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={5}
                    placeholder={"Vídeo YouTube hoje 21h por 30min #estudos\nDentista 25/12 14h #saúde\nTreino perna semanal 18h #treino"}
                    className="w-full font-mono text-xs bg-transparent border hairline p-3 focus:outline-none focus:border-accent transition-smooth"
                  />
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <button
                      onClick={previewPaste}
                      disabled={!pasteText.trim()}
                      className="font-mono text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 border hairline hover:bg-accent hover:text-accent-foreground transition-smooth disabled:opacity-30 flex items-center gap-1.5"
                    ><Wand className="h-3 w-3" /> Analisar</button>
                    {rows.length > 0 && (
                      <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                        {selectedRows.length} de {rows.length} selecionados
                      </span>
                    )}
                  </div>

                  {rows.length > 0 && (
                    <>
                      {/* Bulk toolbar */}
                      <div className="border hairline bg-surface-2 p-2.5 flex flex-wrap items-center gap-2">
                        <button
                          onClick={toggleAll}
                          className="font-mono text-[9px] uppercase tracking-[0.2em] flex items-center gap-1 px-2 py-1 border hairline hover:bg-foreground/5"
                        >
                          {allSelected ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                          {allSelected ? "Desmarcar" : "Marcar tudo"}
                        </button>
                        <span className="text-foreground/20">|</span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Aplicar nos selecionados:</span>
                        <input
                          type="date"
                          onChange={(e) => e.target.value && bulkPatch({ date: e.target.value })}
                          className="font-mono text-[10px] bg-transparent border hairline px-1.5 py-0.5 focus:outline-none focus:border-accent"
                          aria-label="Definir data em lote"
                        />
                        <select
                          defaultValue=""
                          onChange={(e) => { if (e.target.value) { bulkPatch({ category: e.target.value }); e.currentTarget.value = ""; } }}
                          className="font-mono text-[10px] bg-transparent border hairline px-1.5 py-0.5 focus:outline-none focus:border-accent"
                          aria-label="Definir categoria em lote"
                        >
                          <option value="">categoria…</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                        <select
                          defaultValue=""
                          onChange={(e) => { if (e.target.value) { bulkPatch({ recurring: e.target.value as Draft["recurring"] }); e.currentTarget.value = ""; } }}
                          className="font-mono text-[10px] bg-transparent border hairline px-1.5 py-0.5 focus:outline-none focus:border-accent"
                          aria-label="Definir repetição em lote"
                        >
                          <option value="">repetição…</option>
                          <option value="none">única</option>
                          <option value="daily">diária</option>
                          <option value="weekly">semanal</option>
                        </select>
                        <select
                          defaultValue=""
                          onChange={(e) => { if (e.target.value) { bulkPatch({ kind: e.target.value as Draft["kind"] }); e.currentTarget.value = ""; } }}
                          className="font-mono text-[10px] bg-transparent border hairline px-1.5 py-0.5 focus:outline-none focus:border-accent"
                          aria-label="Tarefa ou evento em lote"
                        >
                          <option value="">tipo…</option>
                          <option value="task">tarefa</option>
                          <option value="event">evento</option>
                        </select>
                        <button
                          onClick={removeSelected}
                          disabled={selectedRows.length === 0}
                          className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em] flex items-center gap-1 px-2 py-1 border hairline hover:bg-destructive hover:text-destructive-foreground disabled:opacity-30"
                        ><Trash2 className="h-3 w-3" /> Remover sel.</button>
                      </div>

                      {/* Rows */}
                      <ul className="border hairline divide-y hairline max-h-[50vh] sm:max-h-[40vh] overflow-y-auto">
                        {rows.map((r) => (
                          <li key={r.id} className="text-xs">
                            <div className="p-2.5 flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={r.keep}
                                onChange={(e) => updateRow(r.id, { keep: e.target.checked })}
                                className="accent-accent shrink-0 h-4 w-4"
                              />
                              <button
                                onClick={() => updateRow(r.id, (x) => ({ ...x, expanded: !x.expanded }))}
                                className="shrink-0 h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
                                aria-label="Expandir"
                              >
                                {r.expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </button>
                              <input
                                value={r.draft.title}
                                onChange={(e) => updateDraft(r.id, { title: e.target.value })}
                                className="flex-1 min-w-0 font-serif bg-transparent border-b hairline focus:outline-none focus:border-accent"
                              />
                              <span className="hidden sm:inline font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground shrink-0">
                                {r.draft.kind === "event" ? "evento" : r.draft.recurring !== "none" ? r.draft.recurring : "tarefa"}
                              </span>
                              <button
                                onClick={() => duplicateRow(r.id)}
                                className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                                aria-label="Duplicar"
                                title="Duplicar"
                              ><Copy className="h-3 w-3" /></button>
                              <button
                                onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                                className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
                                aria-label="Remover"
                              ><Trash2 className="h-3 w-3" /></button>
                            </div>
                            {r.expanded && (
                              <div className="px-2.5 pb-3 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-surface-2/50">
                                <Field label="Data">
                                  <input type="date" value={r.draft.date} onChange={(e) => updateDraft(r.id, { date: e.target.value })} className="w-full font-mono text-[10px] bg-transparent border-b hairline pb-0.5 focus:outline-none focus:border-accent" />
                                </Field>
                                {r.draft.kind === "task" && (
                                  <>
                                    <Field label="Início"><input type="time" value={r.draft.time} onChange={(e) => updateDraft(r.id, { time: e.target.value })} className="w-full font-mono text-[10px] bg-transparent border-b hairline pb-0.5 focus:outline-none focus:border-accent" /></Field>
                                    <Field label="Fim"><input type="time" value={r.draft.endTime} onChange={(e) => updateDraft(r.id, { endTime: e.target.value })} className="w-full font-mono text-[10px] bg-transparent border-b hairline pb-0.5 focus:outline-none focus:border-accent" /></Field>
                                  </>
                                )}
                                <Field label="Categoria">
                                  <select value={r.draft.category} onChange={(e) => updateDraft(r.id, { category: e.target.value })} className="w-full font-mono text-[10px] bg-transparent border-b hairline pb-0.5 focus:outline-none focus:border-accent">
                                    {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                                  </select>
                                </Field>
                                <Field label="Tipo">
                                  <select value={r.draft.kind} onChange={(e) => updateDraft(r.id, { kind: e.target.value as Draft["kind"] })} className="w-full font-mono text-[10px] bg-transparent border-b hairline pb-0.5 focus:outline-none focus:border-accent">
                                    <option value="task">Tarefa</option>
                                    <option value="event">Evento</option>
                                  </select>
                                </Field>
                                {r.draft.kind === "task" && (
                                  <>
                                    <Field label="Repetição">
                                      <select value={r.draft.recurring} onChange={(e) => updateDraft(r.id, { recurring: e.target.value as Draft["recurring"] })} className="w-full font-mono text-[10px] bg-transparent border-b hairline pb-0.5 focus:outline-none focus:border-accent">
                                        <option value="none">Única</option>
                                        <option value="daily">Diária</option>
                                        <option value="weekly">Semanal</option>
                                      </select>
                                    </Field>
                                    <Field label="Prioridade">
                                      <select value={r.draft.priority} onChange={(e) => updateDraft(r.id, { priority: e.target.value as Priority })} className="w-full font-mono text-[10px] bg-transparent border-b hairline pb-0.5 focus:outline-none focus:border-accent">
                                        {(["low", "med", "high"] as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_META[p].symbol} {PRIORITY_META[p].label}</option>)}
                                      </select>
                                    </Field>
                                  </>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Sticky footer */}
            <div className="border-t hairline p-3 sm:p-4 flex items-center justify-between gap-3 bg-surface-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                onClick={() => { onClose(); onOpenFull(); }}
                className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground flex items-center gap-2"
              >
                <Plus className="h-3 w-3" /> <span className="hidden sm:inline">Modo</span> completo
              </button>
              {mode === "single" ? (
                <button
                  onClick={submitOne}
                  disabled={!draft.title.trim()}
                  className="bg-accent text-accent-foreground font-mono text-xs uppercase tracking-[0.25em] px-4 sm:px-5 py-2.5 disabled:opacity-30 hover:glow-accent transition-smooth flex items-center gap-2"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Adicionar {draft.kind === "event" ? "evento" : "tarefa"}
                </button>
              ) : (
                <button
                  onClick={importPaste}
                  disabled={selectedRows.length === 0}
                  className="bg-accent text-accent-foreground font-mono text-xs uppercase tracking-[0.25em] px-4 sm:px-5 py-2.5 hover:glow-accent transition-smooth disabled:opacity-30"
                >Importar {selectedRows.length || ""}</button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[8px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
