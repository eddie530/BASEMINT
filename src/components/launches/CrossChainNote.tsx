import { Link } from "@tanstack/react-router";

/** Explains why the hub spans Base and Solana. */
export function CrossChainNote() {
  return (
    <section className="launch-rise rounded-2xl border border-accent/25 bg-accent/5 p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
        Cross-chain ecosystem
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/70">
        Resident Labs is building across <span className="text-white">Base</span> and{" "}
        <span className="text-white">Solana</span>. BaseMint powers creator launches on Base,
        while Resident Signal is our live community token on Solana.
      </p>
      <Link
        to="/community"
        className="mt-3 inline-flex font-mono text-[10px] uppercase tracking-widest text-accent"
      >
        Visit the Community page →
      </Link>
    </section>
  );
}
