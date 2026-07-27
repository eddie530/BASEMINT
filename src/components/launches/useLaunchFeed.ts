import { useEffect, useState } from "react";
import { draftToLaunch, readDrafts } from "@/lib/launch-drafts";
import type { ResidentLaunch } from "@/lib/resident-launches";

/**
 * Merges server launches with locally published wizard drafts.
 * Drafts are read after hydration to keep SSR output stable.
 */
export function useLaunchFeed(serverLaunches: ResidentLaunch[]): ResidentLaunch[] {
  const [drafts, setDrafts] = useState<ResidentLaunch[]>([]);

  useEffect(() => {
    setDrafts(readDrafts().map(draftToLaunch));
  }, []);

  const known = new Set(serverLaunches.map((l) => l.slug));
  return [...drafts.filter((d) => !known.has(d.slug)), ...serverLaunches].sort(
    (a, b) => new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime(),
  );
}
