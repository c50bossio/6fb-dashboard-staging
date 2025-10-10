'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { MoonIcon, SunIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'

/**
 * ThemeToggle Component
 *
 * Universal theme switcher using next-themes
 * Supports: light, dark, and system preference modes
 *
 * Features:
 * - Accessible keyboard navigation
 * - Smooth transitions without flash
 * - Visual indication of current theme
 * - Persists user preference in localStorage
 * - Prevents hydration mismatch
 */

export default function ThemeToggle({ variant = 'default', showLabel = false, className = '' }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className={`w-10 h-10 rounded-lg bg-muted/50 animate-pulse ${className}`} />
    )
  }

  const currentTheme = theme || 'system'

  // Variant: Dropdown with all options
  if (variant === 'dropdown') {
    return (
      <div className={`relative group ${className}`}>
        <button
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          aria-label="Theme selector"
        >
          {resolvedTheme === 'dark' ? (
            <MoonIcon className="h-5 w-5 text-foreground" />
          ) : (
            <SunIcon className="h-5 w-5 text-foreground" />
          )}
          {showLabel && (
            <span className="text-sm font-medium text-foreground capitalize">
              {currentTheme}
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        <div className="absolute right-0 mt-2 w-40 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <button
            onClick={() => setTheme('light')}
            className={`w-full flex items-center space-x-3 px-4 py-2 text-sm hover:bg-muted transition-colors rounded-t-lg ${
              currentTheme === 'light' ? 'bg-muted text-primary font-medium' : 'text-foreground'
            }`}
          >
            <SunIcon className="h-4 w-4" />
            <span>Light</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`w-full flex items-center space-x-3 px-4 py-2 text-sm hover:bg-muted transition-colors ${
              currentTheme === 'dark' ? 'bg-muted text-primary font-medium' : 'text-foreground'
            }`}
          >
            <MoonIcon className="h-4 w-4" />
            <span>Dark</span>
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`w-full flex items-center space-x-3 px-4 py-2 text-sm hover:bg-muted transition-colors rounded-b-lg ${
              currentTheme === 'system' ? 'bg-muted text-primary font-medium' : 'text-foreground'
            }`}
          >
            <ComputerDesktopIcon className="h-4 w-4" />
            <span>System</span>
          </button>
        </div>
      </div>
    )
  }

  // Variant: Simple toggle (light ↔ dark)
  if (variant === 'simple') {
    const isDark = resolvedTheme === 'dark'

    return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={`p-2 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-200 ${className}`}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? (
          <SunIcon className="h-5 w-5 text-foreground" />
        ) : (
          <MoonIcon className="h-5 w-5 text-foreground" />
        )}
      </button>
    )
  }

  // Variant: Default - Segmented control (light | dark | system)
  return (
    <div className={`inline-flex items-center rounded-lg bg-muted/50 p-1 ${className}`}>
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-md transition-all duration-200 ${
          currentTheme === 'light'
            ? 'bg-background shadow-sm'
            : 'hover:bg-muted/80'
        }`}
        aria-label="Light mode"
        title="Light mode"
      >
        <SunIcon className={`h-4 w-4 ${currentTheme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-md transition-all duration-200 ${
          currentTheme === 'dark'
            ? 'bg-background shadow-sm'
            : 'hover:bg-muted/80'
        }`}
        aria-label="Dark mode"
        title="Dark mode"
      >
        <MoonIcon className={`h-4 w-4 ${currentTheme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-md transition-all duration-200 ${
          currentTheme === 'system'
            ? 'bg-background shadow-sm'
            : 'hover:bg-muted/80'
        }`}
        aria-label="System theme"
        title="System preference"
      >
        <ComputerDesktopIcon className={`h-4 w-4 ${currentTheme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
      </button>
    </div>
  )
}

// Convenience exports for different use cases
export const ThemeToggleSimple = (props) => <ThemeToggle {...props} variant="simple" />
export const ThemeToggleDropdown = (props) => <ThemeToggle {...props} variant="dropdown" />
