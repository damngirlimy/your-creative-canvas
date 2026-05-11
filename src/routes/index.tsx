import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Plus, LogOut } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Task, MonthEvent, CategoryDef, DEFAULT_CATEGORIES } from "@/lib/types";
import { TaskList } from "@/components/TaskList";
import { TaskDialog } from "@/components/TaskDialog";
import { Calendar } from "@/components/Calendar";
import { EventsPanel } from "@/components/EventsPanel";
import { LockScreen } from "@/components/LockScreen";
import { FreeSlotsPanel } from "@/components/FreeSlotsPanel";
import { StatsPanel } from "@/components/StatsPanel";
import { QuickCapture } from "@/components/QuickCapture";
import { FloatingAccess } from "@/components/FloatingAccess";
import { ReminderBanner } from "@/components/ReminderBanner";
import { useReminders } from "@/hooks/useReminders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Édit ⁄ Schedule — Seu dia, desenhado com intenção" },
      {
        name: "description",
        content:
          "Cronograma pessoal editorial: tarefas, hábitos, eventos e calendário. Salvo localmente, sempre seu.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [unlocked, setUnlocked] = useState(false);
  const [tasks, setTasks] = useLocalStorage<Task[]>("schedule.tasks.v2", []);
  const [events, setEvents] = useLocalStorage<MonthEvent[]>("schedule.events.v2", []);
  const [categories, setCategories] = useLocalStorage<CategoryDef[]>(
    "schedule.categories.v2",
    DEFAULT_CATEGORIES
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [month, setMonth] = useState(new Date());
  const [filter, setFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const filteredTasks = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((t) => t.category === filter)),
    [tasks, filter]
  );

  const todayStats = useMemo(() => {
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    const dayTasks = tasks.filter((t) => {
      if (t.recurring === "daily") return true;
      if (t.recurring === "weekly") return parseISO(t.date).getDay() === selectedDate.getDay();
      return isSameDay(parseISO(t.date), selectedDate);
    });
    const isDone = (t: Task) =>
      t.recurring && t.recurring !== "none"
        ? (t.completedDates ?? []).includes(dateKey)
        : t.completed;
    const done = dayTasks.filter(isDone).length;
    return {
      total: dayTasks.length,
      done,
      pct: dayTasks.length ? Math.round((done / dayTasks.length) * 100) : 0,
    };
  }, [tasks, selectedDate]);

  const handleSave = (task: Task) => {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === task.id);
      return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task];
    });
    setEditing(null);
  };

  const toggle = (id: string, dateKey: string) =>
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (t.recurring && t.recurring !== "none") {
          const list = t.completedDates ?? [];
          const next = list.includes(dateKey)
            ? list.filter((d) => d !== dateKey)
            : [...list, dateKey];
          return { ...t, completedDates: next };
        }
        return { ...t, completed: !t.completed };
      })
    );
  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const edit = (t: Task) => {
    setEditing(t);
    setDialogOpen(true);
  };

  const addCategory = (c: CategoryDef) => setCategories((prev) => [...prev, c]);
  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setTasks((prev) => prev.map((t) => (t.category === id ? { ...t, category: "other" } : t)));
  };

  const [prefill, setPrefill] = useState<{ time?: string; endTime?: string; date?: string } | null>(null);
  const openNew = (pf?: { time?: string; endTime?: string; date?: string }) => {
    setEditing(null);
    setPrefill(pf ?? null);
    setDialogOpen(true);
  };
  const openFillSlot = (start: string, end: string) =>
    openNew({ time: start, endTime: end, date: format(selectedDate, "yyyy-MM-dd") });
  const rescheduleToToday = (t: Task) => {
    const today = format(new Date(), "yyyy-MM-dd");
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, date: today } : x)));
  };

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const safeNow = now ?? new Date(0);
  const yearStr = now ? format(now, "yyyy") : "";

  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen relative">
      {/* Top nav */}
      <header className="border-b hairline sticky top-0 z-30 bg-background/70 backdrop-blur-xl">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 md:px-12 py-4 md:py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 shrink-0 bg-accent text-accent-foreground flex items-center justify-center font-serif text-base italic">
              é
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] truncate">Édit ⁄ Schedule</p>
              <p className="font-mono text-[9px] text-muted-foreground tracking-widest truncate">
                EST. <span suppressHydrationWarning>{yearStr}</span> · PERSONAL EDITION
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-6 font-mono text-[10px] uppercase tracking-[0.25em] shrink-0">
            <span className="text-muted-foreground tabular-nums" suppressHydrationWarning>{now ? format(now, "HH:mm") : "--:--"}</span>
            <span className="hidden md:inline text-muted-foreground" suppressHydrationWarning>
              {now ? format(now, "EEEE, dd MMM", { locale: ptBR }) : ""}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
            <button
              onClick={() => {
                try {
                  localStorage.removeItem("schedule.unlocked.v1");
                } catch {
                  /* ignore */
                }
                setUnlocked(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border hairline hover:bg-accent hover:text-accent-foreground transition-smooth"
              aria-label="Sair"
              title="Sair e bloquear o acesso neste dispositivo"
            >
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Marquee */}
      <div className="border-b hairline overflow-hidden py-3 bg-surface-1">
        <div className="flex animate-scroll-x whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="px-8 flex items-center gap-8">
              <span>Cronograma Pessoal</span>
              <span className="text-accent">◆</span>
              <span>
                {todayStats.done} / {todayStats.total} concluídas hoje
              </span>
              <span className="text-accent">◆</span>
              <span>Salvo localmente</span>
              <span className="text-accent">◆</span>
              <span>Edição <span suppressHydrationWarning>{yearStr}</span></span>
              <span className="text-accent">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="relative max-w-[1480px] mx-auto px-4 sm:px-6 md:px-12 pt-12 sm:pt-20 md:pt-32 pb-12 md:pb-16">
        <div className="grid md:grid-cols-12 gap-8 md:items-end">
          <div className="md:col-span-8 relative">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent mb-6 md:mb-8">
              № 001 — A Curated Day · Vol. <span suppressHydrationWarning>{now ? format(now, "MM") : ""}</span>
            </p>
            <h1 className="font-serif text-[clamp(2.75rem,11vw,11rem)] leading-[0.88] tracking-[-0.04em] text-balance">
              <span className="block">Seu dia,</span>
              <span className="block italic font-light text-foreground/50">desenhado</span>
              <span className="block">
                com{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">intenção</span>
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.6, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-0 -bottom-1 md:-bottom-2 h-3 md:h-4 w-full bg-accent origin-left -z-10"
                  />
                </span>
                .
              </span>
            </h1>
          </div>

          <div className="md:col-span-4 space-y-6">
            <div className="border hairline bg-surface-1 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 font-mono text-[9px] uppercase tracking-[0.3em] text-accent p-3">
                ● Live
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Progresso de hoje
              </p>
              <div className="flex items-baseline gap-3 mt-3">
                <span className="font-serif text-7xl tabular-nums leading-none">{todayStats.done}</span>
                <span className="font-mono text-sm text-muted-foreground">/ {todayStats.total}</span>
              </div>
              <div className="mt-4 h-[2px] bg-foreground/10 relative overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${todayStats.pct}%` }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground tabular-nums">
                {todayStats.pct}% completo
              </p>
            </div>

            <button
              onClick={() => openNew()}
              className="w-full group flex items-center justify-between px-6 py-5 bg-accent text-accent-foreground hover:glow-accent transition-smooth"
            >
              <span className="font-mono text-xs uppercase tracking-[0.25em]">Adicionar tarefa</span>
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-smooth" />
            </button>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <section className="max-w-[1480px] mx-auto px-4 sm:px-6 md:px-12 pb-32 md:pb-40 grid lg:grid-cols-12 gap-10 md:gap-12 lg:gap-16">
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                № 01 · Agenda do dia
              </p>
              <h2 className="font-serif text-4xl mt-2 capitalize leading-none">
                {format(selectedDate, "EEEE", { locale: ptBR })}
              </h2>
              <p className="font-mono text-xs text-muted-foreground mt-2">
                {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-1 mb-6 border hairline p-1 bg-surface-1">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-smooth",
                filter === "all" ? "bg-accent text-accent-foreground" : "hover:bg-foreground/5"
              )}
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={cn(
                  "px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-smooth flex items-center gap-2",
                  filter === c.id ? "bg-accent text-accent-foreground" : "hover:bg-foreground/5"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${c.hue})` }} />
                {c.label}
              </button>
            ))}
          </div>

          <TaskList
            tasks={filteredTasks}
            selectedDate={selectedDate}
            categories={categories}
            onToggle={toggle}
            onEdit={edit}
            onDelete={remove}
          />
          <div className="mt-12">
            <FreeSlotsPanel
              date={selectedDate}
              tasks={tasks}
              events={events}
              onFillSlot={openFillSlot}
              onReschedule={rescheduleToToday}
              onDiscard={remove}
            />
          </div>
        </div>

        <aside className="lg:col-span-5 xl:col-span-4 space-y-14">
          <Calendar
            month={month}
            setMonth={setMonth}
            selected={selectedDate}
            setSelected={setSelectedDate}
            tasks={tasks}
            events={events}
            categories={categories}
          />
          <EventsPanel
            events={events}
            categories={categories}
            month={month}
            onAdd={(e) => setEvents((prev) => [...prev, e])}
            onDelete={(id) => setEvents((prev) => prev.filter((e) => e.id !== id))}
          />
          <StatsPanel tasks={tasks} categories={categories} />
        </aside>
      </section>

      {/* Footer */}
      <footer className="border-t hairline">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 md:px-12 py-8 md:py-10 grid md:grid-cols-3 gap-4 md:gap-6 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <span>© <span suppressHydrationWarning>{yearStr}</span> — Édit Schedule</span>
          <span className="md:text-center">Salvo localmente · Sempre seu</span>
          <span className="md:text-right text-accent" suppressHydrationWarning>{now ? format(now, "HH:mm:ss") : "--:--:--"}</span>
        </div>
      </footer>

      <QuickCapture
        categories={categories}
        onCreate={handleSave}
        onOpenFull={() => openNew()}
      />

      <TaskDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
          setPrefill(null);
        }}
        onSave={handleSave}
        defaultDate={selectedDate}
        editing={editing}
        categories={categories}
        onAddCategory={addCategory}
        onDeleteCategory={deleteCategory}
        prefill={prefill}
      />
    </div>
  );
}
