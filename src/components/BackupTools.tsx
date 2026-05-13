import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Task, MonthEvent, CategoryDef } from "@/lib/types";
import { format } from "date-fns";

interface Props {
  tasks: Task[];
  events: MonthEvent[];
  categories: CategoryDef[];
  onImport: (data: { tasks?: Task[]; events?: MonthEvent[]; categories?: CategoryDef[] }) => void;
}

const SCHEMA_VERSION = 1;

export function BackupTools({ tasks, events, categories, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportNow = () => {
    const payload = {
      schema: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      tasks,
      events,
      categories,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edit-schedule-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Backup exportado");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== "object") throw new Error("invalid");
      const ok = window.confirm(
        `Importar backup?\n\nTarefas: ${data.tasks?.length ?? 0}\nEventos: ${data.events?.length ?? 0}\nCategorias: ${data.categories?.length ?? 0}\n\nIsto vai SUBSTITUIR os dados atuais.`
      );
      if (!ok) return;
      onImport({
        tasks: Array.isArray(data.tasks) ? data.tasks : undefined,
        events: Array.isArray(data.events) ? data.events : undefined,
        categories: Array.isArray(data.categories) ? data.categories : undefined,
      });
      toast.success("Backup restaurado");
    } catch {
      toast.error("Arquivo inválido");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportNow}
        className="flex items-center gap-1.5 px-2.5 py-1.5 border hairline hover:bg-accent hover:text-accent-foreground transition-smooth font-mono text-[10px] uppercase tracking-[0.25em]"
        title="Exportar tudo como JSON"
      >
        <Download className="h-3 w-3" />
        <span className="hidden sm:inline">Backup</span>
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 px-2.5 py-1.5 border hairline hover:bg-accent hover:text-accent-foreground transition-smooth font-mono text-[10px] uppercase tracking-[0.25em]"
        title="Importar backup JSON"
      >
        <Upload className="h-3 w-3" />
        <span className="hidden sm:inline">Restaurar</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={onFile}
        className="hidden"
      />
    </div>
  );
}
