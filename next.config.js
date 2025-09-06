import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
    ignoreDuringBuilds: true, // Force disable
    dirs: [],
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Enable SWC minification for faster builds
  swcMinify: true,
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
  
  // Generate unique build ID for cache busting
  generateBuildId: async () => {
    // Use timestamp for unique build ID
    const buildId = Date.now().toString();
    
    return buildId;
  },
  
  // Expose build ID to client for cache validation
  env: {
    NEXT_PUBLIC_BUILD_ID: Date.now().toString(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    // Explicitly expose Supabase environment variables
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // Skip static generation for test pages in production
  ...(process.env.NODE_ENV === 'production' && {
    skipMiddlewareUrlNormalize: true,
    skipTrailingSlashRedirect: true,
  }),

  // Experimental features for optimizing bundle
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    // Reduce build memory usage
    workerThreads: false,
    cpus: 1,
  },

  // Output settings
  output: 'standalone',
  
  // Enable edge runtime for API routes (better performance)
  ...(process.env.VERCEL === '1' && {
    // Vercel-specific optimizations
    images: {
      domains: ['localhost'],
    },
  }),

  // Webpack configuration for legacy browser support
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Remove Preact aliasing - causes React 18 hook compatibility issues
    // Keeping React for better compatibility with modern features

    // Bundle analyzer in development
    if (dev) {
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.ANALYZE': JSON.stringify(process.env.ANALYZE),
        }),
      );
    }
    
    // Ensure .js extensions are resolved
    config.resolve.extensions = ['.js', '.jsx', '.ts', '.tsx', '.json']
    
    // Minimal webpack fallbacks - let lazy loading handle the rest
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    
    return config
  },

  // Optimize redirects and headers for production
  async redirects() {
    return [
      // Add production redirects here
    ];
  },

  async headers() {
    return [
      // CORS headers for API routes
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://bookedbarber.com' 
              : '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
      // Add cache control headers for static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;