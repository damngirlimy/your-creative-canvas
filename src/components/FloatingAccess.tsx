import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ClipboardPaste, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onQuick: () => void;
  onPaste: () => void;
  onFull: () => void;
}

export function FloatingAccess({ onQuick, onPaste, onFull }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6 z-40 flex flex-col items-end gap-2">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-2"
          >
            <FabBtn label="Modo completo" onClick={() => { setExpanded(false); onFull(); }}>
              <Plus className="h-3.5 w-3.5" />
            </FabBtn>
            <FabBtn label="Colar lote" onClick={() => { setExpanded(false); onPaste(); }}>
              <ClipboardPaste className="h-3.5 w-3.5" />
            </FabBtn>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => onQuick()}
        onContextMenu={(e) => { e.preventDefault(); setExpanded((v) => !v); }}
        onDoubleClick={() => setExpanded((v) => !v)}
        className={cn(
          "h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lift hover:glow-accent transition-smooth"
        )}
        aria-label="Captura rápida (duplo clique para mais)"
        title="Captura rápida · duplo clique para mais opções"
      >
        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="font-mono text-[8px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
      >
        {expanded ? "menos" : "mais"}
      </button>
    </div>
  );
}

function FabBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 bg-surface-1 border hairline pl-2.5 pr-3 h-9 hover:border-accent hover:bg-accent hover:text-accent-foreground transition-smooth shadow-lift"
    >
      <span className="h-6 w-6 flex items-center justify-center">{children}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.25em]">{label}</span>
    </button>
  );
}
