// The living hero's masks (docs/adr/0004): one RGBA PNG per texture, made from the picture itself so the shader only
// moves pixels the art already has. Reads the repo's own images with sharp (locked), makes no network calls, and writes
// only next to the image (Security 11/27, check 7). Designer checks every mask by eye before its phase ships.
//   R  sky weight: 1 in open sky, feathered to 0 above the ridge line (per column) and around the moon
//   G  stars: small bright points in the sky, as soft dots
//   B  water weight: below the horizon except the descriptor's `land` polygon, so the foreground never ripples
//   A  always 255. Fully transparent pixels can lose their RGB when a browser decodes the PNG (Safari, even with
//      premultiply off: Security 11/27), so the mask stays opaque. The city lights (phase 2) get their own texture.
// Usage: node scripts/hero-masks.mjs <descriptor.json>   (writes each variant's `mask` path, at half the texture width)
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const desc = JSON.parse(readFileSync(process.argv[2], "utf8"));
const local = (p) => {
  if (!/^\/[A-Za-z0-9._/-]+$/.test(p) || p.includes("//") || p.includes("..")) throw new Error(`hero-masks: bad path ${p}`);
  const out = resolve(join(ROOT, "public", p));
  if (!out.startsWith(join(ROOT, "public") + "/")) throw new Error(`hero-masks: ${p} leaves public/`);
  return out;
};
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

for (const v of desc.variants) {
  const { data, info } = await sharp(local(v.image)).removeAlpha().resize({ width: Math.round(v.size[0] / 2) }).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const L = new Float32Array(N), S = new Float32Array(N), warm = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    L[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    S[i] = mx ? (mx - mn) / mx : 0;
    warm[i] = r > 170 && g > 110 && b < 0.75 * r && r >= g ? 1 : 0;
  }
  const hz = Math.round(v.horizon * H);
  const mxp = v.moon.x * W, myp = v.moon.y * H, mr = v.moon.r * W;
  // Box blur of the luminance (for the mirror test), radius 4.
  const blur = (src, rad) => {
    const tmp = new Float32Array(N), out = new Float32Array(N);
    for (let y = 0; y < H; y++) { let s = 0; for (let x = -rad; x <= rad; x++) s += src[y * W + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) { tmp[y * W + x] = s / (2 * rad + 1); s += src[y * W + Math.min(W - 1, x + rad + 1)] - src[y * W + Math.max(0, x - rad)]; } }
    for (let x = 0; x < W; x++) { let s = 0; for (let y = -rad; y <= rad; y++) s += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) { out[y * W + x] = s / (2 * rad + 1); s += tmp[Math.min(H - 1, y + rad + 1) * W + x] - tmp[Math.max(0, y - rad) * W + x]; } }
    return out;
  };
  const Lb = blur(L, 4);
  // The shore: the descriptor's `land` polygon (fractions of the image, hand-traced once per picture; colour alone can't
  // tell night grass from water), feathered so the ripple fades out at the waterline.
  const landRaw = new Float32Array(N);
  if (Array.isArray(v.land) && v.land.length >= 3) {
    const P = v.land.map(([px, py]) => [px * W, py * H]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let inside = false;
      for (let a = 0, b = P.length - 1; a < P.length; b = a++) {
        const [xa, ya] = P[a], [xb, yb] = P[b];
        if ((ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
      }
      if (inside) landRaw[y * W + x] = 1;
    }
  }
  const land = blur(landRaw, 3);

  // Ridge line per column: the topmost snowy point (bright, unsaturated) between 25% and the horizon, then a running
  // minimum over ±3% of the width so gaps between peaks don't let the sky reach down into the haze.
  const ridge = new Float32Array(W).fill(Math.round(0.45 * H));
  for (let x = 0; x < W; x++) for (let y = Math.round(0.25 * H); y < hz; y++) {
    const i = y * W + x;
    if (L[i] > 150 && S[i] < 0.28 && Math.hypot(x - mxp, y - myp) > mr * 2.5) { ridge[x] = y; break; }
  }
  const span = Math.round(0.03 * W), ridgeMin = new Float32Array(W);
  for (let x = 0; x < W; x++) { let m = hz; for (let k = -span; k <= span; k++) m = Math.min(m, ridge[Math.min(W - 1, Math.max(0, x + k))]); ridgeMin[x] = m; }
  const soft = new Float32Array(W);
  for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let k = -span; k <= span; k++) { s += ridgeMin[Math.min(W - 1, Math.max(0, x + k))]; n++; } soft[x] = Math.min(ridgeMin[x], s / n); }
  ridgeMin.set(soft);

  const out = Buffer.alloc(N * 4);
  const feather = 0.04 * H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, o = i * 4;
    // R: open sky, fading to 0 a little above the ridge, and away from the moon and its halo.
    const dm = Math.hypot(x - mxp, y - myp);
    const sky = (1 - smooth(ridgeMin[x] - 2 * feather, ridgeMin[x] - feather / 2, y)) * smooth(mr * 1.6, mr * 2.6, dm);
    out[o] = Math.round(255 * sky);
    // B: water, below the horizon except the shore polygon, so the grass and rocks never ripple.
    if (y > hz + 1) out[o + 2] = Math.round(255 * smooth(hz + 1, hz + 4, y) * (1 - land[i]));
    out[o + 3] = 255;
  }
  // G: stars, small local maxima in open sky that stand out from their surroundings, drawn as 2 px soft dots.
  let stars = 0;
  for (let y = 2; y < hz; y++) for (let x = 2; x < W - 2; x++) {
    const i = y * W + x;
    if (out[i * 4] < 200 || L[i] < 120 || L[i] - Lb[i] < 35) continue;
    let peak = true;
    for (let dy = -2; dy <= 2 && peak; dy++) for (let dx = -2; dx <= 2; dx++) if ((dx || dy) && L[(y + dy) * W + x + dx] > L[i]) { peak = false; break; }
    if (!peak) continue;
    stars++;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const j = ((y + dy) * W + x + dx) * 4, w = Math.round(255 * Math.exp(-(dx * dx + dy * dy) / 2));
      out[j + 1] = Math.max(out[j + 1], w);
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile(local(v.mask));
  console.log(`hero-masks: ${v.mask} ${W}x${H}, horizon ${hz}px, ${stars} stars`);
}
