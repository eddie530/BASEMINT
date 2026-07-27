import { createServerFn } from "@tanstack/react-start";

export interface LaunchReadiness {
  ready: boolean;
  /** Human-readable names of missing server credentials/config. */
  missing: string[];
}

/**
 * Reports whether the server has everything needed to build a real
 * Zora create-coin transaction. The wizard shows a setup screen (never a
 * fake success) when something is missing.
 */
export const getLaunchReadiness = createServerFn({ method: "GET" }).handler(
  async (): Promise<LaunchReadiness> => {
    const missing: string[] = [];
    if (!process.env.ZORA_API_KEY) missing.push("ZORA_API_KEY (Zora Coins API key)");
    return { ready: missing.length === 0, missing };
  },
);
