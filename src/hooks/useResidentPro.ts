import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getResidentStatus } from "@/lib/resident-v3.functions";

export function useResidentPro() {
  const getStatus = useServerFn(getResidentStatus);
  const account = useQuery({
    queryKey: ["resident-account"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
    staleTime: 15000,
    refetchOnWindowFocus: true,
  });
  const status = useQuery({
    queryKey: ["resident-v3-status", account.data?.id],
    queryFn: () => getStatus(),
    enabled: Boolean(account.data),
    staleTime: 5000,
    refetchInterval: 30000,
  });
  return {
    account: account.data,
    accountLoading: account.isPending,
    status,
    isPro: status.data?.isPro ?? false,
  };
}
