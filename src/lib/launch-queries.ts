import { queryOptions } from "@tanstack/react-query";
import { getResidentLaunches } from "./resident-launches.functions";

/** Shared Launch Hub feed query — used by the homepage and `/launches`. */
export const residentLaunchesQO = queryOptions({
  queryKey: ["resident", "launches"],
  queryFn: () => getResidentLaunches(),
  staleTime: 60_000,
});
