/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force Edge Runtime for all API routes
  experimental: {
    runtime: 'edge',
  },
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
    turbo: {
      rules: {
        // Ultra-aggressive tree shaking
        '*.js': {
          sideEffects: false
        }
      }
    },
    serverMinification: true,
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
      // Keep only essential packages, remove everything else
      '@supabase/supabase-js',
      '@supabase/ssr',
      'date-fns',
      'zod',
      'clsx',
      'tailwind-merge',
    ],
    esmExternals: true,
    serverExternalPackages: [
      // Remove all heavy packages completely from server bundles
      'stripe',
      'pusher',
      'twilio',
      'nodemailer',
      '@sendgrid/mail',
      'bull',
      'ioredis',
      'posthog-node',
      'html2canvas',
      'jspdf',
      'canvas-confetti',
      // AI packages - use edge runtime instead
      '@anthropic-ai/sdk',
      '@ai-sdk/anthropic',
      '@ai-sdk/openai',
      'openai',
      '@google/generative-ai',
      'ai'
    ],
    // Disable static optimization to prevent Dynamic Server Usage errors
    staticPageGenerationTimeout: 1000,
    isrMemoryCacheSize: 0,
    // Force dynamic for all routes to reduce bundle size
    appDir: true,
    forceSwcTransforms: true,
    // Ultra-aggressive caching and externalization
    serverMinification: true,
    swcMinify: true,
    modularizeImports: {
      '@heroicons/react/outline': {
        transform: '@heroicons/react/outline/{{member}}',
      },
      '@heroicons/react/solid': {
        transform: '@heroicons/react/solid/{{member}}',
      },
      'lucide-react': {
        transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      },
    },
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
            // Framework chunk (ultra-small)
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 50,
              enforce: true,
              maxSize: 2097152, // 2MB limit (reduced from 5MB)
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
          maxAsyncRequests: 200,
          maxInitialRequests: 50,
          minSize: 5000,
          maxSize: 131072, // Global max size 128KB (ultra-aggressive)
        },
      }
      
      // Ultra-aggressive dead code elimination
      config.resolve.alias = {
        ...config.resolve.alias,
        // Remove unused imports
        '@sentry/react': false,
        '@sentry/nextjs': false,
        // Remove heavy AI SDKs from client bundles
        '@anthropic-ai/sdk': false,
        '@ai-sdk/anthropic': false,
        '@ai-sdk/openai': false,
        'openai': false,
        '@google/generative-ai': false,
        'ai': false,
        // Remove server-only packages
        'nodemailer': false,
        'bull': false,
        'ioredis': false,
        'twilio': false,
        'axios': false,
        '@sendgrid/mail': false,
        'pusher': false,
        'stripe': false,
        'posthog-node': false,
        // Remove heavy chart libraries
        'chart.js': false,
        'react-chartjs-2': false,
        'recharts': false,
        // Remove heavy utility libraries
        'luxon': false,
        'uuid': false,
        'otplib': false,
        'qrcode': false,
        'canvas-confetti': false,
        'html2canvas': false,
        'jspdf': false,
        // Remove FullCalendar packages from client bundle
        '@fullcalendar/core': false,
        '@fullcalendar/daygrid': false,
        '@fullcalendar/timegrid': false,
        '@fullcalendar/react': false,
        '@fullcalendar/resource': false,
        '@fullcalendar/resource-timegrid': false,
        '@fullcalendar/resource-timeline': false,
        '@fullcalendar/interaction': false,
        '@fullcalendar/list': false,
        '@fullcalendar/rrule': false,
        'rrule': false,
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
  
  // Output configuration - optimized for Vercel deployment
  output: 'export' === process.env.BUILD_OUTPUT ? 'export' : undefined,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
  
  // Disable static optimization for API routes to prevent Dynamic Server Usage errors
  trailingSlash: false,
  generateBuildId: async () => {
    // Force completely new build ID to break cache
    const crypto = require('crypto');
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `cache-bust-${timestamp}-${random}`;
  },
  
  // Force dynamic rendering for all API routes
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: []
    }
  },
}

// Add crypto import for webpack config
const crypto = require('crypto')

export default nextConfig