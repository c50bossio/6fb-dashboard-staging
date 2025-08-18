const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
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