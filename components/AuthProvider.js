import { createContext, useContext, useState, useEffect, useRef } from 'react'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)
  const refreshTimeoutRef = useRef(null)

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token')
    if (savedToken) {
      setToken(savedToken)
      fetchUserProfile(savedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUserProfile = async (authToken) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data)
      } else {
        // Token is invalid, clear it
        logout()
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // If there's an error, assume token is invalid
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()

      if (data.success) {
        const authToken = data.access_token
        setToken(authToken)
        localStorage.setItem('auth_token', authToken)
        localStorage.setItem('token_type', data.token_type)
        
        // Fetch user profile
        await fetchUserProfile(authToken)
        
        // Schedule token refresh
        scheduleTokenRefresh(authToken)
        
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })

      const data = await response.json()

      if (data.success) {
        const authToken = data.access_token
        setToken(authToken)
        localStorage.setItem('auth_token', authToken)
        localStorage.setItem('token_type', data.token_type)
        
        // Fetch user profile
        await fetchUserProfile(authToken)
        
        // Schedule token refresh
        scheduleTokenRefresh(authToken)
        
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      if (token) {
        // Attempt to notify backend of logout
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Continue with logout even if backend call fails
    } finally {
      // Clear local state and storage
      setUser(null)
      setToken(null)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('token_type')
    }
  }

  // JWT Token utilities
  const parseJWT = (token) => {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''))
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('Error parsing JWT:', error)
      return null
    }
  }

  const isTokenExpiring = (token) => {
    const payload = parseJWT(token)
    if (!payload || !payload.exp) return true
    
    const currentTime = Date.now() / 1000
    const timeUntilExpiry = payload.exp - currentTime
    
    // Return true if token expires in less than 5 minutes
    return timeUntilExpiry < 300
  }

  const scheduleTokenRefresh = (token) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    const payload = parseJWT(token)
    if (!payload || !payload.exp) return

    const currentTime = Date.now() / 1000
    const timeUntilExpiry = payload.exp - currentTime
    
    // Refresh token 5 minutes before expiry
    const refreshTime = Math.max(0, (timeUntilExpiry - 300) * 1000)

    refreshTimeoutRef.current = setTimeout(() => {
      refreshToken()
    }, refreshTime)
  }

  const refreshToken = async () => {
    if (!token) return

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success && data.access_token) {
        const newToken = data.access_token
        setToken(newToken)
        localStorage.setItem('auth_token', newToken)
        localStorage.setItem('token_type', data.token_type)
        
        // Schedule next refresh
        scheduleTokenRefresh(newToken)
      } else {
        // Refresh failed, logout user
        logout()
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      // If refresh fails, logout user
      logout()
    }
  }

  const getAuthHeaders = () => {
    if (!token) return {}
    
    // Check if token is expiring and refresh if needed
    if (isTokenExpiring(token)) {
      refreshToken()
    }
    
    return {
      'Authorization': `Bearer ${token}`
    }
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    getAuthHeaders,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}