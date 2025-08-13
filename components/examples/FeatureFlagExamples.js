'use client'

import FeatureFlag from '@/components/FeatureFlag'
import { useFeatureFlag, useABTest } from '@/hooks/useFeatureFlag'
import { FLAGS } from '@/lib/feature-flags'

// Example 1: Dark Mode Toggle
export function DarkModeExample() {
  const { isEnabled: isDarkMode } = useFeatureFlag(FLAGS.DARK_MODE)

  return (
    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
      <h3 className="font-semibold mb-2">Dark Mode Example</h3>
      <p>Dark mode is {isDarkMode ? 'enabled' : 'disabled'}</p>
    </div>
  )
}

// Example 2: Payment Method Selection
export function PaymentMethodsExample() {
  return (
    <div className="p-4 bg-white rounded-lg">
      <h3 className="font-semibold mb-2">Payment Methods</h3>
      <div className="space-y-2">
        <label className="flex items-center">
          <input type="radio" name="payment" value="card" defaultChecked />
          <span className="ml-2">Credit Card</span>
        </label>
        
        <FeatureFlag flag={FLAGS.CRYPTO_PAYMENTS}>
          <label className="flex items-center">
            <input type="radio" name="payment" value="crypto" />
            <span className="ml-2">Cryptocurrency 🚀</span>
          </label>
        </FeatureFlag>
        
        <FeatureFlag flag={FLAGS.INSTALLMENT_PAYMENTS}>
          <label className="flex items-center">
            <input type="radio" name="payment" value="installments" />
            <span className="ml-2">Pay in Installments</span>
          </label>
        </FeatureFlag>
      </div>
    </div>
  )
}

// Example 3: A/B Test for Button Styles
export function ButtonABTestExample() {
  const variant = useABTest('button_style_test', ['control', 'variant_a', 'variant_b'])

  const buttonStyles = {
    control: 'px-4 py-2 bg-olive-600 text-white rounded hover:bg-olive-700',
    variant_a: 'px-6 py-3 bg-gradient-to-r from-olive-600 to-gold-600 text-white rounded-lg hover:from-olive-700 hover:to-gold-700',
    variant_b: 'px-4 py-2 bg-white text-olive-600 border-2 border-olive-600 rounded-full hover:bg-olive-50',
  }

  return (
    <div className="p-4 bg-white rounded-lg">
      <h3 className="font-semibold mb-2">A/B Test: Button Styles</h3>
      <p className="text-sm text-gray-600 mb-4">Variant: {variant}</p>
      <button className={buttonStyles[variant]}>
        Book Appointment
      </button>
    </div>
  )
}

// Example 4: Progressive Feature Rollout
export function BetaFeaturesExample() {
  const { isEnabled: hasBetaAccess } = useFeatureFlag(FLAGS.BETA_FEATURES)

  return (
    <div className="p-4 bg-white rounded-lg">
      <h3 className="font-semibold mb-2">Feature Access</h3>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span>Standard Features</span>
          <span className="text-green-600">✓ Available</span>
        </div>
        
        <FeatureFlag flag={FLAGS.ADVANCED_ANALYTICS}>
          <div className="flex items-center justify-between">
            <span>Advanced Analytics</span>
            <span className="text-green-600">✓ Available</span>
          </div>
        </FeatureFlag>
        
        {hasBetaAccess && (
          <>
            <FeatureFlag flag={FLAGS.VIDEO_CONSULTATIONS}>
              <div className="flex items-center justify-between">
                <span>Video Consultations</span>
                <span className="text-gold-600">✨ Beta</span>
              </div>
            </FeatureFlag>
            
            <FeatureFlag flag={FLAGS.AI_RECOMMENDATIONS}>
              <div className="flex items-center justify-between">
                <span>AI Recommendations</span>
                <span className="text-gold-600">✨ Beta</span>
              </div>
            </FeatureFlag>
          </>
        )}
      </div>
    </div>
  )
}

// Example 5: Performance Optimizations
export function PerformanceExample() {
  const { isEnabled: lazyLoading } = useFeatureFlag(FLAGS.LAZY_LOADING)
  const { isEnabled: imageOptimization } = useFeatureFlag(FLAGS.IMAGE_OPTIMIZATION)

  return (
    <div className="p-4 bg-white rounded-lg">
      <h3 className="font-semibold mb-2">Performance Features</h3>
      <ul className="space-y-1 text-sm">
        <li className={lazyLoading ? 'text-green-600' : 'text-gray-400'}>
          {lazyLoading ? '✓' : '✗'} Lazy Loading Components
        </li>
        <li className={imageOptimization ? 'text-green-600' : 'text-gray-400'}>
          {imageOptimization ? '✓' : '✗'} Automatic Image Optimization
        </li>
        <li className="text-gray-400">
          ✗ PWA Features (Coming Soon)
        </li>
      </ul>
    </div>
  )
}

// Main component that shows all examples
export default function FeatureFlagExamples() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <DarkModeExample />
      <PaymentMethodsExample />
      <ButtonABTestExample />
      <BetaFeaturesExample />
      <PerformanceExample />
    </div>
  )
}