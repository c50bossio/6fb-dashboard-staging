'use client'

/**
 * Settings Section Wrapper
 * 
 * Provides consistent layout and styling for all settings sections,
 * replacing the fragmented layouts used across different settings pages.
 */

import React from 'react'

export default function SettingsSection({ children, title, description, className = '' }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {(title || description) && (
        <div className="px-6 py-4 border-b border-gray-200">
          {title && (
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="px-6 py-4">
        {children}
      </div>
    </div>
  )
}