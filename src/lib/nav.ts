import { Compass, Gamepad2, Home, Rocket, ShoppingBag, Sparkles, User, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Short hint shown on desktop sidebar. */
  hint?: string;
};

/**
 * Resident Labs primary nav. Order is canonical — used by both the
 * desktop sidebar and the mobile bottom-nav / "more" sheet.
 */
export const RESIDENT_NAV: NavItem[] = [
  { to: "/home", label: "Home", icon: Home, hint: "Overview" },
  { to: "/discover", label: "Discover", icon: Compass, hint: "BaseMint feed" },
  { to: "/launch", label: "Launch", icon: Rocket, hint: "Create onchain" },
  { to: "/play", label: "Play", icon: Gamepad2, hint: "SpinBase" },
  { to: "/vault", label: "Vault", icon: Wallet, hint: "Assets & rewards" },
  { to: "/shop", label: "Shop", icon: ShoppingBag, hint: "Resident Pro & more" },
  { to: "/ai", label: "AI", icon: Sparkles, hint: "Resident AI" },
  { to: "/profile", label: "Profile", icon: User, hint: "Resident ID" },
];

/** Items shown directly on the mobile bottom bar (5 slots). */
export const MOBILE_PRIMARY: NavItem[] = RESIDENT_NAV.filter((n) =>
  ["/home", "/discover", "/launch", "/play", "/vault"].includes(n.to),
);

/** Items surfaced only in the mobile "More" sheet. */
export const MOBILE_SECONDARY: NavItem[] = RESIDENT_NAV.filter((n) =>
  ["/shop", "/ai", "/profile"].includes(n.to),
);

