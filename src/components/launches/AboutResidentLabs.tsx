/** Short positioning statement for the Resident Labs ecosystem. */
export function AboutResidentLabs() {
  return (
    <section className="launch-rise space-y-3">
      <h2 className="font-display text-lg font-bold uppercase tracking-widest">
        About Resident Labs
      </h2>
      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
        <p className="text-sm leading-relaxed text-white/60">
          Resident Labs builds creator coins, AI tools, mini apps, and digital assets across Base
          and Solana.
        </p>
        <dl className="space-y-2 font-mono text-[11px]">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="uppercase tracking-widest text-white/40">BaseMint</dt>
            <dd className="truncate text-white/80">Launch platform</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="uppercase tracking-widest text-white/40">Resident Signal</dt>
            <dd className="truncate text-white/80">Community token</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
