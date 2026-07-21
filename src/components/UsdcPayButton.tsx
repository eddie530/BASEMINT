import { useState } from "react";
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base } from "wagmi/chains";
import { Bitcoin, Check, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  PRO_TREASURY_ADDRESS,
  PRO_USDC_AMOUNT,
  PRO_USDC_UNITS,
  USDC_BASE_ADDRESS,
  USDC_TRANSFER_ABI,
} from "@/lib/usdc";
import { verifyUsdcPayment } from "@/lib/usdc-payments.functions";

type Status = "idle" | "switching" | "signing" | "confirming" | "verifying" | "done" | "error";

export function UsdcPayButton({ onUnlocked }: { onUnlocked?: () => void }) {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<Status>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);

  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: base.id,
    query: { enabled: !!txHash },
  });

  const handlePay = async () => {
    setError(null);
    if (!isConnected || !address) {
      toast.error("Connect a wallet first");
      return;
    }
    try {
      if (chainId !== base.id) {
        setStatus("switching");
        await switchChainAsync({ chainId: base.id });
      }
      setStatus("signing");
      const hash = await writeContractAsync({
        chainId: base.id,
        address: USDC_BASE_ADDRESS,
        abi: USDC_TRANSFER_ABI,
        functionName: "transfer",
        args: [PRO_TREASURY_ADDRESS as `0x${string}`, PRO_USDC_UNITS],
      });
      setTxHash(hash);
      setStatus("confirming");
      // wait for receipt via useWaitForTransactionReceipt effect below
      const poll = setInterval(async () => {
        if (receipt.isSuccess || receipt.isError) clearInterval(poll);
      }, 1500);
      // fallback: manual verify after 5s in case receipt hook hasn't ticked
      setTimeout(() => verify(hash, address), 6000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction rejected";
      setError(msg);
      setStatus("error");
    }
  };

  const verify = async (hash: `0x${string}`, from: string) => {
    if (status === "done" || status === "verifying") return;
    setStatus("verifying");
    try {
      const result = await verifyUsdcPayment({ data: { txHash: hash, fromAddress: from } });
      if ("error" in result) {
        setError(result.error);
        setStatus("error");
        return;
      }
      setStatus("done");
      toast.success("Resident Pro unlocked", {
        description: `Access until ${new Date(result.unlocksUntil).toLocaleDateString()}`,
      });
      onUnlocked?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
      setStatus("error");
    }
  };

  // When the receipt confirms, kick off verification.
  if (receipt.isSuccess && txHash && address && status === "confirming") {
    verify(txHash, address);
  }

  const label = () => {
    switch (status) {
      case "switching":
        return "Switching to Base…";
      case "signing":
        return "Sign in wallet…";
      case "confirming":
        return "Confirming on Base…";
      case "verifying":
        return "Verifying payment…";
      case "done":
        return "Pro unlocked";
      default:
        return `Pay ${PRO_USDC_AMOUNT} USDC on Base`;
    }
  };

  const busy = ["switching", "signing", "confirming", "verifying"].includes(status);

  return (
    <div className="space-y-2 w-full">
      <Button
        onClick={handlePay}
        disabled={busy || status === "done"}
        size="lg"
        variant="outline"
        className="w-full"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : status === "done" ? (
          <Check className="size-4" />
        ) : (
          <Bitcoin className="size-4" />
        )}
        {label()}
      </Button>
      {txHash && (
        <a
          href={`https://basescan.org/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary"
        >
          View on Basescan <ExternalLink className="size-3" />
        </a>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
