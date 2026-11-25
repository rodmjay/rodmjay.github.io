// The one-page card, drawn in the browser on a canvas (nothing is sent anywhere): the archetype, its strength and
// shadow, the person's growth edge and day 1 of the practice. Colors and fonts come from the page's own design tokens,
// so the card matches the site in light and dark. 1080 × 1350 (portrait, fits a phone screen and a printed page).
export type CardData = { title: string; name: string; role: string; rows: { label: string; text: string }[]; footer: string };

export const CARD_W = 1080, CARD_H = 1350;

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawCard(canvas: HTMLCanvasElement, d: CardData) {
  await document.fonts?.ready;
  // Tokens can be indirect (var() of var(), light-dark()), which a canvas can't parse: let the browser resolve each one
  // on a hidden element and read back the computed rgb() color or font family.
  const probe = document.createElement("span");
  probe.hidden = true;
  document.body.appendChild(probe);
  const color = (token: string, fallback: string) => {
    probe.style.setProperty("color", fallback);
    probe.style.setProperty("color", `var(${token}, ${fallback})`);
    return getComputedStyle(probe).color || fallback;
  };
  const family = (token: string) => {
    probe.style.setProperty("font-family", `var(${token}, sans-serif)`);
    return getComputedStyle(probe).fontFamily || "sans-serif";
  };
  const bg = color("--md-sys-color-surface-container-low", "#f7f2fa"), fg = color("--md-sys-color-on-surface", "#1d1b20");
  const muted = color("--md-sys-color-on-surface-variant", "#49454f"), accent = color("--md-sys-color-primary", "#6750a4");
  const brand = family("--md-ref-typeface-brand"), plain = family("--md-ref-typeface-plain");
  probe.remove();

  canvas.width = CARD_W; canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;
  const M = 96, W = CARD_W - 2 * M;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = accent; ctx.fillRect(M, M, 96, 8);
  let y = M + 72;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = muted; ctx.font = `500 30px ${brand}`; ctx.fillText(d.title.toUpperCase(), M, y);
  y += 84; ctx.fillStyle = fg; ctx.font = `600 68px ${brand}`;
  for (const l of wrap(ctx, d.name, W)) { ctx.fillText(l, M, y); y += 78; }
  ctx.fillStyle = muted; ctx.font = `400 34px ${plain}`;
  for (const l of wrap(ctx, d.role, W)) { ctx.fillText(l, M, y); y += 46; }
  y += 24;
  for (const r of d.rows) {
    y += 40; ctx.fillStyle = accent; ctx.font = `600 28px ${brand}`; ctx.fillText(r.label.toUpperCase(), M, y);
    y += 46; ctx.fillStyle = fg; ctx.font = `400 32px ${plain}`;
    for (const l of wrap(ctx, r.text, W)) { if (y > CARD_H - M - 60) break; ctx.fillText(l, M, y); y += 44; }
  }
  ctx.fillStyle = muted; ctx.font = `400 26px ${plain}`; ctx.fillText(d.footer, M, CARD_H - M + 20);
}

/** Saves the card as a PNG on the person's device (a local blob link; nothing is uploaded). */
export async function downloadCard(d: CardData, filename: string) {
  const canvas = document.createElement("canvas");
  await drawCard(canvas, d);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
