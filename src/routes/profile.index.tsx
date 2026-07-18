import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import { MiniAppShell } from "@/components/MiniAppShell";
import { useConnectWallet } from "@/lib/use-connect-wallet";
import { User } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Resident Labs" },
      {
        name: "description",
        content: "Your Resident ID — wallet, points, activity, and settings.",
      },
      { property: "og:title", content: "Profile — Resident Labs" },
      {
        property: "og:description",
        content: "Your Resident ID — wallet, points, activity, and settings.",
      },
    ],
  }),
  component: ProfileShortcut,
});

function ProfileShortcut() {
  const { address, isConnected } = useAccount();
  const { connectWallet, isPending, message } = useConnectWallet();
  const navigate = useNavigate();

  // When a wallet is connected, jump to the canonical profile route so
  // we don't duplicate profile rendering. Existing /profile/$address stays intact.
  useEffect(() => {
    if (isConnected && address) {
      navigate({ to: "/profile/$address", params: { address }, replace: true });
    }
  }, [isConnected, address, navigate]);

  return (
    <MiniAppShell>
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-accent font-mono">Resident ID</p>
        <h1 className="font-display font-bold text-3xl tracking-tight">Profile</h1>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center">
        <User className="mx-auto size-9 text-accent mb-3" strokeWidth={2} />
        <p className="text-sm text-white/70 mb-5">
          Connect a wallet to view your Resident ID, points, saved assets, and recent activity.
        </p>
        <button
          onClick={() => connectWallet()}
          disabled={isPending}
          className="rounded-full bg-accent text-accent-foreground px-6 py-2.5 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
        >
          {isPending ? "Connecting…" : "Connect wallet"}
        </button>
        {message ? (
          <p className="mt-3 text-[11px] text-white/50">{message}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/40 p-4">
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono mb-2">
          Also available
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/settings/profile"
            className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest text-white/70 hover:bg-white/5"
          >
            Edit profile
          </Link>
          <Link
            to="/points"
            className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest text-white/70 hover:bg-white/5"
          >
            Points
          </Link>
          <Link
            to="/leaderboard"
            className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest text-white/70 hover:bg-white/5"
          >
            Leaderboard
          </Link>
        </div>
      </section>
    </MiniAppShell>
  );
}
