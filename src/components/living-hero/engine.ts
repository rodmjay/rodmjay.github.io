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
// band in CSS pixels (highp: the vertex shader shares it). uL/uP: the cloud flow's span and phase period; uN: the wobble; uAur: the aurora sway; uRip, uK, uW:
// the water ripple; uHz: the horizon; uSize: the plate size, for per-star cells; uTex/uMin: the downscale taps.
export const FS = `precision mediump float;
uniform sampler2D uImg, uMask; uniform highp vec2 uRes; uniform vec2 uA, uB, uSize, uTex, uN; uniform float uT, uHz, uRip, uK, uW, uMin, uL, uP, uAur;
varying vec2 vP;
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x), u.y); }
// Slow secondary noise: two incommensurate time phases (about 50 s and 71 s), so it never visibly repeats.
vec2 wobble(vec2 uv, float t){ vec2 p = uv*vec2(3.0,2.0);
  return vec2(noise(p+vec2(t*0.020,0.0)) + 0.5*noise(p*2.1+vec2(0.0,t*0.014)),
              noise(p+vec2(17.3,t*0.014)) + 0.5*noise(p*2.3+vec2(t*0.020,4.1)))/1.5; }
// The picture at q; when it's shown smaller than its file, 4 fixed taps match the browser's smooth downscale.
vec3 tap(vec2 q){ q = clamp(q, 0.0, 1.0); vec3 c = texture2D(uImg, q).rgb;
  if (uMin > 0.5) { vec2 o = uTex*0.25;
    c = 0.25*(texture2D(uImg, q+vec2(-o.x,-o.y)).rgb + texture2D(uImg, q+vec2(o.x,-o.y)).rgb + texture2D(uImg, q+vec2(-o.x,o.y)).rgb + texture2D(uImg, q+vec2(o.x,o.y)).rgb); }
  return c; }
void main(){
  vec2 uv = vP*uA + uB;
  vec4 m = texture2D(uMask, uv);
  // Where the sky moves: the sky mask, never on a star, fading to 0 within 24 px of the band's edges (no seam).
  float edge = smoothstep(0.0, 24.0, min(min(vP.x, uRes.x-vP.x), min(vP.y, uRes.y-vP.y)));
  float sky = m.r * (1.0 - m.g) * edge;
  // Clouds go faster higher up: full in the top fifth, tapering to 0 toward the ridge.
  float speed = sky * (1.0 - smoothstep(0.2, 0.6, uv.y));
  // Aurora: the saturated hues inside the sky. It sways vertically, with the phase travelling along the ribbon.
  // (Only computed where the sky moves: the rest of the picture skips this cost.)
  vec2 d = vec2(0.0); float aur = 0.0;
  if (sky > 0.002) {
    vec3 s0 = texture2D(uImg, uv).rgb; float hi = max(s0.r, max(s0.g, s0.b)), lo = min(s0.r, min(s0.g, s0.b));
    aur = smoothstep(0.35, 0.6, hi > 0.0 ? (hi-lo)/hi : 0.0) * sky;
    float ph = uv.x*9.0;
    d = (wobble(uv, uT) - wobble(uv, 0.0)) * uN * sky;
    d.y += aur * uAur * (sin(6.2831853*uT/16.0 + ph) - sin(ph));
  }
  // Water: a horizontal ripple growing from 0 at the horizon, zero at t = 0.
  if (uv.y > uHz) { float k = (uv.y-uHz)/(1.0-uHz); float wp = uv.y*uK; d.x += m.b * uRip * k * (sin(wp+uT*uW) - sin(wp)); }
  // Clouds: a two-phase flow, left to right. Each sample's offset is centred on its phase, and the triangle crossfade
  // gives sample A full weight exactly when its offset is 0, so t = 0 is the picture and there's no jump or visible loop.
  float pa = fract(uT/uP + 0.5), pb = fract(uT/uP), wa = 1.0 - abs(2.0*pa - 1.0);
  vec3 c;
  if (speed > 0.002) {
    vec2 qa = uv + d - vec2((pa - 0.5)*uL*speed, 0.0);
    vec2 qb = uv + d - vec2((pb - 0.5)*uL*speed, 0.0);
    c = mix(tap(qb), tap(qa), wa);
  } else { c = tap(uv + d); }
  // Aurora brightness: a travelling wave, within ±8 %, at about 23 s; never a colour shift.
  c *= 1.0 + 0.08*aur*0.5*(sin(6.2831853*uT/23.0 + uv.x*6.0) - sin(uv.x*6.0));
  // Stars twinkle in place, each on its own 4 to 9 s period.
  float T = 4.0 + 5.0*hash(floor(uv*uSize/16.0));
  c *= mix(1.0, 1.0 - 0.2*(1.0-cos(6.2831853*uT/T)), m.g);
  // Draw only where something moves (sky, stars, water); elsewhere the canvas is clear, so the mountains, city and moon
  // are always the page's own <img> at full sharpness, whatever the canvas resolution (premultiplied alpha).
  float a = clamp(max(max(m.r, m.b), m.g), 0.0, 1.0);
  gl_FragColor = vec4(c*a, a);
}`;

