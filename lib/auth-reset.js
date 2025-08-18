export function resetAuthState() {
  
  // 1. Clear all Supabase storage
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
      keysToRemove.push(key)
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })
  
  // 2. Clear session storage
  sessionStorage.clear()
  
  // 3. Clear cookies (if any)
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
  })
  
}

export function debugAuthState() {
  
  const supabaseItems = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
      supabaseItems[key] = localStorage.getItem(key)
    }
  }
  
  
  return supabaseItems
}