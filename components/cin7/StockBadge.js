'use client'

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  CubeIcon
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

/**
 * StockBadge Component
 * Visual indicator for product stock levels with color coding and icons
 */
export default function StockBadge({ 
  stock, 
  minStock = 10, 
  maxStock = 100,
  size = 'normal', // 'small', 'normal', 'large'
  showDetails = false,
  showTrend = false,
  previousStock = null,
  className = ''
}) {
  // Determine stock status
  const getStockStatus = () => {
    if (stock <= 0) return 'out'
    if (stock <= minStock) return 'low'
    if (stock >= maxStock * 0.9) return 'overstocked'
    return 'normal'
  }

  const status = getStockStatus()
  
  // Calculate stock percentage
  const stockPercentage = Math.min((stock / maxStock) * 100, 100)
  
  // Get trend if previous stock is provided
  const getTrend = () => {
    if (!previousStock || previousStock === stock) return 'stable'
    return stock > previousStock ? 'up' : 'down'
  }
  
  const trend = showTrend ? getTrend() : null

  // Style configurations based on status
  const statusConfig = {
    out: {
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      iconColor: 'text-red-500',
      icon: XCircleIcon,
      label: 'Out of Stock',
      pulse: true
    },
    low: {
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700',
      iconColor: 'text-yellow-500',
      icon: ExclamationTriangleIcon,
      label: 'Low Stock',
      pulse: false
    },
    normal: {
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      iconColor: 'text-green-500',
      icon: CheckCircleIcon,
      label: 'In Stock',
      pulse: false
    },
    overstocked: {
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-500',
      icon: CubeIcon,
      label: 'Overstocked',
      pulse: false
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  // Size configurations
  const sizeConfig = {
    small: {
      badge: 'px-2 py-0.5 text-xs',
      icon: 'w-3 h-3',
      container: 'space-x-1'
    },
    normal: {
      badge: 'px-3 py-1 text-sm',
      icon: 'w-4 h-4',
      container: 'space-x-2'
    },
    large: {
      badge: 'px-4 py-2 text-base',
      icon: 'w-5 h-5',
      container: 'space-x-3'
    }
  }

  const sizeStyles = sizeConfig[size]

  // Simple badge view
  if (!showDetails) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ 
          scale: config.pulse ? [1, 1.05, 1] : 1, 
          opacity: 1 
        }}
        transition={config.pulse ? {
          scale: { repeat: Infinity, duration: 2 }
        } : {}}
        className={`
          inline-flex items-center ${sizeStyles.container} 
          ${sizeStyles.badge} ${config.bgColor} ${config.borderColor} 
          ${config.textColor} border rounded-full font-medium
          ${className}
        `}
      >
        <Icon className={`${sizeStyles.icon} ${config.iconColor}`} />
        <span>{stock}</span>
        {showTrend && trend && trend !== 'stable' && (
          <motion.div
            initial={{ y: trend === 'up' ? 5 : -5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center"
          >
            {trend === 'up' ? (
              <ArrowTrendingUpIcon className={`${sizeStyles.icon} text-green-500`} />
            ) : (
              <ArrowTrendingDownIcon className={`${sizeStyles.icon} text-red-500`} />
            )}
          </motion.div>
        )}
      </motion.div>
    )
  }

  // Detailed card view
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
          <span className={`font-semibold ${config.textColor}`}>
            {config.label}
          </span>
        </div>
        {showTrend && trend && trend !== 'stable' && (
          <motion.div
            initial={{ x: trend === 'up' ? -10 : 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center space-x-1"
          >
            {trend === 'up' ? (
              <>
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600">
                  +{stock - previousStock}
                </span>
              </>
            ) : (
              <>
                <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-600">
                  {stock - previousStock}
                </span>
              </>
            )}
          </motion.div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-2xl font-bold text-gray-900">{stock}</span>
          <span className="text-sm text-gray-500">units</span>
        </div>

        {/* Stock level bar */}
        <div className="relative">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stockPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${
                status === 'out' ? 'bg-red-500' :
                status === 'low' ? 'bg-yellow-500' :
                status === 'overstocked' ? 'bg-blue-500' :
                'bg-green-500'
              }`}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">0</span>
            <span className="text-xs text-gray-500">{maxStock}</span>
          </div>
        </div>

        {/* Stock thresholds */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
          <div>
            <span className="text-xs text-gray-500">Min Stock</span>
            <p className="font-medium text-gray-900">{minStock}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Max Stock</span>
            <p className="font-medium text-gray-900">{maxStock}</p>
          </div>
        </div>

        {/* Action suggestions */}
        {status === 'out' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 p-2 bg-red-100 rounded text-xs text-red-700"
          >
            ⚠️ Urgent: Create purchase order immediately
          </motion.div>
        )}
        {status === 'low' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-700"
          >
            📦 Consider reordering soon (below {minStock} units)
          </motion.div>
        )}
        {status === 'overstocked' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-700"
          >
            📊 Above optimal level - consider promotions
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

/**
 * StockIndicator - Simplified inline stock indicator
 */
export function StockIndicator({ stock, className = '' }) {
  const getColor = () => {
    if (stock <= 0) return 'bg-red-500'
    if (stock <= 10) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getSize = () => {
    if (stock <= 0) return 'w-2 h-2'
    if (stock <= 10) return 'w-2.5 h-2.5'
    return 'w-3 h-3'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <motion.div
        animate={stock <= 0 ? {
          scale: [1, 1.2, 1],
        } : {}}
        transition={{
          repeat: stock <= 0 ? Infinity : 0,
          duration: 1.5
        }}
        className={`${getSize()} ${getColor()} rounded-full`}
      />
      <span className={`text-sm font-medium ${
        stock <= 0 ? 'text-red-600' :
        stock <= 10 ? 'text-yellow-600' :
        'text-gray-700'
      }`}>
        {stock <= 0 ? 'Out' : stock}
      </span>
    </div>
  )
}

/**
 * BulkStockIndicator - For showing multiple stock statuses
 */
export function BulkStockIndicator({ products, className = '' }) {
  const stockSummary = products.reduce((acc, product) => {
    if (product.stock <= 0) acc.out++
    else if (product.stock <= product.minStock || product.stock <= 10) acc.low++
    else acc.normal++
    return acc
  }, { out: 0, low: 0, normal: 0 })

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {stockSummary.normal > 0 && (
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-sm text-gray-600">{stockSummary.normal}</span>
        </div>
      )}
      {stockSummary.low > 0 && (
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          <span className="text-sm text-gray-600">{stockSummary.low}</span>
        </div>
      )}
      {stockSummary.out > 0 && (
        <motion.div 
          className="flex items-center space-x-1"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span className="text-sm font-semibold text-red-600">{stockSummary.out}</span>
        </motion.div>
      )}
    </div>
  )
}