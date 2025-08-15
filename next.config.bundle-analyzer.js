/**
 * Next.js configuration with bundle analyzer for optimization
 * Run with: ANALYZE=true npm run build
 */

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  swcMinify: true,
  
  images: {
    domains: [
      'localhost',
      'placehold.co',
      'via.placeholder.com',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      'platform-lookaside.fbsbx.com',
      'pbs.twimg.com',
      'supabase.co',
      'dfhqjdoydihajmjxniee.supabase.co'
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'async',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            ui: {
              name: 'ui',
              test: /components\/ui/,
              chunks: 'all',
              priority: 30,
            },
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
              chunks: 'all',
              priority: 40,
            },
            supabase: {
              name: 'supabase',
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              chunks: 'all',
              priority: 35,
            },
            calendar: {
              name: 'calendar',
              test: /[\\/]node_modules[\\/](@fullcalendar|fullcalendar)[\\/]/,
              chunks: 'async',
              priority: 25,
            },
            charts: {
              name: 'charts',
              test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,
              chunks: 'async',
              priority: 25,
            },
          },
        },
      }
    }
    
    config.optimization.sideEffects = false
    
    config.optimization.minimize = true
    
    return config
  },
  
  experimental: {
    optimizeFonts: true,
    optimizeImages: true,
    scrollRestoration: true,
  },
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  
  async redirects() {
    return []
  },
  
  async rewrites() {
    return []
  },
})