import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { shareCast } from "@/lib/farcaster-share";
import { cn } from "@/lib/utils";

interface ShareRowProps {
  text: string;
  url: string;
  className?: string;
  compact?: boolean;
}

/** One-click Farcaster + X sharing and copy-to-clipboard for a launch URL. */
export function ShareRow({ text, url, className, compact }: ShareRowProps) {
  const [copied, setCopied] = useState(false);

  async function onFarcaster() {
    await shareCast({ text, embeds: [url] });
  }

  function onX() {
    const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  const base = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 font-bold uppercase tracking-widest hover:border-accent/40 transition",
    compact ? "px-2 py-2 text-[9px]" : "py-3 text-xs",
  );

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      <button onClick={onFarcaster} className={base} aria-label="Share on Farcaster">
        <Share2 className="size-3.5 shrink-0" /> Cast
      </button>
      <button onClick={onX} className={base} aria-label="Share on X">
        <span className="font-display text-sm leading-none">𝕏</span> Post
      </button>
      <button onClick={onCopy} className={base} aria-label="Copy launch link">
        {copied ? <Check className="size-3.5 shrink-0" /> : <Copy className="size-3.5 shrink-0" />}
        {copied ? "Copied" : "Link"}
      </button>
    </div>
  );
}
