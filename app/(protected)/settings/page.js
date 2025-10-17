'use client'

import ProtectedRoute from '../../../components/ProtectedRoute'
import UnifiedSettingsInterface from '../../../components/settings/UnifiedSettingsInterface'

/**
 * Main Settings Page
 * 
 * Now uses the UnifiedSettingsInterface which provides:
 * - Single source of truth for all settings data
 * - Eliminates the "different windows, different answers" problem
 * - Context-aware settings with inheritance
 * - Replaces 18+ fragmented settings pages
 */
function Settings() {
  return <UnifiedSettingsInterface />
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <Settings />
    </ProtectedRoute>
  )
}