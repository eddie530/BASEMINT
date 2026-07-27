import {
  ACTIVE_COLLECTION,
  LAUNCH_COLLECTIONS,
  collectionLabel,
  type LaunchCollection,
  type ResidentLaunch,
} from "@/lib/resident-launches";
import { cn } from "@/lib/utils";

interface CollectionRailProps {
  launches: ResidentLaunch[];
  /** Selected collection, or null for "All". */
  value?: LaunchCollection | null;
  onChange?: (next: LaunchCollection | null) => void;
  className?: string;
}

/**
 * Reusable collection selector. Highlights the active Resident Labs
 * collection (Signals) and shows the release count per collection.
 */
export function CollectionRail({ launches, value, onChange, className }: CollectionRailProps) {
  const interactive = typeof onChange === "function";

  const chip = (
    key: string,
    label: string,
    count: number,
    selected: boolean,
    isActive: boolean,
    onClick?: () => void,
  ) => {
    const Tag = interactive ? "button" : "span";
    return (
      <Tag
        key={key}
        onClick={onClick}
        className={cn(
          "launch-glow inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest",
          selected
            ? "border-accent/50 bg-accent/10 text-accent"
            : isActive
              ? "border-primary/40 bg-primary/10 text-white/80"
              : "border-white/10 bg-white/5 text-white/55",
        )}
      >
        <span className="truncate">{label}</span>
        <span className={cn(selected ? "text-accent" : "text-white/40")}>{count}</span>
        {isActive && !selected && (
          <span className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_2px] shadow-primary/60" />
        )}
      </Tag>
    );
  };

  return (
    <div className={cn("-mx-1 flex gap-2 overflow-x-auto px-1 pb-1", className)}>
      {interactive &&
        chip("all", "All", launches.length, value == null, false, () => onChange?.(null))}
      {LAUNCH_COLLECTIONS.map((c) =>
        chip(
          c,
          collectionLabel(c),
          launches.filter((l) => l.collection === c).length,
          value === c,
          c === ACTIVE_COLLECTION,
          () => onChange?.(c === value ? null : c),
        ),
      )}
    </div>
  );
}
