#!/usr/bin/env node

/**
 * Script to update all hardcoded blue/purple colors to Deep Olive & Gold theme
 * This script will systematically replace color references across the codebase
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const colorMappings = {
  'bg-blue-50': 'bg-olive-50',
  'bg-blue-100': 'bg-olive-100',
  'bg-blue-200': 'bg-olive-200',
  'bg-blue-300': 'bg-olive-300',
  'bg-blue-400': 'bg-olive-400',
  'bg-blue-500': 'bg-olive-500',
  'bg-blue-600': 'bg-olive-600',
  'bg-blue-700': 'bg-olive-700',
  'bg-blue-800': 'bg-olive-800',
  'bg-blue-900': 'bg-olive-900',
  'bg-blue-950': 'bg-olive-950',
  
  'text-blue-50': 'text-olive-50',
  'text-blue-100': 'text-olive-100',
  'text-blue-200': 'text-olive-200',
  'text-blue-300': 'text-olive-300',
  'text-blue-400': 'text-olive-400',
  'text-blue-500': 'text-olive-500',
  'text-blue-600': 'text-olive-600',
  'text-blue-700': 'text-olive-700',
  'text-blue-800': 'text-olive-800',
  'text-blue-900': 'text-olive-900',
  'text-blue-950': 'text-olive-950',
  
  'border-blue-50': 'border-olive-50',
  'border-blue-100': 'border-olive-100',
  'border-blue-200': 'border-olive-200',
  'border-blue-300': 'border-olive-300',
  'border-blue-400': 'border-olive-400',
  'border-blue-500': 'border-olive-500',
  'border-blue-600': 'border-olive-600',
  'border-blue-700': 'border-olive-700',
  'border-blue-800': 'border-olive-800',
  'border-blue-900': 'border-olive-900',
  
  'ring-blue-50': 'ring-olive-50',
  'ring-blue-100': 'ring-olive-100',
  'ring-blue-200': 'ring-olive-200',
  'ring-blue-300': 'ring-olive-300',
  'ring-blue-400': 'ring-olive-400',
  'ring-blue-500': 'ring-olive-500',
  'ring-blue-600': 'ring-olive-600',
  'ring-blue-700': 'ring-olive-700',
  'ring-blue-800': 'ring-olive-800',
  'ring-blue-900': 'ring-olive-900',
  
  'from-blue-50': 'from-olive-50',
  'from-blue-100': 'from-olive-100',
  'from-blue-200': 'from-olive-200',
  'from-blue-300': 'from-olive-300',
  'from-blue-400': 'from-olive-400',
  'from-blue-500': 'from-olive-500',
  'from-blue-600': 'from-olive-600',
  'from-blue-700': 'from-olive-700',
  'from-blue-800': 'from-olive-800',
  'from-blue-900': 'from-olive-900',
  
  'to-blue-50': 'to-olive-50',
  'to-blue-100': 'to-olive-100',
  'to-blue-200': 'to-olive-200',
  'to-blue-300': 'to-olive-300',
  'to-blue-400': 'to-olive-400',
  'to-blue-500': 'to-olive-500',
  'to-blue-600': 'to-olive-600',
  'to-blue-700': 'to-olive-700',
  'to-blue-800': 'to-olive-800',
  'to-blue-900': 'to-olive-900',
  
  'via-blue-50': 'via-olive-50',
  'via-blue-100': 'via-olive-100',
  'via-blue-200': 'via-olive-200',
  'via-blue-300': 'via-olive-300',
  'via-blue-400': 'via-olive-400',
  'via-blue-500': 'via-olive-500',
  'via-blue-600': 'via-olive-600',
  'via-blue-700': 'via-olive-700',
  'via-blue-800': 'via-olive-800',
  'via-blue-900': 'via-olive-900',
  
  'bg-purple-50': 'bg-gold-50',
  'bg-purple-100': 'bg-gold-100',
  'bg-purple-200': 'bg-gold-200',
  'bg-purple-300': 'bg-gold-300',
  'bg-purple-400': 'bg-gold-400',
  'bg-purple-500': 'bg-gold-500',
  'bg-purple-600': 'bg-gold-600',
  'bg-purple-700': 'bg-gold-700',
  'bg-purple-800': 'bg-gold-800',
  'bg-purple-900': 'bg-gold-900',
  'bg-purple-950': 'bg-gold-950',
  
  'text-purple-50': 'text-gold-50',
  'text-purple-100': 'text-gold-100',
  'text-purple-200': 'text-gold-200',
  'text-purple-300': 'text-gold-300',
  'text-purple-400': 'text-gold-400',
  'text-purple-500': 'text-gold-500',
  'text-purple-600': 'text-gold-600',
  'text-purple-700': 'text-gold-700',
  'text-purple-800': 'text-gold-800',
  'text-purple-900': 'text-gold-900',
  'text-purple-950': 'text-gold-950',
  
  'border-purple-50': 'border-gold-50',
  'border-purple-100': 'border-gold-100',
  'border-purple-200': 'border-gold-200',
  'border-purple-300': 'border-gold-300',
  'border-purple-400': 'border-gold-400',
  'border-purple-500': 'border-gold-500',
  'border-purple-600': 'border-gold-600',
  'border-purple-700': 'border-gold-700',
  'border-purple-800': 'border-gold-800',
  'border-purple-900': 'border-gold-900',
  
  'ring-purple-50': 'ring-gold-50',
  'ring-purple-100': 'ring-gold-100',
  'ring-purple-200': 'ring-gold-200',
  'ring-purple-300': 'ring-gold-300',
  'ring-purple-400': 'ring-gold-400',
  'ring-purple-500': 'ring-gold-500',
  'ring-purple-600': 'ring-gold-600',
  'ring-purple-700': 'ring-gold-700',
  'ring-purple-800': 'ring-gold-800',
  'ring-purple-900': 'ring-gold-900',
  
  'from-purple-50': 'from-gold-50',
  'from-purple-100': 'from-gold-100',
  'from-purple-200': 'from-gold-200',
  'from-purple-300': 'from-gold-300',
  'from-purple-400': 'from-gold-400',
  'from-purple-500': 'from-gold-500',
  'from-purple-600': 'from-gold-600',
  'from-purple-700': 'from-gold-700',
  'from-purple-800': 'from-gold-800',
  'from-purple-900': 'from-gold-900',
  
  'to-purple-50': 'to-gold-50',
  'to-purple-100': 'to-gold-100',
  'to-purple-200': 'to-gold-200',
  'to-purple-300': 'to-gold-300',
  'to-purple-400': 'to-gold-400',
  'to-purple-500': 'to-gold-500',
  'to-purple-600': 'to-gold-600',
  'to-purple-700': 'to-gold-700',
  'to-purple-800': 'to-gold-800',
  'to-purple-900': 'to-gold-900',
  
  'via-purple-50': 'via-gold-50',
  'via-purple-100': 'via-gold-100',
  'via-purple-200': 'via-gold-200',
  'via-purple-300': 'via-gold-300',
  'via-purple-400': 'via-gold-400',
  'via-purple-500': 'via-gold-500',
  'via-purple-600': 'via-gold-600',
  'via-purple-700': 'via-gold-700',
  'via-purple-800': 'via-gold-800',
  'via-purple-900': 'via-gold-900',
  
  'bg-indigo-500': 'bg-olive-500',
  'bg-indigo-600': 'bg-olive-600',
  'bg-indigo-700': 'bg-olive-700',
  'text-indigo-500': 'text-olive-500',
  'text-indigo-600': 'text-olive-600',
  'text-indigo-700': 'text-olive-700',
  'border-indigo-500': 'border-olive-500',
  'border-indigo-600': 'border-olive-600',
  
  'bg-violet-500': 'bg-gold-500',
  'bg-violet-600': 'bg-gold-600',
  'bg-violet-700': 'bg-gold-700',
  'text-violet-500': 'text-gold-500',
  'text-violet-600': 'text-gold-600',
  'text-violet-700': 'text-gold-700',
  'border-violet-500': 'border-gold-500',
  'border-violet-600': 'border-gold-600',
  
  'hover:bg-blue-500': 'hover:bg-olive-500',
  'hover:bg-blue-600': 'hover:bg-olive-600',
  'hover:bg-blue-700': 'hover:bg-olive-700',
  'hover:bg-purple-500': 'hover:bg-gold-500',
  'hover:bg-purple-600': 'hover:bg-gold-600',
  'hover:bg-purple-700': 'hover:bg-gold-700',
  'hover:text-blue-500': 'hover:text-olive-500',
  'hover:text-blue-600': 'hover:text-olive-600',
  'hover:text-purple-500': 'hover:text-gold-500',
  'hover:text-purple-600': 'hover:text-gold-600',
  
  'focus:ring-blue-500': 'focus:ring-olive-500',
  'focus:ring-blue-600': 'focus:ring-olive-600',
  'focus:ring-purple-500': 'focus:ring-gold-500',
  'focus:ring-purple-600': 'focus:ring-gold-600',
  'focus:border-blue-500': 'focus:border-olive-500',
  'focus:border-purple-500': 'focus:border-gold-500',
  
  'dark:bg-blue-500': 'dark:bg-olive-500',
  'dark:bg-blue-600': 'dark:bg-olive-600',
  'dark:bg-purple-500': 'dark:bg-gold-500',
  'dark:bg-purple-600': 'dark:bg-gold-600',
  'dark:text-blue-400': 'dark:text-olive-400',
  'dark:text-purple-400': 'dark:text-gold-400',
  
  'from-blue-600 to-purple-600': 'from-olive-600 to-gold-600',
  'from-blue-500 to-purple-500': 'from-olive-500 to-gold-500',
  'from-indigo-500 to-purple-600': 'from-olive-500 to-gold-600',
  
  '#2563eb': '#3C4A3E', // Blue-600 to Deep Olive
  '#3b82f6': '#546355', // Blue-500 to Olive-500
  '#1d4ed8': '#2A352D', // Blue-700 to Olive-700
  '#7c3aed': '#C5A35B', // Purple-600 to Rich Gold
  '#8b5cf6': '#D4B878', // Purple-500 to Gold-300
  '#6d28d9': '#A58341', // Purple-700 to Gold-600
  '#4f46e5': '#3C4A3E', // Indigo-600 to Deep Olive
  '#6366f1': '#546355', // Indigo-500 to Olive-500
  '#4338ca': '#2A352D', // Indigo-700 to Olive-700
  '#8B5CF6': '#C5A35B', // Purple uppercase
  '#7C3AED': '#C5A35B', // Purple uppercase
  
  'rgb(59, 130, 246)': 'rgb(60, 74, 62)', // Blue to Olive
  'rgb(124, 58, 237)': 'rgb(197, 163, 91)', // Purple to Gold
  'rgba(59, 130, 246': 'rgba(60, 74, 62', // Blue with alpha
  'rgba(124, 58, 237': 'rgba(197, 163, 91', // Purple with alpha
};

const filePatterns = [
  'app/**/*.{js,jsx,ts,tsx}',
  'components/**/*.{js,jsx,ts,tsx}',
  'lib/**/*.{js,jsx,ts,tsx}',
  'pages/**/*.{js,jsx,ts,tsx}',
  'styles/**/*.css',
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    for (const [oldColor, newColor] of Object.entries(colorMappings)) {
      const regex = new RegExp(escapeRegExp(oldColor), 'g');
      const newContent = content.replace(regex, newColor);
      if (newContent !== content) {
        hasChanges = true;
        content = newContent;
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated: ${filePath}`);
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

async function main() {
  console.log('🎨 Starting color theme update to Deep Olive & Gold...\n');
  
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
  
  console.log('\n📊 Update Summary:');
  console.log(`   Total files scanned: ${totalFiles}`);
  console.log(`   Files updated: ${updatedFiles}`);
  console.log('\n✨ Color theme update complete!');
}

main().catch(console.error);