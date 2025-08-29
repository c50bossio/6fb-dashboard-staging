'use client'

import { createContext, useContext, useState } from 'react'

const MockUserContext = createContext()

export function MockUserProvider({ children }) {
  const [mockUser, setMockUser] = useState({
    id: 'mock-user-123',
    email: 'test@barbershop.com',
    user_metadata: {
      full_name: 'Test Owner',
      role: 'SHOP_OWNER'
    }
  })

  const [mockProfile, setMockProfile] = useState({
    id: 'mock-user-123',
    email: 'test@barbershop.com',
    full_name: 'Test Owner',
    role: 'SHOP_OWNER',
    shop_id: '1ca6138d-eae8-46ed-abf4-5d6c52fbd21b', // Using the barbershop ID from database
    barbershop_id: '1ca6138d-eae8-46ed-abf4-5d6c52fbd21b'
  })

  const [isEnabled, setIsEnabled] = useState(
    process.env.NODE_ENV === 'development' && 
    process.env.NEXT_PUBLIC_DEV_MODE === 'true'
  )

  const value = {
    mockUser,
    mockProfile,
    isEnabled,
    setIsEnabled,
    enableMockAuth: () => setIsEnabled(true),
    disableMockAuth: () => setIsEnabled(false)
  }

  return (
    <MockUserContext.Provider value={value}>
      {children}
    </MockUserContext.Provider>
  )
}

export function useMockUser() {
  const context = useContext(MockUserContext)
  if (!context) {
    throw new Error('useMockUser must be used within a MockUserProvider')
  }
  return context
}