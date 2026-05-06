import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CategoryDef, Task } from "@/lib/types";
import { categoryRates, consistency, dailyCompletion } from "@/lib/insights";

interface Props {
  tasks: Task[];
  categories: CategoryDef[];
}

export function StatsPanel({ tasks, categories }: Props) {
  const cons30 = useMemo(() => consistency(tasks, 30), [tasks]);
  const cons7 = useMemo(() => consistency(tasks, 7), [tasks]);
  const heat = useMemo(() => dailyCompletion(tasks, 7 * 26), [tasks]); // ~6 meses (mobile-friendly)
  const rates = useMemo(() => categoryRates(tasks, 30), [tasks]);
  const catMap = new Map(categories.map((c) => [c.id, c]));

  // Group heat into weeks (cols), 7 rows (days). Pad start so col 0 begins on a Sunday.
  const weeks: { date: string; pct: number; total: number }[][] = [];
  if (heat.length) {
    const firstDow = parseISO(heat[0].date).getDay();
    const padded = Array.from({ length: firstDow }, () => null as null | typeof heat[number])
      .concat(heat as (typeof heat[number] | null)[]);
    for (let i = 0; i < padded.length; i += 7) {
      const week = padded.slice(i, i + 7).map((d) => d ?? { date: "", pct: 0, total: 0, done: 0 });
      weeks.push(week.map((d) => ({ date: d.date, pct: d.pct, total: d.total })));
    }
  }

  const cellColor = (pct: number, total: number) => {
    if (!total) return "hsl(var(--foreground) / 0.04)";
    if (pct >= 1) return "hsl(var(--accent))";
    if (pct >= 0.66) return "hsl(var(--accent) / 0.6)";
    if (pct >= 0.33) return "hsl(var(--accent) / 0.35)";
    return "hsl(var(--accent) / 0.18)";
  };

  return (
    <section className="space-y-10">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">№ 03 · Retrato</p>
        <h2 className="font-serif text-4xl mt-2 leading-none">Consistência</h2>
        <p className="font-mono text-xs text-muted-foreground mt-2">
          Sem streaks puníveis — só o que você de fato sustentou.
        </p>
      </div>

      {/* Consistency numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border hairline bg-surface-1 p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">7 dias</p>
          <p className="font-serif text-5xl tabular-nums leading-none mt-2">{cons7}<span className="text-2xl text-muted-foreground">%</span></p>
        </div>
        <div className="border hairline bg-surface-1 p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">30 dias</p>
          <p className="font-serif text-5xl tabular-nums leading-none mt-2">{cons30}<span className="text-2xl text-muted-foreground">%</span></p>
        </div>
      </div>

      {/* Heatmap */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Heatmap · 26 semanas</p>
          <p className="font-mono text-[9px] text-muted-foreground tabular-nums">
            {heat.length ? format(parseISO(heat[heat.length - 1].date), "MMM yyyy", { locale: ptBR }) : ""}
          </p>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((d, di) => (
                  <div
                    key={di}
                    title={d.date ? `${d.date} · ${Math.round(d.pct * 100)}% (${d.total})` : ""}
                    className="h-3 w-3 rounded-[2px]"
                    style={{ background: cellColor(d.pct, d.total) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>menos</span>
          {[0.05, 0.3, 0.55, 0.8, 1].map((p) => (
            <span key={p} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: cellColor(p, 1) }} />
          ))}
          <span>mais</span>
        </div>
      </div>

      {/* Category bars */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent mb-3">Por categoria · 30 dias</p>
        {rates.length === 0 ? (
          <p className="font-serif italic text-sm text-foreground/50">Sem dados ainda. Marque algumas tarefas.</p>
        ) : (
          <ul className="space-y-3">
            {rates.map((r) => {
              const c = catMap.get(r.category);
              return (
                <li key={r.category}>
                  <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.2em] mb-1.5">
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${c?.hue ?? "0 0% 50%"})` }} />
                      {c?.label ?? r.category}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {r.done}/{r.total} · {r.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-foreground/5 relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 transition-smooth"
                      style={{ width: `${r.pct}%`, background: `hsl(${c?.hue ?? "0 0% 50%"})` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
