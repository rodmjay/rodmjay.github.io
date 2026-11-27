// The living hero's engine (docs/adr/0004): one WebGL1 fragment shader over the page's own picture, moved only inside the
// regions of its mask (R sky, G stars, B water). Every effect is zero at t = 0, so the first frame is the image and the
// canvas can fade in over it unseen. Loaded on idle by LivingHero.tsx, only after every capability check passed.
// Security 11/27: same-origin textures only, no network of its own, nothing logged or sent, no renderer string read,
// the mask uploaded raw (no premultiply, no colorspace conversion), fixed loop bounds, context loss and slow frames end it
// for the session, nothing allocated in the frame loop.
import { pickVariant, type Descriptor, type Variant } from "./descriptor";

const VS = `attribute vec2 a; uniform vec2 uRes; varying vec2 vP;
void main(){ vP = vec2((a.x*0.5+0.5)*uRes.x, (0.5-a.y*0.5)*uRes.y); gl_Position = vec4(a,0.0,1.0); }`;

// uA/uB map canvas CSS pixels to the picture's uv (the same cover-fit and object-position as the <img>).
// uDrift: the sky's largest move in uv (6 px at 1280 w); uRip: half the water's largest move (peak 2 px); uK, uW: the
// ripple's spatial and time frequency; uHz: the horizon; uSize: the texture size, for per-star cells.
const FS = `precision mediump float;
uniform sampler2D uImg, uMask; uniform vec2 uA, uB, uSize, uDrift; uniform float uT, uHz, uRip, uK, uW;
varying vec2 vP;
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x), u.y); }
vec2 flow(vec2 uv, float t){ vec2 p = uv*vec2(3.0,2.0);
  float x = noise(p+vec2(t*0.011,t*0.007)) + 0.5*noise(p*2.1+vec2(-t*0.013,t*0.005));
  float y = noise(p+vec2(17.3,-t*0.009)) + 0.5*noise(p*2.3+vec2(t*0.006,4.1));
  return vec2(x,y)/1.5; }
void main(){
  vec2 uv = vP*uA + uB;
  vec4 m = texture2D(uMask, uv);
  vec2 d = m.r * (flow(uv,uT) - flow(uv,0.0)) * uDrift;
  if (uv.y > uHz) { float k = (uv.y-uHz)/(1.0-uHz); float ph = uv.y*uK; d.x += m.b * uRip * k * (sin(ph+uT*uW) - sin(ph)); }
  vec3 c = texture2D(uImg, clamp(uv+d, 0.0, 1.0)).rgb;
  float T = 4.0 + 5.0*hash(floor(uv*uSize/16.0));
  c *= mix(1.0, 1.0 - 0.2*(1.0-cos(6.2831853*uT/T)), m.g);
  gl_FragColor = vec4(c, 1.0);
}`;

export type Stop = () => void;

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, no) => { const im = new Image(); im.decoding = "async"; im.onload = () => ok(im); im.onerror = () => no(new Error("texture")); im.src = src; });
}

// Starts the hero on `canvas` (inside the cover box) and returns a stop function. `onReady` fires after the first frame is
// drawn (the caller fades the canvas in); `onFail` fires once on any failure, and the static image simply stays.
export function start(canvas: HTMLCanvasElement, d: Descriptor, onReady: () => void, onFail: () => void): Stop {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "low-power" });
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
  const u = { res: U("uRes"), a: U("uA"), b: U("uB"), size: U("uSize"), drift: U("uDrift"), t: U("uT"), hz: U("uHz"), rip: U("uRip"), k: U("uK"), w: U("uW"), img: U("uImg"), mask: U("uMask") };
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

  let v: Variant | null = null, loading = 0;
  // Sizes the canvas to its box (DPR capped at 1.5) and recomputes the cover-fit mapping; loads the variant's textures
  // when the breakpoint changes.
  const layout = async () => {
    const box = canvas.getBoundingClientRect(), cw = Math.max(1, box.width), ch = Math.max(1, box.height);
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const next = pickVariant(d);
    if (!next) return fail();
    if (next !== v) {
      const id = ++loading;
      try {
        const [im, mk] = await Promise.all([load(next.image), load(next.mask)]);
        if (dead || id !== loading) return;
        upload(texImg, 0, im, false); upload(texMask, 1, mk, true);
        v = next;
      } catch { return fail(); }
    }
    const [w, h] = v!.size, s = Math.max(cw / w, ch / h), dw = w * s, dh = h * s;
    const [fx, fy] = v!.focus.split(" ").map((p) => parseFloat(p) / 100);
    const ox = (cw - dw) * fx, oy = (ch - dh) * fy;
    gl.uniform2f(u.res, cw, ch); gl.uniform2f(u.a, 1 / dw, 1 / dh); gl.uniform2f(u.b, -ox / dw, -oy / dh);
    gl.uniform2f(u.size, w, h); gl.uniform1f(u.hz, v!.horizon);
    // Ceilings (Designer): sky 6 px and water 2 px peak when the picture shows 1280 px wide, a ripple wave of about 14 px.
    // Expressed as fractions of the picture (plate pixels), so they look the same at every crop and width.
    const ux = 1 / 1280, uy = (1 / 1280) * (w / h);
    gl.uniform2f(u.drift, 6 * ux, 6 * uy);
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
