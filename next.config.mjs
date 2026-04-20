/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  swcMinify: true,
  productionBrowserSourceMaps: false,
  compress: true,
  /*
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://balkanji-backend-ai5a.onrender.com/api/:path*',
      },
      {
        source: '/health',
        destination: 'https://balkanji-backend-ai5a.onrender.com/health/',
      },
    ]
  },
  */
}

export default nextConfig
