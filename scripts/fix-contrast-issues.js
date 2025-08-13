#!/usr/bin/env node

/**
 * Script to fix critical color contrast issues in the Deep Olive & Gold theme
 * Addresses the issues identified in the contrast analysis
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Critical fixes needed based on contrast analysis
const contrastFixes = {
  // Fix gold buttons with white text (2.71:1 ratio - FAIL)
  // Solution: Change to gunmetal text or use darker gold-700 background
  'bg-gold-400 text-white': 'bg-gold-700 text-white',
  'bg-gold-500 text-white': 'bg-gold-700 text-white',
  'bg-gold-600 text-white': 'bg-gold-700 text-white',
  'hover:bg-gold-500 text-white': 'hover:bg-gold-800 text-white',
  'hover:bg-gold-600 text-white': 'hover:bg-gold-800 text-white',
  'hover:bg-gold-700 text-white': 'hover:bg-gold-800 text-white',
  
  // Alternative: Use dark text on gold
  'bg-secondary text-white': 'bg-secondary text-charcoal-800',
  'bg-secondary text-secondary-foreground': 'bg-secondary text-charcoal-800',
  
  // Fix amber/warning with white text (2.03:1 ratio - FAIL)
  'bg-amber-500 text-white': 'bg-amber-700 text-white',
  'bg-amber-600 text-white': 'bg-amber-700 text-white',
  'bg-yellow-500 text-white': 'bg-amber-700 text-white',
  'bg-yellow-600 text-white': 'bg-amber-700 text-white',
  
  // Fix success colors (moss green)
  'text-moss-500': 'text-moss-700',
  'text-moss-600': 'text-moss-700',
  'bg-moss-500 text-white': 'bg-moss-600 text-white',
  'bg-green-500 text-white': 'bg-moss-600 text-white',
  'bg-green-600 text-white': 'bg-moss-600 text-white',
  
  // Fix status text on light backgrounds
  'text-amber-500': 'text-amber-700',
  'text-amber-600': 'text-amber-700',
  'text-yellow-500': 'text-amber-800',
  'text-yellow-600': 'text-amber-800',
  
  // Fix semantic status badges
  'bg-green-100 text-green-600': 'bg-moss-100 text-moss-800',
  'bg-green-100 text-green-700': 'bg-moss-100 text-moss-800',
  'bg-green-100 text-green-800': 'bg-moss-100 text-moss-900',
  'bg-yellow-100 text-yellow-600': 'bg-amber-100 text-amber-900',
  'bg-yellow-100 text-yellow-700': 'bg-amber-100 text-amber-900',
  'bg-yellow-100 text-yellow-800': 'bg-amber-100 text-amber-900',
  'bg-red-100 text-red-600': 'bg-softred-100 text-softred-800',
  'bg-red-100 text-red-700': 'bg-softred-100 text-softred-800',
  'bg-red-100 text-red-800': 'bg-softred-100 text-softred-900',
  
  // Fix dark mode status badges
  'dark:bg-green-900/30 dark:text-green-400': 'dark:bg-moss-900/30 dark:text-moss-300',
  'dark:bg-yellow-900/30 dark:text-yellow-400': 'dark:bg-amber-900/30 dark:text-amber-300',
  'dark:bg-red-900/30 dark:text-red-400': 'dark:bg-softred-900/30 dark:text-softred-300',
};

// Additional pattern-based fixes for complex cases
const regexFixes = [
  // Fix gold buttons with separate classes
  {
    pattern: /className="([^"]*\b)bg-gold-[456]00(\s+[^"]*)?text-white/g,
    replacement: (match, before, after) => {
      const classes = match.replace('text-white', 'text-charcoal-800');
      return classes;
    }
  },
  // Fix secondary buttons
  {
    pattern: /className="([^"]*\b)bg-secondary(\s+[^"]*)?text-white/g,
    replacement: (match, before, after) => {
      const classes = match.replace('text-white', 'text-charcoal-800');
      return classes;
    }
  },
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    let changeLog = [];
    
    // Apply direct string replacements
    for (const [oldPattern, newPattern] of Object.entries(contrastFixes)) {
      const regex = new RegExp(escapeRegExp(oldPattern), 'g');
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        content = content.replace(regex, newPattern);
        hasChanges = true;
        changeLog.push(`  ${matches.length}x: ${oldPattern} → ${newPattern}`);
      }
    }
    
    // Apply regex-based fixes
    for (const { pattern, replacement } of regexFixes) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        content = content.replace(pattern, replacement);
        hasChanges = true;
        changeLog.push(`  ${matches.length}x: Complex pattern fixed`);
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
      changeLog.forEach(log => console.log(log));
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Create semantic color utility classes
function createSemanticClasses() {
  const semanticClasses = `
/* Semantic Status Colors with Proper Contrast */
/* Add these to your globals.css file */

