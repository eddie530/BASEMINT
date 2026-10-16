/**
 * Dependency-free PNG rasterizer for MOONSHOT share cards.
 * Runs on Cloudflare Workers (uses only typed arrays + CompressionStream).
 */
import type { Challenge } from "../shared";

type RGB = [number, number, number];
const G: Record<string, string> = {
  A: ".###.|#...#|#...#|#####|#...#|#...#|#...#", B: "####.|#...#|#...#|####.|#...#|#...#|####.",
  C: ".###.|#...#|#....|#....|#....|#...#|.###.", D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
  E: "#####|#....|#....|####.|#....|#....|#####", F: "#####|#....|#....|####.|#....|#....|#....",
  G: ".###.|#...#|#....|#.###|#...#|#...#|.####", H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
  I: ".###.|..#..|..#..|..#..|..#..|..#..|.###.", J: "..###|...#.|...#.|...#.|...#.|#..#.|.##..",
  K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#", L: "#....|#....|#....|#....|#....|#....|#####",
  M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#", N: "#...#|#...#|##..#|#.#.#|#..##|#...#|#...#",
  O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.", P: "####.|#...#|#...#|####.|#....|#....|#....",
  Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#", R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
  S: ".####|#....|#....|.###.|....#|....#|####.", T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
  U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.", V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
  W: "#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.", X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
  Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..", Z: "#####|....#|...#.|..#..|.#...|#....|#####",
  "0": ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.", "1": "..#..|.##..|..#..|..#..|..#..|..#..|.###.",
  "2": ".###.|#...#|....#|...#.|..#..|.#...|#####", "3": "#####|...#.|..#..|...#.|....#|#...#|.###.",
  "4": "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.", "5": "#####|#....|####.|....#|....#|#...#|.###.",
  "6": "..##.|.#...|#....|####.|#...#|#...#|.###.", "7": "#####|....#|...#.|..#..|.#...|.#...|.#...",
  "8": ".###.|#...#|#...#|.###.|#...#|#...#|.###.", "9": ".###.|#...#|#...#|.####|....#|...#.|.##..",
  ".": ".....|.....|.....|.....|.....|.##..|.##..", "·": ".....|.....|.....|.##..|.##..|.....|.....",
  "/": "....#|....#|...#.|..#..|.#...|#....|#....", "×": ".....|#...#|.#.#.|..#..|.#.#.|#...#|.....",
  "?": ".###.|#...#|....#|...#.|..#..|.....|..#..", "-": ".....|.....|.....|#####|.....|.....|.....",
  "!": "..#..|..#..|..#..|..#..|..#..|.....|..#..", ":": ".....|.##..|.##..|.....|.##..|.##..|.....",
  "'": "..#..|..#..|.#...|.....|.....|.....|.....", ",": ".....|.....|.....|.....|.##..|..#..|.#...",
  _: ".....|.....|.....|.....|.....|.....|#####", "#": ".#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.",
  "…": ".....|.....|.....|.....|.....|.....|#.#.#",
  " ": ".....|.....|.....|.....|.....|.....|.....",
};
const GLYPHS = Object.fromEntries(Object.entries(G).map(([k, v]) => [k, v.split("|")]));

/** Uppercase, strip accents, map unsupported characters to "?". */
export function cardText(s: string) {
  return [...s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()]
    .map((c) => (GLYPHS[c] ? c : "?"))
    .join("");
}

class Canvas {
  px: Uint8Array;
  constructor(public w: number, public h: number) {
    this.px = new Uint8Array(w * h * 3);
  }
  rect(x: number, y: number, w: number, h: number, c: RGB) {
    const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.w, Math.floor(x + w)), y1 = Math.min(this.h, Math.floor(y + h));
    for (let j = y0; j < y1; j++)
      for (let i = x0; i < x1; i++) {
        const o = (j * this.w + i) * 3;
        this.px[o] = c[0]; this.px[o + 1] = c[1]; this.px[o + 2] = c[2];
      }
  }
  disc(cx: number, cy: number, r: number, c: RGB) {
    for (let j = -r; j <= r; j++) {
      const half = Math.floor(Math.sqrt(r * r - j * j));
      this.rect(cx - half, cy + j, half * 2 + 1, 1, c);
    }
  }
  text(x: number, y: number, s: string, scale: number, c: RGB) {
    let cx = x;
    for (const ch of cardText(s)) {
      GLYPHS[ch].forEach((row, j) => {
        for (let i = 0; i < 5; i++) if (row[i] === "#") this.rect(cx + i * scale, y + j * scale, scale, scale, c);
      });
      cx += 6 * scale;
    }
  }
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  v.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
async function deflate(raw: Uint8Array) {
  const stream = new Blob([raw as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
export async function encodePng(c: Canvas) {
  const raw: Uint8Array<ArrayBuffer> = new Uint8Array((c.w * 3 + 1) * c.h);
  for (let y = 0; y < c.h; y++) {
    raw[y * (c.w * 3 + 1)] = 0;
    raw.set(c.px.subarray(y * c.w * 3, (y + 1) * c.w * 3), y * (c.w * 3 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, c.w); v.setUint32(4, c.h);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", await deflate(raw)),
    chunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** 1200×630 for og:image, 1200×800 (3:2) for Farcaster embeds. */
export async function shareCardPng(ch: Challenge, format: "og" | "embed" = "og") {
  const W = 1200, H = format === "embed" ? 800 : 630;
  const c = new Canvas(W, H);
  const fg: RGB = [240, 244, 255], dim: RGB = [154, 168, 187], blue: RGB = [71, 133, 255];
  c.rect(0, 0, W, H, [8, 11, 19]);
  for (let y = 130; y < H - 60; y += 130) c.rect(70, y, W - 140, 2, [24, 37, 54]);
  for (let x = 300; x < W; x += 300) c.rect(x, 90, 2, H - 170, [24, 37, 54]);
  const [x0, y0, cx, cy, x1, y1] = [80, H - 110, 620, H - 100, W - 80, 110];
  for (let t = 0; t <= 1; t += 0.0015) {
    const a = (1 - t) ** 2, b = 2 * (1 - t) * t, d = t * t;
    c.disc(Math.round(a * x0 + b * cx + d * x1), Math.round(a * y0 + b * cy + d * y1), 3, blue);
  }
  c.disc(x1, y1, 12, blue);
  c.text(75, 60, "MOONSHOT / DAILY FLIGHT", 5, fg);
  c.text(75, 150, `${ch.multiplier.toFixed(2)}×`, 18, fg);
  c.text(80, 310, `BANKED BY ${ch.name.slice(0, 24)}`, 4, fg);
  c.text(80, 360, "CAN YOU BEAT THIS FLIGHT?", 4, dim);
  c.text(80, H - 70, `${ch.day} · VERIFIED ROUND · PLAY MONEY`, 3, dim);
  return encodePng(c);
}
