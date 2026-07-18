import { createFileRoute } from "@tanstack/react-router";
import { MiniAppShell } from "@/components/MiniAppShell";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "Resident AI — Resident Labs" },
      {
        name: "description",
        content:
          "Resident AI — onchain guidance and token insights for Base. Educational only, not financial advice.",
      },
      { property: "og:title", content: "Resident AI" },
      {
        property: "og:description",
        content: "Onchain guidance and token insights for Base.",
      },
    ],
  }),
  component: AIPage,
});

function AIPage() {
  return (
    <MiniAppShell>
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-accent font-mono">
          Resident AI
        </p>
        <h1 className="font-display font-bold text-3xl tracking-tight">AI</h1>
        <p className="text-white/60 text-sm">
          Ask about Base, wallets, launches, and how Resident Labs modules work.
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center">
        <Sparkles className="mx-auto size-9 text-accent mb-3" strokeWidth={2} />
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono mb-2">
          Interface not yet available
        </p>
        <p className="text-sm text-white/70">
          The Resident AI chat is being connected to a backend. When it launches, responses will
          be clearly labeled as AI-generated and will never execute trades or transactions on
          your behalf without explicit confirmation.
        </p>
      </section>

      <p className="text-[11px] text-white/40 leading-relaxed">
        Resident AI is educational. It does not provide personalized financial advice, guarantee
        outcomes, or auto-sign transactions.
      </p>
    </MiniAppShell>
  );
}
