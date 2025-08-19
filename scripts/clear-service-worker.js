#!/usr/bin/env node

/**
 * Script to help users clear their service worker cache
 * Run this script and follow the instructions
 */

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                  SERVICE WORKER CACHE CLEAR GUIDE                ║
╚══════════════════════════════════════════════════════════════════╝

The payment setup issue has been fixed! To apply the fix, you need to:

1. CLEAR BROWSER CACHE & SERVICE WORKER:
   
   Option A - Quick Clear (Chrome/Edge):
   • Press Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)
   • This forces a hard reload and clears the cache
   
   Option B - Manual Clear (All Browsers):
   • Open Developer Tools (F12 or Cmd+Option+I)
   • Go to Application tab (Chrome) or Storage tab (Firefox)
   • Find "Service Workers" in the left sidebar
   • Click "Unregister" for all workers from bookedbarber.com
   • Find "Cache Storage" and delete all caches
   
   Option C - Chrome DevTools Method:
   • Open DevTools (F12)
   • Right-click the refresh button
   • Select "Empty Cache and Hard Reload"

2. REFRESH THE PAGE:
   • After clearing, refresh the page normally
   • The new service worker will install automatically

3. TEST THE FIX:
   • Navigate to the Payment Setup step in onboarding
   • Click "Start Setup" button
   • It should now work properly!

WHAT WAS FIXED:
• Service worker was blocking payment API calls
• Added proper error handling and timeout protection
• Improved user feedback with error/success messages

If you still experience issues:
1. Try using an incognito/private window
2. Check the browser console for any errors
3. Make sure you're connected to the internet

═══════════════════════════════════════════════════════════════════
`)

// Check if running in browser context
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister()
      console.log('✓ Service worker unregistered:', registration.scope)
    }
  })
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name)
        console.log('✓ Cache cleared:', name)
      })
    })
  }
}