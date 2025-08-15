'use client'

/**
 * Standardized Form Input components for consistent form patterns across the dashboard
 * Replaces scattered input implementations with reusable, accessible components
 */

export function FormInput({ 
  label, 
  name, 
  type = 'text', 
  required = false,
  placeholder = '',
  value,
  onChange,
  error,
  helper,
  disabled = false,
  className = '',
  ...props 
}) {
  const inputId = `input-${name}`
  
  return (
    <div className={`${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        id={inputId}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm transition-colors
          focus:ring-olive-500 focus:border-olive-500
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error 
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300'
          }
        `}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {helper && !error && (
        <p className="mt-1 text-xs text-gray-500">{helper}</p>
      )}
    </div>
  )
}

/**
 * Standardized Select component
 */
export function FormSelect({ 
  label, 
  name, 
  required = false,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error,
  helper,
  disabled = false,
  className = '',
  ...props 
}) {
  const selectId = `select-${name}`
  
  return (
    <div className={`${className}`}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        id={selectId}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm transition-colors
          focus:ring-olive-500 focus:border-olive-500
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error 
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300'
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
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {helper && !error && (
        <p className="mt-1 text-xs text-gray-500">{helper}</p>
      )}
    </div>
  )
}

/**
 * Standardized Textarea component
 */
export function FormTextarea({ 
  label, 
  name, 
  required = false,
  placeholder = '',
  value,
  onChange,
  rows = 4,
  error,
  helper,
  disabled = false,
  className = '',
  maxLength,
  ...props 
}) {
  const textareaId = `textarea-${name}`
  
  return (
    <div className={`${className}`}>
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        id={textareaId}
        name={name}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        disabled={disabled}
        maxLength={maxLength}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm transition-colors resize-vertical
          focus:ring-olive-500 focus:border-olive-500
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error 
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300'
          }
        `}
        {...props}
      />
      
      {maxLength && value && (
        <div className="flex justify-between mt-1">
          <div>
            {error && <span className="text-sm text-red-600">{error}</span>}
            {helper && !error && <span className="text-xs text-gray-500">{helper}</span>}
          </div>
          <span className="text-xs text-gray-500">
            {value.length}/{maxLength}
          </span>
        </div>
      )}
      
      {(!maxLength || !value) && error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {(!maxLength || !value) && helper && !error && (
        <p className="mt-1 text-xs text-gray-500">{helper}</p>
      )}
    </div>
  )
}

/**
 * Standardized Checkbox component
 */
export function FormCheckbox({ 
  label, 
  name, 
  checked = false,
  onChange,
  error,
  helper,
  disabled = false,
  className = '',
  ...props 
}) {
  const checkboxId = `checkbox-${name}`
  
  return (
    <div className={`${className}`}>
      <div className="flex items-start">
        <input
          id={checkboxId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={`
            h-4 w-4 rounded border-gray-300 text-olive-600 
            focus:ring-olive-500 focus:ring-offset-0
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-red-300' : ''}
          `}
          {...props}
        />
        
        {label && (
          <label htmlFor={checkboxId} className="ml-3 text-sm text-gray-700">
            {label}
          </label>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {helper && !error && (
        <p className="mt-1 text-xs text-gray-500">{helper}</p>
      )}
    </div>
  )
}