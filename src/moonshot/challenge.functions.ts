import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Challenge } from "./shared";

/** Public, read-only: resolves a challenge only if it is a real successful (cashed) flight. */
export const getChallengeMeta = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().max(64) }).parse(d))
  .handler(async ({ data }): Promise<{ origin: string; challenge: Challenge | null }> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { publicChallenge, originOf } = await import("./server/api.server");
    const origin = originOf(getRequest());
    try {
      return { origin, challenge: await publicChallenge(data.id, origin) };
    } catch {
      return { origin, challenge: null };
    }
  });
