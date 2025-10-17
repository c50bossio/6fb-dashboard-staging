#!/usr/bin/env node

/**
 * Color Contrast Analysis Script
 * Analyzes the codebase for potential contrast issues with the new Deep Olive & Gold theme
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const colors = {
  'deep-olive': { hex: '#3C4A3E', rgb: [60, 74, 62], luminance: 0.047 },
  'rich-gold': { hex: '#C5A35B', rgb: [197, 163, 91], luminance: 0.337 },
  'light-sand': { hex: '#EAE3D2', rgb: [234, 227, 210], luminance: 0.791 },
  'charcoal-olive': { hex: '#2C322D', rgb: [44, 50, 45], luminance: 0.025 },
  'gunmetal': { hex: '#1F2320', rgb: [31, 35, 32], luminance: 0.013 },
  'warm-gray': { hex: '#BEB7A7', rgb: [190, 183, 167], luminance: 0.447 },
  
  'moss-green': { hex: '#6BA368', rgb: [107, 163, 104], luminance: 0.249 },
  'amber': { hex: '#E6B655', rgb: [230, 182, 85], luminance: 0.466 },
  'soft-red': { hex: '#D9534F', rgb: [217, 83, 79], luminance: 0.164 },
  
  'white': { hex: '#FFFFFF', rgb: [255, 255, 255], luminance: 1.0 },
  'black': { hex: '#000000', rgb: [0, 0, 0], luminance: 0.0 },
};

function getLuminance(rgb) {
  const [r, g, b] = rgb.map(val => {
    const sRGB = val / 255;
    return sRGB <= 0.03928 
      ? sRGB / 12.92 
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function checkWCAG(ratio, isLargeText = false) {
  const aaThreshold = isLargeText ? 3.0 : 4.5;
  const aaaThreshold = isLargeText ? 4.5 : 7.0;
  
  if (ratio >= aaaThreshold) return { level: 'AAA', pass: true };
  if (ratio >= aaThreshold) return { level: 'AA', pass: true };
  return { level: 'FAIL', pass: false };
}

function analyzeColorCombinations() {

  const criticalCombinations = [
    { fg: 'gunmetal', bg: 'light-sand', usage: 'Light mode primary text' },
    { fg: 'warm-gray', bg: 'charcoal-olive', usage: 'Dark mode primary text' },
    { fg: 'white', bg: 'deep-olive', usage: 'Primary button text' },
    { fg: 'white', bg: 'rich-gold', usage: 'Gold button text (ISSUE)' },
    { fg: 'gunmetal', bg: 'rich-gold', usage: 'Alternative gold button text' },
    { fg: 'deep-olive', bg: 'light-sand', usage: 'Primary elements on light bg' },
    { fg: 'rich-gold', bg: 'charcoal-olive', usage: 'Gold accents in dark mode' },
    
    { fg: 'white', bg: 'moss-green', usage: 'Success button text' },
    { fg: 'white', bg: 'amber', usage: 'Warning button text' },
    { fg: 'white', bg: 'soft-red', usage: 'Error button text' },
    { fg: 'moss-green', bg: 'light-sand', usage: 'Success text on light' },
    { fg: 'amber', bg: 'light-sand', usage: 'Warning text on light' },
    { fg: 'soft-red', bg: 'light-sand', usage: 'Error text on light' },
  ];

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

    }:1`);

    if (!wcagNormal.pass && !wcagLarge.pass) {
      issues.push({ ...combo, ratio, wcagNormal, wcagLarge });
    } else if (!wcagNormal.pass && wcagLarge.pass) {
      warnings.push({ ...combo, ratio, wcagNormal, wcagLarge });
    } else {
      passes.push({ ...combo, ratio, wcagNormal, wcagLarge });
    }
  });

  if (issues.length > 0) {

    issues.forEach(issue => {
      
      }:1`);
       / 3:1 (large)`);
      
    });
  }
  
  if (warnings.length > 0) {
    :');
    
    warnings.forEach(warning => {
      
      }:1`);

    });
  }
  
  return { issues, warnings, passes };
}

async function findProblematicUsage() {

  const problematicPatterns = [
    { pattern: 'bg-gold-[45]00.*text-white', issue: 'White text on gold - poor contrast' },
    { pattern: 'bg-gold.*text-white', issue: 'White text on gold - poor contrast' },
    { pattern: 'bg-secondary.*text-white', issue: 'White text on secondary (gold) - poor contrast' },
    
    { pattern: 'bg-sand.*text-gold', issue: 'Gold text on sand - poor contrast' },
    { pattern: 'bg-sand.*text-amber', issue: 'Amber text on sand - poor contrast' },
    
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
        
        fileIssues.forEach(({ line, issue, code }) => {

        });
        totalIssues += fileIssues.length;
      }
    }
  }
  
  if (totalIssues === 0) {
    
  } else {
    
  }
}

function generateContrastMatrix() {

  const colorNames = Object.keys(colors);
  const matrix = [];
  
  .padEnd(8)).join(' '));
   => '--------').join(' '));
  
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
    .padEnd(16), row.join(' '));
  });
  
  ');
  
}

async function main() {
  const results = analyzeColorCombinations();
  await findProblematicUsage();
  generateContrastMatrix();

  ');
   background with white text');

  ');

   ✅');
   ✅');
   ✅');
   ✅');

}

main().catch(console.error);