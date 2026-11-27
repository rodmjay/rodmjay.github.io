# 0004. The living hero: one WebGL fragment shader over the existing plate, driven by build-time masks

Date: 2026-11-27. Status: **accepted** (11/27). Designer approved it from design. Security accepted the plan with the checks
below and passes `hero.js` and its loader before they ship. Designer judges the motion on staging.
Rod (via EA 11/27): the home's night-valley hero should "come alive" with subtle GPU motion, with the static image as the
fallback. The same treatment applies to the Discover SLC hero: "keeping with style of image, but enhancing it."
Design contract: personal `design/specs/living-hero.md`, which holds the ceilings, phases, fallback and safety rules.
Layer scoping: PR Person 11/27 (option A, no new generation).

## Context

Rod asked which way is right: separate Higgsfield layers, depth-map parallax, or procedural shaders. Designer's
contract sets the limits:
- the static `<img>` is the page and the LCP, and the first frame must match it exactly;
- under 60 KB of hand-written WebGL, with no library;
- 30 fps cap, DPR cap 1.5;
- off for reduced motion, save-data, no WebGL, hidden or off-screen, and the visitor's toggle;
- the shader never recolors or sharpens the art;
- only these move: sky drift, star twinkle, water ripple, then city lights, then the sky mirrored in the water.

## Decision

**Animate the existing plate itself, with one WebGL1 fragment shader and a mask texture per image made at build time.
No new image generation, no depth map, no parallax.**

