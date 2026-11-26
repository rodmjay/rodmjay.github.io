// The consent boxes show exactly the words the rvp-account function records (Security 11/26). The function stores the
// sha256 of its own copy of each approved wording; this hashes what the page shows (i18n, UTF-8) and fails on any
// difference from the pins in tests/consent-hashes.json, so the text people tick can't drift from the text on record.
//   node tests/consent-hashes.mjs
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const pins = JSON.parse(readFileSync("tests/consent-hashes.json", "utf8"));
const sha = (t) => createHash("sha256").update(t, "utf8").digest("hex");
const bad = [];
let n = 0;
for (const lang of ["en", "es"]) {
  const dict = JSON.parse(readFileSync(`i18n/${lang}.json`, "utf8"));
  for (const [name, pin] of Object.entries(pins)) {
    if (name === "note") continue;
    const text = pin.key.split(".").reduce((o, k) => o?.[k], dict);
    n++;
    if (typeof text !== "string") bad.push(`${name} ${lang}: ${pin.key} is missing from i18n/${lang}.json`);
    else if (sha(text) !== pin[lang]) bad.push(`${name} ${lang}: ${pin.key} hashes to ${sha(text)}, pinned ${pin[lang]}`);
  }
}
if (bad.length) { console.error(`consent wording differs from what the function records:\n${bad.join("\n")}`); process.exit(1); }
console.log(`consent hashes: all ${n} consent strings match their pins`);
