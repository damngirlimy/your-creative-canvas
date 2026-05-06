import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, X, Wand2 } from "lucide-react";
import { Task, CategoryDef } from "@/lib/types";
import { parseQuickInput } from "@/lib/insights";

interface Props {
  categories: CategoryDef[];
  onCreate: (task: Task) => void;
  onOpenFull: () => void;
}

export function QuickCapture({ categories, onCreate, onOpenFull }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof parseQuickInput> | null>(null);

  const handleChange = (v: string) => {
    setText(v);
    setPreview(v.trim() ? parseQuickInput(v) : null);
  };

  const matchCategory = (hint?: string) => {
    if (!hint) return categories[0]?.id ?? "other";
    const found = categories.find((c) =>
      c.id.toLowerCase() === hint || c.label.toLowerCase().startsWith(hint)
    );
    return found?.id ?? categories[0]?.id ?? "other";
  };

  const submit = () => {
    if (!text.trim()) return;
    const p = parseQuickInput(text);
    onCreate({
      id: crypto.randomUUID(),
      title: p.title,
      category: matchCategory(p.categoryHint),
      priority: "med",
      date: p.date,
      time: p.time,
      endTime: p.endTime,
      completed: false,
      recurring: p.recurring,
      createdAt: Date.now(),
    });
    setText("");
    setPreview(null);
    setOpen(false);
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-5 sm:bottom-8 z-40 flex justify-center pointer-events-none px-4">
        <motion.button
          onClick={() => setOpen(true)}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="pointer-events-auto group flex items-center gap-3 sm:gap-4 bg-accent text-accent-foreground pl-5 pr-6 sm:pl-7 sm:pr-9 py-3.5 sm:py-4 shadow-lift hover:glow-accent transition-smooth"
          aria-label="Captura rápida"
        >
          <span className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center bg-accent-foreground/10 group-hover:rotate-12 transition-smooth">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <span className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.25em] whitespace-nowrap">
            Captura rápida
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-background/85 backdrop-blur-md z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-1/2 bottom-6 sm:bottom-12 -translate-x-1/2 z-50 w-[min(640px,94vw)] bg-surface-1 border hairline shadow-lift"
            >
              <div className="border-b hairline px-5 py-3 flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent flex items-center gap-2">
                  <Wand2 className="h-3 w-3" /> Captura rápida
                </p>
                <button onClick={() => setOpen(false)} className="h-7 w-7 flex items-center justify-center hover:bg-foreground/10">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="p-5">
                <input
                  autoFocus
                  value={text}
                  onChange={(e) => handleChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
                  placeholder='Ex: "treino amanhã 18h por 1h #treino"'
                  className="w-full font-serif text-2xl sm:text-3xl bg-transparent border-b hairline pb-3 placeholder:text-foreground/25 focus:outline-none focus:border-accent transition-smooth"
                />

                {preview && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
                    <Tag label="Título" value={preview.title} />
                    <Tag label="Data" value={preview.date} />
                    <Tag label="Hora" value={preview.time ?? "—"} />
                    <Tag
                      label="Repetição"
                      value={preview.recurring === "daily" ? "Diário" : preview.recurring === "weekly" ? "Semanal" : "Única"}
                    />
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    onClick={() => { setOpen(false); onOpenFull(); }}
                    className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground flex items-center gap-2"
                  >
                    <Plus className="h-3 w-3" /> Modo completo
                  </button>
                  <button
                    onClick={submit}
                    disabled={!text.trim()}
                    className="bg-accent text-accent-foreground font-mono text-xs uppercase tracking-[0.25em] px-5 py-2.5 disabled:opacity-30 hover:glow-accent transition-smooth"
                  >
                    Adicionar
                  </button>
                </div>

                <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Reconhece: hoje · amanhã · seg–dom · dd/mm · 18h · 18:30 · por 1h · diário · semanal · #categoria
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div className="border hairline px-2.5 py-1.5">
      <p className="text-muted-foreground text-[8px]">{label}</p>
      <p className="text-foreground truncate text-[10px]">{value}</p>
    </div>
  );
}
