import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Export as a static site for GitHub Pages
  output: 'export',
  // If deploying as a project site (username.github.io/repo),
  // set `basePath` and `assetPrefix` to '/repo-name'
  basePath: '/system-architect',
  assetPrefix: '/system-architect/',
};

export default nextConfig;
