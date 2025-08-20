'use client'

import React, { createContext, useContext } from 'react'

const ThemeContext = createContext({})

export const THEMES = {
  light: {
    mode: 'light',
    background: 'bg-white',
    text: 'text-gray-900',
    border: 'border-gray-200'
  },
  dark: {
    mode: 'dark',
    background: 'bg-gray-900',
    text: 'text-white',
    border: 'border-gray-700'
  }
}

export function ThemeProvider({ children }) {
  const theme = {
    mode: 'light', // Default theme
    ...THEMES.light
  }

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export default ThemeProvider