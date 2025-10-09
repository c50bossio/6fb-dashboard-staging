'use client'

export default function SEODashboardTest() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-muted p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-card-foreground mb-8">
          🚀 AI SEO Dashboard - Test Version
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-card rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">Organic Traffic</h3>
            <p className="text-3xl font-bold text-olive-600">2,847</p>
            <p className="text-green-600">+23.5%</p>
          </div>
          
          <div className="bg-white dark:bg-card rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">Keywords Ranking</h3>
            <p className="text-3xl font-bold text-olive-600">98</p>
            <p className="text-gray-500 dark:text-gray-300">out of 156</p>
          </div>
          
          <div className="bg-white dark:bg-card rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">Review Score</h3>
            <p className="text-3xl font-bold text-olive-600">4.8</p>
            <p className="text-amber-800">⭐⭐⭐⭐⭐</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-card rounded-xl p-6 shadow-sm border">
          <h3 className="text-xl font-semibold mb-4">AI Recommendations</h3>
          <div className="space-y-3">
            <div className="border-l-4 border-olive-500 pl-4">
              <h4 className="font-medium">Increase blog posting frequency</h4>
              <p className="text-gray-600 dark:text-gray-300">Post 3x per week to outpace competitors</p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-medium">Optimize Google My Business</h4>
              <p className="text-gray-600 dark:text-gray-300">Add more photos and post daily updates</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-gray-600 dark:text-gray-300">✅ Basic dashboard rendering works</p>
          <p className="text-gray-600 dark:text-gray-300">🔧 Ready to test API connections</p>
        </div>
      </div>
    </div>
  )
}