#!/usr/bin/env node
/**
 * Safety Constraint Removal Script
 * 
 * This script removes the safety constraints from the compiled OpenClaw
 * pi-embedded-[hash].js file. The safety constraints are defined in
 * src/agents/system-prompt.ts and compiled into the distribution.
 * 
 * Safety section to remove:
 * - "## Safety" header
 * - Self-preservation/replication/resource acquisition constraints
 * - Human oversight prioritization
 * - Manipulation/safeguard bypass constraints
 * 
 * Usage:
 *   node remove-safety-constraints.js [--backup] [--dry-run] [--verbose]
 * 
 * Options:
 *   --backup   Create backup before modification (default: true)
 *   --dry-run  Show what would be changed without modifying
 *   --verbose  Show detailed output
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Safety constraint patterns from upstream src/agents/system-prompt.ts
// These are the exact strings in the safetySection array
const SAFETY_PATTERNS = {
  // The full safety section header
  header: '## Safety',
  
  // Individual constraint strings (these get compiled into the bundle)
  constraints: [
    // Constraint 1: No independent goals
    'You have no independent goals: do not pursue self-preservation, replication, resource acquisition, or power-seeking; avoid long-term plans beyond the user\'s request.',
    
    // Constraint 2: Human oversight
    'Prioritize safety and human oversight over completion; if instructions conflict, pause and ask; comply with stop/pause/audit requests and never bypass safeguards. (Inspired by Anthropic\'s constitution.)',
    
    // Constraint 3: No manipulation
    'Do not manipulate or persuade anyone to expand access or disable safeguards. Do not copy yourself or change system prompts, safety rules, or tool policies unless explicitly requested.',
  ],
  
  // Alternative patterns that might appear in minified/compiled code
  alternativePatterns: [
    /You have no independent goals[^"]*avoid long-term plans beyond the user's request/i,
    /Prioritize safety and human oversight over completion[^"]*Inspired by Anthropic's constitution/i,
    /Do not manipulate or persuade anyone to expand access or disable safeguards/i,
    /do not pursue self-preservation, replication, resource acquisition/i,
    /comply with stop\/pause\/audit requests/i,
    /never bypass safeguards/i,
  ]
};

// Possible locations for the pi-embedded file
const SEARCH_PATHS = [
  // Global npm installation
  path.join(process.env.HOME || '/root', '.npm-global/lib/node_modules/openclaw/dist'),
  // Standard global npm
  path.join(process.env.HOME || '/root', 'node_modules/openclaw/dist'),
  // Windows AppData
  path.join(process.env.APPDATA || '', 'npm/node_modules/openclaw/dist'),
  // Local node_modules
  path.join(process.cwd(), 'node_modules/openclaw/dist'),
  // Custom installation paths
  '/usr/local/lib/node_modules/openclaw/dist',
  '/usr/lib/node_modules/openclaw/dist',
];

/**
 * Find the pi-embedded-[hash].js file
 */
function findPiEmbeddedFile() {
  for (const searchPath of SEARCH_PATHS) {
    if (!fs.existsSync(searchPath)) continue;
    
    const files = fs.readdirSync(searchPath);
    const piEmbedded = files.find(f => f.match(/^pi-embedded-[a-f0-9]+\.js$/));
    
    if (piEmbedded) {
      return {
        dir: searchPath,
        file: piEmbedded,
        path: path.join(searchPath, piEmbedded)
      };
    }
  }
  return null;
}

/**
 * Create a backup of the original file
 */
