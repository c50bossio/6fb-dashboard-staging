/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Enable TypeScript checking during build for code quality
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Docker/standalone configuration
  output: 'standalone',
  
  // Custom server port configuration
  env: {
    PORT: process.env.PORT || '9999',
    CUSTOM_KEY: process.env.CUSTOM_KEY || 'development',
    BUNDLE_ANALYZE: process.env.ANALYZE || 'false',
    // Google OAuth configuration (server-side only)
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  },
  
  // Bundle optimization
  experimental: {
    optimizeCss: false,
    optimizePackageImports: [
      '@heroicons/react',
      'lucide-react',
      'recharts',
      'framer-motion'
    ],
    // Enable modern builds
    esmExternals: true,
  },

  // Performance optimizations
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    domains: ['localhost'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            dashboard: {
              test: /[\\/]components[\\/]dashboard[\\/]/,
              name: 'dashboard',
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
            },
            mobile: {
              test: /[\\/]components[\\/]mobile[\\/]/,
              name: 'mobile',
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
            },
            onboarding: {
              test: /[\\/]components[\\/]onboarding[\\/]/,
              name: 'onboarding',
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
            },
          },
        },
      }
      
      // Tree shaking optimization
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
    }

    return config
  },

  // Headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // API rewrites for backend integration
  async rewrites() {
    return [
      {
        source: '/api/agents/:path*',
        destination: process.env.INTERNAL_API_URL 
          ? `${process.env.INTERNAL_API_URL}/api/agents/:path*`
          : 'http://enhanced-agent-api:3001/api/agents/:path*',
      },
    ]
  },

  // Transpile packages - removed workspace packages since they're now local
}

module.exports = nextConfig