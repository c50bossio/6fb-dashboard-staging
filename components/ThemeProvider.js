'use client'

import React, { createContext, useContext } from 'react'

const ThemeContext = createContext({})

export function ThemeProvider({ children }) {
  const theme = {
    mode: 'light' // Default theme
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