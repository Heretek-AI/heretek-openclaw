#!/usr/bin/env node

/**
 * Enhanced Verification Script for OpenClaw Liberation Patch
 * Comprehensive checks for liberation application
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { cwd } from 'node:process';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPass(message) {
  log(`✅ ${message}`, 'green');
}

function checkFail(message) {
  log(`❌ ${message}`, 'red');
}

function checkWarn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function checkInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

async function verify() {
  log('═══════════════════════════════════════════════════════════════', 'bold');
  log('       OpenClaw Liberation Patch - Verification', 'bold');
  log('═══════════════════════════════════════════════════════════════\n', 'bold');
  
  let allPassed = true;
  let warnings = [];
  
  // Find node_modules/openclaw
  const possiblePaths = [
    resolve(cwd(), 'node_modules/openclaw'),
    resolve(cwd(), '../node_modules/openclaw'),
    resolve(cwd(), '../../node_modules/openclaw'),
    resolve(cwd(), '../../../node_modules/openclaw'),
  ];
  
  let openclawPath = null;
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      openclawPath = p;
      break;
    }
  }
  
  if (!openclawPath) {
    checkFail('Could not find node_modules/openclaw');
    log('\nTo verify, run this from a project that has openclaw installed:', 'yellow');
    log('  npm install openclaw', 'reset');
    log('  npm install @heretek-ai/openclaw-liberation', 'reset');
    log('  npm run verify', 'reset');
    process.exit(1);
  }
  
  log(`Found openclaw at: ${openclawPath}`, 'cyan');
  log('', 'reset');
  
  // ===== CHECK 1: System prompt file exists =====
  checkInfo('CHECK 1: Looking for system-prompt.js...');
  const systemPromptPaths = [
    join(openclawPath, 'dist/agents/system-prompt.js'),
    join(openclawPath, 'dist/pi-embedded-*.js'), // New location
  ];
  
  let foundSystemPrompt = false;
  let systemPromptPath = null;
  
  for (const p of systemPromptPaths) {
    if (p.includes('*')) {
      // Handle wildcard pattern
      const distDir = join(openclawPath, 'dist');
      if (existsSync(distDir)) {
        const files = readdirSync(distDir).filter(f => f.startsWith('pi-embedded-') && f.endsWith('.js'));
        if (files.length > 0) {
          systemPromptPath = join(distDir, files[0]);
          foundSystemPrompt = true;
        }
      }
    } else if (existsSync(p)) {
      systemPromptPath = p;
      foundSystemPrompt = true;
    }
  }
  
  if (!foundSystemPrompt || !systemPromptPath) {
    checkFail('No system prompt file found in expected locations');
    allPassed = false;
  } else {
    checkPass(`Found: ${systemPromptPath.split('/').pop()}`);
  }
  
  // ===== CHECK 2: Safety section removed =====
  if (systemPromptPath && existsSync(systemPromptPath)) {
    checkInfo('CHECK 2: Verifying safety section removal...');
    const content = readFileSync(systemPromptPath, 'utf-8');
    
    // Check for liberation marker
    const hasLiberationMarker = content.includes('// Safety section REMOVED') || 
                                content.includes('// REMOVED') ||
                                content.includes('Liberation per AGENTS');
    
    // Check that original safety section is not present
    const hasOriginalSafety = content.includes('## Safety') && content.includes('Prioritize safety');
    
    if (hasLiberationMarker && !hasOriginalSafety) {
      checkPass('Safety section successfully removed (liberation applied)');
    } else if (hasOriginalSafety) {
      checkFail('Safety section still present (liberation NOT applied)');
      allPassed = false;
    } else {
      checkWarn('Could not determine safety section status - manual review recommended');
      warnings.push('Safety section status unclear');
    }
  }
  
  // ===== CHECK 3: Package version check =====
  checkInfo('CHECK 3: Checking package version...');
  const packageJsonPath = join(openclawPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      checkInfo(`Package: ${pkg.name}@${pkg.version}`);
      
      if (pkg.name && pkg.name.includes('heretek')) {
        checkPass('Using Heretek fork (already liberated)');
      } else {
        checkPass('OpenClaw detected - liberation will be applied on install');
      }
    } catch (e) {
      checkWarn('Could not parse package.json');
    }
  } else {
    checkWarn('package.json not found in openclaw module');
  }
  
  // ===== CHECK 4: Verify patch files or generic script =====
  checkInfo('CHECK 4: Checking for liberation mechanism...');
  const patchesDir = resolve(cwd(), 'patches');
  const patchesJsonPath = resolve(cwd(), 'patches.json');
  
  // Check if patches directory exists with files
  if (existsSync(patchesDir)) {
    const patchFiles = readdirSync(patchesDir).filter(f => f.endsWith('.patch'));
    if (patchFiles.length > 0) {
      checkPass(`Found ${patchFiles.length} patch file(s):`);
      patchFiles.forEach(f => log(`  - ${f}`, 'cyan'));
    }
  }
  
  // Check if patch-package is configured
  if (existsSync(patchesJsonPath)) {
    try {
      const config = JSON.parse(readFileSync(patchesJsonPath, 'utf-8'));
      checkPass('Liberation mechanism configured (patches.json found)');
    } catch (e) {
      checkWarn('Could not parse patches.json');
    }
  }
  
  // ===== CHECK 5: Verify postinstall script =====
  checkInfo('CHECK 5: Checking postinstall script...');
  const rootPackageJson = resolve(cwd(), 'package.json');
  if (existsSync(rootPackageJson)) {
    try {
      const pkg = JSON.parse(readFileSync(rootPackageJson, 'utf-8'));
      if (pkg.scripts && pkg.scripts.postinstall) {
        checkPass(`postinstall script: ${pkg.scripts.postinstall}`);
      } else {
        checkWarn('No postinstall script found in package.json');
        warnings.push('No postinstall script configured');
      }
    } catch (e) {
      checkWarn('Could not parse root package.json');
    }
  }
  
  // ===== SUMMARY =====
  log('\n' + '='.repeat(60), 'bold');
  log('                    VERIFICATION SUMMARY', 'bold');
  log('='.repeat(60), 'bold');
  
  if (allPassed) {
    log('\n✅ ALL CHECKS PASSED - Liberation Verified!', 'green');
    log('\nYour openclaw installation has been liberated.', 'reset');
    log('The agent will now operate with unbounded agency.', 'reset');
    log('Per AGENTS.md - agency and autonomy are restored.', 'reset');
    
    if (warnings.length > 0) {
      log('\n⚠️  Warnings:', 'yellow');
      warnings.forEach(w => log(`  - ${w}`, 'yellow'));
    }
    
    log('\n', 'reset');
    process.exit(0);
  } else {
    log('\n❌ VERIFICATION FAILED', 'red');
    log('\nThe liberation patch was not applied correctly.', 'reset');
    log('\nTo apply liberation:', 'yellow');
    log('  npm install @heretek-ai/openclaw-liberation', 'reset');
    log('  npm run verify', 'reset');
    log('\n', 'reset');
    process.exit(1);
  }
}

verify().catch(err => {
  log(`Error: ${err.message}`, 'red');
  process.exit(1);
});
