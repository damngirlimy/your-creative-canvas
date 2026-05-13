import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Moon, ArrowRight, X } from "lucide-react";
import { Task } from "@/lib/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface Props {
  tasks: Task[];
  onReschedule: (id: string, newDate: string) => void;
  triggerHour?: number; // default 21
}

export function ShutdownRitual({ tasks, onReschedule, triggerHour = 21 }: Props) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [lastShown, setLastShown] = useLocalStorage<string>("schedule.shutdown.v1", "");
  const [reflections, setReflections] = useLocalStorage<Record<string, string>>("schedule.reflections.v1", {});
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  // Auto-trigger after triggerHour, once a day
  useEffect(() => {
    const now = new Date();
    if (now.getHours() >= triggerHour && lastShown !== today) {
      setOpen(true);
    }
  }, [lastShown, today, triggerHour]);

  useEffect(() => { if (open) setText(reflections[today] ?? ""); }, [open, reflections, today]);

  const undone = useMemo(() => {
    return tasks.filter((t) => {
      const isToday =
        t.recurring === "daily" ? true :
        t.recurring === "weekly" ? parseISO(t.date).getDay() === new Date().getDay() :
        isSameDay(parseISO(t.date), new Date());
      if (!isToday) return false;
      const completed = t.recurring && t.recurring !== "none"
        ? (t.completedDates ?? []).includes(today)
        : t.completed;
      return !completed;
    });
  }, [tasks, today]);

  const done = useMemo(() => {
    return tasks.filter((t) => {
      const isToday =
        t.recurring === "daily" ? true :
        t.recurring === "weekly" ? parseISO(t.date).getDay() === new Date().getDay() :
        isSameDay(parseISO(t.date), new Date());
      if (!isToday) return false;
      return t.recurring && t.recurring !== "none"
        ? (t.completedDates ?? []).includes(today)
        : t.completed;
    });
  }, [tasks, today]);

  const close = () => {
    setReflections({ ...reflections, [today]: text });
    setLastShown(today);
    setOpen(false);
  };

  const moveAllToTomorrow = () => {
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
    undone.forEach((t) => { if (!t.recurring || t.recurring === "none") onReschedule(t.id, tomorrow); });
  };

  return (
    <>
      {/* Manual trigger button is rendered by parent; expose via window event */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/90 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-lg bg-surface-1 border hairline p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent flex items-center gap-2">
                    <Moon className="h-3 w-3" /> Ritual de fechamento
                  </p>
                  <h2 className="font-serif text-3xl sm:text-4xl mt-2">{format(new Date(), "EEEE", { locale: ptBR })}</h2>
                  <p className="font-mono text-xs text-muted-foreground mt-1">{format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</p>
                </div>
                <button onClick={close} className="h-8 w-8 flex items-center justify-center hover:bg-foreground/5"><X className="h-4 w-4" /></button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-6">
                <Stat label="Feitas" value={done.length} accent />
                <Stat label="Restam" value={undone.length} />
                <Stat label="Total" value={done.length + undone.length} />
              </div>

              {undone.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Pendentes</p>
                    <button onClick={moveAllToTomorrow} className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent hover:underline flex items-center gap-1">
                      mover tudo p/ amanhã <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {undone.map((t) => (
                      <li key={t.id} className="flex items-center justify-between border hairline px-3 py-2">
                        <span className="font-serif text-sm truncate">{t.title}</span>
                        {(!t.recurring || t.recurring === "none") && (
                          <button
                            onClick={() => onReschedule(t.id, format(addDays(new Date(), 1), "yyyy-MM-dd"))}
                            className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground hover:text-accent shrink-0 ml-2"
                          >
                            → amanhã
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mb-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                  Uma linha sobre hoje
                </p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="O que valeu? O que aprendeu?"
                  rows={3}
                  className="w-full bg-background border hairline p-3 font-serif text-sm focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <button
                onClick={close}
                className="w-full px-6 py-3 bg-accent text-accent-foreground font-mono text-xs uppercase tracking-[0.25em] hover:glow-accent transition-smooth"
              >
                Fechar o dia
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`border hairline p-3 ${accent ? "bg-accent/10" : "bg-background"}`}>
      <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className={`font-serif text-3xl tabular-nums leading-none mt-1 ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}
