import type { SpinResult } from "@/lib/spin/segments";

export function WinModal({
  result,
  onClose,
}: {
  result: SpinResult | null;
  onClose: () => void;
}) {
  if (!result) return null;
  const { reward, isJackpot, isMultiplier, isMystery, segment, multiplierActivated } = result;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-black to-zinc-900 p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {isMultiplier ? (
          <>
            <p className="text-5xl mb-2">🎰</p>
            <p className="text-[10px] uppercase tracking-widest text-fuchsia-300 font-mono mb-2">
              Multiplier locked in
            </p>
            <p className="font-display font-black text-4xl mb-1">{multiplierActivated}×</p>
            <p className="text-white/60 text-sm">Your next spin's reward is multiplied.</p>
          </>
        ) : reward > 0 ? (
          <>
            <p className="text-5xl mb-2">{isJackpot ? "💰" : isMystery ? "🎁" : "✨"}</p>
            <p className="text-[10px] uppercase tracking-widest text-amber-300 font-mono mb-2">
              {isJackpot ? "JACKPOT" : isMystery ? "Mystery reveal" : "You won"}
            </p>
            <p className="font-display font-black text-5xl mb-1 bg-gradient-to-r from-amber-300 to-pink-400 bg-clip-text text-transparent">
              {reward.toLocaleString()}
            </p>
            <p className="text-white/60 text-sm">
              SPIN added to your balance{isMystery ? ` (${segment.label})` : ""}.
            </p>
          </>
        ) : (
          <>
            <p className="text-5xl mb-2">🎯</p>
            <p className="font-display font-bold text-2xl">Almost!</p>
            <p className="text-white/60 text-sm">Give it another spin.</p>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-white text-black py-3 text-xs font-bold uppercase tracking-widest"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
