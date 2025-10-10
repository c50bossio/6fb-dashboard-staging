/**
 * Booking Slug Generator
 * Feature: 011-holistic-staff-management
 *
 * Generates unique URL slugs for barber booking pages
 * Example: "John Smith" → "john-smith" or "john-smith-2" if duplicate
 */

import { createClient } from '@/lib/supabase/client'

/**
 * Generate a unique booking slug from first and last name
 * - Converts to kebab-case: "John Smith" → "john-smith"
 * - Handles duplicates by appending number: "john-smith-2"
 * - Sanitizes special characters
 * - Ensures uniqueness via database check
 */
export async function generateBookingSlug(
  firstName: string,
  lastName: string
): Promise<string> {
  const supabase = createClient()

  // Kebab-case transformation
  const base = `${firstName}-${lastName}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens

  // Check for duplicates
  const { data: existing, error } = await supabase
    .from('profiles')
    .select('booking_slug')
    .eq('booking_slug', base)
    .maybeSingle()

  if (error) {
    console.error('Error checking slug uniqueness:', error)
    throw new Error('Failed to generate booking slug')
  }

  if (!existing) {
    // Base slug is available
    return base
  }

  // Find highest suffix for conflicts
  const pattern = `${base}-%`
  const { data: conflicts, error: conflictError } = await supabase
    .from('profiles')
    .select('booking_slug')
    .like('booking_slug', pattern)

  if (conflictError) {
    console.error('Error finding slug conflicts:', conflictError)
    throw new Error('Failed to generate unique booking slug')
  }

  // Extract numeric suffixes and find max
  const suffixes = conflicts
    ?.map(p => {
      const match = p.booking_slug?.match(/-(\d+)$/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter(n => n > 0) || []

  const maxSuffix = suffixes.length > 0 ? Math.max(...suffixes) : 1

  return `${base}-${maxSuffix + 1}`
}

/**
 * Validate a custom slug (if manually provided)
 * - Must be kebab-case
 * - Must be unique
 * - Must be 3-100 characters
 */
export async function validateCustomSlug(
  slug: string,
  excludeUserId?: string
): Promise<{ valid: boolean; error?: string }> {
  // Format validation
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (!slugRegex.test(slug)) {
    return {
      valid: false,
      error: 'Slug must be kebab-case (lowercase letters, numbers, and hyphens only)'
    }
  }

  if (slug.length < 3 || slug.length > 100) {
    return { valid: false, error: 'Slug must be 3-100 characters' }
  }

  // Uniqueness check
  const supabase = createClient()
  let query = supabase
    .from('profiles')
    .select('id')
    .eq('booking_slug', slug)

  // Exclude current user if updating existing profile
  if (excludeUserId) {
    query = query.neq('id', excludeUserId)
  }

  const { data: existing } = await query.maybeSingle()

  if (existing) {
    return { valid: false, error: 'This booking URL is already taken' }
  }

  return { valid: true }
}

/**
 * Suggest alternative slugs if preferred slug is taken
 */
export async function suggestAlternativeSlugs(
  firstName: string,
  lastName: string,
  count: number = 3
): Promise<string[]> {
  const base = `${firstName}-${lastName}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const suggestions: string[] = []

  // Try with just first name
  suggestions.push(`${firstName.toLowerCase()}`)

  // Try with middle initial if available
  if (firstName.includes(' ')) {
    const parts = firstName.split(' ')
    suggestions.push(`${parts[0].toLowerCase()}-${parts[1][0].toLowerCase()}-${lastName.toLowerCase()}`)
  }

  // Try with numbers
  for (let i = 1; i <= count; i++) {
    suggestions.push(`${base}-${i}`)
  }

  // Validate all suggestions
  const supabase = createClient()
  const validSuggestions: string[] = []

  for (const suggestion of suggestions) {
    const { data } = await supabase
      .from('profiles')
      .select('booking_slug')
      .eq('booking_slug', suggestion)
      .maybeSingle()

    if (!data) {
      validSuggestions.push(suggestion)
    }

    if (validSuggestions.length >= count) break
  }

  return validSuggestions
}
