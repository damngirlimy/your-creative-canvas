import { useEffect, useState, FormEvent, useRef } from "react";
import { motion } from "framer-motion";
import { Lock, ShieldAlert } from "lucide-react";
import coverImg from "@/assets/lock-cover.png";

// SHA-256 hash da senha de acesso. A senha em texto puro NÃO está no código.
const PASSWORD_HASH =
  "8eb1597386bef1052725a0b67a809818b3b3eb20c76d41c2390373d83ed0ffd3";

const STORAGE_KEY = "schedule.unlocked.v1";
const LOCKOUT_KEY = "schedule.lockout.v1";

// Escala progressiva: 5ª falha = 30s, depois 1m, 5m, 15m, 30m, 1h
const LOCKOUT_STEPS_MS = [30_000, 60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000, 60 * 60_000];
const ATTEMPT_THRESHOLD = 5;

interface LockoutState {
  fails: number;
  until: number; // epoch ms
}

function readLockout(): LockoutState {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { fails: 0, until: 0 };
    return JSON.parse(raw) as LockoutState;
  } catch {
    return { fails: 0, until: 0 };
  }
}
function writeLockout(s: LockoutState) {
  try {
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fmtRemaining(ms: number) {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.ceil(m / 60);
  return `${h}h`;
}

interface Props {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lockout, setLockout] = useState<LockoutState>({ fails: 0, until: 0 });
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "1") onUnlock();
    setLockout(readLockout());
  }, [onUnlock]);

  // tick clock while locked
  useEffect(() => {
    if (lockout.until <= Date.now()) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      return;
    }
    tickRef.current = window.setInterval(() => setNow(Date.now()), 500);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [lockout.until]);

  const isLocked = lockout.until > now;
  const remaining = isLocked ? lockout.until - now : 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setBusy(true);
    setError(false);
    const hash = await sha256(value);
    if (hash === PASSWORD_HASH) {
      localStorage.setItem(STORAGE_KEY, "1");
      writeLockout({ fails: 0, until: 0 });
      setLockout({ fails: 0, until: 0 });
      onUnlock();
    } else {
      const fails = lockout.fails + 1;
      let until = 0;
      if (fails >= ATTEMPT_THRESHOLD) {
        const step = Math.min(fails - ATTEMPT_THRESHOLD, LOCKOUT_STEPS_MS.length - 1);
        until = Date.now() + LOCKOUT_STEPS_MS[step];
      }
      const next = { fails, until };
      writeLockout(next);
      setLockout(next);
      setError(true);
      setValue("");
    }
    setBusy(false);
  };

  const remainingAttempts = Math.max(0, ATTEMPT_THRESHOLD - lockout.fails);

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="relative h-64 md:h-screen overflow-hidden bg-surface-1 border-b md:border-b-0 md:border-r hairline">
        <img
          src={coverImg}
          alt="Just Do It"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute top-4 left-4 font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          ● Acesso restrito
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 md:p-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-6">
            № 000 — Entrada
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl leading-[0.9] tracking-[-0.03em] mb-3">
            Édit ⁄ <span className="italic font-light text-foreground/60">Schedule</span>
          </h1>
          <p className="font-mono text-xs text-muted-foreground mb-10 leading-relaxed">
            Esta agenda é pessoal. Insira a senha para liberar o conteúdo.
          </p>

          {isLocked && (
            <div className="mb-4 border hairline bg-destructive/10 p-4 flex items-start gap-3">
              <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-destructive">
                  Acesso bloqueado temporariamente
                </p>
                <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  Tente novamente em {fmtRemaining(remaining)} · {lockout.fails} tentativas
                </p>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                disabled={isLocked || busy}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(false);
                }}
                placeholder={isLocked ? "Aguarde…" : "Digite a senha"}
                className="w-full bg-surface-1 border hairline pl-11 pr-4 py-4 font-mono text-sm tracking-[0.3em] focus:outline-none focus:border-accent transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                aria-invalid={error}
              />
            </div>

            {error && !isLocked && (
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-destructive">
                ✕ Senha incorreta
                {remainingAttempts > 0 && remainingAttempts <= 3 && (
                  <span className="text-muted-foreground ml-2">
                    · {remainingAttempts} tentativa{remainingAttempts > 1 ? "s" : ""} restante
                    {remainingAttempts > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !value || isLocked}
              className="w-full bg-accent text-accent-foreground py-4 font-mono text-xs uppercase tracking-[0.3em] hover:glow-accent transition-smooth disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLocked ? `Bloqueado · ${fmtRemaining(remaining)}` : busy ? "Verificando…" : "Liberar acesso"}
            </button>
          </form>

          <p className="mt-10 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
            Édit Schedule · Personal Edition
          </p>
        </motion.div>
      </div>
    </div>
  );
}
