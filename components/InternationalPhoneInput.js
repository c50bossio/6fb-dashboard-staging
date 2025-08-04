import { useState, useRef, useEffect, forwardRef, memo } from 'react'
import NuclearInput from './NuclearInput'

/**
 * INTERNATIONAL PHONE INPUT WITH COUNTRY CODE SUPPORT
 * 
 * Specifically designed for Twilio SMS integration requiring E.164 format
 * Provides country code dropdown + formatted phone number input
 */

// Popular countries for barbershop businesses with their calling codes
const COUNTRY_CODES = [
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', format: '(XXX) XXX-XXXX' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', format: '(XXX) XXX-XXXX' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', format: 'XXXX XXX XXXX' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', format: 'XXX XXX XXX' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', format: 'XXX XXXXXXX' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', format: 'XX XX XX XX XX' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', format: 'XXX XXX XXXX' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', format: 'XXX XX XX XX' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', format: 'XX XXXX XXXX' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', format: 'XX XXXXX-XXXX' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', format: 'XXXXX XXXXX' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', format: 'XX-XXXX-XXXX' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', format: 'XXX XXXX XXXX' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', format: 'XX-XXXX-XXXX' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', format: 'XX XXX XXXX' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', format: 'XX XXX XX XX' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴', format: 'XXX XX XXX' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰', format: 'XX XX XX XX' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', format: 'XX XXX XX XX' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹', format: 'XXX XXXXXXX' }
]

/**
 * Format phone number based on country-specific patterns
 */
const formatByCountry = (value, countryCode) => {
  if (!value) return value
  
  const country = COUNTRY_CODES.find(c => c.code === countryCode)
  if (!country) return value
  
  // Remove all non-digit characters
  const digits = value.replace(/[^\d]/g, '')
  
  // Apply country-specific formatting
  switch (countryCode) {
    case 'US':
    case 'CA':
      if (digits.length <= 3) return `(${digits}`
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    
    case 'GB':
      if (digits.length <= 4) return digits
      if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`
    
    case 'AU':
      if (digits.length <= 3) return digits
      if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`
    
    case 'DE':
    case 'AT':
      if (digits.length <= 3) return digits
      return `${digits.slice(0, 3)} ${digits.slice(3)}`
    
    case 'FR':
      if (digits.length <= 2) return digits
      if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`
      if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`
      if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`
      return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`
    
    case 'MX':
      if (digits.length <= 2) return digits
      if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`
      return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`
    
    case 'BR':
      if (digits.length <= 2) return digits
      if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2)}`
      return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
    
    case 'IN':
      if (digits.length <= 5) return digits
      return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`
    
    default:
      // Generic formatting: add spaces every 3-4 digits
      const groups = digits.match(/.{1,3}/g) || []
      return groups.join(' ')
  }
}

/**
 * Generate E.164 format for Twilio SMS
 */
const toE164Format = (phoneNumber, countryDialCode) => {
  if (!phoneNumber) return ''
  
  const digits = phoneNumber.replace(/[^\d]/g, '')
  if (!digits) return ''
  
  return `${countryDialCode}${digits}`
}

/**
 * Validate phone number length for country
 */
const validatePhoneLength = (phoneNumber, countryCode) => {
  const digits = phoneNumber.replace(/[^\d]/g, '')
  
  const validLengths = {
    'US': [10], 'CA': [10], 'GB': [10, 11], 'AU': [9], 'DE': [10, 11],
    'FR': [10], 'IT': [10], 'ES': [9], 'MX': [10], 'BR': [10, 11],
    'IN': [10], 'JP': [10, 11], 'CN': [11], 'KR': [10, 11],
    'NL': [9], 'SE': [9], 'NO': [8], 'DK': [8], 'CH': [9], 'AT': [10, 11]
  }
  
  const expected = validLengths[countryCode] || [8, 9, 10, 11]
  return expected.includes(digits.length)
}

