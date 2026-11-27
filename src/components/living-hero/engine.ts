// The living hero's engine (docs/adr/0004): one WebGL1 fragment shader over the page's own picture, moved only inside the
// regions of its mask (R sky, G stars, B water). Every effect is zero at t = 0, so the first frame is the image and the
// canvas can fade in over it unseen. Loaded on idle by LivingHero.tsx, only after every capability check passed.
// Security 11/27: same-origin textures only, no network of its own, nothing logged or sent, no renderer string read,
// the mask uploaded raw (no premultiply, no colorspace conversion), fixed loop bounds, context loss and slow frames end it
// for the session, nothing allocated in the frame loop.
import { pickVariant, shownImage, type Descriptor, type Variant } from "./descriptor";

export const VS = `attribute vec2 a; uniform vec2 uRes; varying vec2 vP;
void main(){ vP = vec2((a.x*0.5+0.5)*uRes.x, (0.5-a.y*0.5)*uRes.y); gl_Position = vec4(a,0.0,1.0); }`;

// uA/uB map canvas CSS pixels to the picture's uv (the same cover-fit and object-position as the <img>); uRes is the
// band in CSS pixels (highp: the vertex shader shares it). uSky: the clear sky; uWind, uCover: the procedural clouds' drift and
// coverage; uOcc: cloud over the moon (CPU, lagged); uRip, uK, uW:
// the water ripple; uHz: the horizon; uSize: the plate size, for per-star cells; uTex/uMin: the downscale taps.
export const FS = `precision mediump float;
uniform sampler2D uImg, uMask, uSky; uniform highp vec2 uRes; uniform vec2 uA, uB, uSize, uTex; uniform float uT, uHz, uRip, uK, uW, uMin, uMr, uAsp, uOcc, uWind, uCover; uniform vec2 uRipple, uMoon, uRing, uRingR;
varying vec2 vP;
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p), u=f*f*f*(f*(f*6.0-15.0)+10.0);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x), u.y); }
// Fractal noise, fixed octave counts (bounded cost per pixel).
float fbm3(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a*noise(p); p = p*2.02 + vec2(1.7, 9.2); a *= 0.5; } return s/0.875; }
float fbm5(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a*noise(p); p = p*2.03 + vec2(5.1, 1.3); a *= 0.5; } return s/0.96875; }
// The picture at q; when it's shown smaller than its file, 4 fixed taps match the browser's smooth downscale.
vec3 tap(vec2 q){ q = clamp(q, 0.0, 1.0); vec3 c = texture2D(uImg, q).rgb;
  if (uMin > 0.5) { vec2 o = uTex*0.25;
    c = 0.25*(texture2D(uImg, q+vec2(-o.x,-o.y)).rgb + texture2D(uImg, q+vec2(o.x,-o.y)).rgb + texture2D(uImg, q+vec2(-o.x,o.y)).rgb + texture2D(uImg, q+vec2(o.x,o.y)).rgb); }
  return c; }
// Positions in "plate pixels at a 1280 px wide picture", the unit every ceiling uses.
vec2 px(vec2 uv){ return vec2(uv.x*1280.0, uv.y*1280.0/uAsp); }
// The ring ripple: centre, radius and strength come from the CPU once per frame; pixels away from the ring skip it.
vec2 ring(vec2 uv){
  if (uRingR.y <= 0.0) return vec2(0.0);
  vec2 q = px(uv) - px(uRing); q.y *= 4.0;
  float dist = length(q);
  if (abs(dist - uRingR.x) > 16.0) return vec2(0.0);
  float x = (dist - uRingR.x)/5.0;
  vec2 dir = q/max(dist, 0.001); dir.y /= 4.0;
  return vec2(dir.x/1280.0, dir.y*uAsp/1280.0) * 3.0 * exp(-x*x) * uRingR.y;
}
// Procedural clouds (Rod 11/27: "i want purely procedural clouds"): domain-warped fractal noise, stretched about 2.6:1,
// drifting with the wind and slowly changing shape, so they never tile or repeat. Returns density (0..1) and how lit it
// is from the upper right, where the moon is (Designer's palette and light, living-hero-assets/README.md).
vec2 clouds(vec2 uv){
  vec2 p = px(uv)/1280.0*vec2(2.2, 5.6) - vec2(uT*uWind, 0.0);
  vec2 q = vec2(fbm3(p + vec2(0.0, uT*0.010)), fbm3(p + vec2(5.2, 1.3) - vec2(uT*0.008, 0.0)));
  vec2 w = p + 1.4*q;
  float d = fbm5(w);
  float dl = fbm5(w + vec2(0.06, -0.08));
  float dens = smoothstep(0.58 - 0.24*uCover, 0.80 - 0.24*uCover, d);
  return vec2(dens, clamp(0.55 + (d - dl)*5.0, 0.0, 1.0));
}
vec3 cloudColor(vec2 cl, vec2 uv){
  vec3 body = mix(vec3(0.051,0.180,0.412), vec3(0.247,0.412,0.647), cl.y);       // #0d2e69 to #3f69a5
  body = mix(body, vec3(0.200,0.184,0.467), 0.22*(1.0 - cl.y));                  // violet shadow #332f77
  body = mix(body, vec3(0.459,0.596,0.765), 0.85*cl.y*cl.y);                     // pale rim #7598c3
  float nearMoon = exp(-length(px(uv) - px(uMoon))/(7.0*uMr*1280.0));
  return mix(body, vec3(0.749,0.882,0.976), 0.6*nearMoon*cl.y);                   // brightest rims near the moon #bfe1f9
}
void main(){
  vec2 uv = vP*uA + uB;
  vec4 m = texture2D(uMask, uv);
  // Sky (above the horizon): the clear sky, the plate's own stars twinkling in place, procedural clouds over them. The
  // sky mask fades this to the picture at the ridge; over the moon the clouds alone are drawn, with their own alpha.
  if (uv.y <= uHz) {
    float rp = uMr*1280.0, dm = length(px(uv) - px(uMoon));
    float overMoon = (1.0 - m.r) * (1.0 - smoothstep(2.4*rp, 3.0*rp, dm));
    if (m.r < 0.002 && overMoon < 0.002) { gl_FragColor = vec4(0.0); return; }
    vec2 cl = clouds(uv);
    vec3 cc = cloudColor(cl, uv);
    vec3 base = texture2D(uSky, uv).rgb;
    // Aurora glow (saturated hues in the clear sky): a travelling brightness wave, within ±8 %, never a colour shift.
    float hi = max(base.r, max(base.g, base.b)), lo = min(base.r, min(base.g, base.b));
    float aur = smoothstep(0.35, 0.6, hi > 0.0 ? (hi-lo)/hi : 0.0);
    base *= 1.0 + 0.08*aur*0.5*(sin(6.2831853*uT/23.0 + uv.x*6.0) - sin(uv.x*6.0));
    // Stars: the plate's own star pixels, each twinkling on its own 4 to 9 s period.
    float T = 4.0 + 5.0*hash(floor(uv*uSize/16.0));
    vec3 star = texture2D(uImg, uv).rgb * (1.0 - 0.2*(1.0 - cos(6.2831853*uT/T)));
    base = mix(base, max(base, star), m.g);
    vec3 skyc = mix(base, cc, cl.x*0.92);
    float ac = 0.5 * cl.x * overMoon; // a moonlit veil over the moon, never a dark blot (density at most 0.5)
    gl_FragColor = vec4(skyc*m.r + cc*ac, m.r + ac);
    return;
  }
  // Water: a long horizontal shimmer, plus ripples (Rod 11/27: "make ripples in water"), a few directional waves in
  // perspective moving toward the viewer, and the ring ripple. Each term is zero at t = 0. Only computed on water.
  vec2 d = vec2(0.0);
  float glint = 0.0;
  if (m.b > 0.002) {
    float k = (uv.y-uHz)/(1.0-uHz); float wp = uv.y*uK;
    d.x += m.b * uRip * k * (sin(wp+uT*uW) - sin(wp));
    vec2 p = vec2((uv.x - 0.5)*uSize.x/uSize.y / (k + 0.08), 1.0/(k + 0.08)) * 6.0;
    vec2 g = vec2(0.0);
    vec2 k1 = vec2(0.31, 1.0), k2 = vec2(-0.47, 0.83), k3 = vec2(0.12, 1.37);
    g += k1 * (cos(dot(k1,p) + uT*1.30 + 0.7) - cos(dot(k1,p) + 0.7));
    g += 0.6 * k2 * (cos(dot(k2,p)*1.7 + uT*1.90 + 2.1) - cos(dot(k2,p)*1.7 + 2.1));
    g += 0.4 * k3 * (cos(dot(k3,p)*2.9 + uT*2.70 + 4.3) - cos(dot(k3,p)*2.9 + 4.3));
    d += m.b * g * k * uRipple;
    if (uv.x > 0.3) d += m.b * ring(uv);
    glint = m.b * k * (g.y * 0.5);
  }
  vec3 c = tap(uv + d);
  // The reflected light scales ±10 % with the wave phase (never a new bright point).
  c *= 1.0 + 0.10*clamp(glint, -1.0, 1.0);
  // The moon's reflection column dims as clouds cover the moon (uOcc, once per frame on the CPU).
  c *= 1.0 - 0.6*uOcc*m.b*exp(-pow((uv.x - uMoon.x)/(2.0*uMr), 2.0));
  // Draw only on water; elsewhere the canvas is clear, so the mountains, city and shore stay the page's own <img>.
  gl_FragColor = vec4(c*m.b, m.b);
}`;

