/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Export as a static site for GitHub Pages
  output: 'export',
  // If deploying as a project site (username.github.io/repo),
  // uncomment and set the `basePath` and `assetPrefix` to '/repo-name'
  basePath: '/system-architect',
  assetPrefix: '/system-architect/',
};

module.exports = nextConfig;
