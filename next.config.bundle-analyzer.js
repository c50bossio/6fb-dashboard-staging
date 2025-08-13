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
  
  // Image optimization
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
  
  // Optimize build output
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Module aliases
  webpack: (config, { isServer }) => {
    // Bundle optimizations
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor code splitting
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common components
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'async',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // UI components bundle
            ui: {
              name: 'ui',
              test: /components\/ui/,
              chunks: 'all',
              priority: 30,
            },
            // Separate large libraries
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
    
    // Tree shaking
    config.optimization.sideEffects = false
    
    // Minimize main bundle
    config.optimization.minimize = true
    
    return config
  },
  
  // Experimental features for better performance
  experimental: {
    optimizeFonts: true,
    optimizeImages: true,
    scrollRestoration: true,
  },
  
  // Headers for caching
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
  
  // Redirects
  async redirects() {
    return []
  },
  
  // Rewrites
  async rewrites() {
    return []
  },
})