export type Stop = () => void;

// The shader's hash and noise, mirrored on the CPU (same constants), for the few per-frame values every pixel would
// otherwise recompute: the ring's position and the cloud cover over the moon.
const fract = (x: number) => x - Math.floor(x);
function hash(x: number, y: number) { let px = fract(x * 123.34), py = fract(y * 456.21);
  const d = px * (px + 45.32) + py * (py + 45.32); px += d; py += d; return fract(px * py); }
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uy;
}
function fbm(x: number, y: number, oct: number, ox: number, oy: number, k: number) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise(x, y); n += a; x = x * k + ox; y = y * k + oy; a *= 0.5; }
  return s / n;
}
let ringHz = 0.6, moonU = { x: 0.8, y: 0.2 }, asp = 2.35;
// The ring ripple's centre (uv), radius (px at 1280 w) and strength for this frame; strength 0 when none is showing.
function ringAt(t: number): [number, number, number, number] {
  if (t < 8) return [0, 0, 0, 0];
  const e = Math.floor((t - 8) / 14), age = t - 8 - e * 14;
  if (age > 7) return [0, 0, 0, 0];
  const cx = 0.35 + 0.6 * hash(e, 3.1), cy = ringHz + 0.12 * (1 - ringHz) + 0.8 * (1 - ringHz) * hash(e, 7.7);
  return [cx, cy, (140 * age) / 7, Math.sin((Math.min(1, age / 7)) * Math.PI)];
}
// Cloud density over the moon's centre (clouds() in the shader, at uMoon): it dims the moon's reflection and, next, the
// moonlit highlights. Lagged like a real cloud shadow (Designer): about 2.5 s to dim, 4 s to recover.
const WIND = 0.0035, COVER = 0.8;
function cloudAtMoon(t: number) {
  const px = moonU.x * 1280, py = (moonU.y * 1280) / asp;
  const x = (px / 1280) * 2.2 - t * WIND, y = (py / 1280) * 5.6;
  const qx = fbm(x, y + t * 0.010, 3, 1.7, 9.2, 2.02), qy = fbm(x + 5.2 - t * 0.008, y + 1.3, 3, 1.7, 9.2, 2.02);
  const d = fbm(x + 1.4 * qx, y + 1.4 * qy, 5, 5.1, 1.3, 2.03);
  const lo = 0.58 - 0.24 * COVER, hi = 0.80 - 0.24 * COVER, k = Math.min(1, Math.max(0, (d - lo) / (hi - lo)));
  return 0.5 * k * k * (3 - 2 * k);
}
let occ = 0, occT = 0;
function occlusion(t: number) {
  const target = cloudAtMoon(t), dt = Math.max(0, Math.min(0.5, t - occT)); occT = t;
  occ += (target - occ) * (1 - Math.exp(-dt / (target > occ ? 2.5 : 4)));
  return occ;
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, no) => { const im = new Image(); im.decoding = "async"; im.onload = () => ok(im); im.onerror = () => no(new Error("texture")); im.src = src; });
}

