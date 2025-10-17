// ❌ CURRENT: Full library imports (adds ~500KB)
import { User, Settings, Home, Calendar, Mail } from 'lucide-react'
import { ChevronDownIcon, UserIcon, CogIcon } from '@heroicons/react/24/outline'

// ✅ OPTIMIZED: Direct imports for better tree-shaking
import User from 'lucide-react/dist/esm/icons/user'
import Settings from 'lucide-react/dist/esm/icons/settings'
import Home from 'lucide-react/dist/esm/icons/home'

// ✅ BETTER: Create icon barrel file for centralized management
export { 
  User,
  Settings, 
  Home,
  Calendar,
  Mail 
} from 'lucide-react'

import { User, Settings } from '@/lib/icons'

// ✅ NEXT.JS 14: Use experimental.optimizePackageImports
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react',
      'recharts'
    ]
  }
}

