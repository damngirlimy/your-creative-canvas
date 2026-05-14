import { useEffect, useMemo, useRef, useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Trophy, Flame, Check, Pencil } from "lucide-react";
import { Task } from "@/lib/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  selectedDate: Date;
}

interface GoalState {
  /** map yyyy-mm-dd -> goal count */
  goals: Record<string, number>;
  /** map yyyy-mm-dd -> already celebrated */
  celebrated: Record<string, boolean>;
  /** consecutive days hitting the goal */
  streak: number;
  /** last date (yyyy-mm-dd) the streak was updated */
  lastStreakDate: string | null;
  /** total days the goal was hit ever */
  totalAchievements: number;
}

const DEFAULT_GOAL = 5;

export function DailyGoal({ tasks, selectedDate }: Props) {
  const [state, setState] = useLocalStorage<GoalState>("schedule.dailyGoal.v1", {
    goals: {},
    celebrated: {},
    streak: 0,
    lastStreakDate: null,
    totalAchievements: 0,
  });
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const goal = state.goals[dateKey] ?? DEFAULT_GOAL;

  const doneToday = useMemo(() => {
    return tasks.filter((t) => {
      const isDone =
        t.recurring && t.recurring !== "none"
          ? (t.completedDates ?? []).includes(dateKey)
          : t.completed && isSameDay(parseISO(t.date), selectedDate);
      return isDone;
    }).length;
  }, [tasks, selectedDate, dateKey]);

  const pct = Math.min(100, Math.round((doneToday / Math.max(1, goal)) * 100));
  const achieved = doneToday >= goal;

  // Celebrate once per day when goal is reached
  const prevAchievedRef = useRef(achieved);
  useEffect(() => {
    if (achieved && !state.celebrated[dateKey]) {
      celebrate();
      setState((s) => {
        const today = format(new Date(), "yyyy-MM-dd");
        const isToday = dateKey === today;
        const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
        let nextStreak = s.streak;
        if (isToday) {
          nextStreak = s.lastStreakDate === yesterday ? s.streak + 1 : 1;
        }
        return {
          ...s,
          celebrated: { ...s.celebrated, [dateKey]: true },
          streak: isToday ? nextStreak : s.streak,
          lastStreakDate: isToday ? today : s.lastStreakDate,
          totalAchievements: s.totalAchievements + 1,
        };
      });
    }
    prevAchievedRef.current = achieved;
  }, [achieved, dateKey, state.celebrated, setState]);

  const setGoal = (n: number) => {
    const v = Math.max(1, Math.min(50, Math.round(n)));
    setState((s) => ({ ...s, goals: { ...s.goals, [dateKey]: v } }));
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <div className="border hairline bg-surface-1 p-5 sm:p-6 relative overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-accent" />
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Meta diária
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em]">
          {state.streak > 0 && (
            <span className="flex items-center gap-1 text-accent" title={`${state.streak} dias seguidos`}>
              <Flame className="h-3 w-3" />
              <span className="tabular-nums">{state.streak}</span>
            </span>
          )}
          {state.totalAchievements > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground" title="Total de metas batidas">
              <Trophy className="h-3 w-3" />
              <span className="tabular-nums">{state.totalAchievements}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-serif text-5xl sm:text-6xl tabular-nums leading-none">
          {doneToday}
        </span>
        <span className="font-mono text-sm text-muted-foreground">/</span>
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={50}
            defaultValue={goal}
            onBlur={(e) => {
              setGoal(Number(e.target.value) || DEFAULT_GOAL);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setGoal(Number((e.target as HTMLInputElement).value) || DEFAULT_GOAL);
                setEditing(false);
              }
              if (e.key === "Escape") setEditing(false);
            }}
            className="font-serif text-3xl sm:text-4xl tabular-nums leading-none w-16 bg-transparent border-b border-accent focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="font-serif text-3xl sm:text-4xl tabular-nums leading-none text-muted-foreground hover:text-foreground transition-smooth flex items-center gap-1.5 group"
            aria-label="Editar meta"
          >
            {goal}
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-smooth" />
          </button>
        )}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground tabular-nums">
          {pct}%
        </span>
      </div>

      {/* progress bar with segments */}
      <div className="mt-4 grid gap-0.5" style={{ gridTemplateColumns: `repeat(${goal}, 1fr)` }}>
        {Array.from({ length: goal }).map((_, i) => {
          const filled = i < doneToday;
          return (
            <motion.div
              key={i}
              initial={{ scaleY: 0.6, opacity: 0.4 }}
              animate={{
                scaleY: filled ? 1 : 0.6,
                opacity: filled ? 1 : 0.25,
              }}
              transition={{ delay: i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "h-2 origin-bottom",
                filled ? "bg-accent" : "bg-foreground/15"
              )}
            />
          );
        })}
      </div>

      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {achieved
          ? "Meta concluída — dia desenhado."
          : `Faltam ${goal - doneToday} para bater a meta`}
      </p>

      <AnimatePresence>
        {achieved && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 flex items-center gap-3 border hairline border-accent/40 bg-accent/10 p-3"
          >
            <div className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0">
              <Check className="h-4 w-4" strokeWidth={3} />
            </div>
            <div className="min-w-0">
              <p className="font-serif italic text-sm leading-tight">Parabéns.</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-0.5">
                {state.streak > 1 ? `${state.streak} dias seguidos` : "Meta batida hoje"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
