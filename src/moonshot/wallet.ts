export type WalletSource = "farcaster" | "browser";

export type WalletLink = {
  address: string | null;
  source: WalletSource | null;
  error: string | null;
};

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (accounts: unknown) => void) => void;
  removeListener?: (event: string, listener: (accounts: unknown) => void) => void;
};

type Found = { provider: Eip1193; source: WalletSource };

const empty: WalletLink = { address: null, source: null, error: null };

function firstAddress(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const address = value[0];
  return typeof address === "string" && address.startsWith("0x") ? address : null;
}

export function shortAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function injected(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  const eth = (window as Window & { ethereum?: Eip1193 }).ethereum;
  return eth?.request ? eth : null;
}

async function farcasterProvider(): Promise<Eip1193 | null> {
  const { sdk } = await import("@farcaster/miniapp-sdk");
  const provider = await Promise.race([
    sdk.wallet.getEthereumProvider(),
    new Promise<undefined>((resolve) => {
      setTimeout(() => resolve(undefined), 2500);
    }),
  ]);
  if (!provider || typeof provider.request !== "function") return null;
  return provider as Eip1193;
}

export async function findWallet(inMiniApp: boolean): Promise<Found | null> {
  if (inMiniApp) {
    try {
      const provider = await farcasterProvider();
      if (provider) return { provider, source: "farcaster" };
    } catch {
      /* the host has no wallet; try a browser wallet */
    }
  }
  const browser = injected();
  return browser ? { provider: browser, source: "browser" } : null;
}

export async function readWallet(inMiniApp: boolean): Promise<WalletLink> {
  const found = await findWallet(inMiniApp);
  if (!found) return empty;
  try {
    const accounts = await found.provider.request({ method: "eth_accounts" });
    return { address: firstAddress(accounts), source: found.source, error: null };
  } catch {
    return { address: null, source: found.source, error: null };
  }
}

export async function connectWallet(inMiniApp: boolean): Promise<WalletLink> {
  const found = await findWallet(inMiniApp);
  if (!found) {
    return {
      address: null,
      source: null,
      error: "No wallet here. Open it in the Base app, or use a browser wallet.",
    };
  }
  try {
    const accounts = await found.provider.request({ method: "eth_requestAccounts" });
    const address = firstAddress(accounts);
    if (!address) {
      return { address: null, source: found.source, error: "The wallet didn't return an account." };
    }
    return { address, source: found.source, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const cancelled = /reject|denied|cancel|4001/i.test(message);
    return {
      address: null,
      source: found.source,
      error: cancelled ? "Connection cancelled." : "Couldn't reach the wallet.",
    };
  }
}

export async function disconnectWallet(inMiniApp: boolean): Promise<void> {
  const found = await findWallet(inMiniApp);
  if (!found) return;
  try {
    await found.provider.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch {
    /* most wallets ignore this; the button still clears the address */
  }
}
