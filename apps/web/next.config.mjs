/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@fdl/shared"],
  webpack: (config, { dev }) => {
    if (dev) {
      // Use memory cache in development on Windows to prevent packfile lock conflicts and CSS chunk eviction
      config.cache = {
        type: 'memory',
      };
    }
    return config;
  },
};

export default nextConfig;
