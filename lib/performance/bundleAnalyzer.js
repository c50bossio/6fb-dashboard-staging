'use client'

/**
 * Bundle Size Analyzer and Optimizer
 * Provides insights and recommendations for reducing bundle sizes
 */

import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'

// Bundle analysis configuration
const BUNDLE_CONFIG = {
  // Size thresholds (bytes)
  thresholds: {
    warning: 244 * 1024,    // 244kb - warning threshold
    error: 488 * 1024,      // 488kb - error threshold
    criticalChunk: 100 * 1024, // 100kb - critical chunk size
    asyncChunk: 200 * 1024,    // 200kb - async chunk size
  },
  
  // Optimization targets
  targets: {
    firstLoadJS: 128 * 1024,   // 128kb target for first load JS
    totalBundle: 512 * 1024,   // 512kb target for total bundle
    asyncChunks: 244 * 1024,   // 244kb target for async chunks
  },
  
  // Analysis settings
  reportFormat: 'html',
  reportPath: './performance-reports/bundle-analysis.html',
  generateStatsFile: true,
  statsFilename: './performance-reports/bundle-stats.json',
}

// Webpack configuration for bundle analysis
export function getBundleAnalyzerConfig(isAnalyzing = false) {
  const plugins = []
  
  if (isAnalyzing) {
    plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: BUNDLE_CONFIG.reportPath,
        generateStatsFile: BUNDLE_CONFIG.generateStatsFile,
        statsFilename: BUNDLE_CONFIG.statsFilename,
        openAnalyzer: true,
        logLevel: 'info',
      })
    )
  }
  
  return {
    plugins,
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Vendor chunk for third-party libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            chunks: 'all',
            maxSize: BUNDLE_CONFIG.targets.asyncChunks,
          },
          
          // React/Next.js specific
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'framework',
            priority: 20,
            chunks: 'all',
            maxSize: BUNDLE_CONFIG.targets.asyncChunks,
          },
          
          // Common booking components
          booking: {
            test: /[\\/]components[\\/]booking[\\/]/,
            name: 'booking',
            priority: 15,
            chunks: 'async',
            maxSize: BUNDLE_CONFIG.targets.asyncChunks,
            minChunks: 2,
          },
          
          // UI components
          ui: {
            test: /[\\/]components[\\/]ui[\\/]/,
            name: 'ui',
            priority: 12,
            chunks: 'all',
            maxSize: BUNDLE_CONFIG.targets.criticalChunk,
            minChunks: 3,
          },
          
          // Utility libraries
          utils: {
            test: /[\\/]lib[\\/]/,
            name: 'utils',
            priority: 8,
            chunks: 'all',
            maxSize: BUNDLE_CONFIG.targets.criticalChunk,
            minChunks: 2,
          },
          
          // Default chunk
          default: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
            maxSize: BUNDLE_CONFIG.targets.asyncChunks,
          },
        },
      },
      
      // Module concatenation (scope hoisting)
      concatenateModules: true,
      
      // Remove empty chunks
      removeEmptyChunks: true,
      
      // Merge duplicate chunks
      mergeDuplicateChunks: true,
      
      // Tree shaking optimization
      usedExports: true,
      sideEffects: false,
      
      // Minimize configuration
      minimize: process.env.NODE_ENV === 'production',
      minimizer: [],
    },
    
    // Performance hints
    performance: {
      hints: 'warning',
      maxEntrypointSize: BUNDLE_CONFIG.thresholds.warning,
      maxAssetSize: BUNDLE_CONFIG.thresholds.error,
      assetFilter: (assetFilename) => {
        // Only analyze JS and CSS files
        return /\.(js|css)$/.test(assetFilename)
      },
    },
    
    // Stats configuration for detailed analysis
    stats: {
      assets: true,
      chunks: true,
      chunkModules: true,
      chunkOrigins: true,
      modules: true,
      moduleTrace: true,
      reasons: true,
      usedExports: true,
      providedExports: true,
      optimizationBailout: true,
      errorDetails: true,
      colors: true,
      hash: false,
      timings: true,
      builtAt: true,
    },
  }
}

// Bundle size analyzer class
export class BundleSizeAnalyzer {
  constructor(statsData) {
    this.stats = statsData
    this.assets = statsData?.assets || []
    this.chunks = statsData?.chunks || []
    this.modules = statsData?.modules || []
  }
  
  // Analyze overall bundle performance
  analyze() {
    const analysis = {
      totalSize: this.getTotalBundleSize(),
      firstLoadJS: this.getFirstLoadJSSize(),
      asyncChunks: this.getAsyncChunksSize(),
      largestChunks: this.getLargestChunks(10),
      heaviestModules: this.getHeaviestModules(20),
      duplicateModules: this.findDuplicateModules(),
      recommendations: [],
    }
    
    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis)
    
