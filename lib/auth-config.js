/**
 * NextAuth.js configuration for the 6FB AI Agent System
 */

import CredentialsProvider from 'next-auth/providers/credentials'

// Mock authentication configuration
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // This is a mock implementation
        // In production, this would validate against your FastAPI backend
        if (credentials?.email && credentials?.password) {
          // Mock user for development
          const mockUser = {
            id: '1',
            email: credentials.email,
            name: 'Test User',
            barbershop_name: 'Test Barbershop'
          }
          
          return mockUser
        }
        
        return null
      }
    })
  ],
  
  pages: {
    signIn: '/auth',
    signOut: '/auth',
    error: '/auth'
  },
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.barbershop_name = user.barbershop_name
      }
      return token
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.barbershop_name = token.barbershop_name
      }
      return session
    }
  },
  
  session: {
    strategy: 'jwt'
  },
  
  secret: process.env.NEXTAUTH_SECRET || 'development-secret'
}

export default authOptions