const InternationalPhoneInput = memo(forwardRef(({
  defaultValue = '',
  defaultCountry = 'US',
  onBlur,
  onCountryChange,
  className = 'input-field',
  disabled = false,
  ...props
}, ref) => {
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isValid, setIsValid] = useState(true)
  const [validationMessage, setValidationMessage] = useState('')
  
  const phoneInputRef = useRef(null)
  const dropdownRef = useRef(null)
  const actualRef = ref || phoneInputRef
  
  // Initialize phone number from defaultValue
  useEffect(() => {
    if (defaultValue) {
      // Try to parse existing phone number
      if (defaultValue.startsWith('+')) {
        // Find matching country code
        const matchingCountry = COUNTRY_CODES.find(c => 
          defaultValue.startsWith(c.dialCode)
        )
        if (matchingCountry) {
          setSelectedCountry(matchingCountry.code)
          const numberPart = defaultValue.slice(matchingCountry.dialCode.length)
          setPhoneNumber(formatByCountry(numberPart, matchingCountry.code))
        } else {
          setPhoneNumber(defaultValue)
        }
      } else {
        setPhoneNumber(formatByCountry(defaultValue, selectedCountry))
      }
    }
  }, [defaultValue, selectedCountry])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const selectedCountryData = COUNTRY_CODES.find(c => c.code === selectedCountry) || COUNTRY_CODES[0]
  
  const handleCountrySelect = (countryCode) => {
    setSelectedCountry(countryCode)
    setIsDropdownOpen(false)
    
    // Reformat current phone number for new country
    if (phoneNumber) {
      const newFormatted = formatByCountry(phoneNumber, countryCode)
      setPhoneNumber(newFormatted)
    }
    
    if (onCountryChange) {
      const newCountryData = COUNTRY_CODES.find(c => c.code === countryCode)
      onCountryChange(newCountryData)
    }
  }
  
  const handlePhoneInput = (e) => {
    const value = e.target.value
    const formatted = formatByCountry(value, selectedCountry)
    setPhoneNumber(formatted)
    
    // Update the actual input value
    if (actualRef.current) {
      actualRef.current.value = formatted
    }
  }
  
  const handleBlur = (e) => {
    const value = e.target.value
    
    // Validate phone number
    const isValidNumber = validatePhoneLength(value, selectedCountry)
    setIsValid(isValidNumber)
    setValidationMessage(isValidNumber ? '' : `Please enter a valid ${selectedCountryData.name} phone number`)
    
    if (onBlur) {
      // Provide both formatted and E.164 versions
      const e164 = toE164Format(value, selectedCountryData.dialCode)
      const eventWithData = {
        ...e,
        target: {
          ...e.target,
          value: value, // Formatted display value
          e164: e164,   // E.164 for Twilio
          country: selectedCountryData.code,
          dialCode: selectedCountryData.dialCode
        }
      }
      onBlur(eventWithData)
    }
  }
  
  return (
    <div className="international-phone-input-container">
      <div className="flex">
        {/* Country Code Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            className={`
              flex items-center px-3 py-2 border border-r-0 rounded-l-md bg-gray-50 
              hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-lg mr-1">{selectedCountryData.flag}</span>
            <span className="text-sm font-medium text-gray-700">
              {selectedCountryData.dialCode}
            </span>
            <svg 
              className={`ml-1 h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute z-50 top-full left-0 w-80 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {COUNTRY_CODES.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country.code)}
                  className={`
                    w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center
                    ${selectedCountry === country.code ? 'bg-blue-100' : ''}
                  `}
                >
                  <span className="text-lg mr-2">{country.flag}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{country.name}</div>
                    <div className="text-xs text-gray-500">{country.dialCode} • {country.format}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Phone Number Input */}
        <div className="flex-1">
          <NuclearInput
            ref={actualRef}
            type="tel"
            defaultValue={phoneNumber}
            onInput={handlePhoneInput}
            onBlur={handleBlur}
            placeholder={selectedCountryData.format.replace(/X/g, '0')}
            className={`${className} rounded-l-none ${!isValid ? 'border-red-500 focus:ring-red-500' : ''}`}
            disabled={disabled}
            autoFormatting={false} // We handle formatting manually
            validation={false}     // We handle validation manually
            {...props}
          />
        </div>
      </div>
      
      {/* Validation Feedback */}
      {validationMessage && (
        <div className="text-red-500 text-sm mt-1 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {validationMessage}
        </div>
      )}
      
      {/* Success feedback with E.164 format */}
      {!validationMessage && phoneNumber && isValid && (
        <div className="text-green-500 text-sm mt-1 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Valid • Twilio format: {toE164Format(phoneNumber, selectedCountryData.dialCode)}
        </div>
      )}
    </div>
  )
}))

InternationalPhoneInput.displayName = 'InternationalPhoneInput'

export default InternationalPhoneInput

// Helper function for components that need E.164 format
export const getE164Format = (phoneNumber, countryCode) => {
  const country = COUNTRY_CODES.find(c => c.code === countryCode)
  if (!country) return phoneNumber
  return toE164Format(phoneNumber, country.dialCode)
}

// Validation helper
export const isValidInternationalPhone = (phoneNumber, countryCode) => {
  return validatePhoneLength(phoneNumber, countryCode)
}