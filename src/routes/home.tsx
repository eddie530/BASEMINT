import { createFileRoute, Link } from "@tanstack/react-router";
import { MiniAppShell } from "@/components/MiniAppShell";
import { RESIDENT_NAV } from "@/lib/nav";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — Resident Labs" },
      {
        name: "description",
        content:
          "Resident Labs — discover, create, play, and earn across the Base ecosystem. BaseMint + SpinBase in one app.",
      },
      { property: "og:title", content: "Home — Resident Labs" },
      {
        property: "og:description",
        content: "Discover, create, play, and earn across the Base ecosystem.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <MiniAppShell>
      <header className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-accent font-mono">
          Built on Base
        </p>
        <h1 className="font-display font-bold text-3xl md:text-4xl tracking-tight">
          Welcome to Resident Labs
        </h1>
        <p className="text-white/60 text-sm md:text-base">
          Discover, create, play, and earn on Base.
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono mb-3">
          Full dashboard shipping next
        </p>
        <p className="text-sm text-white/70">
          The Home dashboard — wallet summary, quick actions, trending, and recent activity — is
          coming online. In the meantime, jump straight into any module below.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {RESIDENT_NAV.filter((n) => n.to !== "/home").map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group rounded-2xl border border-white/10 bg-black/40 p-4 hover:border-accent/40 transition"
          >
            <div className="size-9 rounded-xl bg-accent/15 grid place-items-center text-accent mb-3 group-hover:bg-accent/25 transition">
              <item.icon className="size-4" strokeWidth={2.4} />
            </div>
            <p className="font-bold text-sm">{item.label}</p>
            {item.hint ? (
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono mt-0.5">
                {item.hint}
              </p>
            ) : null}
          </Link>
        ))}
      </section>
    </MiniAppShell>
  );
}
