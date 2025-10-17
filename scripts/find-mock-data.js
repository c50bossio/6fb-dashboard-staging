
const fs = require('fs').promises
const path = require('path')

const SEARCH_PATTERNS = [
  'generateMock',
  'mock.*data',
  'fallback.*data',
  'mockData',
  'MockData',
  'MOCK_DATA',
  'const.*mock.*=',
  'let.*mock.*=',
  'var.*mock.*='
]

const EXCLUDE_DIRS = [
  'node_modules',
  '.git', 
  '.next',
  'coverage',
  'dist',
  'build',
  '__tests__',
  'tests',
  'playwright-report'
]

const EXCLUDE_FILES = [
  '.md',
  '.json',
  '.lock',
  '.log',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico'
]

async function findMockDataFiles() {

  const results = {
    totalFiles: 0,
    filesWithMockData: 0,
    mockDataInstances: [],
    progress: {},
    summary: {}
  }
  
  await scanDirectory('.', results)
  
  generateProgressReport(results)
  
  return results
}

async function scanDirectory(dirPath, results) {
  try {
    const items = await fs.readdir(dirPath)
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item)
      const stat = await fs.stat(fullPath)
      
      if (stat.isDirectory()) {
        if (EXCLUDE_DIRS.some(excluded => item.includes(excluded))) {
          continue
        }
        await scanDirectory(fullPath, results)
      } else if (stat.isFile()) {
        if (EXCLUDE_FILES.some(ext => item.endsWith(ext))) {
          continue
        }
        
        await scanFile(fullPath, results)
        results.totalFiles++
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan ${dirPath}:`, error.message)
  }
}

async function scanFile(filePath, results) {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    const lines = content.split('\n')
    const Instances = []
    
    lines.forEach((line, index) => {
      SEARCH_PATTERNS.forEach(pattern => {
        const regex = new RegExp(pattern, 'gi')
        const matches = line.match(regex)
        
        if (matches) {
          matches.forEach(match => {
            mockInstances.push({
              file: filePath,
              line: index + 1,
              match: match,
              context: line.trim(),
              pattern: pattern
            })
          })
        }
      })
    })
    
    if (mockInstances.length > 0) {
      results.filesWithMockData++
      results.mockDataInstances.push(...mockInstances)
    }
    
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}:`, error.message)
  }
}

function generateProgressReport(results) {
  
  )

  if (results.mockDataInstances.length === 0) {
    
    return
  }

  )
  
  const fileGroups = {}
  results.mockDataInstances.forEach(instance => {
    if (!fileGroups[instance.file]) {
      fileGroups[instance.file] = []
    }
    fileGroups[instance.file].push(instance)
  })
  
  const sortedFiles = Object.entries(fileGroups)
    .sort(([, a], [, b]) => b.length - a.length)
  
  sortedFiles.forEach(([file, instances]) => {
    const priority = getPriority(file, instances.length)
    :`)
    
    instances.forEach(instance => {

    })
  })

  )
  
  const priorities = {
    '🔴 HIGH': sortedFiles.filter(([file, instances]) => 
      instances.length >= 5 || isHighPriorityFile(file)).length,
    '🟡 MEDIUM': sortedFiles.filter(([file, instances]) => 
      instances.length >= 2 && instances.length < 5 && !isHighPriorityFile(file)).length,
    '🟢 LOW': sortedFiles.filter(([file, instances]) => 
      instances.length < 2 && !isHighPriorityFile(file)).length
  }
  
  Object.entries(priorities).forEach(([priority, count]) => {
    
  })

  )
  
  const patternCounts = {}
  results.mockDataInstances.forEach(instance => {
    patternCounts[instance.pattern] = (patternCounts[instance.pattern] || 0) + 1
  })
  
  Object.entries(patternCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([pattern, count]) => {
      
    })

}

function getPriority(file, instanceCount) {
  if (isHighPriorityFile(file) || instanceCount >= 5) {
    return '🔴 HIGH'
  } else if (instanceCount >= 2) {
    return '🟡 MEDIUM'  
  } else {
    return '🟢 LOW'
  }
}

function isHighPriorityFile(file) {
  const highPriorityPatterns = [
    'components/dashboard',
    'app/(protected)/dashboard',
    'api/',
    'hooks/',
    'lib/',
    'contexts/'
  ]
  
  return highPriorityPatterns.some(pattern => file.includes(pattern))
}

function generateCleanupSuggestions(results) {
  
  )
  
  const suggestions = [
    'Replace generateMock* functions with database query functions',
    'Update import statements to use real database modules',
    'Remove fallback mock data in catch blocks',
    'Replace hardcoded mock arrays/objects with database operations',
    'Add proper error handling for empty database results',
    'Create database seed scripts for missing test data'
  ]
  
  suggestions.forEach((suggestion, index) => {
    
  })
}

if (require.main === module) {
  findMockDataFiles()
    .then(results => {
      generateCleanupSuggestions(results)
      
      if (results.mockDataInstances.length > 0) {
        
        process.exit(1)
      } else {
        
        process.exit(0)
      }
    })
    .catch(error => {
      console.error('❌ Scan failed:', error)
      process.exit(1)
    })
}

module.exports = { findMockDataFiles }