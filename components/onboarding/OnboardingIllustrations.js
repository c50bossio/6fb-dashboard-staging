'use client'

// Professional SVG illustrations for onboarding steps
// These replace emojis with custom, branded graphics

export const BusinessIllustration = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="30" width="60" height="50" rx="4" className="fill-blue-100 stroke-blue-500" strokeWidth="2"/>
    <rect x="30" y="40" width="40" height="3" className="fill-blue-400"/>
    <rect x="30" y="48" width="30" height="2" className="fill-blue-300"/>
    <rect x="30" y="54" width="35" height="2" className="fill-blue-300"/>
    <rect x="30" y="60" width="25" height="2" className="fill-blue-300"/>
    <circle cx="50" cy="20" r="8" className="fill-blue-500"/>
    <path d="M47 20 L49 22 L53 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const StaffIllustration = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="35" cy="30" r="10" className="fill-purple-200 stroke-purple-500" strokeWidth="2"/>
    <path d="M35 45 Q35 55 25 60 L45 60 Q35 55 35 45" className="fill-purple-100 stroke-purple-500" strokeWidth="2"/>
    <circle cx="65" cy="30" r="10" className="fill-green-200 stroke-green-500" strokeWidth="2"/>
    <path d="M65 45 Q65 55 55 60 L75 60 Q65 55 65 45" className="fill-green-100 stroke-green-500" strokeWidth="2"/>
    <rect x="20" y="70" width="60" height="4" rx="2" className="fill-gray-300"/>
  </svg>
)

export const ScheduleIllustration = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="25" width="70" height="60" rx="6" className="fill-indigo-50 stroke-indigo-500" strokeWidth="2"/>
    <rect x="15" y="25" width="70" height="15" rx="6" className="fill-indigo-500"/>
    <circle cx="30" cy="32" r="2" fill="white"/>
    <circle cx="50" cy="32" r="2" fill="white"/>
    <circle cx="70" cy="32" r="2" fill="white"/>
    <rect x="25" y="50" width="12" height="8" rx="2" className="fill-indigo-200"/>
    <rect x="44" y="50" width="12" height="8" rx="2" className="fill-green-200"/>
    <rect x="63" y="50" width="12" height="8" rx="2" className="fill-indigo-200"/>
    <rect x="25" y="65" width="12" height="8" rx="2" className="fill-green-200"/>
    <rect x="44" y="65" width="12" height="8" rx="2" className="fill-indigo-200"/>
    <rect x="63" y="65" width="12" height="8" rx="2" className="fill-gray-200"/>
  </svg>
)

export const ServicesIllustration = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="20" width="30" height="25" rx="4" className="fill-amber-100 stroke-amber-500" strokeWidth="2"/>
    <text x="30" y="35" textAnchor="middle" className="fill-amber-600 text-xs font-bold">$$$</text>
    <rect x="55" y="20" width="30" height="25" rx="4" className="fill-green-100 stroke-green-500" strokeWidth="2"/>
    <path d="M65 28 L70 33 L75 28" stroke="green" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <rect x="15" y="55" width="30" height="25" rx="4" className="fill-blue-100 stroke-blue-500" strokeWidth="2"/>
    <circle cx="30" cy="67" r="8" className="fill-blue-200"/>
    <rect x="55" y="55" width="30" height="25" rx="4" className="fill-purple-100 stroke-purple-500" strokeWidth="2"/>
    <path d="M65 63 L75 63 M70 58 L70 68" stroke="purple" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

export const PaymentIllustration = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="35" width="60" height="40" rx="6" className="fill-gradient-to-br from-green-100 to-green-50 stroke-green-500" strokeWidth="2"/>
    <rect x="20" y="45" width="60" height="8" className="fill-green-500 opacity-20"/>
    <circle cx="35" cy="60" r="5" className="fill-green-400"/>
    <rect x="50" y="58" width="20" height="4" rx="2" className="fill-green-300"/>
    <path d="M30 25 L35 30 L45 20" stroke="green" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="fill-none"/>
  </svg>
)

