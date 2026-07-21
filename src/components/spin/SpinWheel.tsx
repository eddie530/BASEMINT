import { useMemo, useRef, useState } from "react";
import { SEGMENTS, SEG_ANGLE, type SpinResult } from "@/lib/spin/segments";

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 148;

function polar(angleDeg: number, r: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + r * Math.cos(a), CENTER + r * Math.sin(a)];
}

/** SVG pie-slice path for segment index i, starting at 12 o'clock. */
function segmentPath(i: number): string {
  const start = i * SEG_ANGLE;
  const end = start + SEG_ANGLE;
  const [x1, y1] = polar(start, RADIUS);
  const [x2, y2] = polar(end, RADIUS);
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2} Z`;
}

interface Props {
  disabled?: boolean;
  pendingMultiplier: number;
  /** Server-authoritative resolver — returns the SpinResult to animate to. */
  resolve: () => Promise<SpinResult>;
  onResult: (r: SpinResult) => void;
  onError?: (e: unknown) => void;
}

export function SpinWheel({ disabled, pendingMultiplier, resolve, onResult, onError }: Props) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const paths = useMemo(() => SEGMENTS.map((_, i) => segmentPath(i)), []);

  async function spin() {
    if (spinning || disabled) return;
    setSpinning(true);

    let result: SpinResult;
    try {
      result = await resolve();
    } catch (e) {
      setSpinning(false);
      onError?.(e);
      return;
    }

    const winIdx = result.index;
    const centerAngle = winIdx * SEG_ANGLE + SEG_ANGLE / 2;
    const fullSpins = 6 + Math.floor(Math.random() * 4);
    const target = fullSpins * 360 + (360 - centerAngle);
    const base = rotation - (rotation % 360);
    const final = base + target;
    setRotation(final);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSpinning(false);
      onResult(result);
    }, 4700);
  }


  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE + 24 }}>
      {/* Pointer */}
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 -top-1 z-20"
        style={{
          width: 0,
          height: 0,
          borderLeft: "14px solid transparent",
          borderRight: "14px solid transparent",
          borderTop: "22px solid #fbbf24",
          filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.6))",
        }}
      />

      {/* Wheel */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="block"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning
            ? "transform 4.6s cubic-bezier(0.15, 0.85, 0.15, 1)"
            : "none",
          filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.6))",
        }}
      >
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 6} fill="#18181b" />
        {SEGMENTS.map((seg, i) => {
          const mid = i * SEG_ANGLE + SEG_ANGLE / 2;
          const [tx, ty] = polar(mid, RADIUS * 0.65);
          return (
            <g key={i}>
              <path d={paths[i]} fill={seg.color} stroke="#0a0a0a" strokeWidth={3} />
              <g transform={`translate(${tx} ${ty}) rotate(${mid})`}>
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={seg.label.length > 4 ? 11 : 14}
                  fontWeight={800}
                  fill="white"
                  style={{ letterSpacing: 0.4 }}
                >
                  {seg.label}
                </text>
              </g>
            </g>
          );
        })}
        <circle cx={CENTER} cy={CENTER} r={26} fill="#0a0a0a" stroke="#fbbf24" strokeWidth={3} />
        <text
          x={CENTER}
          y={CENTER + 4}
          textAnchor="middle"
          fontSize={11}
          fontWeight={900}
          fill="#fbbf24"
          style={{ letterSpacing: 1 }}
        >
          SPIN
        </text>
      </svg>

      {/* Spin button */}
      <button
        onClick={spin}
        disabled={spinning || disabled}
        className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-fuchsia-500 text-black font-bold py-3.5 text-sm uppercase tracking-widest shadow-[0_0_40px_-10px_#f472b6] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {spinning ? "Spinning…" : pendingMultiplier > 1 ? `Spin (${pendingMultiplier}× active)` : "Spin"}
      </button>
    </div>
  );
}
