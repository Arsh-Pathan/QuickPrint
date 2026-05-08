/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@quickprint/shared'],
  experimental: { typedRoutes: true },
};
export default nextConfig;
