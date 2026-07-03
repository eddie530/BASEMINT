import { useState } from "react";
import { useSignMessage } from "wagmi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus, ExternalLink, ShieldCheck } from "lucide-react";
import {
  addProfileContract,
  listProfileContracts,
  removeProfileContract,
} from "@/lib/profile-contracts.functions";

const BASE_CHAIN_ID = 8453;
const addrRegex = /^0x[a-fA-F0-9]{40}$/;

export function ProfileContractsPanel({
  wallet,
  editable,
}: {
  wallet: string;
  editable: boolean;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["profile-contracts", wallet.toLowerCase()],
    queryFn: () => listProfileContracts({ data: { address: wallet } }),
  });

  const remove = useMutation({
    mutationFn: async (contract: string) => {
      // handled inside dialog for signature UX; not used here
      return contract;
    },
  });

  return (
    <div className="mt-8 border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-sm uppercase tracking-widest">
            Smart contracts
          </h2>
          <p className="text-[11px] text-white/50 mt-1">
            Verified contracts you own. Onchain activity attributed to your profile.
          </p>
        </div>
        {editable && (
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 inline-flex items-center gap-1 bg-accent text-accent-foreground px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest"
          >
            <Plus className="size-3.5" /> Add
          </button>
        )}
      </div>

      {list.isLoading ? (
        <p className="text-[11px] font-mono text-white/40">Loading…</p>
      ) : list.data && list.data.length > 0 ? (
        <ul className="divide-y divide-white/5">
          {list.data.map((c) => (
            <ContractRow
              key={`${c.chain_id}-${c.contract_address}`}
              wallet={wallet}
              contract={c.contract_address}
              chainId={c.chain_id}
              editable={editable}
              onRemoved={() =>
                qc.invalidateQueries({ queryKey: ["profile-contracts", wallet.toLowerCase()] })
              }
            />
          ))}
        </ul>
      ) : (
        <p className="text-[11px] font-mono text-white/40">No contracts tracked yet.</p>
      )}

      {remove.isError && (
        <p className="text-destructive text-xs font-mono">{(remove.error as Error).message}</p>
      )}

      {open && (
        <AddContractDialog
          wallet={wallet}
          onClose={() => setOpen(false)}
          onAdded={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["profile-contracts", wallet.toLowerCase()] });
          }}
        />
      )}
    </div>
  );
}

function ContractRow({
  wallet,
  contract,
  chainId,
  editable,
  onRemoved,
}: {
  wallet: string;
  contract: string;
  chainId: number;
  editable: boolean;
  onRemoved: () => void;
}) {
  const { signMessageAsync } = useSignMessage();
  const remove = useMutation({
    mutationFn: async () => {
      const message = `Basemint: remove contract ${contract.toLowerCase()} on chain ${chainId} from ${wallet.toLowerCase()} at ${new Date().toISOString()}`;
      const signature = await signMessageAsync({ message });
      return removeProfileContract({
        data: {
          ownerWallet: wallet,
          contractAddress: contract,
          chainId,
          message,
          signature,
        },
      });
    },
    onSuccess: onRemoved,
  });

  return (
    <li className="flex items-center gap-2 py-2.5">
      <ShieldCheck className="size-4 text-accent shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-mono text-white/80 truncate">{contract}</p>
        <p className="text-[10px] font-mono text-white/40">
          Base · chain {chainId}
        </p>
      </div>
      <a
        href={`https://basescan.org/address/${contract}`}
        target="_blank"
        rel="noreferrer"
        className="p-1.5 text-white/50 hover:text-white"
        aria-label="View on Basescan"
      >
        <ExternalLink className="size-3.5" />
      </a>
      {editable && (
        <button
          onClick={() => remove.mutate()}
          disabled={remove.isPending}
          className="p-1.5 text-white/50 hover:text-destructive disabled:opacity-40"
          aria-label="Remove contract"
        >
          <X className="size-4" />
        </button>
      )}
    </li>
  );
}

function AddContractDialog({
  wallet,
  onClose,
  onAdded,
}: {
  wallet: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { signMessageAsync } = useSignMessage();
  const [address, setAddress] = useState("");
  const [chainId] = useState<number>(BASE_CHAIN_ID);

  const add = useMutation({
    mutationFn: async () => {
      const contract = address.trim().toLowerCase();
      if (!addrRegex.test(contract)) throw new Error("Enter a valid 0x… contract address.");
      const message = `Basemint: link contract ${contract} on chain ${chainId} to ${wallet.toLowerCase()} at ${new Date().toISOString()}`;
      const signature = await signMessageAsync({ message });
      return addProfileContract({
        data: {
          ownerWallet: wallet,
          contractAddress: contract,
          chainId: chainId as 8453,
          message,
          signature,
        },
      });
    },
    onSuccess: onAdded,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card border-t sm:border border-white/10 sm:rounded-3xl rounded-t-3xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto sm:hidden h-1 w-10 rounded-full bg-white/20 -mt-1" />
        <div>
          <h3 className="font-display font-bold text-lg">Add smart contract</h3>
          <p className="text-xs text-white/50 mt-1">
            Add contracts to track this profile's onchain activity and impact. You must be the
            on-chain owner.
          </p>
        </div>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">
            Contract address
          </span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x…"
            spellCheck={false}
            autoCapitalize="off"
            className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent/50"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">
            Chain
          </span>
          <div className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80">
            Base mainnet
          </div>
        </label>

        {add.isError && (
          <p className="text-destructive text-xs font-mono">{(add.error as Error).message}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/15 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            onClick={() => add.mutate()}
            disabled={add.isPending || !address}
            className="px-5 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-bold uppercase tracking-widest disabled:opacity-60"
          >
            {add.isPending ? "Verifying…" : "Verify"}
          </button>
        </div>
      </div>
    </div>
  );
}
