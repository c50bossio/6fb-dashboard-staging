// ❌ CURRENT: Full library imports (adds ~500KB)
import { User, Settings, Home, Calendar, Mail } from 'lucide-react'
import { ChevronDownIcon, UserIcon, CogIcon } from '@heroicons/react/24/outline'

// ✅ OPTIMIZED: Direct imports for better tree-shaking
import User from 'lucide-react/dist/esm/icons/user'
import Settings from 'lucide-react/dist/esm/icons/settings'
import Home from 'lucide-react/dist/esm/icons/home'

// ✅ BETTER: Create icon barrel file for centralized management
// lib/icons.js
export { 
  User,
  Settings, 
  Home,
  Calendar,
  Mail 
} from 'lucide-react'

// Usage in components
import { User, Settings } from '@/lib/icons'

// ✅ NEXT.JS 14: Use experimental.optimizePackageImports
// next.config.js
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react',
      'recharts'
    ]
  }
}

// Result: ~300KB → ~20KB for icons (95% reduction)