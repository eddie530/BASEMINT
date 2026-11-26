import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Sparkles, ArrowUp, Loader2, Crown } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { Button } from "@/components/ui/button";
import { useResidentPro } from "@/hooks/useResidentPro";
import { askResidentAI } from "@/lib/resident-v3.functions";
import { residentHead } from "@/lib/resident-head";
export const Route = createFileRoute("/ai")({
  head: () =>
    residentHead(
      "Resident AI Copilot · BaseMint",
      "Interactive Base ecosystem research, token analysis, public wallet insights and market summaries. Educational, with no autonomous trading.",
    ),
  component: AIPage,
});
function AIPage() {
  const { account, status, isPro } = useResidentPro();
  const { address } = useAccount();
  const ask = useServerFn(askResidentAI);
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>(
    [],
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  async function send() {
    if (!input.trim() || busy || !account) return;
    const next = [...messages, { role: "user" as const, content: input.trim() }].slice(-8);
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const result = await ask({
        data: {
          requestId: crypto.randomUUID(),
          messages: next.map((message) => ({
            ...message,
            content: message.content.slice(0, 2000),
          })),
          ...(address ? { wallet: address } : {}),
        },
      });
      if (result.answer) {
        setMessages([...next, { role: "assistant", content: result.answer }]);
        setSources(result.sources);
      } else {
        setError(result.error);
        setInput(next.at(-1)?.content ?? "");
      }
    } catch {
      setError("Could not send your message. Your input is preserved.");
      setInput(next.at(-1)?.content ?? "");
    } finally {
      setBusy(false);
      await queryClient.invalidateQueries({ queryKey: ["resident-v3-status"] });
    }
  }
  return (
    <MiniAppShell>
      <header className="space-y-3">
        <p className="text-xs font-mono uppercase text-accent flex gap-2 items-center">
          <Sparkles className="size-4" /> Resident Labs intelligence
        </p>
        <h1 className="font-display text-3xl font-bold">Resident AI Copilot</h1>
        <p className="text-sm text-muted-foreground">
          Base research. Token context. A clearer view of your wallet.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="font-mono">
            {isPro ? "PRO" : "FREE"} · {status.data?.used ?? 0} / {status.data?.limit ?? 5} requests
            today
          </span>
          <Link to="/pro" className="text-accent flex gap-1 items-center">
            <Crown className="size-3" /> Resident Pro
          </Link>
        </div>
      </header>
      <section className="border-y border-border py-5 space-y-5" aria-live="polite">
        {!messages.length ? (
          <>
            <p className="font-semibold">What’s on your radar?</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Summarize the Base market",
                "Analyze token liquidity risks",
                "Explain the Base ecosystem",
                "Review my public wallet balance",
              ].map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  className="h-auto min-h-16 whitespace-normal text-left justify-start"
                  onClick={() => setInput(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </>
        ) : (
          messages.map((m, i) => (
            <article
              key={i}
              className={m.role === "user" ? "border-l-2 border-accent pl-4" : "py-2"}
            >
              <p className="text-xs font-mono text-muted-foreground mb-2">
                {m.role === "user" ? "YOU" : "RESIDENT AI · AI-GENERATED"}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">{m.content}</p>
            </article>
          ))
        )}
        {busy && (
          <p className="text-accent text-sm flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Researching…
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </section>
      {sources.length > 0 && (
        <p className="text-xs text-muted-foreground">Context sources: {sources.join(" · ")}</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="space-y-3"
      >
        <label htmlFor="resident-prompt" className="text-xs text-muted-foreground">
          Your question
        </label>
        <div className="flex gap-2 items-end">
          <textarea
            id="resident-prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            rows={3}
            className="flex-1 min-w-0 rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send question"
            disabled={
              busy ||
              !account ||
              !input.trim() ||
              (status.data ? status.data.used >= status.data.limit : true)
            }
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <ArrowUp />
          </Button>
        </div>
        {!account && (
          <p className="text-sm text-muted-foreground">
            An existing Resident account is required for AI requests. Wallet connection alone is not
            account sign-in.
          </p>
        )}
      </form>
      <p className="text-xs text-muted-foreground">
        Educational, not financial advice. No trades, approvals or transaction signing. Public
        wallet lookups do not verify ownership. Free: 5 requests/day; Pro: 50. Allowances reset at
        00:00 UTC; failed attempts count.
      </p>
    </MiniAppShell>
  );
}
