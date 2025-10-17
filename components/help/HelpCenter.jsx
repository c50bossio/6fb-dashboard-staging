'use client'

import { 
  QuestionMarkCircleIcon, 
  MagnifyingGlassIcon,
  BookOpenIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

const HELP_ARTICLES = [
  {
    id: 1,
    category: 'Getting Started',
    title: 'How to create your first booking',
    content: 'Learn how to create and manage bookings in the system.',
    videoUrl: '/help/videos/first-booking.mp4',
    readTime: '3 min'
  },
  {
    id: 2,
    category: 'Getting Started',
    title: 'Setting up your barbershop profile',
    content: 'Configure your barbershop details, services, and operating hours.',
    readTime: '5 min'
  },
  {
    id: 3,
    category: 'Bookings',
    title: 'Managing recurring appointments',
    content: 'Set up and manage recurring appointments for regular customers.',
    readTime: '4 min'
  },
  {
    id: 4,
    category: 'Payments',
    title: 'Processing payments and refunds',
    content: 'Handle customer payments, tips, and process refunds when needed.',
    readTime: '6 min'
  },
  {
    id: 5,
    category: 'Analytics',
    title: 'Understanding your analytics dashboard',
    content: 'Interpret metrics and use data to grow your business.',
    videoUrl: '/help/videos/analytics.mp4',
    readTime: '7 min'
  },
  {
    id: 6,
    category: 'AI Features',
    title: 'Using the AI Assistant',
    content: 'Get the most out of your AI business assistant.',
    readTime: '4 min'
  }
]

const FAQ_ITEMS = [
  {
    question: 'How do I cancel a booking?',
    answer: 'Navigate to the booking in your calendar, click on it, and select "Cancel Booking". You can optionally send a notification to the customer.'
  },
  {
    question: 'Can I integrate with my existing calendar?',
    answer: 'Yes! Go to Settings > Integrations and connect your Google Calendar or other calendar services.'
  },
  {
    question: 'How are commissions calculated?',
    answer: 'Commissions are calculated based on the payment model you set up for each barber. You can configure this in Staff Management.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use bank-level encryption and comply with all data protection regulations including GDPR.'
  },
  {
    question: 'Can customers book online?',
    answer: 'Yes, you can share your booking link or embed the booking widget on your website for online bookings.'
  }
]

export default function HelpCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [expandedFAQ, setExpandedFAQ] = useState(null)

  // Keyboard shortcut for help (Cmd/Ctrl + /)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setIsOpen(!isOpen)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen])

  const categories = ['all', ...new Set(HELP_ARTICLES.map(a => a.category))]
  
  const filteredArticles = HELP_ARTICLES.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleContactSupport = () => {
    // Open support chat or email
    window.open('mailto:support@6fbagent.com?subject=Help Request', '_blank')
  }

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 bg-gray-800 text-white rounded-full p-3 shadow-lg hover:bg-gray-700 transition-colors group"
        aria-label="Open help center"
      >
        <QuestionMarkCircleIcon className="h-6 w-6" />
        <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Help (⌘/)
        </span>
      </button>

      {/* Help Center Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-5">
            {/* Header */}
            <div className="bg-gradient-to-r from-olive-600 to-gold-600 text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Help Center</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:text-gray-200"
                  aria-label="Close help center"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for help..."
                  className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex h-[calc(90vh-200px)]">
              {/* Sidebar */}
              <div className="w-64 border-r border-gray-200 p-4 overflow-y-auto">
                <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
                <div className="space-y-1">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCategory === category
                          ? 'bg-olive-50 text-olive-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {category === 'all' ? 'All Articles' : category}
                    </button>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Quick Links</h3>
                  <div className="space-y-2">
                    <button className="flex items-center space-x-2 text-sm text-gray-700 hover:text-olive-600">
                      <VideoCameraIcon className="h-4 w-4" />
                      <span>Video Tutorials</span>
                    </button>
                    <button className="flex items-center space-x-2 text-sm text-gray-700 hover:text-olive-600">
                      <BookOpenIcon className="h-4 w-4" />
                      <span>User Guide</span>
                    </button>
                    <button 
                      onClick={handleContactSupport}
                      className="flex items-center space-x-2 text-sm text-gray-700 hover:text-olive-600"
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      <span>Contact Support</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto">
                {selectedArticle ? (
                  // Article View
                  <div className="p-6">
                    <button
                      onClick={() => setSelectedArticle(null)}
                      className="text-olive-600 hover:text-olive-700 text-sm mb-4"
                    >
                      ← Back to articles
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedArticle.title}
                    </h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6">
                      <span>{selectedArticle.category}</span>
                      <span>•</span>
                      <span>{selectedArticle.readTime} read</span>
                    </div>
                    <div className="prose max-w-none">
                      <p>{selectedArticle.content}</p>
                      {selectedArticle.videoUrl && (
                        <div className="mt-6">
                          <h3 className="text-lg font-semibold mb-2">Video Tutorial</h3>
                          <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center">
                            <VideoCameraIcon className="h-12 w-12 text-gray-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Articles List
                  <div className="p-6">
                    {/* Articles */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Help Articles {searchQuery && `(${filteredArticles.length} results)`}
                      </h3>
                      <div className="grid gap-4">
                        {filteredArticles.map(article => (
                          <button
                            key={article.id}
                            onClick={() => setSelectedArticle(article)}
                            className="text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-olive-300 hover:shadow-md transition-all group"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900 group-hover:text-olive-600">
                                  {article.title}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">{article.content}</p>
                                <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                                  <span>{article.category}</span>
                                  {article.videoUrl && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center">
                                        <VideoCameraIcon className="h-3 w-3 mr-1" />
                                        Video
                                      </span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span>{article.readTime}</span>
                                </div>
                              </div>
                              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-olive-600 flex-shrink-0 ml-4" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* FAQ */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Frequently Asked Questions
                      </h3>
                      <div className="space-y-3">
                        {FAQ_ITEMS.map((faq, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 rounded-lg overflow-hidden"
                          >
                            <button
                              onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                            >
                              <span className="font-medium text-gray-900">{faq.question}</span>
                              <span className="text-gray-400">
                                {expandedFAQ === index ? '−' : '+'}
                              </span>
                            </button>
                            {expandedFAQ === index && (
                              <div className="px-4 pb-3 text-sm text-gray-600">
                                {faq.answer}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}