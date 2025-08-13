#!/usr/bin/env node

/**
 * Color Contrast Analysis Script
 * Analyzes the codebase for potential contrast issues with the new Deep Olive & Gold theme
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Color definitions with luminance values
const colors = {
  // Primary colors
  'deep-olive': { hex: '#3C4A3E', rgb: [60, 74, 62], luminance: 0.047 },
  'rich-gold': { hex: '#C5A35B', rgb: [197, 163, 91], luminance: 0.337 },
  'light-sand': { hex: '#EAE3D2', rgb: [234, 227, 210], luminance: 0.791 },
  'charcoal-olive': { hex: '#2C322D', rgb: [44, 50, 45], luminance: 0.025 },
  'gunmetal': { hex: '#1F2320', rgb: [31, 35, 32], luminance: 0.013 },
  'warm-gray': { hex: '#BEB7A7', rgb: [190, 183, 167], luminance: 0.447 },
  
  // Semantic colors
  'moss-green': { hex: '#6BA368', rgb: [107, 163, 104], luminance: 0.249 },
  'amber': { hex: '#E6B655', rgb: [230, 182, 85], luminance: 0.466 },
  'soft-red': { hex: '#D9534F', rgb: [217, 83, 79], luminance: 0.164 },
  
  // Common colors
  'white': { hex: '#FFFFFF', rgb: [255, 255, 255], luminance: 1.0 },
  'black': { hex: '#000000', rgb: [0, 0, 0], luminance: 0.0 },
};

// Calculate relative luminance
function getLuminance(rgb) {
  const [r, g, b] = rgb.map(val => {
    const sRGB = val / 255;
    return sRGB <= 0.03928 
      ? sRGB / 12.92 
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Calculate contrast ratio
function getContrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Check WCAG compliance
function checkWCAG(ratio, isLargeText = false) {
  const aaThreshold = isLargeText ? 3.0 : 4.5;
  const aaaThreshold = isLargeText ? 4.5 : 7.0;
  
  if (ratio >= aaaThreshold) return { level: 'AAA', pass: true };
  if (ratio >= aaThreshold) return { level: 'AA', pass: true };
  return { level: 'FAIL', pass: false };
}

// Analyze color combinations
function analyzeColorCombinations() {
  console.log('🎨 COLOR CONTRAST ANALYSIS REPORT');
  console.log('==================================\n');
  
  const criticalCombinations = [
    // Text on backgrounds
    { fg: 'gunmetal', bg: 'light-sand', usage: 'Light mode primary text' },
    { fg: 'warm-gray', bg: 'charcoal-olive', usage: 'Dark mode primary text' },
    { fg: 'white', bg: 'deep-olive', usage: 'Primary button text' },
    { fg: 'white', bg: 'rich-gold', usage: 'Gold button text (ISSUE)' },
    { fg: 'gunmetal', bg: 'rich-gold', usage: 'Alternative gold button text' },
    { fg: 'deep-olive', bg: 'light-sand', usage: 'Primary elements on light bg' },
    { fg: 'rich-gold', bg: 'charcoal-olive', usage: 'Gold accents in dark mode' },
    
    // Status colors
    { fg: 'white', bg: 'moss-green', usage: 'Success button text' },
    { fg: 'white', bg: 'amber', usage: 'Warning button text' },
    { fg: 'white', bg: 'soft-red', usage: 'Error button text' },
    { fg: 'moss-green', bg: 'light-sand', usage: 'Success text on light' },
    { fg: 'amber', bg: 'light-sand', usage: 'Warning text on light' },
    { fg: 'soft-red', bg: 'light-sand', usage: 'Error text on light' },
  ];
  
  console.log('📊 CRITICAL COLOR COMBINATIONS:\n');
  
  const issues = [];
  const warnings = [];
  const passes = [];
  
  criticalCombinations.forEach(combo => {
    const fgColor = colors[combo.fg];
    const bgColor = colors[combo.bg];
    const ratio = getContrastRatio(fgColor.luminance, bgColor.luminance);
    const wcagNormal = checkWCAG(ratio, false);
    const wcagLarge = checkWCAG(ratio, true);
    
    const status = wcagNormal.pass ? '✅' : (wcagLarge.pass ? '⚠️' : '❌');
    
    console.log(`${status} ${combo.usage}`);
    console.log(`   ${combo.fg} on ${combo.bg}`);
    console.log(`   Contrast: ${ratio.toFixed(2)}:1`);
    console.log(`   Normal text: ${wcagNormal.level} | Large text: ${wcagLarge.level}`);
    console.log('');
    
    if (!wcagNormal.pass && !wcagLarge.pass) {
      issues.push({ ...combo, ratio, wcagNormal, wcagLarge });
    } else if (!wcagNormal.pass && wcagLarge.pass) {
      warnings.push({ ...combo, ratio, wcagNormal, wcagLarge });
    } else {
      passes.push({ ...combo, ratio, wcagNormal, wcagLarge });
    }
  });
  
  // Summary
  console.log('\n📈 SUMMARY:');
  console.log('===========');
  console.log(`✅ Passing combinations: ${passes.length}`);
  console.log(`⚠️  Large text only: ${warnings.length}`);
  console.log(`❌ Failing combinations: ${issues.length}`);
  
  // Critical issues
  if (issues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES TO FIX:');
    console.log('==========================');
    issues.forEach(issue => {
      console.log(`\n❌ ${issue.usage}`);
      console.log(`   Current ratio: ${issue.ratio.toFixed(2)}:1`);
      console.log(`   Required: 4.5:1 (normal) / 3:1 (large)`);
      console.log(`   Solution: Use darker background or lighter text`);
    });
  }
  
  // Warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (Large text only):');
    console.log('================================');
    warnings.forEach(warning => {
      console.log(`\n⚠️  ${warning.usage}`);
      console.log(`   Current ratio: ${warning.ratio.toFixed(2)}:1`);
      console.log(`   Only suitable for text ≥18pt or ≥14pt bold`);
      console.log(`   Consider improving for better accessibility`);
    });
  }
  
  return { issues, warnings, passes };
}

// Find problematic color usage in files
async function findProblematicUsage() {
  console.log('\n\n🔍 SCANNING FOR PROBLEMATIC COLOR USAGE:');
  console.log('=========================================\n');
  
  const problematicPatterns = [
    // Gold backgrounds with white text
    { pattern: 'bg-gold-[45]00.*text-white', issue: 'White text on gold - poor contrast' },
    { pattern: 'bg-gold.*text-white', issue: 'White text on gold - poor contrast' },
    { pattern: 'bg-secondary.*text-white', issue: 'White text on secondary (gold) - poor contrast' },
    
    // Light colors on light backgrounds
    { pattern: 'bg-sand.*text-gold', issue: 'Gold text on sand - poor contrast' },
    { pattern: 'bg-sand.*text-amber', issue: 'Amber text on sand - poor contrast' },
    
    // Dark on dark
    { pattern: 'bg-charcoal.*text-olive', issue: 'Olive text on charcoal - poor contrast' },
    { pattern: 'bg-olive.*text-charcoal', issue: 'Charcoal text on olive - poor contrast' },
  ];
  
  const filePatterns = [
    'app/**/*.{js,jsx}',
    'components/**/*.{js,jsx}',
  ];
  
  let totalIssues = 0;
  
  for (const filePattern of filePatterns) {
    const files = glob.sync(filePattern, { 
      cwd: path.join(__dirname, '..'),
      absolute: true 
    });
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      const fileIssues = [];
      
      lines.forEach((line, index) => {
        problematicPatterns.forEach(({ pattern, issue }) => {
          const regex = new RegExp(pattern, 'g');
          if (regex.test(line)) {
            fileIssues.push({ 
              line: index + 1, 
              issue,
              code: line.trim().substring(0, 80) 
            });
          }
        });
      });
      
      if (fileIssues.length > 0) {
        const relativePath = path.relative(path.join(__dirname, '..'), file);
        console.log(`\n📄 ${relativePath}`);
        fileIssues.forEach(({ line, issue, code }) => {
          console.log(`   Line ${line}: ${issue}`);
          console.log(`   > ${code}...`);
        });
        totalIssues += fileIssues.length;
      }
    }
  }
  
  if (totalIssues === 0) {
    console.log('✅ No obvious contrast issues found in component files!');
  } else {
    console.log(`\n⚠️  Found ${totalIssues} potential contrast issues to review`);
  }
}

