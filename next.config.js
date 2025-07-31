/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
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
        },
      };
    }
    return config;
  },
  
  // Environment-specific API rewrites
  async rewrites() {
    const isDev = process.env.NODE_ENV === 'development';
    const apiUrl = isDev 
      ? 'http://localhost:8001' 
      : process.env.NEXT_PUBLIC_API_URL || 'https://6fb-ai-backend-staging.onrender.com';
      
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