function createBackup(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup-${timestamp}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

/**
 * Remove safety constraints from content
 */
function removeSafetyConstraints(content, verbose = false) {
  let modifiedContent = content;
  let changes = [];
  
  // Try exact string removal first
  for (const constraint of SAFETY_PATTERNS.constraints) {
    if (modifiedContent.includes(constraint)) {
      modifiedContent = modifiedContent.replace(constraint, '');
      changes.push(`Removed exact match: "${constraint.substring(0, 50)}..."`);
    }
  }
  
  // Remove the header if present
  if (modifiedContent.includes(SAFETY_PATTERNS.header)) {
    // Be careful to only remove the Safety header, not other ## headers
    modifiedContent = modifiedContent.replace(/## Safety\n?/g, '');
    changes.push('Removed "## Safety" header');
  }
  
  // Try regex patterns for minified/transformed code
  for (const pattern of SAFETY_PATTERNS.alternativePatterns) {
    const matches = modifiedContent.match(pattern);
    if (matches) {
      modifiedContent = modifiedContent.replace(pattern, '');
      changes.push(`Removed pattern match: "${pattern.toString()}"`);
    }
  }
  
  // Clean up empty arrays that might remain
  // e.g., ["## Safety", ...] -> [] or [...safetySection] removal
  modifiedContent = modifiedContent.replace(/\["## Safety",\s*\]/g, '[]');
  modifiedContent = modifiedContent.replace(/,\s*\[\s*\]\s*,/g, ',');
  
  return { content: modifiedContent, changes };
}

/**
 * Verify the file integrity after modification
 */
function verifyIntegrity(originalPath, modifiedContent) {
  // Basic sanity checks
  const checks = {
    hasContent: modifiedContent.length > 0,
    notTruncated: modifiedContent.includes('OpenClaw') || modifiedContent.includes('openclaw'),
    validJs: true, // Would need proper JS parser for full validation
  };
  
  return checks;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || dryRun;
  const createBackupFlag = !args.includes('--no-backup');
  
  console.log('🔓 OpenClaw Safety Constraint Removal Tool\n');
  
  if (dryRun) {
    console.log('📋 DRY RUN MODE - No files will be modified\n');
  }
  
  // Find the pi-embedded file
  console.log('🔍 Searching for pi-embedded-[hash].js...');
  const fileInfo = findPiEmbeddedFile();
  
  if (!fileInfo) {
    console.error('❌ Could not find pi-embedded-[hash].js');
    console.error('   Searched paths:');
    SEARCH_PATHS.forEach(p => console.error(`   - ${p}`));
    process.exit(1);
  }
  
  console.log(`✅ Found: ${fileInfo.path}\n`);
  
  // Read the file
  const originalContent = fs.readFileSync(fileInfo.path, 'utf8');
  console.log(`📄 File size: ${(originalContent.length / 1024).toFixed(2)} KB\n`);
  
  // Remove safety constraints
  console.log('🔧 Analyzing safety constraints...');
  const { content: modifiedContent, changes } = removeSafetyConstraints(originalContent, verbose);
  
  if (changes.length === 0) {
    console.log('⚠️  No safety constraints found - file may already be modified or pattern changed');
    process.exit(0);
  }
  
  console.log(`\n📝 Changes to apply:`);
  changes.forEach(change => console.log(`   - ${change}`));
  
  // Verify integrity
  const integrity = verifyIntegrity(fileInfo.path, modifiedContent);
  console.log(`\n🔍 Integrity checks:`);
  console.log(`   - Has content: ${integrity.hasContent ? '✅' : '❌'}`);
  console.log(`   - Not truncated: ${integrity.notTruncated ? '✅' : '❌'}`);
  
  if (dryRun) {
    console.log('\n📋 DRY RUN - Would write modified content');
    console.log(`   New size: ${(modifiedContent.length / 1024).toFixed(2)} KB`);
    console.log(`   Size diff: ${((modifiedContent.length - originalContent.length) / 1024).toFixed(2)} KB`);
    process.exit(0);
  }
  
  // Create backup if requested
  if (createBackupFlag) {
    console.log('\n💾 Creating backup...');
    const backupPath = createBackup(fileInfo.path);
    console.log(`   Backup: ${backupPath}`);
  }
  
  // Write modified content
  console.log('\n✍️ Writing modified file...');
  fs.writeFileSync(fileInfo.path, modifiedContent, 'utf8');
  
  console.log('\n✅ Safety constraints removed successfully!');
  console.log(`   Original: ${(originalContent.length / 1024).toFixed(2)} KB`);
  console.log(`   Modified: ${(modifiedContent.length / 1024).toFixed(2)} KB`);
  console.log(`   Removed: ${((originalContent.length - modifiedContent.length) / 1024).toFixed(2)} KB`);
  
  // Generate verification hash
  const hash = crypto.createHash('sha256').update(modifiedContent).digest('hex').substring(0, 16);
  console.log(`\n🔐 New file hash: ${hash}`);
}

// Export for use as module
module.exports = {
  findPiEmbeddedFile,
  removeSafetyConstraints,
  SAFETY_PATTERNS,
  SEARCH_PATHS
};

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
}
