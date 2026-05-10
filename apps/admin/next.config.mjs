/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@quickprint/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000'}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000'}/socket.io/:path*`,
      }
    ];
  },
};
export default nextConfig;