export const BookingRulesIllustration = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="20" width="50" height="65" rx="4" className="fill-orange-50 stroke-orange-500" strokeWidth="2"/>
    <rect x="35" y="30" width="30" height="3" className="fill-orange-400"/>
    <rect x="35" y="38" width="25" height="2" className="fill-orange-300"/>
    <rect x="35" y="44" width="28" height="2" className="fill-orange-300"/>
    <rect x="35" y="50" width="20" height="2" className="fill-orange-300"/>
    <circle cx="30" cy="38" r="2" className="fill-green-500"/>
    <circle cx="30" cy="44" r="2" className="fill-green-500"/>
    <circle cx="30" cy="50" r="2" className="fill-red-500"/>
    <path d="M35 60 L40 65 L50 55" stroke="green" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const BrandingIllustration = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="25" width="60" height="50" rx="4" className="fill-gradient-to-br from-purple-100 to-pink-100 stroke-purple-500" strokeWidth="2"/>
    <circle cx="35" cy="40" r="8" className="fill-purple-400"/>
    <rect x="50" y="35" width="20" height="3" className="fill-purple-300"/>
    <rect x="50" y="42" width="15" height="2" className="fill-pink-300"/>
    <path d="M25 55 Q30 60 35 55 Q40 60 45 55 Q50 60 55 55 Q60 60 65 55 Q70 60 75 55" 
          stroke="purple" strokeWidth="2" fill="none" strokeLinecap="round"/>
  </svg>
)

// Animated completion checkmark
export const CompletionIllustration = ({ className = "w-32 h-32" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="35" className="fill-green-100 stroke-green-500 animate-pulse" strokeWidth="3"/>
    <path d="M30 50 L42 62 L70 34" 
          stroke="green" 
          strokeWidth="4" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="animate-[draw_0.5s_ease-in-out_forwards]"
          strokeDasharray="60"
          strokeDashoffset="60"
    />
    <style jsx>{`
      @keyframes draw {
        to {
          stroke-dashoffset: 0;
        }
      }
    `}</style>
  </svg>
)

// Progress indicator with gradient
export const ProgressRing = ({ progress = 0, className = "w-16 h-16" }) => {
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg className={className} viewBox="0 0 50 50">
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <circle
        cx="25"
        cy="25"
        r={radius}
        stroke="#E5E7EB"
        strokeWidth="4"
        fill="none"
      />
      <circle
        cx="25"
        cy="25"
        r={radius}
        stroke="url(#progressGradient)"
        strokeWidth="4"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 25 25)"
        className="transition-all duration-500 ease-out"
      />
      <text
        x="25"
        y="25"
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-xs font-bold fill-gray-700"
      >
        {progress}%
      </text>
    </svg>
  )
}

// Welcome illustration for onboarding start
export const WelcomeIllustration = ({ className = "w-48 h-48" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="40" y="60" width="120" height="80" rx="8" className="fill-gradient-to-br from-blue-100 to-purple-100 stroke-blue-500" strokeWidth="3"/>
    <rect x="50" y="70" width="100" height="60" rx="4" className="fill-white stroke-gray-300" strokeWidth="1"/>
    <circle cx="100" cy="40" r="15" className="fill-blue-500"/>
    <path d="M95 40 L98 43 L105 36" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="60" y="85" width="80" height="4" rx="2" className="fill-blue-400"/>
    <rect x="60" y="95" width="60" height="3" rx="1" className="fill-gray-300"/>
    <rect x="60" y="103" width="70" height="3" rx="1" className="fill-gray-300"/>
    <rect x="60" y="111" width="50" height="3" rx="1" className="fill-gray-300"/>
    <circle cx="30" cy="100" r="8" className="fill-purple-400 animate-bounce"/>
    <circle cx="170" cy="100" r="8" className="fill-green-400 animate-bounce" style={{animationDelay: '0.2s'}}/>
    <circle cx="100" cy="160" r="6" className="fill-amber-400 animate-bounce" style={{animationDelay: '0.4s'}}/>
  </svg>
)

export default {
  BusinessIllustration,
  StaffIllustration,
  ScheduleIllustration,
  ServicesIllustration,
  PaymentIllustration,
  BookingRulesIllustration,
  BrandingIllustration,
  CompletionIllustration,
  ProgressRing,
  WelcomeIllustration
}