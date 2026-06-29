import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { encodeFunctionData } from "viem";
import { Loader2, X } from "lucide-react";
import { DeployProgress, explainError, type DeployStep } from "@/components/create/DeployProgress";
import { useConnectWallet } from "@/lib/use-connect-wallet";
import { sendSponsoredOrFallback } from "@/lib/sponsored-tx";

/**
 * MintDialog — purchase / collect flow for a Zora ERC-1155 edition.
 * Mirrors TradeDialog's UX: chain switch → prepare → sign → confirm,
 * surfaced through the shared DeployProgress component.
 */
export function MintDialog({
  collectionAddress,
  tokenId = 1n,
  title,
  onClose,
}: {
  collectionAddress: `0x${string}`;
  tokenId?: bigint;
  title: string;
  onClose: () => void;
}) {
  const { address, isConnected, chainId, connector } = useAccount();
  const { connectWallet, message: connectMessage } = useConnectWallet();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [quantity, setQuantity] = useState("1");
  const [steps, setSteps] = useState<DeployStep[]>([]);
  const [busy, setBusy] = useState(false);

  const update = useCallback((id: string, patch: Partial<DeployStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  async function run() {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!walletClient || !publicClient || !address) return;
    const qty = Math.max(1, Math.floor(Number(quantity) || 0));
    if (qty <= 0) {
      setSteps([{ id: "validate", label: "Enter a valid quantity.", status: "error" }]);
      return;
    }

    const init: DeployStep[] = [
      { id: "chain", label: "Connect to Base mainnet", status: "pending" },
      { id: "prepare", label: "Prepare mint from Zora 1155", status: "pending" },
      { id: "sign", label: "Sign & broadcast mint", status: "pending" },
      { id: "confirm", label: "Confirm on Base", status: "pending" },
    ];
    setSteps(init);
    setBusy(true);

    try {
      // 1. chain
      update("chain", { status: "active" });
      if (chainId !== 8453) {
        try {
          await walletClient.switchChain({ id: 8453 });
        } catch (e) {
          const { detail, hint } = explainError(e);
          update("chain", { status: "error", detail, hint });
          return;
        }
      }
      update("chain", { status: "success", detail: "Base mainnet (8453)" });

      // 2. prepare via Zora protocol-sdk
      update("prepare", { status: "active" });
      let parameters;
      try {
        const { createCollectorClient } = await import("@zoralabs/protocol-sdk");
        const collectorClient = createCollectorClient({
          chainId: 8453,
          publicClient: publicClient as unknown as Parameters<
            typeof createCollectorClient
          >[0]["publicClient"],
        });
        const res = await collectorClient.mint({
          tokenContract: collectionAddress,
          mintType: "1155",
          tokenId,
          quantityToMint: qty,
          minterAccount: address as `0x${string}`,
        });
        parameters = res.parameters;
      } catch (e) {
        const { detail, hint } = explainError(e);
        update("prepare", { status: "error", detail, hint });
        return;
      }
      update("prepare", { status: "success", detail: `Qty ${qty} · token #${tokenId.toString()}` });

      // 3. sign / broadcast
      update("sign", { status: "active" });
      let hash: `0x${string}`;
      try {
        hash = await walletClient.writeContract(parameters);
      } catch (e) {
        const { detail, hint } = explainError(e);
        update("sign", { status: "error", detail, hint });
        return;
      }
      update("sign", { status: "success", txHash: hash });

      // 4. confirm
      update("confirm", { status: "active" });
      try {
        await publicClient.waitForTransactionReceipt({ hash });
      } catch (e) {
        const { detail, hint } = explainError(e);
        update("confirm", { status: "error", detail, hint });
        return;
      }
      update("confirm", {
        status: "success",
        txHash: hash,
        detail: `Minted ${qty} × ${title}`,
        link: {
          href: `https://basescan.org/address/${collectionAddress}`,
          label: "View collection",
        },
      });

      try {
        const { track } = await import("@/lib/analytics");
        void track("mint", { wallet_address: address, coin_address: collectionAddress });
      } catch {
        /* noop */
      }
    } finally {
      setBusy(false);
    }
  }

  const allDone = steps.length > 0 && steps.every((s) => s.status === "success");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-3xl border border-white/10 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg uppercase tracking-wider">
            Collect Edition
          </h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white p-1"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="text-sm text-white/70 truncate">{title}</p>

        <div className="space-y-2">
          <label className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/40 font-mono">
            <span>Quantity</span>
            <span>Token #{tokenId.toString()}</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={busy}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 font-display text-2xl focus:outline-none focus:border-accent disabled:opacity-50"
          />
        </div>

        <button
          onClick={run}
          disabled={busy || allDone}
          className="w-full bg-accent text-accent-foreground py-4 rounded-2xl font-bold uppercase tracking-widest text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {!isConnected ? "Connect Wallet" : busy ? "Minting…" : allDone ? "Done" : "Mint"}
        </button>

        {connectMessage && <p className="text-xs text-white/60">{connectMessage}</p>}

        <DeployProgress steps={steps} onRetry={run} />

        <p className="text-[10px] text-white/40 text-center">
          Powered by Zora Protocol · ERC-1155 on Base
        </p>
      </div>
    </div>
  );
}
