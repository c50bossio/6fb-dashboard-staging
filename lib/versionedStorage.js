/**
 * Versioned Storage Utility
 * 
 * This utility manages localStorage with version checking to ensure
 * stale data is cleared when the application is updated.
 * 
 * It automatically clears old data when the storage version changes,
 * preventing issues where old cached data conflicts with new code.
 */

// Storage version - increment this when storage structure changes
const STORAGE_VERSION = '2.0.0';
const VERSION_KEY = '__storage_version__';
const BUILD_KEY = '__build_id__';

// Check and clear old storage on initialization
if (typeof window !== 'undefined') {
  const currentVersion = localStorage.getItem(VERSION_KEY);
  const currentBuild = localStorage.getItem(BUILD_KEY);
  const newBuild = process.env.NEXT_PUBLIC_BUILD_ID;
  
  // Clear storage if version mismatch or build changed
  if (currentVersion !== STORAGE_VERSION || (newBuild && currentBuild !== newBuild)) {
    console.log('[Storage] Clearing old storage due to version/build change');
    console.log(`[Storage] Old version: ${currentVersion}, New version: ${STORAGE_VERSION}`);
    console.log(`[Storage] Old build: ${currentBuild}, New build: ${newBuild}`);
    
    // Clear everything except critical auth data
    const keysToPreserve = ['supabase.auth.token'];
    const preservedData = {};
    
    keysToPreserve.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        preservedData[key] = value;
      }
    });
    
    localStorage.clear();
    
    // Restore preserved data
    Object.entries(preservedData).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    
    // Set new version and build
    localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
    if (newBuild) {
      localStorage.setItem(BUILD_KEY, newBuild);
    }
  }
}

/**
 * Set data in localStorage with version metadata
 */
export const setVersionedItem = (key, data) => {
  if (typeof window === 'undefined') return;
  
  try {
    const versionedData = {
      version: STORAGE_VERSION,
      buildId: process.env.NEXT_PUBLIC_BUILD_ID,
      timestamp: Date.now(),
      data
    };
    
    localStorage.setItem(key, JSON.stringify(versionedData));
    return true;
  } catch (error) {
    console.error('[Storage] Failed to set item:', error);
    
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError') {
      // Clear old data and retry
      clearOldData();
      try {
        const versionedData = {
          version: STORAGE_VERSION,
          buildId: process.env.NEXT_PUBLIC_BUILD_ID,
          timestamp: Date.now(),
          data
        };
        localStorage.setItem(key, JSON.stringify(versionedData));
        return true;
      } catch (retryError) {
        console.error('[Storage] Failed to set item after clearing:', retryError);
        return false;
      }
    }
    return false;
  }
};

/**
 * Get data from localStorage with version checking
 */
export const getVersionedItem = (key, maxAge = null) => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Check if data has version metadata
    if (!parsed.version || !parsed.data) {
      // Old format data, clear it
      localStorage.removeItem(key);
      return null;
    }
    
    // Check version match
    if (parsed.version !== STORAGE_VERSION) {
      console.log(`[Storage] Version mismatch for key ${key}, clearing`);
      localStorage.removeItem(key);
      return null;
    }
    
    // Check build ID if available
    const currentBuild = process.env.NEXT_PUBLIC_BUILD_ID;
    if (currentBuild && parsed.buildId && parsed.buildId !== currentBuild) {
      console.log(`[Storage] Build mismatch for key ${key}, clearing`);
      localStorage.removeItem(key);
      return null;
    }
    
    // Check age if maxAge is specified
    if (maxAge && parsed.timestamp) {
      const age = Date.now() - parsed.timestamp;
      if (age > maxAge) {
        console.log(`[Storage] Data expired for key ${key}, clearing`);
        localStorage.removeItem(key);
        return null;
      }
    }
    
    return parsed.data;
  } catch (error) {
    console.error('[Storage] Failed to get item:', error);
    // If parsing fails, remove the corrupted data
    localStorage.removeItem(key);
    return null;
  }
};

/**
 * Remove item from localStorage
 */
export const removeVersionedItem = (key) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('[Storage] Failed to remove item:', error);
    return false;
  }
};

/**
 * Clear old data to free up space
 */
const clearOldData = () => {
  if (typeof window === 'undefined') return;
  
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  Object.keys(localStorage).forEach(key => {
    // Skip system keys
    if (key === VERSION_KEY || key === BUILD_KEY) return;
    
    try {
      const stored = localStorage.getItem(key);
      const parsed = JSON.parse(stored);
      
      if (parsed.timestamp && (now - parsed.timestamp) > maxAge) {
        localStorage.removeItem(key);
        console.log(`[Storage] Cleared old data for key: ${key}`);
      }
    } catch {
      // If we can't parse it, it's probably old format or corrupted
      // Keep auth-related keys, clear others
      if (!key.includes('auth') && !key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    }
  });
};

/**
 * Clear all versioned storage
 */
export const clearAllVersionedStorage = () => {
  if (typeof window === 'undefined') return;
  
  // Preserve auth data
  const authKeys = Object.keys(localStorage).filter(key => 
    key.includes('auth') || key.includes('supabase')
  );
  const authData = {};
  
  authKeys.forEach(key => {
    authData[key] = localStorage.getItem(key);
  });
  
  // Clear everything
  localStorage.clear();
  
  // Restore auth data
  Object.entries(authData).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
  
  // Set new version
  localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
  localStorage.setItem(BUILD_KEY, process.env.NEXT_PUBLIC_BUILD_ID || '');
  
  console.log('[Storage] Cleared all versioned storage');
};

/**
 * Get storage info for debugging
 */
export const getStorageInfo = () => {
  if (typeof window === 'undefined') return null;
  
  const keys = Object.keys(localStorage);
  const totalSize = new Blob(Object.values(localStorage)).size;
  
  return {
    version: localStorage.getItem(VERSION_KEY),
    buildId: localStorage.getItem(BUILD_KEY),
    currentBuildId: process.env.NEXT_PUBLIC_BUILD_ID,
    itemCount: keys.length,
    totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
    keys: keys
  };
};

export default {
  set: setVersionedItem,
  get: getVersionedItem,
  remove: removeVersionedItem,
  clear: clearAllVersionedStorage,
  info: getStorageInfo
};