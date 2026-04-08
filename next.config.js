/** @type {import('next').NextConfig} */

// Set NEXT_PUBLIC_BASE_PATH=/system-architect in .env.production (or CI env)
// for GitHub Pages deployment.  Leave empty for local dev.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // Static export — required for GitHub Pages (no server-side runtime)
  output: 'export',

  // Append trailing slash so relative asset paths resolve on GH Pages
  trailingSlash: true,

  // Base path for GitHub Pages subfolder deployments
  basePath,
  assetPrefix: basePath ? `${basePath}/` : '',

  // Disable image optimisation (not available in static export)
  images: { unoptimized: true },

  reactStrictMode: false,
};

module.exports = nextConfig;
