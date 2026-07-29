const STATS = [
  { value: "1", label: "Live Token" },
  { value: "1", label: "Launch Platform" },
  { value: null, label: "AI Powered" },
  { value: null, label: "Base + Solana" },
];

/** Compact social-proof strip for the Resident Labs ecosystem. */
export function EcosystemStatsBar() {
  return (
    <section className="launch-rise rounded-2xl border border-white/10 bg-black/40 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
        Resident Labs Ecosystem
      </p>
      <ul className="mt-3 space-y-1">
        {STATS.map((s) => (
          <li key={s.label} className="flex items-baseline gap-2 font-mono text-sm text-white/70">
            <span className="w-3 shrink-0 text-accent">{s.value ?? ""}</span>
            <span className="truncate">{s.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
