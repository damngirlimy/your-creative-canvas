import { useEffect, useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import coverImg from "@/assets/lock-cover.png";

// SHA-256 hash da senha de acesso. A senha em texto puro NÃO está no código.
// (gerado a partir da senha definida pelo dono — somente o hash é distribuído)
const PASSWORD_HASH =
  "8eb1597386bef1052725a0b67a809818b3b3eb20c76d41c2390373d83ed0ffd3";

const STORAGE_KEY = "schedule.unlocked.v1";

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface Props {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  // Auto-unlock se já validou antes nesta máquina
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "1") onUnlock();
  }, [onUnlock]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const hash = await sha256(value);
    if (hash === PASSWORD_HASH) {
      localStorage.setItem(STORAGE_KEY, "1");
      onUnlock();
    } else {
      setError(true);
      setValue("");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      {/* Imagem */}
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

      {/* Form */}
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

          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(false);
                }}
                placeholder="Digite a senha"
                className="w-full bg-surface-1 border hairline pl-11 pr-4 py-4 font-mono text-sm tracking-[0.3em] focus:outline-none focus:border-accent transition-smooth"
                aria-invalid={error}
              />
            </div>

            {error && (
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-destructive">
                ✕ Senha incorreta
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !value}
              className="w-full bg-accent text-accent-foreground py-4 font-mono text-xs uppercase tracking-[0.3em] hover:glow-accent transition-smooth disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? "Verificando…" : "Liberar acesso"}
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