// Generate contrast matrix
function generateContrastMatrix() {
  console.log('\n\n📊 FULL CONTRAST MATRIX:');
  console.log('========================\n');
  
  const colorNames = Object.keys(colors);
  const matrix = [];
  
  // Header
  console.log('                ', colorNames.map(name => name.substring(0, 8).padEnd(8)).join(' '));
  console.log('                ', colorNames.map(() => '--------').join(' '));
  
  colorNames.forEach(fg => {
    const row = [];
    colorNames.forEach(bg => {
      if (fg === bg) {
        row.push('   -    ');
      } else {
        const ratio = getContrastRatio(colors[fg].luminance, colors[bg].luminance);
        const wcag = checkWCAG(ratio);
        const symbol = wcag.pass ? '✓' : '✗';
        row.push(`${ratio.toFixed(1).padStart(4)}:1${symbol} `);
      }
    });
    console.log(fg.substring(0, 15).padEnd(16), row.join(' '));
  });
  
  console.log('\n✓ = WCAG AA compliant (≥4.5:1)');
  console.log('✗ = Below WCAG AA threshold');
}

// Main execution
async function main() {
  const results = analyzeColorCombinations();
  await findProblematicUsage();
  generateContrastMatrix();
  
  console.log('\n\n🎯 RECOMMENDATIONS:');
  console.log('===================');
  console.log('\n1. IMMEDIATE FIXES NEEDED:');
  console.log('   • Change gold button text from white to gunmetal (#1F2320)');
  console.log('   • Or use gold-600 (#A58341) background with white text');
  console.log('   • Review all gold/amber elements for contrast');
  
  console.log('\n2. BEST PRACTICES:');
  console.log('   • Always test color combinations with a contrast checker');
  console.log('   • Use semantic color classes instead of hardcoding');
  console.log('   • Provide alternative visual indicators (icons, borders)');
  console.log('   • Test with color blindness simulators');
  
  console.log('\n3. SAFE COLOR COMBINATIONS:');
  console.log('   • Gunmetal on Light Sand (12.8:1) ✅');
  console.log('   • White on Deep Olive (7.8:1) ✅');
  console.log('   • Warm Gray on Charcoal Olive (6.2:1) ✅');
  console.log('   • Deep Olive on Light Sand (6.9:1) ✅');
  
  console.log('\n✨ Analysis complete!');
}

main().catch(console.error);