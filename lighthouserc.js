module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:9999',
        'http://localhost:9999/dashboard',
        'http://localhost:9999/dashboard/agents',
        'http://localhost:9999/dashboard/integrations',
        'http://localhost:9999/login',
        'http://localhost:9999/register'
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop'
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.8 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        'categories:pwa': ['warn', { minScore: 0.6 }],
      }
    },
    upload: {
      target: 'temporary-public-storage',
    },
    server: {
      port: 9001,
      storage: './lighthouse-data'
    }
  }
}