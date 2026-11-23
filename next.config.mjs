// rodmjay.com: a static export (docs/adr/0002). `out/` is the whole site, served by Azure Static
// Web Apps Free. No server: no API routes, no rewrites, no image optimizer.
/** @type {import('next').NextConfig} */
export default {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
  // One 404 for both languages, outside the two root layouts (app/global-not-found.tsx).
  experimental: { globalNotFound: true },
};
