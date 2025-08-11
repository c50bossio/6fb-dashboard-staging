/**
 * Database Helper Functions
 * 
 * These functions replace mock data generators with real database queries.
 * All functions return real data from the database or empty states.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get a user from database
 */
export async function getUserFromDatabase() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error fetching user:', error);
    // Return empty user object instead of placeholder
    return null;
  }
  
  return data;
}

/**
 * Get a test user from database
 */
export async function getTestUserFromDatabase() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_test', true)
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error fetching test user:', error);
    // Return null instead of placeholder
    return null;
  }
  
  return data;
}

/**
 * Get random data from database
 */
export async function getRandomFromDatabase(count) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(count);
  
  if (error) {
    console.error('Error fetching random data:', error);
    return [];
  }
  
  return data[Math.floor(Math.random() * data.length)];
}

/**
 * Fetch data from database with options
 */
export async function fetchFromDatabase(options = {}) {
  const { limit = 10, table = 'profiles' } = options;
  
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(limit);
  
  if (error) {
    console.error('Error fetching from database:', error);
    return [];
  }
  
  return data;
}

/**
 * Fetch real data from database (generic replacement for mock generators)
 */
export async function fetchRealDataFromDatabase(type, options = {}) {
  const tableMap = {
    'Users': 'profiles',
    'Bookings': 'bookings',
    'Services': 'services',
    'Barbers': 'barbers',
    'Metrics': 'metrics'
  };
  
  const table = tableMap[type] || 'profiles';
  
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(options.limit || 10);
  
  if (error) {
    console.error(`Error fetching ${type}:`, error);
    return [];
  }
  
  return data;
}

module.exports = {
  getUserFromDatabase,
  getTestUserFromDatabase,
  getRandomFromDatabase,
  fetchFromDatabase,
  fetchRealDataFromDatabase
};
