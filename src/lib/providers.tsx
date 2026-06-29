import { useEffect, useState, useCallback, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { CDPReactProvider } from "@coinbase/cdp-react";
import { wagmiConfig, cdpConfig } from "./wagmi";

/**
 * Tiny event bus so any UI (e.g. AppHeader) can open the CDP sign-in
 * dialog without prop drilling. Subscribers receive `true` when the
 * dialog should be opened.
 */
type Listener = () => void;
const openListeners = new Set<Listener>();

export function openCdpSignIn() {
  openListeners.forEach((l) => l());
}

const cdpTheme: Partial<Record<string, string>> = {
  "colors-bg-primary": "#0a0a0a",
  "colors-bg-secondary": "#0a0a0a",
  "colors-fg-primary": "#ffffff",
  "colors-fg-secondary": "rgba(255,255,255,0.6)",
  "colors-line-primary": "rgba(255,255,255,0.1)",
};

export function Web3Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { sdk } = await import("@farcaster/miniapp-sdk");
        if (!cancelled) await sdk.actions.ready();
      } catch {
        // running outside of a Farcaster client
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasCdp = Boolean(cdpConfig.projectId);

  const tree = <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;

  if (!hasCdp) return tree;

  return (
    <CDPReactProvider config={cdpConfig} theme={cdpTheme}>
      {tree}
      <CdpSignInPortal />
    </CDPReactProvider>
  );
}

/**
 * Renders the CDP `<SignIn />` flow inside a modal. The CDP wagmi
 * connector auto-connects as soon as sign-in completes, so we just
 * need to host the UI and close on success.
 */
function CdpSignInPortal() {
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => setOpen(true), []);
  useEffect(() => {
    openListeners.add(handleOpen);
    return () => {
      openListeners.delete(handleOpen);
    };
  }, [handleOpen]);

  if (!open) return null;
  return <CdpSignInModal onClose={() => setOpen(false)} />;
}

function CdpSignInModal({ onClose }: { onClose: () => void }) {
  // Lazy import so the SignIn bundle is only fetched when needed.
  const [Mod, setMod] = useState<null | {
    SignIn: React.ComponentType<{ onSuccess?: () => void }>;
  }>(null);

  useEffect(() => {
    let cancelled = false;
    import("@coinbase/cdp-react").then((m) => {
      if (!cancelled) setMod({ SignIn: m.SignIn as never });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {Mod ? (
          <Mod.SignIn onSuccess={onClose} />
        ) : (
          <p className="py-12 text-center text-sm text-white/60">Loading…</p>
        )}
        <button
          onClick={onClose}
          className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-xs uppercase tracking-widest text-white/60 hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
