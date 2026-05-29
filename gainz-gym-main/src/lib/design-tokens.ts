/** Design system tokens — shared between CSS variables and TS components */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const duration = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
} as const;

export const touch = {
  min: 44,
  comfortable: 48,
} as const;

export const typography = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
} as const;

export type AdaptationBadgeId =
  | "adaptado"
  | "seguro-rodilla"
  | "seguro-hombro"
  | "seguro-lumbar"
  | "baja-carga"
  | "movilidad"
  | "recuperacion";

export const ADAPTATION_BADGES: Record<
  AdaptationBadgeId,
  { label: string; className: string }
> = {
  adaptado: { label: "Adaptado", className: "badge-adapt" },
  "seguro-rodilla": { label: "Seguro para rodilla", className: "badge-safe-knee" },
  "seguro-hombro": { label: "Seguro para hombro", className: "badge-safe-shoulder" },
  "seguro-lumbar": { label: "Baja carga lumbar", className: "badge-safe-back" },
  "baja-carga": { label: "Baja carga", className: "badge-low-load" },
  movilidad: { label: "Movilidad", className: "badge-mobility" },
  recuperacion: { label: "Recuperación", className: "badge-recovery" },
};

export const COACH_LOADING_MESSAGES = [
  "Analizando tu entrenamiento…",
  "Adaptando ejercicios…",
  "Preparando recomendaciones…",
  "Revisando tu progreso…",
  "Consultando evidencia científica…",
] as const;