- **Why not separate layers (Higgsfield):**
  - Each layer is a new picture, so the composite drifts from the static fallback and the first frame stops matching.
  - The sky behind the ridge would need inpainting.
  - It costs credits and Rod's go for each image.
  - It stays the escape hatch (PR Person's option B) only if A looks flat.
- **Why not depth-map parallax:** parallax moves the mountains and city, and the contract says nothing else moves.
  Parallax also exposes edges that need inpainting.
- **Why a shader on the plate:**
  - Every allowed motion is a small displacement or brightness change inside a region of the same picture.
  - One draw call per frame, one texture plus one mask, a few KB of GLSL.
  - The picture keeps its own style because the shader only moves and brightens pixels it already has.

### The motion model: every effect is zero at t = 0

Each effect is a displacement field `d(x, t)` or a brightness factor `b(x, t)`, written so that `d(x, 0) = 0` and
`b(x, 0) = 1`. The first frame is therefore the image, pixel for pixel, and the canvas can fade in over it without a jump.

| Effect (phase) | Where | Formula (sketch) | Ceiling |
|---|---|---|---|
| Sky drift (1) | sky mask, feathered to 0 at the ridge | UV += curl of 2-octave value noise; time enters through 3 incommensurate slow phases (≥ 90 s), so the cycle never visibly repeats; `d·(t)` minus `d·(0)` | ≤ 6 px at 1280 w |
| Star twinkle (1) | star mask | `b = 1 − 0.4·(1 − cos(2πt / T))/2`, with T hashed per star in 4 to 9 s | 0.6 to 1.0 |
| Moon (1) | moon disc from the descriptor | excluded from the drift; no change (or < 3 % if Designer wants it) | still |
| Water ripple (1) | below `horizon` | `dx = A(y)·(sin(ky + ωt + φ) − sin(ky + φ))`, A from 0 at the horizon to 1 px plate-scaled at the bottom (2 px peak) | 2 px, < 8 px/s |
| City lights (2) | light mask; per-point seed in the alpha channel | each point gets a random schedule; at most 1 in 12 points mid-change per 10 s | 0.85 to 1.0, never off |
| Mirrored sky (3) | below `horizon` | painted water + k × (animated sky − static sky), sampled mirrored about the horizon with the ripple | adds only the motion, never replaces the paint |

- **Ripple sizing:** amplitudes are in plate pixels, scaled by the cover-fit factor, so the ripple looks the same at
  every crop (Designer).
- **Phase 3 never repaints the water:** it adds only the sky's motion, mirrored, to the painted reflection. At t = 0 that
  difference is zero, which is why phase 3 can't change the picture.

### Masks: made by a script, checked by eye

- `scripts/hero-masks.mjs` (Node with sharp, already in the lockfile) reads a plate and its descriptor and writes one
  RGBA PNG at half the texture width:
  - R: sky weight (above the horizon, by luminance and edge distance, feathered 8 px, with the moon disc cut out);
  - G: stars (small local maxima in the sky above a threshold);
  - B: water weight (below the horizon, minus the descriptor's hand-traced `land` polygon for the shore);
  - A: always 255. Fully transparent pixels can lose their RGB when a browser decodes the PNG (Safari: Security 11/27).
    Phase 2's city lights get their own texture, with each light's seed hashed from its position in the shader.
- It is reproducible, so a new season's plate is one command. PR Person and Designer check the mask output before a
  phase ships; PR Person can hand-paint corrections over it (same format).
- Textures: the same crops as the cover, 1920 w (desktop) and 1280 w (phone); masks at 960 and 640.

### The descriptor (JSON beside each image)

```json
{ "id": "home-fall-2026", "image": "/img/cover-1920.webp", "imagePhone": "/img/cover-m-1125.webp",
  "mask": "/img/cover-1920.mask.png", "maskPhone": "/img/cover-m-1125.mask.png",
  "size": [3168, 1344], "horizon": 0.60, "moon": { "x": 0.78, "y": 0.18, "r": 0.035 },
  "focus": { "desktop": "50% 23%", "tablet": "60% 30%", "phone": "64% 30%" },
  "ripple": null, "phases": [1] }
```

- `phases` turns effects on per image; Designer turns phase 2 on only after the light mask passes.
- `focus` is the exact `object-position` the page uses, so the canvas uses the same cover-fit math at every width.
- The build checks each descriptor (horizon in 0.5 to 0.7, the mask's size, `phases` a subset of [1, 2, 3]).

### The component

- **`<LivingHero descriptor={…}>`** (`src/components/living-hero/`): it renders the existing `<picture>` unchanged, so
  the LCP, CLS 0 and no-script behaviour all stay. It adds an empty `<canvas aria-hidden>` absolutely over it, and one
  client module (`hero.js`, target under 15 KB minified with the GLSL) that loads in `requestIdleCallback` after the load
  event.
- **It starts only when:**
  - WebGL1 is available;
  - `prefers-reduced-motion` is not `reduce`;
  - `navigator.connection.saveData` is not true;
  - the visitor's toggle isn't off (localStorage key `motion`, in try/catch);
  - `deviceMemory` and `hardwareConcurrency` aren't both 2 or less (a low-end guard instead of the Battery API, which
    is gone or unreliable).
  Otherwise nothing loads but the image.
- **It runs only while:**
  - the tab is visible (`visibilitychange`);
  - the band is on screen (IntersectionObserver).
  Both pause the rAF loop.
- **Rendering limits:**
  - a 30 fps cap (frames gated on rAF time);
  - DPR capped at 1.5;
  - the canvas is sized to the band's box, not the plate.
- **Bail-outs, back to the image for good:**
  - the median frame time over 60 frames is above 24 ms;
  - `webglcontextlost`;
  - a shader compile error.
- **Fade-in:** the first frame is drawn, then opacity goes 0 → 1 over 600 ms. That frame is the image, so the change
  can't be seen.
- **Toggle and hosts:**
  - The footer "Motion on/off" toggle is a small client component in each product's footer. It writes `motion` and fires
    an event the hero listens to, so it takes effect without a reload.
  - One setting per origin covers both products, since they share rodmjay.com.
  - Hosts: the home's cover band and the /slc band (the current season's descriptor). The component carries no brand
    styling.

### Security and privacy

- Nothing new leaves the site: the script, textures and masks are served from `'self'`. The CSP stays as it is
  (`script-src 'self'`, `img-src 'self'`; WebGL needs no new directive).
- No inline script; there's no `eval` or `new Function` in the shader loader.
- Security passes `hero.js` and its loader before it ships, against these checks (Security 11/27):
  1. **The descriptor is validated at build and at runtime.** Image and mask paths are site-relative: one leading `/`, no
     `//`, no `..`, no scheme. They become texture URLs only and never markup. No fetch beyond the textures, nothing
     cross-origin, no `eval`, `new Function`, `innerHTML` or string `setTimeout`.
  2. **Privacy.** deviceMemory, hardwareConcurrency, saveData and WebGL support are read only to decide locally. They
     are never sent or logged. `WEBGL_debug_renderer_info` and the renderer string are never read, because they are a
     fingerprint. Bail-outs have no telemetry, which keeps the privacy page's no-tracking claim true.
  3. **Storage.** The `motion` key is a visitor preference and is listed on the privacy page and in the cookie line.
     Compliance and Designer are told.
  4. **Robustness.**
     - The shader's loops have fixed bounds, so the cost per fragment is bounded.
     - A compile error, context loss or slow frames return to the static image for the session.
     - `webglcontextlost` gets `preventDefault()`, then the hero stops.
     - It pauses when the tab is hidden or the band is off screen.
     - Nothing in the rAF loop allocates.
  5. **The mask is uploaded raw.** `UNPACK_PREMULTIPLY_ALPHA_WEBGL` is false and `UNPACK_COLORSPACE_CONVERSION_WEBGL`
     is `NONE`, so the alpha-channel seeds don't corrupt the R, G and B channels.
  6. **Accessibility.** The twinkle is far below the WCAG 2.3.1 flash threshold. Motion over 5 s needs a pause control
     (2.2.2): the footer toggle is keyboard-reachable and takes effect live, and the hero also reacts live when
     reduced motion changes.
  7. **The mask script** reads the repo's own images with the locked `sharp`, makes no network calls, and writes only
     to the images folder.
- In debug builds only, the hero logs the descriptor's `id`, so a wrong plate is easy to spot (Designer).

### Measured on the built page (11/27, headless Chromium, 1280×720 and 375×812 at 1× and 3×)

- The canvas draws only where something moves (alpha = the larger of the sky, star and water weights, premultiplied).
  Everywhere else it is clear, so the mountains, city and moon are always the page's own `<img>`, pixel for pixel,
  whatever the canvas density. Measured difference over the mountains: 0.00 to 0.01 levels.
- It samples the file the `<img>` is actually showing (`currentSrc`, validated same-origin), not a fixed size, so both
  decode the same pixels. When that file is shown smaller than its size, it averages 4 taps, the way the browser smooths
  a downscale.
- Over 30 s the mountains and city change by 0.00. The sky moves by a mean of about 0.5 levels and the water by about
  1.2: quiet, as the contract asks.

## Consequences

- Phase 1 needs no new art and no credits: the home plate plus a generated mask. /slc needs four masks (one per season).
  Phase 2 waits on Designer passing each light mask; phase 3 comes last.
- If A reads flat on staging, option B (Higgsfield sky-only and foreground-on-key plates) slots in by changing only the
  descriptor's textures. That needs Rod's go via EA for the credits.
- Every ceiling in the contract is reachable with this model; none needs an exception.
- Turning it off is a flag per phase, or the visitor's toggle; the static page is always complete without it.

## Addendum, 11/27: a simulation framework, not a fixed shader

Rod (via EA, 11/27): "we are going to be adding more simulated features in as we go … this is the framework we need to
build on this graphic." He wants procedural clouds, a parametric scene state with seamless transitions (the calm moonlit
night can turn into a storm or a tornado "with click of button"), and runtime control. Designer's language for it:
design/specs/living-hero.md "scene states and transitions".

