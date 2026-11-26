// rodmjay.com: a static export (docs/adr/0002). `out/` is the whole site, served by Azure Static
// Web Apps Free. No server: no API routes, no rewrites, no image optimizer.
// Accounts are on only where both the build flag and the browser flag say so (the workflow sets them together).
const ACCOUNTS = process.env.ACCOUNTS_ON === "1" && process.env.NEXT_PUBLIC_ACCOUNTS_ON === "1";
/** @type {import('next').NextConfig} */
export default {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
  // One 404 for both languages, outside the two root layouts (app/global-not-found.tsx).
  experimental: { globalNotFound: true },
  // SITE_BUILD_ID pins Next's build id (it's random otherwise), so two builds of the same content are byte-identical:
  // tests/cms-parity.mjs builds from the markdown and from the CMS and compares every file (docs/adr/0003).
  generateBuildId: async () => process.env.SITE_BUILD_ID || null,
  // The RVP test's routes are named page.rvp.tsx: they exist only where RVP_ON=1 (staging and checks; production after
  // Rod's yes, DECISIONS 11/25). Off, Next never compiles them, so no page and no chunk with its questions ships.
  // Accounts (ADR 0004/0005: /signin/ and /dashboard/) are page.acct.tsx the same way: only where ACCOUNTS_ON=1 (staging and
  // checks; production after the reviews and Rod's yes). The rest of the account code is behind NEXT_PUBLIC_ACCOUNTS_ON
  // (src/account/gate.ts), so off, none of it is compiled into the site.
  pageExtensions: [...(process.env.RVP_ON === "1" ? ["rvp.tsx"] : []), ...(ACCOUNTS ? ["acct.tsx"] : []), "tsx", "ts", "jsx", "js"],
  // The account pieces the always-built pages use (header link, save card) come through src/account/gate.ts; off, its
  // ./account-slots import becomes ./account-slots.off (nulls), so no account module reaches any chunk.
  webpack(config, { webpack }) {
    if (!ACCOUNTS) config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^\.\/account-slots$/, "./account-slots.off"));
    return config;
  },
};
