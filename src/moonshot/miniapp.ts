export type MiniSession = {
  inApp: boolean;
  added: boolean;
  username: string | null;
  displayName: string | null;
  pfpUrl: string | null;
};

const empty: MiniSession = {
  inApp: false,
  added: false,
  username: null,
  displayName: null,
  pfpUrl: null,
};

export async function bootMiniApp(): Promise<MiniSession> {
  if (import.meta.env.SSR || typeof window === "undefined") return empty;
  try {
    const { sdk } = await import("@farcaster/miniapp-sdk");
    const inApp = await Promise.race([sdk.isInMiniApp(), new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1500))]);
    if (!inApp) return empty;
    await Promise.race([sdk.actions.ready({ disableNativeGestures: true }), new Promise<void>(resolve => setTimeout(resolve, 1500))]);
    const ctx = await sdk.context;
    const insets = ctx.client.safeAreaInsets;
    if (insets) {
      (document.querySelector<HTMLElement>(".moonshot-root") ?? document.documentElement).style.setProperty("--mini-top", `${insets.top}px`);
      (document.querySelector<HTMLElement>(".moonshot-root") ?? document.documentElement).style.setProperty("--mini-bottom", `${insets.bottom}px`);
    }
    return {
      inApp: true,
      added: ctx.client.added,
      username: ctx.user.username ?? null,
      displayName: ctx.user.displayName ?? null,
      pfpUrl: ctx.user.pfpUrl ?? null,
    };
  } catch {
    return empty;
  }
}

export async function saveMiniApp(): Promise<void> {
  const { sdk } = await import("@farcaster/miniapp-sdk");
  await sdk.actions.addMiniApp();
}

export async function shareMoonshot(text: string, inApp: boolean): Promise<void> {
  const url = window.location.origin;
  if (inApp) {
    const { sdk } = await import("@farcaster/miniapp-sdk");
    await sdk.actions.composeCast({ text, embeds: [url] });
    return;
  }
  const compose = new URL("https://warpcast.com/~/compose");
  compose.searchParams.set("text", text);
  compose.searchParams.append("embeds[]", url);
  window.open(compose.toString(), "_blank", "noopener,noreferrer");
}