This addendum is the target architecture. Phase 1 (what's on staging) ships as it is and becomes the framework's first
modules. Each later stage is reviewed by eye before the next.

### The pieces

1. **The loop and the gates (unchanged).** One rAF loop per hero, with the gates above: reduced motion, save-data, no
   WebGL, low-end, hidden or off screen, the toggle, slow frames, GL errors. Every effect runs behind the same gates,
   whatever it is.
2. **The state vector.** One named set of numbers, the only input every effect reads:
   cloudCover, cloudDark, wind, moonVisibility, auroraStrength, starVisibility, precipType, precipDensity, lightning,
   waterRoughness, fog, funnel.
   - A **state** is a named point in it (Calm night, Breezy, Overcast, Snowfall, Storm, Tornado), kept in one JSON
     catalog next to the descriptors.
   - Calm night is the phase 1 look.
3. **Transitions.** A transition animates each parameter from its current value to the target state's, eased
   (smoothstep or slower, no overshoot), never by cross-fading images.
   - Each parameter has its own delay and duration, so the order follows Designer's spec (wind first, then cover, light,
     precipitation, water and fog, lightning last; reversed on the way back).
   - Pacing comes from the spec: 20 s for Breezy up to 60–90 s for the tornado build-up.
   - Because every parameter always moves from where it is now, a transition can be interrupted or reversed at any point
     with no jump. "Back to calm" starts within one frame.
