// Clear any dev session data that might interfere with auth

// This would run in the browser console
const clearDevSession = () => {
  localStorage.removeItem('dev_session')
  sessionStorage.removeItem('force_sign_out')
  
  // Remove dev_auth cookie
  document.cookie = 'dev_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'

  )
  
}

sessionStorage.removeItem('force_sign_out')
document.cookie = 'dev_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'

Then refresh the page.
`)