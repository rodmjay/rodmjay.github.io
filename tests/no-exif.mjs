// No photo on the site carries EXIF or XMP metadata (Security 11/26): a phone photo's GPS would be Rod's home. Checks every
// image under public/recipes/images: JPEG APP1 "Exif\0\0" segments, WebP "EXIF"/"XMP " chunks, and the XMP namespace
// (ns.adobe.com/xap) anywhere in the file. scripts/recipe-images.py re-encodes without metadata, so this only fails when
// something bypassed it.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = "public/recipes/images";
const bad = [];
let n = 0;
if (existsSync(DIR)) for (const f of readdirSync(DIR)) {
  if (!/\.(jpe?g|webp)$/i.test(f)) continue;
  n++;
  const b = readFileSync(join(DIR, f));
  const why = [];
  if (b.includes(Buffer.from("ns.adobe.com/xap"))) why.push("XMP");
  if (/\.jpe?g$/i.test(f)) {
    // Walk the JPEG markers up to the image data; APP1 with "Exif\0\0" is EXIF.
    for (let i = 2; i + 4 < b.length && b[i] === 0xff;) {
      const marker = b[i + 1], len = b.readUInt16BE(i + 2);
      if (marker === 0xda) break;
      if (marker === 0xe1 && b.subarray(i + 4, i + 10).equals(Buffer.from("Exif\0\0", "binary"))) why.push("EXIF");
      i += 2 + len;
    }
  } else if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") {
    for (let i = 12; i + 8 <= b.length;) {
      const id = b.subarray(i, i + 4).toString(), size = b.readUInt32LE(i + 4);
      if (id === "EXIF") why.push("EXIF");
      if (id === "XMP ") why.push("XMP");
      i += 8 + size + (size % 2);
    }
  } else why.push("not a WebP file");
  if (why.length) bad.push(`${f}: ${[...new Set(why)].join(", ")}`);
}
if (bad.length) { console.error(`photo metadata (strip it: scripts/recipe-images.py):\n${bad.join("\n")}`); process.exit(1); }
console.log(`photo metadata: none in ${n} images`);
