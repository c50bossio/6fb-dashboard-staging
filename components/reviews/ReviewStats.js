'use client'

import {
  StarIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

export default function ReviewStats({ 
  stats = {}, 
  showTrends = false,
  compact = false,
  className = '' 
}) {
  const {
    totalReviews = 0,
    averageRating = 0,
    attributedReviews = 0,
    positiveReviews = 0,
    ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    weeklyTrend = 0,
    monthlyTrend = 0
  } = stats

  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
          <StarIconSolid
            key={star}
            className={`h-5 w-5 ${star <= Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    )
  }

  const maxRatingCount = Math.max(...Object.values(ratingDistribution))

  if (compact) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{totalReviews}</p>
          <p className="text-sm text-gray-500">Total Reviews</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
          <p className="text-sm text-gray-500">Avg Rating</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{attributedReviews}</p>
          <p className="text-sm text-gray-500">Attributed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{positiveReviews}%</p>
          <p className="text-sm text-gray-500">Positive</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Reviews</p>
              <p className="text-2xl font-semibold text-gray-900">{totalReviews}</p>
              {showTrends && weeklyTrend !== 0 && (
                <p className={`text-xs mt-1 ${weeklyTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {weeklyTrend > 0 ? '+' : ''}{weeklyTrend}% this week
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <StarIcon className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Average Rating</p>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-semibold text-gray-900">{averageRating.toFixed(1)}</p>
                {renderStars(averageRating)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Attributed</p>
              <p className="text-2xl font-semibold text-gray-900">{attributedReviews}</p>
              <p className="text-xs text-gray-500 mt-1">
                {totalReviews > 0 ? Math.round((attributedReviews / totalReviews) * 100) : 0}% of total
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Positive</p>
              <p className="text-2xl font-semibold text-gray-900">{positiveReviews}</p>
              <p className="text-xs text-gray-500 mt-1">4+ stars</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Rating Distribution</h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map(rating => {
            const count = ratingDistribution[rating] || 0
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
            const barWidth = maxRatingCount > 0 ? (count / maxRatingCount) * 100 : 0
            
            return (
              <div key={rating} className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 w-20">
                  <span className="text-sm font-medium text-gray-700">{rating}</span>
                  <StarIconSolid className="h-4 w-4 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-600 w-20 text-right">
                  {count} ({percentage.toFixed(0)}%)
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Trends */}
      {showTrends && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Weekly Trend</p>
                <p className={`text-2xl font-bold ${weeklyTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {weeklyTrend > 0 ? '+' : ''}{weeklyTrend}%
                </p>
              </div>
              <TrendingUpIcon className={`h-8 w-8 ${weeklyTrend >= 0 ? 'text-green-500' : 'text-red-500 rotate-180'}`} />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Monthly Trend</p>
                <p className={`text-2xl font-bold ${monthlyTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {monthlyTrend > 0 ? '+' : ''}{monthlyTrend}%
                </p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}