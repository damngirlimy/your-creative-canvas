import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pause, Play, RotateCcw, X, Check, SkipForward } from "lucide-react";
import { Task } from "@/lib/types";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  selectedDate: Date;
  onComplete: (id: string, dateKey: string) => void;
}

const PRESETS = [
  { label: "25 / 5", focus: 25 * 60, brk: 5 * 60 },
  { label: "50 / 10", focus: 50 * 60, brk: 10 * 60 },
  { label: "15", focus: 15 * 60, brk: 0 },
];

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export function FocusMode({ open, onClose, tasks, selectedDate, onComplete }: Props) {
  const [presetIdx, setPresetIdx] = useState(0);
  const preset = PRESETS[presetIdx];
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [secs, setSecs] = useState(preset.focus);
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const candidates = useMemo(
    () =>
      tasks.filter((t) => {
        const isToday =
          t.recurring === "daily" ? true :
          t.recurring === "weekly" ? parseISO(t.date).getDay() === selectedDate.getDay() :
          isSameDay(parseISO(t.date), selectedDate);
        if (!isToday) return false;
        const completed = t.recurring && t.recurring !== "none"
          ? (t.completedDates ?? []).includes(dateKey)
          : t.completed;
        return !completed;
      }),
    [tasks, selectedDate, dateKey]
  );
  const current = candidates.find((t) => t.id === taskId) ?? null;

  // reset secs on preset/phase change
  useEffect(() => {
    setSecs(phase === "focus" ? preset.focus : preset.brk);
  }, [presetIdx, phase, preset.focus, preset.brk]);

  // timer
  useEffect(() => {
    if (!running) {
      if (tick.current) { clearInterval(tick.current); tick.current = null; }
      return;
    }
    tick.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          // phase end
          celebrate();
          if (phase === "focus") {
            setDone((d) => d + 1);
            if (preset.brk > 0) { setPhase("break"); return preset.brk; }
            return preset.focus;
          } else {
            setPhase("focus"); return preset.focus;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [running, phase, preset.brk, preset.focus]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") { e.preventDefault(); setRunning((r) => !r); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const total = phase === "focus" ? preset.focus : preset.brk || 1;
  const pct = 1 - secs / total;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-2xl"
        >
          <div className="absolute inset-0 flex flex-col">
            <header className="flex items-center justify-between p-4 sm:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent">
                ● Foco · {format(selectedDate, "dd MMM", { locale: ptBR })}
              </p>
              <button onClick={onClose} className="h-9 w-9 flex items-center justify-center hover:bg-foreground/5" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
              {/* Ring */}
              <div className="relative">
                <svg width="280" height="280" viewBox="0 0 280 280" className="-rotate-90">
                  <circle cx="140" cy="140" r="130" stroke="hsl(var(--foreground) / 0.08)" strokeWidth="2" fill="none" />
                  <motion.circle
                    cx="140" cy="140" r="130"
                    stroke={phase === "focus" ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.4)"}
                    strokeWidth="2" fill="none"
                    strokeDasharray={2 * Math.PI * 130}
                    strokeDashoffset={2 * Math.PI * 130 * (1 - pct)}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <motion.div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  animate={running ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
                    {phase === "focus" ? "Foco" : "Pausa"}
                  </p>
                  <p className="font-serif text-7xl tabular-nums leading-none mt-2">{fmt(secs)}</p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-3 tabular-nums">
                    {done} sessão{done === 1 ? "" : "s"} hoje
                  </p>
                </motion.div>
              </div>

              {/* Task picker */}
              <div className="w-full max-w-md text-center">
                {current ? (
                  <div className="border hairline bg-surface-1 p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 text-left">
                      <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">tarefa atual</p>
                      <p className="font-serif text-lg truncate">{current.title}</p>
                    </div>
                    <button
                      onClick={() => { onComplete(current.id, dateKey); celebrate(); setTaskId(null); }}
                      className="h-9 px-3 bg-accent text-accent-foreground font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5 hover:glow-accent"
                    >
                      <Check className="h-3.5 w-3.5" /> feito
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                      escolha uma tarefa (opcional)
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto">
                      {candidates.length === 0 && (
                        <p className="font-serif italic text-foreground/50">Nada pendente para hoje.</p>
                      )}
                      {candidates.slice(0, 8).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTaskId(t.id)}
                          className="border hairline px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] hover:border-accent hover:text-accent transition-smooth"
                        >
                          {t.title.slice(0, 28)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </main>

            <footer className="p-4 sm:p-6 flex flex-col items-center gap-4">
              <div className="flex gap-1 border hairline p-1 bg-surface-1">
                {PRESETS.map((p, i) => (
                  <button
                    key={p.label}
                    onClick={() => { setPresetIdx(i); setPhase("focus"); setRunning(false); }}
                    className={cn(
                      "px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em]",
                      i === presetIdx ? "bg-accent text-accent-foreground" : "hover:bg-foreground/5"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setRunning(false); setSecs(phase === "focus" ? preset.focus : preset.brk); }}
                  className="h-11 w-11 border hairline flex items-center justify-center hover:bg-foreground/5"
                  aria-label="Reiniciar"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRunning((r) => !r)}
                  className="h-14 w-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:glow-accent shadow-lift"
                  aria-label={running ? "Pausar" : "Iniciar"}
                >
                  {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
                </button>
                <button
                  onClick={() => {
                    if (phase === "focus") { setDone((d) => d + 1); if (preset.brk) setPhase("break"); }
                    else setPhase("focus");
                  }}
                  className="h-11 w-11 border hairline flex items-center justify-center hover:bg-foreground/5"
                  aria-label="Pular fase"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                espaço = play/pause · esc = sair
              </p>
            </footer>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
