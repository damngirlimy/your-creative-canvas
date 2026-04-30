export type Priority = "low" | "med" | "high";

/** Category id is a string so the user can create custom ones. */
export type Category = string;

export interface CategoryDef {
  id: Category;
  label: string;
  /** HSL triplet, e.g. "220 70% 55%" */
  hue: string;
  builtin?: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  category: Category;
  priority: Priority;
  date: string; // ISO yyyy-mm-dd
  time?: string; // HH:mm
  endTime?: string; // HH:mm optional end
  completed: boolean;
  /** Para tarefas recorrentes: datas (yyyy-MM-dd) em que foi concluída. */
  completedDates?: string[];
  recurring?: "none" | "daily" | "weekly";
  createdAt: number;
}

export interface MonthEvent {
  id: string;
  title: string;
  notes?: string;
  category: Category;
  date: string; // ISO yyyy-mm-dd
  endDate?: string;
  createdAt: number;
}

/** Categorias do único usuário — refinadas para o dia-a-dia pessoal. */
export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { id: "work",     label: "Trabalho",   hue: "220 70% 55%", builtin: true },
  { id: "study",    label: "Estudos",    hue: "280 55% 60%", builtin: true },
  { id: "fitness",  label: "Treino",     hue: "12 80% 55%",  builtin: true },
  { id: "health",   label: "Saúde",      hue: "165 60% 45%", builtin: true },
  { id: "home",     label: "Casa",       hue: "40 85% 58%",  builtin: true },
  { id: "personal", label: "Pessoal",    hue: "330 75% 60%", builtin: true },
  { id: "leisure",  label: "Lazer",      hue: "190 80% 50%", builtin: true },
  { id: "other",    label: "Outros",     hue: "220 8% 55%",  builtin: true },
];

export const PRIORITY_META: Record<Priority, { label: string; symbol: string }> = {
  low: { label: "Baixa", symbol: "○" },
  med: { label: "Média", symbol: "◐" },
  high: { label: "Alta", symbol: "●" },
};

export const PALETTE_HUES = [
  "75 95% 60%",   // lime
  "220 70% 55%",  // blue
  "12 80% 55%",   // red-orange
  "280 55% 60%",  // purple
  "165 60% 45%",  // teal
  "40 85% 58%",   // amber
  "330 75% 60%",  // pink
  "190 80% 50%",  // cyan
  "0 0% 90%",     // bone
  "260 60% 65%",  // violet
];
