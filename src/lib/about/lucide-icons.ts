import {
  Award,
  BadgeCheck,
  Building2,
  CheckCircle2,
  HardHat,
  Headset,
  PencilRuler,
  Shield,
  Sun,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Admin-selectable Lucide icons for About credential/team cards (#82 allowlist). */
export const ABOUT_LUCIDE_ICON_NAMES = [
  "Building2",
  "BadgeCheck",
  "Award",
  "PencilRuler",
  "Wrench",
  "Headset",
  "Shield",
  "HardHat",
  "Sun",
  "Zap",
  "Users",
  "CheckCircle2",
] as const;

export type AboutLucideIconName = (typeof ABOUT_LUCIDE_ICON_NAMES)[number];

export const ABOUT_ICON_SLOT_DEFAULTS = {
  credRegisteredIcon: "Building2",
  credEngineerIcon: "BadgeCheck",
  credExperienceIcon: "Award",
  teamDesignIcon: "PencilRuler",
  teamInstallIcon: "Wrench",
  teamSupportIcon: "Headset",
} as const satisfies Record<string, AboutLucideIconName>;

export type AboutIconSlot = keyof typeof ABOUT_ICON_SLOT_DEFAULTS;

const ICON_MAP: Record<AboutLucideIconName, LucideIcon> = {
  Building2,
  BadgeCheck,
  Award,
  PencilRuler,
  Wrench,
  Headset,
  Shield,
  HardHat,
  Sun,
  Zap,
  Users,
  CheckCircle2,
};

export function resolveAboutLucideIcon(
  stored: string | null | undefined,
  slot: AboutIconSlot,
): LucideIcon {
  if (stored && stored in ICON_MAP) {
    return ICON_MAP[stored as AboutLucideIconName];
  }
  return ICON_MAP[ABOUT_ICON_SLOT_DEFAULTS[slot]];
}

export function isAboutLucideIconName(value: string): value is AboutLucideIconName {
  return (ABOUT_LUCIDE_ICON_NAMES as readonly string[]).includes(value);
}
