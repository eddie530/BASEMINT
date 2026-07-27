import { createServerFn } from "@tanstack/react-start";
import type { ResidentLaunch } from "./resident-launches";

/** Launch Hub feed: curated config hydrated + auto-populated from live Zora data. */
export const getResidentLaunches = createServerFn({ method: "GET" }).handler(
  async (): Promise<ResidentLaunch[]> => {
    const { loadResidentLaunches } = await import("./resident-launches.server");
    return loadResidentLaunches();
  },
);
