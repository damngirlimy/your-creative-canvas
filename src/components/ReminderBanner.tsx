import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X } from "lucide-react";
import { UpcomingItem, requestPermission } from "@/lib/reminders";

interface Props {
  upcoming: UpcomingItem[];
}

export function ReminderBanner({ upcoming }: Props) {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission);
  }, []);

  const next = upcoming.find((i) => !dismissed.has(i.id));

  const ask = async () => {
    const r = await requestPermission();
    setPerm(r);
  };

  if (!next && perm === "granted") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="border-b hairline bg-accent/10 backdrop-blur-md"
      >
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 md:px-12 py-2.5 flex items-center gap-3 flex-wrap">
          {next && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot shrink-0" />
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] flex-1 min-w-0 truncate">
                <span className="text-accent">Em breve</span> ·{" "}
                <span className="text-foreground">{next.title}</span>{" "}
                <span className="text-muted-foreground tabular-nums">
                  {next.kind === "event" ? "(evento hoje)" : `${next.time} · em ${next.minutesAway}min`}
                </span>
              </p>
              <button
                onClick={() => setDismissed((s) => new Set([...s, next.id]))}
                className="h-6 w-6 flex items-center justify-center hover:bg-foreground/10 transition-smooth shrink-0"
                aria-label="Dispensar"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          )}
          {perm === "default" && (
            <button
              onClick={ask}
              className="font-mono text-[10px] uppercase tracking-[0.25em] px-2.5 py-1 border hairline flex items-center gap-1.5 hover:bg-accent hover:text-accent-foreground transition-smooth shrink-0"
              title="Notificações funcionam com a aba aberta"
            >
              <Bell className="h-3 w-3" /> Ativar lembretes
            </button>
          )}
          {perm === "denied" && (
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
              <BellOff className="h-3 w-3" /> Notificações bloqueadas
            </span>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
