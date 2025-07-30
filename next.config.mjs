/** @type {import('next').NextConfig} */
const nextConfig = {
  // Core optimizations
  reactStrictMode: true,
  swcMinify: true,
  
  // Basic performance settings
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Simple webpack config without bundle analyzer
  webpack: (config, { isServer }) => {
    // Exclude server-only packages from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      }
    }
    return config
  },
}

export default nextConfig