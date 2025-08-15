'use client'

import { useFeatureFlag } from '@/hooks/useFeatureFlag'

export default function FeatureFlag({ flag, children, fallback = null }) {
  const { isEnabled, loading } = useFeatureFlag(flag)

  if (loading) {
    return fallback
  }

  return isEnabled ? children : fallback
}

export function ABTest({ experiment, variants, fallback = null }) {
  const { variant } = useABTest(experiment)

  if (!variants[variant]) {
    return fallback || variants.control || null
  }

  return variants[variant]
}