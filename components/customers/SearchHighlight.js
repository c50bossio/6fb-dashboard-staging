'use client'

import React from 'react'

/**
 * SearchHighlight Component
 * 
 * Highlights matching text within search results with smooth animations
 * and intelligent text parsing for better user experience.
 * 
 * Features:
 * - Case-insensitive highlighting
 * - Multiple match highlighting in a single string
 * - Smooth fade-in animations for highlights
 * - Accessible markup with proper ARIA attributes
 * - Fuzzy match support with partial highlighting
 * - Customizable highlight styling
 */
export default function SearchHighlight({ 
  text = '', 
  searchQuery = '', 
  className = '',
  highlightClassName = 'bg-yellow-200 text-yellow-900 px-0.5 rounded animate-pulse-subtle',
  caseSensitive = false,
  maxLength = null,
  showEllipsis = true
}) {
  // Early return for invalid inputs
  if (!text || !searchQuery) {
    const displayText = maxLength && text.length > maxLength 
      ? `${text.substring(0, maxLength)}${showEllipsis ? '...' : ''}`
      : text
    
    return <span className={className}>{displayText}</span>
  }

  // Prepare text and query for comparison
  const originalText = String(text)
  const query = String(searchQuery).trim()
  
  if (!query) {
    const displayText = maxLength && originalText.length > maxLength 
      ? `${originalText.substring(0, maxLength)}${showEllipsis ? '...' : ''}`
      : originalText
    
    return <span className={className}>{displayText}</span>
  }

  // Apply max length before highlighting to avoid highlighting cut-off text
  const textToProcess = maxLength && originalText.length > maxLength 
    ? originalText.substring(0, maxLength)
    : originalText
  
  const shouldShowEllipsis = maxLength && originalText.length > maxLength && showEllipsis

  // Find all matches in the text
  const findMatches = (text, searchQuery, caseSensitive = false) => {
    const matches = []
    const textToSearch = caseSensitive ? text : text.toLowerCase()
    const queryToSearch = caseSensitive ? searchQuery : searchQuery.toLowerCase()
    
    // Handle multiple words in search query
    const words = queryToSearch.split(/\s+/).filter(word => word.length > 0)
    
    words.forEach(word => {
      let startIndex = 0
      let index
      
      // Find all occurrences of each word
      while ((index = textToSearch.indexOf(word, startIndex)) !== -1) {
        matches.push({
          start: index,
          end: index + word.length,
          word: word
        })
        startIndex = index + 1
      }
    })
    
    // Sort matches by start position and merge overlapping ones
    return mergeOverlappingMatches(matches.sort((a, b) => a.start - b.start))
  }

  // Merge overlapping or adjacent matches to avoid nested highlights
  const mergeOverlappingMatches = (matches) => {
    if (matches.length <= 1) return matches
    
    const merged = [matches[0]]
    
    for (let i = 1; i < matches.length; i++) {
      const current = matches[i]
      const last = merged[merged.length - 1]
      
      // If current match overlaps or is adjacent to the last merged match
      if (current.start <= last.end + 1) {
        // Extend the last match to include the current one
        last.end = Math.max(last.end, current.end)
      } else {
        // Add as a new separate match
        merged.push(current)
      }
    }
    
    return merged
  }

  // Find all matches in the text
  const matches = findMatches(textToProcess, query, caseSensitive)
  
  // If no matches found, return the original text
  if (matches.length === 0) {
    return (
      <span className={className}>
        {textToProcess}
        {shouldShowEllipsis && '...'}
      </span>
    )
  }

  // Split text into segments with highlights
  const segments = []
  let currentIndex = 0
  
  matches.forEach((match, matchIndex) => {
    // Add text before the match
    if (currentIndex < match.start) {
      segments.push({
        type: 'text',
        content: textToProcess.substring(currentIndex, match.start),
        key: `text-${matchIndex}-${currentIndex}`
      })
    }
    
    // Add the highlighted match
    segments.push({
      type: 'highlight',
      content: textToProcess.substring(match.start, match.end),
      key: `highlight-${matchIndex}-${match.start}`
    })
    
    currentIndex = match.end
  })
  
  // Add remaining text after the last match
  if (currentIndex < textToProcess.length) {
    segments.push({
      type: 'text',
      content: textToProcess.substring(currentIndex),
      key: `text-final-${currentIndex}`
    })
  }

  return (
    <span className={className} role="search" aria-label={`Text with highlighted search terms: ${query}`}>
      {segments.map(segment => (
        segment.type === 'highlight' ? (
          <mark
            key={segment.key}
            className={`${highlightClassName} transition-colors duration-200`}
            aria-label={`Search match: ${segment.content}`}
          >
            {segment.content}
          </mark>
        ) : (
          <span key={segment.key}>
            {segment.content}
          </span>
        )
      ))}
      {shouldShowEllipsis && '...'}
    </span>
  )
}

/**
 * Advanced SearchHighlight with fuzzy matching capabilities
 * Supports more intelligent highlighting for typo tolerance
 */
