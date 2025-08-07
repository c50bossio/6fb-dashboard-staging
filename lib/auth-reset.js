export function resetAuthState() {
  console.log('🧹 Performing complete auth state reset...')
  
  // 1. Clear all Supabase storage
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
      keysToRemove.push(key)
    }
  }
  
  keysToRemove.forEach(key => {
    console.log(`  Removing: ${key}`)
    localStorage.removeItem(key)
  })
  
  // 2. Clear session storage
  sessionStorage.clear()
  
  // 3. Clear cookies (if any)
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
  })
  
  console.log('✅ Auth state reset complete')
}

export function debugAuthState() {
  console.log('🔍 Current Auth State Debug:')
  console.log('LocalStorage keys:', Object.keys(localStorage))
  console.log('SessionStorage keys:', Object.keys(sessionStorage))
  
  // Check for Supabase specific items
  const supabaseItems = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
      supabaseItems[key] = localStorage.getItem(key)
    }
  }
  
  console.log('Supabase items:', supabaseItems)
  
  return supabaseItems
}