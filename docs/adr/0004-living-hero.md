# 0004. The living hero: one WebGL fragment shader over the existing plate, driven by build-time masks

Date: 2026-11-27. Status: **proposed** (Software Architect, for EA). Security reviews the script before it ships;
Designer judges the motion on staging.
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
  - B: lights (warm hue, high luminance, in the skyline band);
  - A: a per-light seed.
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
- Security passes `hero.js` and its loader before it ships.

## Consequences

- Phase 1 needs no new art and no credits: the home plate plus a generated mask. /slc needs four masks (one per season).
  Phase 2 waits on Designer passing each light mask; phase 3 comes last.
- If A reads flat on staging, option B (Higgsfield sky-only and foreground-on-key plates) slots in by changing only the
  descriptor's textures. That needs Rod's go via EA for the credits.
- Every ceiling in the contract is reachable with this model; none needs an exception.
- Turning it off is a flag per phase, or the visitor's toggle; the static page is always complete without it.
