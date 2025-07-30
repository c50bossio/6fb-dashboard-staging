// Enhanced next.config.js for bundle optimization
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode and SWC minification
  reactStrictMode: true,
  swcMinify: true,
  
  // Experimental optimizations for Next.js 14
  experimental: {
    // Automatic package import optimization
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react', 
      'recharts',
      '@headlessui/react'
    ],
    
    // Server-side optimizations
    optimizeServerReact: true,
    optimizeCss: true,
  },

  // Bundle optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
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
      
      // Exclude server-only dependencies
      config.externals = [
        ...config.externals,
        'googleapis',
        'google-auth-library',
        'bcryptjs', 
        'jsonwebtoken',
        'sqlite3',
        'pg'
      ]
    }

    // Bundle analyzer in development
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: 8888,
          openAnalyzer: true,
        })
      )
    }

    return config
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },
}

module.exports = withBundleAnalyzer(nextConfig)

// Package.json scripts to add:
// "analyze": "ANALYZE=true npm run build",
// "analyze:server": "ANALYZE=true npm run build && npm start",
// "bundle:size": "bundlesize"