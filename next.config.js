const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  
  // Path aliases for cleaner imports
  webpack: (config, { dev, isServer }) => {
    // Add path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '.'),
      '@/components': path.resolve(__dirname, 'components'),
      '@/lib': path.resolve(__dirname, 'lib'),
      '@/hooks': path.resolve(__dirname, 'hooks'),
      '@/contexts': path.resolve(__dirname, 'contexts'),
      '@/services': path.resolve(__dirname, 'services'),
      '@/utils': path.resolve(__dirname, 'utils'),
    }
    
    // Optimize for production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          heroicons: {
            test: /[\\/]node_modules[\\/]@heroicons[\\/]/,
            name: 'heroicons',
            priority: 20,
            reuseExistingChunk: true,
          },
          recharts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: 'recharts',
            priority: 25,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Environment-specific API rewrites
  async rewrites() {
    const isDev = process.env.NODE_ENV === 'development';
    // Use NEXT_PUBLIC_API_URL if set (for Docker), otherwise default based on environment
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || (isDev 
      ? 'http://localhost:8001' 
      : 'https://6fb-ai-backend-staging.onrender.com');
      
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;