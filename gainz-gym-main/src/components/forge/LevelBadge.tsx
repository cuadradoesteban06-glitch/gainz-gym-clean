import { xpToLevel } from "@/lib/forge-routines";

export type TierId = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export type Tier = {
  id: TierId;
  name: string;
  range: [number, number]; // inclusive level range
  base: string;
  light: string;
  dark: string;
  glow: string;
  ink: string;
};

export const TIERS: Tier[] = [
  { id: "bronze",   name: "BRONCE",   range: [1, 2],  base: "#B87333", light: "#F2C28A", dark: "#5C3514", glow: "rgba(184,115,51,0.45)",  ink: "#1A0E05" },
  { id: "silver",   name: "PLATA",    range: [3, 4],  base: "#C0C8D1", light: "#FFFFFF", dark: "#5A6470", glow: "rgba(192,200,209,0.45)", ink: "#1A1F26" },
  { id: "gold",     name: "ORO",      range: [5, 6],  base: "#F2C14E", light: "#FFF1B8", dark: "#7A5610", glow: "rgba(242,193,78,0.5)",   ink: "#241803" },
  { id: "platinum", name: "PLATINO",  range: [7, 8],  base: "#D8E6EC", light: "#FFFFFF", dark: "#6A8290", glow: "rgba(216,230,236,0.5)",  ink: "#142026" },
  { id: "diamond",  name: "DIAMANTE", range: [9, 10], base: "#7FE3FF", light: "#E8FBFF", dark: "#1E5C7A", glow: "rgba(127,227,255,0.55)", ink: "#03161E" },
];

export function tierForLevel(lvl: number): Tier {
  return TIERS.find((t) => lvl >= t.range[0] && lvl <= t.range[1]) ?? TIERS[TIERS.length - 1];
}

export function tierForXp(xp: number): { tier: Tier; lvl: number; next?: Tier } {
  const { lvl } = xpToLevel(xp);
  const tier = tierForLevel(lvl);
  const idx = TIERS.indexOf(tier);
  return { tier, lvl, next: TIERS[idx + 1] };
}

/* SVG dumbbell badge with metallic gradient per tier */
export function LevelBadge({
  xp,
  size = 120,
  showLabel = true,
}: {
  xp: number;
  size?: number;
  showLabel?: boolean;
}) {
  const { tier, lvl } = tierForXp(xp);
  const uid = `t-${tier.id}`;

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle at 30% 25%, ${tier.light}22, transparent 60%), radial-gradient(circle at 70% 80%, ${tier.dark}55, transparent 65%), #0E0B08`,
          border: `1px solid ${tier.dark}`,
          boxShadow: `0 0 0 4px rgba(0,0,0,0.4), 0 10px 30px -8px ${tier.glow}, inset 0 0 24px ${tier.glow}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <DumbbellSVG tier={tier} uid={uid} size={Math.round(size * 0.72)} />
        <div
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            background: tier.base,
            color: tier.ink,
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            fontSize: Math.max(10, Math.round(size * 0.11)),
            padding: "3px 8px",
            borderRadius: 999,
            border: `2px solid #0E0B08`,
            letterSpacing: 1,
          }}
        >
          LV {lvl}
        </div>
      </div>
      {showLabel && (
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            letterSpacing: 3,
            fontSize: Math.max(12, Math.round(size * 0.13)),
            color: tier.base,
            textTransform: "uppercase",
          }}
        >
          {tier.name}
        </div>
      )}
    </div>
  );
}

function DumbbellSVG({ tier, uid, size }: { tier: Tier; uid: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tier.light} />
          <stop offset="45%" stopColor={tier.base} />
          <stop offset="100%" stopColor={tier.dark} />
        </linearGradient>
        <linearGradient id={`${uid}-bar`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tier.light} />
          <stop offset="50%" stopColor={tier.base} />
          <stop offset="100%" stopColor={tier.dark} />
        </linearGradient>
        <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Bar */}
      <rect x="32" y="46" width="36" height="8" rx="2" fill={`url(#${uid}-bar)`} stroke={tier.dark} strokeWidth="0.5" />
      <rect x="32" y="46" width="36" height="3" fill={`url(#${uid}-shine)`} opacity="0.6" />

      {/* Left plates */}
      <rect x="22" y="36" width="6" height="28" rx="2" fill={`url(#${uid}-metal)`} stroke={tier.dark} strokeWidth="0.5" />
      <rect x="14" y="30" width="8" height="40" rx="2.5" fill={`url(#${uid}-metal)`} stroke={tier.dark} strokeWidth="0.6" />
      <rect x="15.5" y="32" width="2" height="36" fill={`url(#${uid}-shine)`} opacity="0.7" />

      {/* Right plates */}
      <rect x="72" y="36" width="6" height="28" rx="2" fill={`url(#${uid}-metal)`} stroke={tier.dark} strokeWidth="0.5" />
      <rect x="78" y="30" width="8" height="40" rx="2.5" fill={`url(#${uid}-metal)`} stroke={tier.dark} strokeWidth="0.6" />
      <rect x="79.5" y="32" width="2" height="36" fill={`url(#${uid}-shine)`} opacity="0.7" />

      {/* Diamond-only sparkle accents */}
      {tier.id === "diamond" && (
        <>
          <circle cx="50" cy="50" r="1.6" fill="#ffffff" />
          <circle cx="18" cy="36" r="1" fill="#ffffff" opacity="0.9" />
          <circle cx="82" cy="64" r="1" fill="#ffffff" opacity="0.9" />
        </>
      )}
    </svg>
  );
}