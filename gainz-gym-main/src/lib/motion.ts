import type { Transition, Variants } from "framer-motion";

export const TAB_ORDER = ["home", "routine", "coach", "diet", "history", "profile"] as const;

export const springSnappy = { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.85 };
export const springSoft = { type: "spring" as const, stiffness: 280, damping: 28, mass: 0.9 };
export const springBounce = { type: "spring" as const, stiffness: 500, damping: 22, mass: 0.7 };

export const easeOut = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const tabPanelVariants = (dir: number): Variants => ({
  enter: { opacity: 0, x: dir * 28, filter: "blur(4px)" },
  center: { opacity: 1, x: 0, filter: "blur(0px)", transition: springSoft },
  exit: { opacity: 0, x: dir * -20, filter: "blur(3px)", transition: { duration: 0.18 } },
});

export const screenSlideUp: Variants = {
  hidden: { opacity: 0, y: "100%" },
  show: { opacity: 1, y: 0, transition: springSoft },
  exit: { opacity: 0, y: 24, transition: { duration: 0.22 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: springSnappy },
};

export function tabDirection(from: string, to: string): number {
  const a = TAB_ORDER.indexOf(from as (typeof TAB_ORDER)[number]);
  const b = TAB_ORDER.indexOf(to as (typeof TAB_ORDER)[number]);
  if (a < 0 || b < 0) return 0;
  return b > a ? 1 : b < a ? -1 : 0;
}

export function hapticLight() {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* noop */
  }
}

export function hapticSuccess() {
  try {
    navigator.vibrate?.([12, 40, 18]);
  } catch {
    /* noop */
  }
}

export const toastTransition: Transition = springSnappy;

export function greetingForHour(h = new Date().getHours()): string {
  if (h < 6) return "Buenas noches";
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}
