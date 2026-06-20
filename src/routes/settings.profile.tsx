import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useAccount } from "wagmi";
import { MiniAppShell } from "@/components/MiniAppShell";
import { getProfile, upsertProfile } from "@/lib/profiles.functions";
import { useMutation, useQuery } from "@tanstack/react-query";

const searchSchema = z.object({ address: z.string().optional() });

export const Route = createFileRoute("/settings/profile")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Edit Profile · Basemint" },
      { name: "description", content: "Edit your creator profile on Basemint." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsProfile,
});

function SettingsProfile() {
  const navigate = useNavigate();
  const { address: connected } = useAccount();
  const { address: searchAddress } = Route.useSearch();
  const wallet = searchAddress ?? connected ?? null;

  const profileQuery = useQuery({
    queryKey: ["profile", wallet?.toLowerCase()],
    queryFn: () => getProfile({ data: { address: wallet! } }),
    enabled: Boolean(wallet),
  });

  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    avatar_url: "",
    twitter: "",
    farcaster: "",
    website: "",
  });

  useEffect(() => {
    const p = profileQuery.data;
    if (p) {
      setForm({
        display_name: p.display_name ?? "",
        bio: p.bio ?? "",
        avatar_url: p.avatar_url ?? "",
        twitter: p.twitter ?? "",
        farcaster: p.farcaster ?? "",
        website: p.website ?? "",
      });
    }
  }, [profileQuery.data]);

  const mutation = useMutation({
    mutationFn: () =>
      upsertProfile({
        data: {
          address: wallet!,
          display_name: form.display_name || null,
          bio: form.bio || null,
          avatar_url: form.avatar_url || null,
          twitter: form.twitter || null,
          farcaster: form.farcaster || null,
          website: form.website || null,
        },
      }),
    onSuccess: () => {
      if (wallet) navigate({ to: "/profile/$address", params: { address: wallet } });
    },
  });

  if (!wallet) {
    return (
      <MiniAppShell>
        <div className="mt-12 text-center">
          <p className="text-white/60 text-sm">Connect your wallet to edit your profile.</p>
        </div>
      </MiniAppShell>
    );
  }

  return (
    <MiniAppShell>
      <h1 className="font-display font-bold text-2xl uppercase">Edit profile</h1>
      <p className="text-[11px] font-mono text-white/40 break-all">{wallet}</p>

      <div className="space-y-4">
        <Field label="Display name" value={form.display_name} onChange={(v) => setForm((s) => ({ ...s, display_name: v }))} />
        <Field label="Bio" value={form.bio} onChange={(v) => setForm((s) => ({ ...s, bio: v }))} multiline />
        <Field label="Avatar URL" value={form.avatar_url} onChange={(v) => setForm((s) => ({ ...s, avatar_url: v }))} />
        <Field label="Twitter handle" value={form.twitter} onChange={(v) => setForm((s) => ({ ...s, twitter: v }))} />
        <Field label="Farcaster handle" value={form.farcaster} onChange={(v) => setForm((s) => ({ ...s, farcaster: v }))} />
        <Field label="Website" value={form.website} onChange={(v) => setForm((s) => ({ ...s, website: v }))} />
      </div>

      {mutation.isError && (
        <p className="text-destructive text-xs font-mono">{(mutation.error as Error).message}</p>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full bg-accent text-accent-foreground py-4 rounded-2xl font-bold uppercase tracking-widest text-sm disabled:opacity-60"
      >
        {mutation.isPending ? "Saving…" : "Save profile"}
      </button>

      <p className="text-[10px] text-white/40 font-mono leading-relaxed">
        Anyone with this wallet can update its profile. For higher trust, wire wallet-signature
        verification into the upsert server fn.
      </p>
    </MiniAppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent/50"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent/50"
        />
      )}
    </label>
  );
}
