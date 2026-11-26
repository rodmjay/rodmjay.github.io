// Everything the always-built parts of the site (the header, the footer, the test's pages) may show for accounts. Only
// src/account/gate.ts imports this file. Where accounts are off, next.config.mjs swaps it for account-slots.off.ts, so
// none of the account code, its words or the function URL is compiled into the site.
export const ON = true;
export { AccountLink, SignedOutBanner } from "./AccountLink";
export { SaveCard } from "./SaveCard";
