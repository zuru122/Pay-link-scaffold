/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Privy pulls in an optional Farcaster Solana dep — stub it out
    config.resolve.alias["@farcaster/mini-app-solana"] = false;
    return config;
  },
};

export default nextConfig;
