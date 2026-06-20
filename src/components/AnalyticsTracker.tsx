import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { captureRefFromUrl, track } from "@/lib/analytics";

export function AnalyticsTracker() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { address } = useAccount();

  useEffect(() => {
    captureRefFromUrl();
  }, []);

  useEffect(() => {
    void track("pageview", { path, wallet_address: address });
  }, [path, address]);

  return null;
}
