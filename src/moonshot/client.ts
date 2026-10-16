import { encodeFunctionData, erc20Abi, toHex, type Hex } from "viem";
import { findWallet } from "@/moonshot/wallet";
import { PACK } from "./shared";
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`/api/public/moonshot/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({ error: "The server is unavailable." }));
  if (!r.ok) throw new Error(data.error || "Please try again.");
  return data as T;
}
export async function loginWallet(inApp: boolean) {
  const found = await findWallet(inApp);
  if (!found) throw new Error("Open MOONSHOT in a wallet browser or install a browser wallet.");
  const accounts = (await found.provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts[0]) throw new Error("No wallet account selected.");
  const n = await api<{ id: string; message: string }>("nonce", { address: accounts[0] });
  const signature = await found.provider.request({
    method: "personal_sign",
    params: [toHex(n.message), accounts[0]],
  });
  await api("wallet-login", { id: n.id, signature });
}
export async function loginFarcaster() {
  const { sdk } = await import("@farcaster/miniapp-sdk");
  const { token } = await sdk.quickAuth.getToken();
  await api("farcaster-login", { token });
}
export async function sendPackPayment(inApp: boolean, payer: string): Promise<string> {
  const found = await findWallet(inApp);
  if (!found) throw new Error("Open your wallet to continue.");
  const accounts = (await found.provider.request({ method: "eth_requestAccounts" })) as string[];
  if (accounts[0]?.toLowerCase() !== payer.toLowerCase())
    throw new Error("Switch to the wallet linked to this pilot before paying.");
  const chain = await found.provider.request({ method: "eth_chainId" });
  if (chain !== "0x2105")
    await found.provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x2105" }],
    });
  const confirmed = await found.provider.request({ method: "eth_chainId" });
  if (confirmed !== "0x2105") throw new Error("Select Base mainnet to continue.");
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [PACK.recipient, BigInt(PACK.units)],
  });
  const result = await found.provider.request({
    method: "eth_sendTransaction",
    params: [{ from: accounts[0], to: PACK.token, data, value: "0x0" }],
  });
  if (typeof result !== "string" || !/^0x[0-9a-f]{64}$/i.test(result))
    throw new Error("The wallet did not return a transaction hash.");
  return result;
}
export async function verifyRound(id: string, seed: string, commitment: string, crash: number) {
  const digest = async (s: string) =>
    Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))))
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
  const [commit, random] = await Promise.all([digest(`${id}:${seed}`), digest(seed)]);
  const r = parseInt(random.slice(0, 8), 16) / 2 ** 32;
  const expected = Math.max(
    1,
    Math.min(1000, Math.floor((r < 0.03 ? 1 : 0.97 / (1 - r)) * 100) / 100),
  );
  return commit === commitment && expected === crash;
}
