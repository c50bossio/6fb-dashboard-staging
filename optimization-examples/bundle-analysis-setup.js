const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react', 
      'recharts',
      '@headlessui/react'
    ],
    
    optimizeServerReact: true,
    optimizeCss: true,
  },

  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
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

  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },
}

module.exports = withBundleAnalyzer(nextConfig)

// "analyze": "ANALYZE=true npm run build",
// "analyze:server": "ANALYZE=true npm run build && npm start",
// "bundle:size": "bundlesize"