    return analysis
  }
  
  getTotalBundleSize() {
    return this.assets.reduce((total, asset) => {
      if (asset.name.endsWith('.js') || asset.name.endsWith('.css')) {
        return total + asset.size
      }
      return total
    }, 0)
  }
  
  getFirstLoadJSSize() {
    const firstLoadChunks = this.chunks.filter(chunk => 
      chunk.initial && chunk.files.some(file => file.endsWith('.js'))
    )
    
    return firstLoadChunks.reduce((total, chunk) => {
      return total + chunk.size
    }, 0)
  }
  
  getAsyncChunksSize() {
    const asyncChunks = this.chunks.filter(chunk => !chunk.initial)
    
    return asyncChunks.reduce((total, chunk) => {
      return total + chunk.size
    }, 0)
  }
  
  getLargestChunks(limit = 10) {
    return this.chunks
      .sort((a, b) => b.size - a.size)
      .slice(0, limit)
      .map(chunk => ({
        name: chunk.names[0] || chunk.id,
        size: chunk.size,
        files: chunk.files,
        modules: chunk.modules?.length || 0,
      }))
  }
  
  getHeaviestModules(limit = 20) {
    return this.modules
      .sort((a, b) => b.size - a.size)
      .slice(0, limit)
      .map(module => ({
        name: this.cleanModuleName(module.name),
        size: module.size,
        chunks: module.chunks,
        issuer: module.issuer,
      }))
  }
  
  findDuplicateModules() {
    const moduleMap = new Map()
    
    this.modules.forEach(module => {
      const cleanName = this.cleanModuleName(module.name)
      if (!moduleMap.has(cleanName)) {
        moduleMap.set(cleanName, [])
      }
      moduleMap.get(cleanName).push(module)
    })
    
    // Return modules that appear in multiple chunks
    const duplicates = []
    moduleMap.forEach((instances, moduleName) => {
      if (instances.length > 1) {
        const totalSize = instances.reduce((sum, instance) => sum + instance.size, 0)
        const chunks = [...new Set(instances.flatMap(instance => instance.chunks))]
        
        if (chunks.length > 1) {
          duplicates.push({
            name: moduleName,
            instances: instances.length,
            totalSize,
            chunks,
            wastedSize: totalSize - instances[0].size,
          })
        }
      }
    })
    
    return duplicates.sort((a, b) => b.wastedSize - a.wastedSize)
  }
  
  generateRecommendations(analysis) {
    const recommendations = []
    
    // First load JS recommendations
    if (analysis.firstLoadJS > BUNDLE_CONFIG.targets.firstLoadJS) {
      recommendations.push({
        type: 'critical',
        category: 'First Load Performance',
        message: `First load JS size (${this.formatBytes(analysis.firstLoadJS)}) exceeds target (${this.formatBytes(BUNDLE_CONFIG.targets.firstLoadJS)})`,
        suggestions: [
          'Move non-critical components to lazy loading',
          'Split large vendor libraries into separate chunks',
          'Use dynamic imports for heavy features',
          'Consider removing unused dependencies',
        ],
      })
    }
    
    // Total bundle size recommendations
    if (analysis.totalSize > BUNDLE_CONFIG.targets.totalBundle) {
      recommendations.push({
        type: 'warning',
        category: 'Bundle Size',
        message: `Total bundle size (${this.formatBytes(analysis.totalSize)}) is larger than recommended`,
        suggestions: [
          'Enable tree shaking for unused code elimination',
          'Use webpack-bundle-analyzer to identify heavy modules',
          'Consider alternative lighter libraries',
          'Implement code splitting strategies',
        ],
      })
    }
    
    // Large chunks recommendations
    const largeChunks = analysis.largestChunks.filter(chunk => 
      chunk.size > BUNDLE_CONFIG.thresholds.warning
    )
    
    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'warning',
        category: 'Chunk Optimization',
        message: `${largeChunks.length} chunks exceed size recommendations`,
        suggestions: [
          'Split large chunks using dynamic imports',
          'Move heavy dependencies to separate chunks',
          'Implement route-based code splitting',
          'Use React.lazy() for component splitting',
        ],
        details: largeChunks.map(chunk => 
          `${chunk.name}: ${this.formatBytes(chunk.size)}`
        ),
      })
    }
    
    // Duplicate modules recommendations
    if (analysis.duplicateModules.length > 0) {
      const totalWasted = analysis.duplicateModules.reduce(
        (sum, dup) => sum + dup.wastedSize, 0
      )
      
      recommendations.push({
        type: 'optimization',
        category: 'Code Deduplication',
        message: `${analysis.duplicateModules.length} duplicate modules wasting ${this.formatBytes(totalWasted)}`,
        suggestions: [
          'Configure webpack SplitChunksPlugin to extract common modules',
          'Review import patterns to avoid multiple instances',
          'Use externals for libraries loaded via CDN',
          'Optimize chunk splitting strategy',
        ],
        details: analysis.duplicateModules.slice(0, 5).map(dup =>
          `${dup.name}: ${this.formatBytes(dup.wastedSize)} wasted`
        ),
      })
    }
    
    // Heavy modules recommendations
    const heavyModules = analysis.heaviestModules.filter(module =>
      module.size > BUNDLE_CONFIG.thresholds.criticalChunk
    )
    
    if (heavyModules.length > 0) {
      recommendations.push({
        type: 'optimization',
        category: 'Module Optimization',
        message: `${heavyModules.length} modules are particularly heavy`,
        suggestions: [
          'Lazy load heavy modules when possible',
          'Find lighter alternatives for heavy dependencies',
          'Use import maps for optimal module resolution',
          'Consider module federation for shared dependencies',
        ],
        details: heavyModules.slice(0, 5).map(module =>
          `${module.name}: ${this.formatBytes(module.size)}`
        ),
      })
    }
    
    return recommendations
  }
  
  cleanModuleName(name) {
    // Remove webpack-specific prefixes and suffixes
    return name
      .replace(/^\.\//, '')
      .replace(/\?.*$/, '')
      .replace(/!.*!/, '')
      .replace(/^.*\/node_modules\//, '')
      .replace(/\/index\.js$/, '')
  }
  
  formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
  }
  
  // Export analysis to different formats
  exportToHTML() {
    const analysis = this.analyze()
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bundle Analysis Report</title>
          <style>
            body { font-family: system-ui, sans-serif; margin: 2rem; }
            .metric { background: #f5f5f5; padding: 1rem; margin: 1rem 0; border-radius: 8px; }
            .critical { border-left: 4px solid #ef4444; }
            .warning { border-left: 4px solid #f59e0b; }
            .optimization { border-left: 4px solid #3b82f6; }
            .good { border-left: 4px solid #10b981; }
            .chunk-list { display: grid; gap: 0.5rem; }
            .chunk-item { background: white; padding: 0.5rem; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>6FB Booking System - Bundle Analysis</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          
          <div class="metric ${analysis.totalSize > BUNDLE_CONFIG.targets.totalBundle ? 'warning' : 'good'}">
            <h3>Total Bundle Size</h3>
            <p><strong>${this.formatBytes(analysis.totalSize)}</strong> (Target: ${this.formatBytes(BUNDLE_CONFIG.targets.totalBundle)})</p>
          </div>
          
          <div class="metric ${analysis.firstLoadJS > BUNDLE_CONFIG.targets.firstLoadJS ? 'critical' : 'good'}">
            <h3>First Load JS</h3>
            <p><strong>${this.formatBytes(analysis.firstLoadJS)}</strong> (Target: ${this.formatBytes(BUNDLE_CONFIG.targets.firstLoadJS)})</p>
          </div>
          
          <div class="metric">
            <h3>Async Chunks Size</h3>
            <p><strong>${this.formatBytes(analysis.asyncChunks)}</strong></p>
          </div>
          
          <h2>Recommendations</h2>
          ${analysis.recommendations.map(rec => `
            <div class="metric ${rec.type}">
              <h3>${rec.category}</h3>
              <p>${rec.message}</p>
              <ul>
                ${rec.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
              </ul>
              ${rec.details ? `
                <details>
                  <summary>Details</summary>
                  <ul>${rec.details.map(detail => `<li>${detail}</li>`).join('')}</ul>
                </details>
              ` : ''}
            </div>
          `).join('')}
          
          <h2>Largest Chunks</h2>
          <div class="chunk-list">
            ${analysis.largestChunks.map(chunk => `
              <div class="chunk-item">
                <strong>${chunk.name}</strong> - ${this.formatBytes(chunk.size)}
                <br><small>${chunk.modules} modules, Files: ${chunk.files.join(', ')}</small>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `
  }
  
  exportToJSON() {
    return JSON.stringify(this.analyze(), null, 2)
  }
}

// Utility function to analyze existing bundle
export async function analyzeBundleFromStats(statsPath) {
  try {
    const fs = await import('fs/promises')
    const statsData = JSON.parse(await fs.readFile(statsPath, 'utf8'))
    const analyzer = new BundleSizeAnalyzer(statsData)
    return analyzer.analyze()
  } catch (error) {
    console.error('Failed to analyze bundle:', error)
    return null
  }
}

// Next.js configuration helper
export function withBundleAnalyzer(nextConfig = {}) {
  return {
    ...nextConfig,
    webpack: (config, options) => {
      // Apply existing webpack config
      if (nextConfig.webpack) {
        config = nextConfig.webpack(config, options)
      }
      
      // Add bundle analyzer configuration
      if (process.env.ANALYZE === 'true') {
        const analyzerConfig = getBundleAnalyzerConfig(true)
        config.plugins.push(...analyzerConfig.plugins)
        Object.assign(config.optimization, analyzerConfig.optimization)
        Object.assign(config.performance, analyzerConfig.performance)
      }
      
      return config
    },
  }
}