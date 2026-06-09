import { useMemo, useState } from "react";
import { format, parseISO, startOfWeek, addDays, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Task } from "@/lib/types";
import { dailyCompletion } from "@/lib/insights";

interface Props {
  tasks: Task[];
}

const DOW_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function HabitHeatmap({ tasks }: Props) {
  const [hover, setHover] = useState<{ date: string; pct: number; total: number; done: number } | null>(null);

  const { weeks, monthMarkers, total, totalDone } = useMemo(() => {
    const data = dailyCompletion(tasks, 365);
    // Align: pad start to Sunday of the first week
    const first = parseISO(data[0].date);
    const startSun = startOfWeek(first, { weekStartsOn: 0 });
    const padCount = Math.round((first.getTime() - startSun.getTime()) / (24 * 3600 * 1000));
    type Cell = { date: string; pct: number; total: number; done: number } | null;
    const padded: Cell[] = Array.from({ length: padCount }, () => null);
    for (const d of data) padded.push(d);
    while (padded.length % 7 !== 0) padded.push(null);
    const weeks: Cell[][] = [];
    for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

    // Month markers per week column
    const monthMarkers: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((wk, ci) => {
      const firstCell = wk.find((c) => c) as Cell;
      if (!firstCell) return;
      const m = getMonth(parseISO(firstCell.date));
      if (m !== lastMonth) {
        monthMarkers.push({ col: ci, label: format(parseISO(firstCell.date), "MMM", { locale: ptBR }) });
        lastMonth = m;
      }
    });

    let total = 0, totalDone = 0;
    for (const d of data) { total += d.total; totalDone += d.done; }
    return { weeks, monthMarkers, total, totalDone };
  }, [tasks]);

  const color = (c: { pct: number; total: number } | null) => {
    if (!c || !c.total) return "hsl(var(--foreground) / 0.05)";
    if (c.pct >= 1) return "hsl(var(--accent))";
    if (c.pct >= 0.66) return "hsl(var(--accent) / 0.65)";
    if (c.pct >= 0.33) return "hsl(var(--accent) / 0.38)";
    return "hsl(var(--accent) / 0.18)";
  };

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">№ 04 · Ano em síntese</p>
          <h2 className="font-serif text-3xl sm:text-4xl mt-2 leading-none">Heatmap anual</h2>
        </div>
        <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground tabular-nums">
          {totalDone}/{total}
        </p>
      </div>

      <div className="border hairline bg-surface-1 p-3 sm:p-4 overflow-x-auto">
        {/* Month row */}
        <div className="relative h-3 mb-1 ml-5" style={{ minWidth: weeks.length * 11 }}>
          {monthMarkers.map((m, i) => (
            <span
              key={i}
              className="absolute font-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground"
              style={{ left: m.col * 11 }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex gap-[3px]">
          {/* DOW labels */}
          <div className="flex flex-col gap-[3px] mr-1">
            {DOW_LABELS.map((d, i) => (
              <span key={i} className="h-2 w-3 font-mono text-[8px] text-muted-foreground" style={{ opacity: i % 2 ? 1 : 0 }}>
                {d}
              </span>
            ))}
          </div>
          {weeks.map((wk, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {wk.map((cell, ri) => (
                <button
                  key={ri}
                  type="button"
                  onMouseEnter={() => cell && setHover(cell)}
                  onMouseLeave={() => setHover(null)}
                  className="h-2 w-2 rounded-[2px] hover:ring-1 hover:ring-foreground/40 transition-colors"
                  style={{ background: color(cell) }}
                  aria-label={cell?.date ?? "vazio"}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-h-[14px] font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground tabular-nums">
            {hover ? (
              <>
                {format(parseISO(hover.date), "dd MMM yyyy", { locale: ptBR })} ·{" "}
                <span className="text-foreground">{hover.done}/{hover.total}</span>
              </>
            ) : (
              <>Passe o mouse para detalhes</>
            )}
          </div>
          <div className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
            <span>−</span>
            {[0.05, 0.3, 0.55, 0.8, 1].map((p) => (
              <span key={p} className="h-2 w-2 rounded-[2px]" style={{ background: color({ pct: p, total: 1 }) }} />
            ))}
            <span>+</span>
          </div>
        </div>
      </div>
    </section>
  );
}
