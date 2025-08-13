/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Image optimization
  images: {
    domains: ['localhost', 'supabase.co', 'avatars.githubusercontent.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  // Bundle optimization
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@heroicons/react',
      'date-fns',
      '@supabase/supabase-js',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@fullcalendar/react',
      '@stripe/react-stripe-js',
      'react-hot-toast',
      'posthog-js',
      'pusher-js',
      'qrcode'
    ],
    serverComponentsExternalPackages: [
      '@anthropic-ai/sdk',
      'openai',
      '@google/generative-ai',
      'nodemailer',
      'bull',
      'ioredis',
      '@sendgrid/mail',
      'stripe',
      'pusher',
      'twilio',
      'axios',
      'luxon',
      'uuid',
      'otplib',
      'limiter',
      'html2canvas',
      'jspdf',
      'qrcode',
      'canvas-confetti',
      'posthog-node',
      'recharts',
      'chart.js',
      'react-chartjs-2',
      '@fullcalendar/core',
      '@fullcalendar/daygrid',
      '@fullcalendar/timegrid',
      '@fullcalendar/react',
      '@fullcalendar/resource',
      '@fullcalendar/resource-timegrid',
      '@fullcalendar/resource-timeline',
      '@fullcalendar/interaction',
      '@fullcalendar/list',
      '@fullcalendar/rrule'
    ],
    esmExternals: true,
    serverExternalPackages: [
      '@anthropic-ai/sdk',
      'openai',
      '@google/generative-ai',
      'nodemailer',
      'bull',
      'ioredis',
      '@sendgrid/mail',
      'stripe',
      'pusher',
      'twilio'
    ],
  },
  
  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Bundle analyzer for production builds
    if (!dev && !isServer) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: '../analyze/client.html',
          openAnalyzer: false,
        })
      )
    }
    
    // Production optimizations
    if (!dev) {
      // Tree shaking and dead code elimination
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk (smaller)
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 50,
              enforce: true,
              maxSize: 5242880, // 5MB limit
            },
            // Calendar libraries (heavy)
            calendar: {
              test: /[\\/]node_modules[\\/](@fullcalendar)[\\/]/,
              name: 'calendar-libs',
              chunks: 'async',
              priority: 48,
              maxSize: 1048576, // 1MB limit per chunk
            },
            // Chart libraries (heavy)
            charts: {
              test: /[\\/]node_modules[\\/](recharts|chart\.js|react-chartjs-2)[\\/]/,
              name: 'chart-libs',
              chunks: 'async',
              priority: 47,
              maxSize: 1048576, // 1MB limit per chunk
            },
            // Large libraries separated
            large: {
              test: /[\\/]node_modules[\\/](@radix-ui|html2canvas|jspdf|canvas-confetti)[\\/]/,
              name: 'large-libs',
              chunks: 'async',
              priority: 45,
              maxSize: 1048576, // 1MB limit per chunk
            },
            // AI/ML libraries
            ai: {
              test: /[\\/]node_modules[\\/](@anthropic-ai|openai|@google|ai)[\\/]/,
              name: 'ai-libs',
              chunks: 'async',
              priority: 40,
              maxSize: 2097152, // 2MB limit
            },
            // UI libraries
            ui: {
              test: /[\\/]node_modules[\\/](@heroicons|lucide-react|@headlessui|posthog|pusher)[\\/]/,
              name: 'ui-libs',
              chunks: 'async',
              priority: 35,
              maxSize: 1048576, // 1MB limit
            },
            // Utilities
            utils: {
              test: /[\\/]node_modules[\\/](date-fns|luxon|uuid|zod|clsx|tailwind)[\\/]/,
              name: 'utils',
              chunks: 'async',
              priority: 30,
              maxSize: 524288, // 512KB limit
            },
            // Common components (much smaller chunks)
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
              maxSize: 262144, // 256KB limit
            },
          },
          maxAsyncRequests: 100,
          maxInitialRequests: 30,
          minSize: 10000,
          maxSize: 262144, // Global max size 256KB
        },
      }
      
      // Aggressive dead code elimination
      config.resolve.alias = {
        ...config.resolve.alias,
        // Remove unused imports
        '@sentry/react': false,
        '@sentry/nextjs': false,
      }
      
      // Remove development-only modules in production
      config.plugins = config.plugins || []
      if (config.plugins) {
        config.plugins = config.plugins.filter(plugin => 
          !plugin.constructor.name.includes('HotModuleReplacementPlugin')
        )
      }
    }
    
    return config
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
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  
  // Performance monitoring
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  
  // Output configuration - remove standalone for Vercel deployment
  // output: 'standalone',
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
}

// Add crypto import for webpack config
const crypto = require('crypto')

export default nextConfig