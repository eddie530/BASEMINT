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
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {STATS.map((s) => (
          <li key={s.label} className="flex items-baseline gap-1.5 font-mono text-xs text-white/70">
            {s.value && <span className="text-accent">{s.value}</span>}
            <span className="truncate">{s.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
