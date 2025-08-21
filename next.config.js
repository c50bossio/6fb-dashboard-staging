const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Generate unique build ID for cache busting
  generateBuildId: async () => {
    // Use timestamp for unique build ID
    const buildId = Date.now().toString();
    console.log(`[Build] Generating build ID: ${buildId}`);
    return buildId;
  },
  
  // Expose build ID to client for cache validation
  env: {
    NEXT_PUBLIC_BUILD_ID: Date.now().toString(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  
  // Experimental features for optimizing bundle
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@sentry/cli',
        'node_modules/puppeteer',
        'node_modules/@playwright',
        'node_modules/playwright',
        'node_modules/@fullcalendar',
        'node_modules/canvas-confetti',
        'node_modules/html2canvas',
        'node_modules/jspdf',
        'node_modules/chart.js',
        'node_modules/recharts',
        'node_modules/@faker-js',
        'node_modules/@testing-library',
        'node_modules/jest',
        'node_modules/webpack-bundle-analyzer',
      ],
    },
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
    }
    // Ensure .js extensions are resolved
    config.resolve.extensions = ['.js', '.jsx', '.ts', '.tsx', '.json']
    return config
  },
  
  async headers() {
    return [
      {
        source: '/book/:barberId/embed',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *;",
          },
        ],
      },
      // Add cache control headers for static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, immutable, max-age=31536000',
          },
        ],
      },
      // Use stale-while-revalidate for HTML pages
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=1, stale-while-revalidate=59',
          },
        ],
      },
    ];
  },

  async rewrites() {
    const isDev = process.env.NODE_ENV === 'development';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || (isDev 
      ? 'http://127.0.0.1:8001' 
      : 'https://6fb-ai-backend-staging.onrender.com');
      
    return [
      {
        source: '/fastapi/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;