'use client'

import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function FormInput({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  onBlur,
  error, 
  touched,
  required = false,
  placeholder,
  icon: Icon,
  className = '',
  ...props 
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  
  const hasError = error && touched
  const isValid = touched && !error && value
  const inputType = type === 'password' && showPassword ? 'text' : type

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className={`h-5 w-5 transition-colors duration-200 ${
              hasError ? 'text-red-400' : 
              isValid ? 'text-green-400' : 
              isFocused ? 'text-olive-400' : 'text-gray-400'
            }`} />
          </div>
        )}
        
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            setIsFocused(false)
            onBlur && onBlur(e)
          }}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 border rounded-lg transition-all duration-200 
            focus:outline-none focus:ring-2 focus:border-transparent
            ${Icon ? 'pl-10' : 'pl-4'}
            ${type === 'password' ? 'pr-12' : 'pr-4'}
            ${hasError 
              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:ring-opacity-50' 
              : isValid 
                ? 'border-green-300 bg-green-50 focus:ring-green-500 focus:ring-opacity-50'
                : 'border-gray-300 bg-white focus:ring-olive-500 focus:ring-opacity-50'
            }
          `}
          {...props}
        />
        
        {/* Password visibility toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
            )}
          </button>
        )}
        
        {/* Validation icons */}
        {type !== 'password' && (hasError || isValid) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {hasError ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            ) : (
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            )}
          </div>
        )}
      </div>
      
      {/* Error message */}
      {hasError && (
        <div className="mt-2 flex items-center text-sm text-red-600 animate-fadeInUp">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
          {error}
        </div>
      )}
      
      {/* Success message */}
      {isValid && (
        <div className="mt-2 flex items-center text-sm text-green-600 animate-fadeInUp">
          <CheckCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
          Looks good!
        </div>
      )}
    </div>
  )
}

export function FormSelect({ 
  label, 
  value, 
  onChange, 
  options, 
  error, 
  touched,
  required = false,
  placeholder = "Select an option",
  icon: Icon,
  className = '',
  ...props 
}) {
  const hasError = error && touched
  const isValid = touched && !error && value

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className={`h-5 w-5 transition-colors duration-200 ${
              hasError ? 'text-red-400' : 
              isValid ? 'text-green-400' : 'text-gray-400'
            }`} />
          </div>
        )}
        
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`
            w-full px-4 py-3 border rounded-lg transition-all duration-200 
            focus:outline-none focus:ring-2 focus:border-transparent
            ${Icon ? 'pl-10' : 'pl-4'}
            ${hasError 
              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:ring-opacity-50' 
              : isValid 
                ? 'border-green-300 bg-green-50 focus:ring-green-500 focus:ring-opacity-50'
                : 'border-gray-300 bg-white focus:ring-olive-500 focus:ring-opacity-50'
            }
          `}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Error message */}
      {hasError && (
        <div className="mt-2 flex items-center text-sm text-red-600 animate-fadeInUp">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}