export type Stop = () => void;

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
  const u = { min: U("uMin"), tex: U("uTex"), res: U("uRes"), a: U("uA"), b: U("uB"), size: U("uSize"), n: U("uN"), l: U("uL"), p: U("uP"), aur: U("uAur"), t: U("uT"), hz: U("uHz"), rip: U("uRip"), k: U("uK"), w: U("uW"), img: U("uImg"), mask: U("uMask") };
  gl.uniform1i(u.img, 0); gl.uniform1i(u.mask, 1);
  const texImg = gl.createTexture(), texMask = gl.createTexture();
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
        const [im, mk] = await Promise.all([load(src), next === v ? Promise.resolve(null) : load(next.mask)]);
        if (dead || id !== loading) return;
        upload(texImg, 0, im, false); texW = im.naturalWidth; if (mk) upload(texMask, 1, mk, true);
        v = next; vSrc = src;
      } catch { return fail(); }
    }
    const [w, h] = v!.size, s = Math.max(cw / w, ch / h), dw = w * s, dh = h * s;
    const [fx, fy] = v!.focus.split(" ").map((p) => parseFloat(p) / 100);
    const ox = (cw - dw) * fx, oy = (ch - dh) * fy;
    gl.uniform2f(u.res, cw, ch); gl.uniform2f(u.a, 1 / dw, 1 / dh); gl.uniform2f(u.b, -ox / dw, -oy / dh);
    gl.uniform2f(u.size, w, h); gl.uniform1f(u.hz, v!.horizon);
    gl.uniform2f(u.tex, 1 / (dw * dpr), 1 / (dh * dpr)); // one canvas pixel, in uv
    gl.uniform1f(u.min, texW / (dw * dpr) > 1.25 ? 1 : 0);
    // Ceilings (Designer, living-hero.md "The clouds and aurora visibly drift"), in plate pixels at a 1280 px wide picture,
    // so they look the same at every crop: clouds up to 40 px per 26 s phase (about 1.5 px/s), a secondary wobble up to
    // 6 px, the aurora swaying 8 px top to bottom, the water 2 px at its peak. Combined, under 3 px/s.
    const ux = 1 / 1280, uy = (1 / 1280) * (w / h);
    gl.uniform1f(u.l, 40 * ux); gl.uniform1f(u.p, 26);
    gl.uniform2f(u.n, 6 * ux, 6 * uy);
    gl.uniform1f(u.aur, 4 * uy);
    gl.uniform1f(u.rip, 1 * ux); // sin(a) - sin(b) peaks at 2: 2 px
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
    gl.uniform1f(u.t, (now - t0) / 1000);
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
    gl!.deleteTexture(texImg); gl!.deleteTexture(texMask); gl!.deleteBuffer(buf); gl!.deleteProgram(prog);
  }
  layout().then(() => { if (!dead) { onVis(); run(); } });
  return stop;
}
