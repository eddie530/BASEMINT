import { GROWTH, type Runtime } from "@/moonshot/game/types";
import { stampFor } from "@/moonshot/game/sim";
import { palette } from "@/moonshot/game/theme";

const LEVELS = [1.5, 2, 3, 5, 8, 10, 20, 50, 100, 200, 500];

function spawn(
  rt: Runtime,
  x: number,
  y: number,
  kind: 0 | 1,
  count: number,
  speed: number,
) {
  let left = count;
  for (const p of rt.particles) {
    if (left <= 0) break;
    if (p.on) continue;
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.65);
    p.on = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s - (kind === 0 ? 30 : 0);
    p.max = 0.4 + Math.random() * 0.45;
    p.life = p.max;
    p.size = 1.4 + Math.random() * 2.2;
    left--;
  }
}

function floatAt(rt: Runtime, text: string, x: number, y: number, kind: 0 | 1) {
  const f = rt.floaters.find((item) => !item.on);
  if (!f) return;
  f.on = true;
  f.text = text;
  f.x = x;
  f.y = y;
  f.max = 0.95;
  f.life = f.max;
  f.kind = kind;
}

export function renderFrame(canvas: HTMLCanvasElement, rt: Runtime): void {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  if (w < 2 || h < 2) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const bw = Math.max(1, Math.floor(w * dpr));
  const bh = Math.max(1, Math.floor(h * dpr));
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const c = palette();
  const shake = rt.shake && !rt.reduced ? rt.trauma * rt.trauma : 0;
  const ox = shake * 6 * Math.sin(rt.t * 42);
  const oy = shake * 4 * Math.sin(rt.t * 31 + 1.2);
  ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);

  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, c.washTop);
  wash.addColorStop(1, c.bg);
  ctx.fillStyle = wash;
  ctx.fillRect(-20, -20, w + 40, h + 40);

  for (const s of rt.stars) {
    ctx.globalAlpha = s.a * 0.35;
    ctx.fillStyle = c.bone;
    ctx.fillRect(s.x * w, s.y * h, s.r > 1 ? 1.5 : 1, s.r > 1 ? 1.5 : 1);
  }
  ctx.globalAlpha = 1;

  const top = Math.min(78, Math.max(28, h * 0.14));
  const plot = {
    x: 56,
    y: top,
    w: Math.max(10, w - 76),
    h: Math.max(10, h - top - 28),
  };
  const viewM = Math.max(1.2, rt.viewM);
  const viewT = Math.max(0.8, rt.viewT);
  const xOf = (t: number) => plot.x + (t / viewT) * plot.w;
  const yOf = (m: number) => {
    const n = (m - 1) / (viewM - 1);
    return plot.y + plot.h - n * plot.h;
  };

  ctx.fillStyle = c.ink;
  ctx.fillRect(plot.x, plot.y, plot.w, plot.h);
  ctx.strokeStyle = c.frame;
  ctx.lineWidth = 1;
  ctx.strokeRect(plot.x + 0.5, plot.y + 0.5, plot.w - 1, plot.h - 1);

  ctx.font = "11px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = c.muted;
  let lastLabelY = -999;
  const baseY = yOf(1);
  ctx.strokeStyle = c.baseline;
  ctx.beginPath();
  ctx.moveTo(plot.x, baseY);
  ctx.lineTo(plot.x + plot.w, baseY);
  ctx.stroke();
  ctx.fillText("1.00", plot.x - 10, baseY);

  ctx.strokeStyle = c.grid;
  for (let i = 1; i < 4; i++) {
    const x = plot.x + (plot.w * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
  }

  for (const level of LEVELS) {
    if (level >= viewM) continue;
    const y = yOf(level);
    if (y < plot.y + 8 || y > plot.y + plot.h - 8) continue;
    if (Math.abs(y - lastLabelY) < 18) continue;
    lastLabelY = y;
    ctx.strokeStyle = c.grid;
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
    ctx.fillStyle = c.muted;
    ctx.fillText(level >= 10 ? String(level) : level.toFixed(1), plot.x - 10, y);
  }

  if (rt.auto != null) {
    const y = yOf(rt.auto);
    if (y > plot.y && y < plot.y + plot.h) {
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = c.auto;
      ctx.beginPath();
      ctx.moveTo(plot.x, y);
      ctx.lineTo(plot.x + plot.w, y);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = c.lime;
      ctx.textAlign = "left";
      ctx.fillText(`AUTO ${rt.auto.toFixed(2)}`, plot.x + 10, y - 10);
      ctx.textAlign = "right";
    }
  }

  const ghost = rt.phase === "idle";
  const tEnd = ghost ? 0 : Math.max(0.02, rt.elapsed);
  const steps = 120;
  const rugTone = rt.result === "rug" && !ghost;
  const stroke = rugTone ? c.danger : c.lime;

  const sample = (i: number, cap: number) => {
    if (ghost) {
      const u = i / steps;
      return {
        x: plot.x + u * plot.w * 0.96,
        y: plot.y + plot.h - u * u * plot.h * 0.84,
      };
    }
    const t = (tEnd * i) / steps;
    const raw = Math.exp(GROWTH * t);
    const m = rt.phase === "arming" ? raw : Math.min(cap, raw);
    return { x: xOf(Math.min(t, viewT)), y: yOf(Math.min(m, viewM)) };
  };

  const head = sample(steps, rt.phase === "arming" ? Number.POSITIVE_INFINITY : rt.mult);
  const hx = head.x;
  const hy = head.y;

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const p = sample(i, rt.phase === "arming" ? Number.POSITIVE_INFINITY : rt.crashAt);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(hx, yOf(1));
  ctx.lineTo(xOf(0), yOf(1));
  ctx.closePath();
  const y0 = Number.isFinite(hy) ? Math.min(hy, plot.y) : plot.y;
  const y1 = yOf(1);
  if (Number.isFinite(y0) && Number.isFinite(y1) && Math.abs(y1 - y0) > 0.5) {
    const fill = ctx.createLinearGradient(0, y0, 0, y1);
    fill.addColorStop(0, rugTone ? c.fillRug : ghost ? c.fillGhost : c.fillTop);
    fill.addColorStop(1, c.fillEnd);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const p = sample(i, rt.phase === "arming" ? Number.POSITIVE_INFINITY : rt.mult);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = stroke;
  ctx.globalAlpha = ghost ? 0.45 : 0.35;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = ghost ? 2.25 : 2.5;
  ctx.stroke();
  ctx.globalAlpha = 1;

  const prev = sample(Math.max(0, steps - 4), Infinity);
  const ang = Math.atan2(hy - prev.y, hx - prev.x);

  if (rt.fx === 1) {
    spawn(rt, hx, hy, 0, 36, 260);
    floatAt(rt, rt.floaterText, hx, hy - 16, 0);
    rt.fx = 0;
  } else if (rt.fx === 2) {
    spawn(rt, hx, hy, 1, 48, 340);
    floatAt(rt, rt.floaterText, hx, hy - 16, 1);
    rt.fx = 0;
  }

  if (rt.phase === "flying" && !rt.reduced && rt.t - rt.lastExhaust > 0.04) {
    rt.lastExhaust = rt.t;
    spawn(rt, hx, hy, 0, 1, 50);
  }

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(Number.isFinite(ang) ? ang : 0);
  const stretch = rt.phase === "arming" ? 0.82 : 1 + Math.min(0.22, (rt.mult - 1) * 0.03);
  ctx.scale(stretch, 1 / stretch);
  ctx.beginPath();
  ctx.moveTo(11, 0);
  ctx.lineTo(-1, 5.5);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-1, -5.5);
  ctx.closePath();
  ctx.fillStyle = c.ink;
  ctx.fill();
  ctx.lineWidth = 1.75;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-1, 0, 1.6, 0, Math.PI * 2);
  ctx.fillStyle = stroke;
  ctx.fill();
  ctx.restore();

  for (const p of rt.particles) {
    if (!p.on) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.kind === 1 ? c.danger : c.lime;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const f of rt.floaters) {
    if (!f.on) continue;
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.font = "600 13px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = f.kind === 1 ? c.danger : c.lime;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  const stamp = stampFor(rt);
  if (stamp && (rt.phase === "impact" || rt.phase === "result")) {
    ctx.save();
    ctx.translate(plot.x + plot.w * 0.62, plot.y + plot.h * 0.42);
    ctx.rotate(-0.06);
    const size = Math.min(68, plot.w * 0.16);
    ctx.font = `italic ${size}px 'Instrument Serif', Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1;
    ctx.strokeStyle = c.ink;
    ctx.strokeText(stamp, 0, 0);
    ctx.fillStyle = rt.result === "rug" ? c.danger : c.lime;
    ctx.globalAlpha = 0.92;
    ctx.fillText(stamp, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.2, w * 0.5, h * 0.5, h * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, c.vignette);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  if (rt.flash > 0) {
    ctx.globalAlpha = Math.min(0.22, rt.flash * 0.22);
    ctx.fillStyle = rt.result === "cash" ? c.lime : c.danger;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
}
