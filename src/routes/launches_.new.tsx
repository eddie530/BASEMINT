import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, Upload } from "lucide-react";
import { MiniAppShell } from "@/components/MiniAppShell";
import { FeaturedLaunchHero } from "@/components/launches/FeaturedLaunchHero";
import { ShareRow } from "@/components/launches/ShareRow";
import {
  draftToLaunch,
  saveDraft,
  slugify,
  socialPost,
  type LaunchDraft,
} from "@/lib/launch-drafts";
import {
  LAUNCH_COLLECTIONS,
  collectionLabel,
  launchUrl,
  type LaunchCollection,
} from "@/lib/resident-launches";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/launches_/new")({
  head: () => ({
    meta: [
      { title: "New Launch — Resident Labs Launch Wizard" },
      {
        name: "description",
        content:
          "Stage a Resident Labs creator coin release: artwork, name, ticker, description, collection, preview, publish, and social post.",
      },
      { property: "og:title", content: "New Launch — Resident Labs Launch Wizard" },
      {
        property: "og:description",
        content: "Create a consistent Resident Labs creator coin launch in seven steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LaunchWizard,
});

const STEPS = [
  "Artwork",
  "Name",
  "Ticker",
  "Description",
  "Collection",
  "Preview",
  "Publish",
] as const;

const inputCls =
  "w-full rounded-xl border border-white/10 bg-black/50 px-3 py-3 text-sm outline-none placeholder:text-white/25 focus:border-accent/50";

function LaunchWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [collection, setCollection] = useState<LaunchCollection>("Signals");
  const [published, setPublished] = useState<LaunchDraft | null>(null);
  const [copied, setCopied] = useState(false);

  const draft = useMemo<LaunchDraft>(
    () => ({
      slug: slugify(name || ticker || "launch"),
      name: name || "Untitled Resident Launch",
      ticker: (ticker || "TBD").toUpperCase(),
      collection,
      description: description || "A new Resident Labs creator coin on Base.",
      image,
      tags: ["residentlabs", "base", collection.toLowerCase()],
      launchDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    }),
    [name, ticker, collection, description, image],
  );

  const preview = useMemo(() => draftToLaunch(draft), [draft]);
  const post = socialPost(draft);

  const canAdvance =
    (step === 0 && Boolean(image)) ||
    (step === 1 && name.trim().length > 1) ||
    (step === 2 && ticker.trim().length > 0) ||
    (step === 3 && description.trim().length > 9) ||
    step === 4 ||
    step === 5 ||
    step === 6;

  function onFile(file?: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  function publish() {
    saveDraft(draft);
    setPublished(draft);
    setStep(6);
  }

  async function copyPost() {
    try {
      await navigator.clipboard.writeText(post);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  return (
    <MiniAppShell>
      <header className="space-y-1">
        <Link
          to="/launches"
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-white/40"
        >
          <ArrowLeft className="size-3" /> Launch Hub
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight">New Launch</h1>
        <p className="text-sm text-white/60">
          Seven steps to a consistent Resident Labs release.
        </p>
      </header>

      <ol className="grid grid-cols-7 gap-1">
        {STEPS.map((s, i) => (
          <li key={s} className="space-y-1">
            <div
              className={cn(
                "h-1 rounded-full",
                i <= step ? "bg-accent" : "bg-white/10",
              )}
            />
            <p className="truncate font-mono text-[8px] uppercase tracking-widest text-white/35">
              {s}
            </p>
          </li>
        ))}
      </ol>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-4">
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest">
              Upload artwork
            </h2>
            <label className="flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.02]">
              {image ? (
                <img src={image} alt="Launch artwork preview" className="h-full w-full object-cover" />
              ) : (
                <span className="inline-flex flex-col items-center gap-2 text-white/40">
                  <Upload className="size-6" />
                  <span className="font-mono text-[10px] uppercase tracking-widest">
                    Choose image
                  </span>
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest">Coin name</h2>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Resident Labs // SIGNAL-002"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest">Ticker</h2>
            <input
              className={cn(inputCls, "font-mono uppercase")}
              value={ticker}
              maxLength={12}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="SIG002"
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest">
              Description
            </h2>
            <textarea
              className={cn(inputCls, "min-h-32 resize-y leading-relaxed")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this release documents…"
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest">Collection</h2>
            <div className="grid gap-2">
              {LAUNCH_COLLECTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCollection(c)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left text-sm font-bold",
                    collection === c
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-white/10 bg-white/[0.02] text-white/70",
                  )}
                >
                  {collectionLabel(c)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest">
              Preview launch page
            </h2>
            <FeaturedLaunchHero launch={preview} />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest">
              {published ? "Published" : "Publish"}
            </h2>
            {published ? (
              <>
                <p className="inline-flex items-center gap-2 text-sm text-accent">
                  <Check className="size-4" /> {published.name} is listed in the Launch Hub.
                </p>
                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    Social post
                  </p>
                  <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-3 text-xs leading-relaxed text-white/70">
                    {post}
                  </pre>
                  <button
                    onClick={copyPost}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest"
                  >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? "Copied" : "Copy post"}
                  </button>
                  <ShareRow url={launchUrl(preview)} text={post} />
                </div>
                <button
                  onClick={() => navigate({ to: "/launches" })}
                  className="w-full rounded-2xl bg-accent py-3 text-sm font-bold uppercase tracking-widest text-accent-foreground"
                >
                  Open Launch Hub
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-white/60">
                  Publishing lists {draft.name} (${draft.ticker}) in{" "}
                  {collectionLabel(draft.collection)} as “Coming soon”.
                </p>
                <button
                  onClick={publish}
                  className="w-full rounded-2xl bg-accent py-4 text-sm font-bold uppercase tracking-widest text-accent-foreground"
                >
                  Publish launch
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {!published && (
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-30"
          >
            Back
          </button>
          <button
            disabled={!canAdvance || step === STEPS.length - 1}
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-accent py-3 text-xs font-bold uppercase tracking-widest text-accent-foreground disabled:opacity-30"
          >
            Next <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}
    </MiniAppShell>
  );
}
