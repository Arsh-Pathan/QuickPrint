/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@quickprint/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://backend:4000'}/api/:path*`, // Proxy to Backend
      },
      {
        source: '/socket.io/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://backend:4000'}/socket.io/:path*`, // Proxy logic for WebSocket if necessary
      }
    ];
  },
};
export default nextConfig;
