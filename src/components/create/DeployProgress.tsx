import { CheckCircle2, Circle, Loader2, XCircle, ExternalLink } from "lucide-react";

export type StepStatus = "pending" | "active" | "success" | "error";

export interface DeployStep {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
  hint?: string; // actionable suggestion on error
  txHash?: `0x${string}`;
  link?: { href: string; label: string };
}

export function DeployProgress({ steps, onRetry }: { steps: DeployStep[]; onRetry?: () => void }) {
  if (steps.length === 0) return null;
  const hasError = steps.some((s) => s.status === "error");
  const allDone = steps.every((s) => s.status === "success");

  return (
    <div
      className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">
          {allDone ? "Complete" : hasError ? "Failed" : "In Progress"}
        </span>
        {hasError && onRetry && (
          <button
            onClick={onRetry}
            className="text-[11px] font-bold uppercase tracking-widest text-accent hover:underline"
          >
            Retry
          </button>
        )}
      </div>

      <ol className="space-y-2.5">
        {steps.map((step) => (
          <li key={step.id} className="flex gap-3">
            <div className="mt-0.5 shrink-0">
              {step.status === "success" && <CheckCircle2 className="size-4 text-accent" />}
              {step.status === "active" && <Loader2 className="size-4 animate-spin text-white/80" />}
              {step.status === "error" && <XCircle className="size-4 text-destructive" />}
              {step.status === "pending" && <Circle className="size-4 text-white/20" />}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs font-medium ${
                  step.status === "pending"
                    ? "text-white/40"
                    : step.status === "error"
                      ? "text-destructive"
                      : "text-white/90"
                }`}
              >
                {step.label}
              </p>
              {step.detail && (
                <p className="mt-0.5 text-[11px] text-white/50 font-mono break-all">{step.detail}</p>
              )}
              {step.hint && step.status === "error" && (
                <p className="mt-1 text-[11px] text-white/70 bg-destructive/10 border border-destructive/30 rounded-lg px-2 py-1.5">
                  {step.hint}
                </p>
              )}
              {step.txHash && (
                <a
                  href={`https://basescan.org/tx/${step.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-accent hover:underline font-mono"
                >
                  View tx <ExternalLink className="size-3" />
                </a>
              )}
              {step.link && (
                <a
                  href={step.link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                >
                  {step.link.label} <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---- Error → human hint mapping ---------------------------------------------
export function explainError(err: unknown): { detail: string; hint: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const msg = raw.toLowerCase();

  if (msg.includes("user rejected") || msg.includes("user denied")) {
    return { detail: "Wallet signature rejected.", hint: "Approve the transaction in your wallet to continue." };
  }
  if (msg.includes("insufficient funds")) {
    return { detail: raw, hint: "Top up ETH on Base for gas, then retry." };
  }
  if (msg.includes("chain") && msg.includes("mismatch")) {
    return { detail: raw, hint: "Switch your wallet to Base mainnet (chain 8453)." };
  }
  if (msg.includes("api key") || msg.includes("unauthorized") || msg.includes("403")) {
    return { detail: raw, hint: "Zora API key is missing or invalid — contact support." };
  }
  if (msg.includes("failed to create content calldata") || msg.includes("postcreatecontent")) {
    return {
      detail: raw,
      hint: "Zora couldn't build the calldata. Check name/symbol are valid and try again in a moment.",
    };
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return { detail: raw, hint: "Network hiccup. Check your connection and retry." };
  }
  return { detail: raw.slice(0, 240), hint: "Unexpected error. Retry; if it persists, share this with support." };
}