export function FuzzySearchHighlight({ 
  text = '', 
  searchQuery = '', 
  className = '',
  highlightClassName = 'bg-yellow-200 text-yellow-900 px-0.5 rounded',
  fuzzyThreshold = 0.6,
  maxLength = null,
  showEllipsis = true
}) {
  // Calculate fuzzy match score using Levenshtein distance
  const calculateFuzzyScore = (text, query) => {
    if (!text || !query) return 0
    
    const textLower = text.toLowerCase()
    const queryLower = query.toLowerCase()
    
    // Exact match gets perfect score
    if (textLower.includes(queryLower)) return 1
    
    // Calculate Levenshtein distance
    const matrix = []
    const textLen = textLower.length
    const queryLen = queryLower.length
    
    for (let i = 0; i <= textLen; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= queryLen; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= textLen; i++) {
      for (let j = 1; j <= queryLen; j++) {
        if (textLower[i - 1] === queryLower[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }
    
    const distance = matrix[textLen][queryLen]
    const maxLength = Math.max(textLen, queryLen)
    
    return maxLength === 0 ? 1 : 1 - (distance / maxLength)
  }

  // Find fuzzy matches with character-level highlighting
  const findFuzzyMatches = (text, query) => {
    const textLower = text.toLowerCase()
    const queryLower = query.toLowerCase()
    const matches = []
    
    // Try to find subsequence matches
    let queryIndex = 0
    for (let textIndex = 0; textIndex < textLower.length && queryIndex < queryLower.length; textIndex++) {
      if (textLower[textIndex] === queryLower[queryIndex]) {
        matches.push({
          start: textIndex,
          end: textIndex + 1,
          score: 1
        })
        queryIndex++
      }
    }
    
    // Only return matches if we matched a significant portion of the query
    const matchRatio = queryIndex / queryLower.length
    return matchRatio >= fuzzyThreshold ? matches : []
  }

  const textToProcess = maxLength && text.length > maxLength 
    ? text.substring(0, maxLength)
    : text
  
  const shouldShowEllipsis = maxLength && text.length > maxLength && showEllipsis

  if (!searchQuery || !text) {
    return (
      <span className={className}>
        {textToProcess}
        {shouldShowEllipsis && '...'}
      </span>
    )
  }

  // Calculate overall fuzzy score
  const fuzzyScore = calculateFuzzyScore(textToProcess, searchQuery)
  
  if (fuzzyScore < fuzzyThreshold) {
    return (
      <span className={className}>
        {textToProcess}
        {shouldShowEllipsis && '...'}
      </span>
    )
  }

  // For high scores, use exact matching
  if (fuzzyScore > 0.8) {
    return (
      <SearchHighlight
        text={textToProcess}
        searchQuery={searchQuery}
        className={className}
        highlightClassName={highlightClassName}
        maxLength={null} // Already handled above
        showEllipsis={false} // Already handled above
      />
    )
  }

  // For medium scores, use fuzzy character-level highlighting
  const fuzzyMatches = findFuzzyMatches(textToProcess, searchQuery)
  
  if (fuzzyMatches.length === 0) {
    return (
      <span className={className}>
        {textToProcess}
        {shouldShowEllipsis && '...'}
      </span>
    )
  }

  // Render with fuzzy highlights
  const segments = []
  let currentIndex = 0
  
  fuzzyMatches.forEach((match, matchIndex) => {
    // Add text before the match
    if (currentIndex < match.start) {
      segments.push({
        type: 'text',
        content: textToProcess.substring(currentIndex, match.start),
        key: `text-${matchIndex}-${currentIndex}`
      })
    }
    
    // Add the highlighted match
    segments.push({
      type: 'highlight',
      content: textToProcess.substring(match.start, match.end),
      key: `highlight-${matchIndex}-${match.start}`
    })
    
    currentIndex = match.end
  })
  
  // Add remaining text after the last match
  if (currentIndex < textToProcess.length) {
    segments.push({
      type: 'text',
      content: textToProcess.substring(currentIndex),
      key: `text-final-${currentIndex}`
    })
  }

  return (
    <span 
      className={className} 
      role="search" 
      aria-label={`Fuzzy text match with highlighted search terms: ${searchQuery}`}
    >
      {segments.map(segment => (
        segment.type === 'highlight' ? (
          <mark
            key={segment.key}
            className={`${highlightClassName} opacity-75 transition-all duration-200`}
            aria-label={`Fuzzy search match: ${segment.content}`}
            title={`Fuzzy match (${Math.round(fuzzyScore * 100)}% similarity)`}
          >
            {segment.content}
          </mark>
        ) : (
          <span key={segment.key}>
            {segment.content}
          </span>
        )
      ))}
      {shouldShowEllipsis && '...'}
    </span>
  )
}

/**
 * Multi-field SearchHighlight for highlighting across different customer fields
 */
export function MultiFieldSearchHighlight({ 
  fields = [], 
  searchQuery = '', 
  className = '',
  separator = ' • ',
  maxFieldLength = 50
}) {
  if (!searchQuery || fields.length === 0) {
    return (
      <span className={className}>
        {fields.join(separator)}
      </span>
    )
  }

  return (
    <span className={className}>
      {fields.map((field, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-gray-400">{separator}</span>}
          <SearchHighlight
            text={field}
            searchQuery={searchQuery}
            maxLength={maxFieldLength}
            showEllipsis={true}
          />
        </React.Fragment>
      ))}
    </span>
  )
}