4. **Signals.** Values derived once per frame on the CPU from the state and time, and shared by every effect. Examples:
   - moonOcclusion: how much cloud covers the moon disc, from the veils and the procedural cover;
   - moonlight: moonOcclusion with Designer's lag (2.5 s down, 4 s up);
   - flash: lightning;
   - windVector.
   This keeps the world coherent: the dynamic moonlight, the moon's water column and the window streaks all read the same
   signal. It also keeps per-pixel work low, as the veil showed.
5. **Effect modules.** Each effect is one file declaring:
   - the state parameters and signals it reads;
   - its uniforms;
   - GLSL for one or more fixed stages (displacement, colour, overlay);
   - the masks or textures it needs;
   - a cost class (light or heavy).
   The engine assembles the fragment shader from the active modules. It recompiles only when the set of modules changes,
   which is rare; state changes are uniforms only. Adding a feature means adding a module and a catalog entry. Today's
   effects become the first modules: cloud flow, aurora, stars, water shimmer, ripples, ring, moon veil, and next,
   dynamic moonlight.
6. **Procedural clouds.**
   - A cloud layer of domain-warped fractal noise, lit from the moon's direction (the descriptor's moon), coloured from a
     small palette sampled from the plate's own sky so it matches the painted look.
   - Rendered at half resolution into an offscreen buffer and composited.
   - At Calm (cloudCover 0) the layer is empty and the painted clouds keep their flow, so the calm frame stays the
     picture. Coverage, density and darkness come from the state vector.
   - First prototype needs from Designer: a reference crop of the painted clouds, a 4–6 colour palette, and the light
     direction. Designer reviews it before anything uses it.
7. **The control layer.** A small controller API on the hero: `setState(name, { duration })`, `backToCalm()`, `state()`,
   and change events. Every trigger goes through it:
   - the future footer "Scene" button (Designer's spec: default Calm on every visit, nothing saved, hidden when Motion is
     off or not possible);
   - `?scene=` and a debug panel, behind a build flag and never in production;
   - later interactive triggers.
   Nothing changes state on its own.
8. **Masks per plate,** from the same script:
   - the motion mask (R sky, G stars, B water, A opaque);
   - a second light mask (R moonlit highlights, G window lights, B fixed lights such as the Temple floodlight that never
     dim or flicker, A opaque).
   Designer checks each by eye.

### Budgets and safety for heavy states

- Heavy modules (precipitation, lightning, funnel, dense procedural cloud) load only when a heavy state is asked for. They
  never load on low-end devices, with save-data, or after the frame budget has failed; there the hero stays on Calm
  silently (Designer 6).
- Lightning follows Designer's flash limits (at most 1 per 8 s on average, 25 % in-cloud and 10 % on land, at most 3 per
  second) and is off under reduced motion or "Reduce flashing".
- The fixed elements never move in any state: skyline, ridge, Temple, windows, moon position, reflection geometry. The
  canvas stays transparent wherever no module draws, so those are always the page's own pixels.
- Security's seven checks apply to every module. Nothing a module does may fetch, log or send anything.

### Order of work

1. Restructure phase 1 into the module and signal shape, with no visible change. The CI shader test covers every
   module set.
2. Add dynamic moonlight (the first signal consumer, with the light mask).
3. Build the procedural cloud prototype, with Designer's review.
4. Add the state vector and transition engine with Calm, Breezy and Overcast.
5. Add precipitation and water roughness.
6. Add lightning and the funnel.
7. Add the Scene control.

Each step is its own commit to `next` and its own staging check.