// Starts the hero on `canvas` (inside the cover box) and returns a stop function. `onReady` fires after the first frame is
// drawn (the caller fades the canvas in); `onFail` fires once on any failure, and the static image simply stays.
export function start(canvas: HTMLCanvasElement, d: Descriptor, onReady: () => void, onFail: () => void): Stop {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: "low-power" });
  if (!gl) { onFail(); return () => {}; }
  let dead = false, raf = 0, visible = true, onScreen = true, t0 = 0, last = 0, ready = false, failed = false, t0Pause = 0;
  // Slow frames: the device's own frame interval is measured over 30 frames before anything is drawn (a display or a
  // power mode may cap at 30 fps), then the hero stops if its drawing pushes the median past max(24 ms, 1.4 x that).
  const deltas = new Float32Array(60); let nDelta = 0, prevRaf = 0, baseline = 0;
  const scratch = new Float32Array(60);
  const median = (n: number) => { scratch.set(deltas); const v = scratch.subarray(0, n).sort(); return v[n >> 1]; };
  const fail = () => { if (failed) return; failed = true; stop(); onFail(); };

  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("shader"); return s; };
  let prog: WebGLProgram;
  try {
    prog = gl.createProgram()!;
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
    gl.deleteShader(vs); gl.deleteShader(fs); // flagged; freed with the program
  } catch { onFail(); return () => {}; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const u = { ring: U("uRing"), ringR: U("uRingR"), occ: U("uOcc"), wind: U("uWind"), cover: U("uCover"), sky: U("uSky"), moon: U("uMoon"), mr: U("uMr"), asp: U("uAsp"), ripple: U("uRipple"), min: U("uMin"), tex: U("uTex"), res: U("uRes"), a: U("uA"), b: U("uB"), size: U("uSize"), t: U("uT"), hz: U("uHz"), rip: U("uRip"), k: U("uK"), w: U("uW"), img: U("uImg"), mask: U("uMask") };
  gl.uniform1i(u.img, 0); gl.uniform1i(u.mask, 1); gl.uniform1i(u.sky, 2);
  const texImg = gl.createTexture(), texMask = gl.createTexture(), texSky = gl.createTexture();
  const upload = (tex: WebGLTexture | null, unit: number, im: HTMLImageElement, raw: boolean) => {
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, raw ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  let v: Variant | null = null, vSrc = "", loading = 0, texW = 0;
  const picture = canvas.parentElement?.querySelector("img") ?? null;
  // Sizes the canvas to its box (DPR capped at 1.5) and recomputes the cover-fit mapping; loads the variant's textures
  // when the breakpoint changes.
  const layout = async () => {
    const box = canvas.getBoundingClientRect(), cw = Math.max(1, box.width), ch = Math.max(1, box.height);
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const next = pickVariant(d);
    if (!next) return fail();
    const src = shownImage(picture) ?? next.image;
    if (next !== v || src !== vSrc) {
      const id = ++loading;
      try {
        const [im, mk, sk] = await Promise.all([load(src), next === v ? Promise.resolve(null) : load(next.mask), next === v ? Promise.resolve(null) : load(next.skyTex)]);
        if (dead || id !== loading) return;
        upload(texImg, 0, im, false); texW = im.naturalWidth; if (mk) upload(texMask, 1, mk, true); if (sk) upload(texSky, 2, sk, false);
        v = next; vSrc = src;
      } catch { return fail(); }
    }
    const [w, h] = v!.size, s = Math.max(cw / w, ch / h), dw = w * s, dh = h * s;
    const [fx, fy] = v!.focus.split(" ").map((p) => parseFloat(p) / 100);
    const ox = (cw - dw) * fx, oy = (ch - dh) * fy;
    gl.uniform2f(u.res, cw, ch); gl.uniform2f(u.a, 1 / dw, 1 / dh); gl.uniform2f(u.b, -ox / dw, -oy / dh);
    gl.uniform2f(u.size, w, h); gl.uniform1f(u.hz, v!.horizon);
    gl.uniform2f(u.moon, v!.moon.x, v!.moon.y); gl.uniform1f(u.mr, v!.moon.r); gl.uniform1f(u.asp, w / h); ringHz = v!.horizon; moonU = { x: v!.moon.x, y: v!.moon.y }; asp = w / h;
    gl.uniform2f(u.tex, 1 / (dw * dpr), 1 / (dh * dpr)); // one canvas pixel, in uv
    gl.uniform1f(u.min, texW / (dw * dpr) > 1.25 ? 1 : 0);
    // Ceilings (Designer, living-hero.md "The clouds and aurora visibly drift"), in plate pixels at a 1280 px wide picture,
    // so they look the same at every crop: clouds up to 40 px per 26 s phase (about 1.5 px/s), a secondary wobble up to
    // 6 px, the aurora swaying 8 px top to bottom, the water 2 px at its peak. Combined, under 3 px/s.
    const ux = 1 / 1280, uy = (1 / 1280) * (w / h);
    gl.uniform1f(u.wind, WIND); gl.uniform1f(u.cover, COVER);
    gl.uniform1f(u.rip, 1 * ux); // sin(a) - sin(b) peaks at 2: 2 px
    // Ripples (Designer, "visible water ripples"): up to about 4 px sideways and 1.5 px vertically at the bottom of
    // the picture (the wave slope sums to about 1.3 across and 4.1 along), fading to 0 at the horizon.
    gl.uniform2f(u.ripple, 3.0 * ux, 0.35 * uy);
    gl.uniform1f(u.k, (2 * Math.PI) / (14 * uy)); gl.uniform1f(u.w, 1.1); // about 2.5 px/s of drift, under 8
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (prevRaf) { deltas[nDelta % 60] = now - prevRaf; nDelta++; }
    prevRaf = now;
    if (!baseline) {
      if (nDelta < 30) return;
      baseline = median(30); nDelta = 0;
    }
    if (nDelta === 60) { if (median(60) > Math.max(24, 1.4 * baseline)) return fail(); nDelta = 0; }
    if (!v || now - last < 32) return; // 30 fps cap
    if (!t0) t0 = now;
    if (t0Pause) { t0 += now - t0Pause; t0Pause = 0; } // resume where it paused, no jump
    last = now;
    const t = (now - t0) / 1000;
    gl.uniform1f(u.t, t);
    gl.uniform1f(u.occ, occlusion(t));
    const r = ringAt(t);
    gl.uniform2f(u.ring, r[0], r[1]); gl.uniform2f(u.ringR, r[2], r[3]);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!ready) { ready = true; onReady(); }
  };
  const run = () => { if (!dead && !raf && visible && onScreen) { prevRaf = 0; nDelta = 0; raf = requestAnimationFrame(frame); } };
  const pause = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } if (t0 && !t0Pause) t0Pause = performance.now(); };

  const onVis = () => { visible = document.visibilityState === "visible"; visible ? run() : pause(); };
  const io = new IntersectionObserver((e) => { onScreen = e[0]?.isIntersecting ?? true; onScreen ? run() : pause(); });
  const ro = new ResizeObserver(() => { layout(); });
  const onLost = (e: Event) => { e.preventDefault(); fail(); };
  document.addEventListener("visibilitychange", onVis);
  canvas.addEventListener("webglcontextlost", onLost);
  io.observe(canvas); ro.observe(canvas);

  function stop() {
    if (dead) return; dead = true; pause();
    document.removeEventListener("visibilitychange", onVis); canvas.removeEventListener("webglcontextlost", onLost);
    io.disconnect(); ro.disconnect();
    // Free what this run created, so turning Motion off and on doesn't grow GPU memory (Security 11/27).
    gl!.deleteTexture(texImg); gl!.deleteTexture(texMask); gl!.deleteTexture(texSky); gl!.deleteBuffer(buf); gl!.deleteProgram(prog);
  }
  layout().then(() => { if (!dead) { onVis(); run(); } });
  return stop;
}
