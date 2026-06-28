import { useCallback, useState } from "react";
import { useAccount, useBalance, usePublicClient, useReadContract, useWalletClient } from "wagmi";
import { erc20Abi, formatEther, parseEther, parseUnits, maxUint256 } from "viem";
import { Loader2, X } from "lucide-react";
import { DeployProgress, explainError, type DeployStep } from "@/components/create/DeployProgress";
import { useConnectWallet } from "@/lib/use-connect-wallet";

type Side = "buy" | "sell";

export function TradeDialog({
  side,
  coinAddress,
  coinSymbol,
  onClose,
}: {
  side: Side;
  coinAddress: `0x${string}`;
  coinSymbol: string;
  onClose: () => void;
}) {
  const { address, isConnected, chainId } = useAccount();
  const { connectWallet, message: connectMessage } = useConnectWallet();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const { data: ethBal } = useBalance({ address, query: { enabled: Boolean(address) } });
  const { data: coinRawBal } = useReadContract({
    address: coinAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const { data: coinDecimals } = useReadContract({
    address: coinAddress,
    abi: erc20Abi,
    functionName: "decimals",
  });
  const coinBal = {
    value: (coinRawBal as bigint | undefined) ?? 0n,
    decimals: (coinDecimals as number | undefined) ?? 18,
  };

  const [amount, setAmount] = useState("");
  const [steps, setSteps] = useState<DeployStep[]>([]);
  const [busy, setBusy] = useState(false);

  const update = useCallback((id: string, patch: Partial<DeployStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const inSymbol = side === "buy" ? "ETH" : coinSymbol;
  const outSymbol = side === "buy" ? coinSymbol : "ETH";
  const inBalance =
    side === "buy"
      ? ethBal
        ? Number(formatEther(ethBal.value)).toFixed(5)
        : "0"
      : (Number(coinBal.value) / 10 ** coinBal.decimals).toString();

  async function run() {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!walletClient || !publicClient || !address) return;
    const amt = amount.trim();
    if (!amt || Number(amt) <= 0) {
      setSteps([{ id: "validate", label: `Enter an ${inSymbol} amount.`, status: "error" }]);
      return;
    }

    const init: DeployStep[] = [
      { id: "chain", label: "Connect to Base mainnet", status: "pending" },
      { id: "quote", label: "Fetch quote from Zora", status: "pending" },
      ...(side === "sell"
        ? [{ id: "approve", label: "Approve token spend", status: "pending" as const }]
        : []),
      { id: "sign", label: "Sign & broadcast swap", status: "pending" },
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

      // 2. quote
      update("quote", { status: "active" });
      const decimals = side === "buy" ? 18 : (coinBal?.decimals ?? 18);
      let amountInWei: bigint;
      try {
        amountInWei = side === "buy" ? parseEther(amt as `${number}`) : parseUnits(amt, decimals);
      } catch {
        update("quote", { status: "error", detail: "Invalid amount." });
        return;
      }

      let prep;
      try {
        const { prepareTradeCall } = await import("@/lib/zora-trade.functions");
        prep = await prepareTradeCall({
          data: {
            side,
            coinAddress,
            sender: address,
            amountIn: amountInWei.toString(),
            slippage: 0.05,
            chainId: 8453,
          },
        });
      } catch (e) {
        const { detail, hint } = explainError(e);
        update("quote", { status: "error", detail, hint });
        return;
      }
      const outDecimals = side === "buy" ? (coinBal?.decimals ?? 18) : 18;
      const outAmt = Number(prep.amountOut) / 10 ** outDecimals;
      update("quote", {
        status: "success",
        detail: `~${outAmt.toFixed(6)} ${outSymbol} (slip ${(prep.slippage * 100).toFixed(1)}%)`,
      });

      // 3. approve if sell
      if (side === "sell") {
        update("approve", { status: "active" });
        try {
          const allowance = (await publicClient.readContract({
            address: coinAddress,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, prep.call.target],
          })) as bigint;
          if (allowance < amountInWei) {
            const approveHash = await walletClient.writeContract({
              address: coinAddress,
              abi: erc20Abi,
              functionName: "approve",
              args: [prep.call.target, maxUint256],
            });
            await publicClient.waitForTransactionReceipt({ hash: approveHash });
            update("approve", { status: "success", txHash: approveHash });
          } else {
            update("approve", { status: "success", detail: "Already approved." });
          }
        } catch (e) {
          const { detail, hint } = explainError(e);
          update("approve", { status: "error", detail, hint });
          return;
        }
      }

      // 4. sign / broadcast
      update("sign", { status: "active" });
      let hash: `0x${string}`;
      try {
        hash = await walletClient.sendTransaction({
          to: prep.call.target,
          data: prep.call.data,
          value: BigInt(prep.call.value),
        });
      } catch (e) {
        const { detail, hint } = explainError(e);
        update("sign", { status: "error", detail, hint });
        return;
      }
      update("sign", { status: "success", txHash: hash });

      // 5. confirm
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
        detail: `Swapped ${amt} ${inSymbol} → ~${outAmt.toFixed(6)} ${outSymbol}`,
      });

      try {
        const { track } = await import("@/lib/analytics");
        void track("trade", { wallet_address: address, coin_address: coinAddress });
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
            {side === "buy" ? "Buy" : "Sell"} {coinSymbol}
          </h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white p-1"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/40 font-mono">
            <span>You pay ({inSymbol})</span>
            <button
              type="button"
              onClick={() => setAmount(side === "buy" ? String(inBalance) : String(inBalance))}
              className="text-accent hover:underline"
            >
              Bal: {inBalance}
            </button>
          </div>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
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
          {!isConnected
            ? "Connect Wallet"
            : busy
              ? "Working…"
              : allDone
                ? "Done"
                : side === "buy"
                  ? `Buy ${coinSymbol}`
                  : `Sell ${coinSymbol}`}
        </button>

        {connectMessage && <p className="text-xs text-white/60">{connectMessage}</p>}

        <DeployProgress steps={steps} onRetry={run} />

        <p className="text-[10px] text-white/40 text-center">
          Powered by Zora · routed on Base · ~5% max slippage
        </p>
      </div>
    </div>
  );
}
