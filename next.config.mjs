/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three.js ships ESM; transpile the r3f ecosystem for maximum compatibility.
  transpilePackages: ['three'],
};

export default nextConfig;