@layer utilities {
  /* Success States - Using Moss Green */
  .status-success {
    @apply bg-moss-100 text-moss-900 dark:bg-moss-900/30 dark:text-moss-300;
  }
  .status-success-solid {
    @apply bg-moss-700 text-white hover:bg-moss-800;
  }
  
  /* Warning States - Using Amber */
  .status-warning {
    @apply bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300;
  }
  .status-warning-solid {
    @apply bg-amber-700 text-white hover:bg-amber-800;
  }
  
  /* Error States - Using Soft Red */
  .status-error {
    @apply bg-softred-100 text-softred-900 dark:bg-softred-900/30 dark:text-softred-300;
  }
  .status-error-solid {
    @apply bg-softred-600 text-white hover:bg-softred-700;
  }
  
  /* Info States - Using Olive */
  .status-info {
    @apply bg-olive-100 text-olive-900 dark:bg-olive-900/30 dark:text-olive-300;
  }
  .status-info-solid {
    @apply bg-olive-600 text-white hover:bg-olive-700;
  }
  
  /* Gold/Secondary Buttons with Proper Contrast */
  .btn-gold {
    @apply bg-gold-600 text-charcoal-800 hover:bg-gold-700 font-medium;
  }
  .btn-gold-outline {
    @apply border-2 border-gold-600 text-gold-700 hover:bg-gold-50 dark:text-gold-400 dark:hover:bg-gold-900/20;
  }
}
`;

  const outputPath = path.join(__dirname, '..', 'styles', 'semantic-colors.css');
  fs.writeFileSync(outputPath, semanticClasses);
  console.log(`\n✅ Created semantic color classes at: styles/semantic-colors.css`);
  console.log('   Import this in your globals.css file: @import "./semantic-colors.css";');
}

async function main() {
  console.log('🎨 Fixing Color Contrast Issues...\n');
  
  const filePatterns = [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
  ];
  
  let totalFiles = 0;
  let updatedFiles = 0;
  
  for (const pattern of filePatterns) {
    const files = glob.sync(pattern, { 
      cwd: path.join(__dirname, '..'),
      absolute: true 
    });
    
    for (const file of files) {
      totalFiles++;
      if (updateFile(file)) {
        updatedFiles++;
      }
    }
  }
  
  // Create semantic color classes
  createSemanticClasses();
  
  console.log('\n📊 Contrast Fix Summary:');
  console.log(`   Total files scanned: ${totalFiles}`);
  console.log(`   Files updated: ${updatedFiles}`);
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Import semantic-colors.css in your globals.css');
  console.log('2. Replace hardcoded status colors with semantic classes:');
  console.log('   • Use .status-success instead of bg-green-* text-green-*');
  console.log('   • Use .status-warning instead of bg-yellow-* text-yellow-*');
  console.log('   • Use .status-error instead of bg-red-* text-red-*');
  console.log('   • Use .btn-gold instead of bg-gold-* text-white');
  console.log('\n3. Test all buttons and status indicators for proper contrast');
  console.log('4. Run the contrast analysis again to verify fixes');
  
  console.log('\n✨ Contrast fixes complete!');
}

main().catch(console.error);