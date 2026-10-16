export type ThemeName = "dark" | "light";

export type Palette = {
  lime: string;
  danger: string;
  bg: string;
  ink: string;
  bone: string;
  muted: string;
  frame: string;
  baseline: string;
  grid: string;
  auto: string;
  fillTop: string;
  fillGhost: string;
  fillRug: string;
  fillEnd: string;
  washTop: string;
  vignette: string;
};

const dark: Palette = {
  lime: "#1d5fbf",
  danger: "#d7e8ff",
  bg: "#05060a",
  ink: "#0a1018",
  bone: "#e7eef8",
  muted: "#8b97ad",
  frame: "rgba(231, 238, 248, 0.2)",
  baseline: "rgba(231, 238, 248, 0.16)",
  grid: "rgba(29, 95, 191, 0.18)",
  auto: "rgba(29, 95, 191, 0.85)",
  fillTop: "rgba(29, 95, 191, 0.34)",
  fillGhost: "rgba(29, 95, 191, 0.18)",
  fillRug: "rgba(215, 232, 255, 0.2)",
  fillEnd: "rgba(29, 95, 191, 0)",
  washTop: "#0c1628",
  vignette: "rgba(5, 6, 10, 0.5)",
};

const light: Palette = {
  lime: "#123f8a",
  danger: "#0b1220",
  bg: "#f3f6fb",
  ink: "#e7eef7",
  bone: "#0b1220",
  muted: "#5c6b82",
  frame: "rgba(11, 18, 32, 0.18)",
  baseline: "rgba(11, 18, 32, 0.14)",
  grid: "rgba(18, 63, 138, 0.16)",
  auto: "rgba(18, 63, 138, 0.75)",
  fillTop: "rgba(18, 63, 138, 0.2)",
  fillGhost: "rgba(18, 63, 138, 0.12)",
  fillRug: "rgba(11, 18, 32, 0.12)",
  fillEnd: "rgba(18, 63, 138, 0)",
  washTop: "#e4edf8",
  vignette: "rgba(243, 246, 251, 0.55)",
};

export const THEME_KEY = "moonshot-theme";

let active: Palette = dark;
let cosmetic = "base";
export function setCosmetic(look: string) { cosmetic=look; }
const accents: Record<string,string> = {base:"#4785ff",acid:"#d4fa59",ember:"#ff976b",violet:"#ba9cff"};

export function palette(): Palette {
  const color=accents[cosmetic] || accents.base;
  return {...active,lime:color,danger:"#f58c91",fillRug:"rgba(245,140,145,.2)",fillTop:`${color}44`,fillGhost:`${color}22`,fillEnd:`${color}00`,auto:color};
}

export function setDrawTheme(next: ThemeName): void {
  active = next === "light" ? light : dark;
}

export function readTheme(): ThemeName {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* private mode */
  }
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function applyTheme(next: ThemeName): void {
  setDrawTheme(next);
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", next === "light" ? "#f3f6fb" : "#05060a");
  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {
    /* private mode */
  }
}
