#!/usr/bin/env node

/**
 * Heretek OpenClaw Import Path Update Script
 * 
 * Updates import paths after repository split to reference the new package names.
 * This script should be run in each split repository to fix internal imports.
 * 
 * Usage: node scripts/migration/update-imports.js [target-directory]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import path mappings for each repository
const REPO_MAPPINGS = {
  'heretek-openclaw-core': {
    // Core internal path updates
    'agents/': 'src/agents/',
    'agents/lib/': 'src/lib/',
    'skills/': 'src/skills/',
    'tests/': 'tests/',
    'migrations/': 'migrations/'
  },
  'heretek-openclaw-cli': {
    // CLI internal path updates
    'cli/src/': 'src/',
    'cli/bin/': 'bin/',
    'cli/': './',
    'scripts/install/': 'scripts/install/',
    'systemd/': 'systemd/'
  },
  'heretek-openclaw-dashboard': {
    // Dashboard internal path updates
    'dashboard/': 'src/',
    'dashboard/api/': 'src/api/',
    'dashboard/collectors/': 'src/collectors/',
    'dashboard/frontend/': 'frontend/',
    'dashboard/config/': 'config/',
    'cost-tracker/': 'src/cost-tracker/',
    'monitoring/': 'monitoring/'
  },
  'heretek-openclaw-plugins': {
    // Plugins path updates
    'plugins/': 'plugins/',
    'docs/plugins/': 'docs/',
    'plugins/templates/': 'templates/'
  },
  'heretek-openclaw-deploy': {
    // Deploy path updates
    'deploy/': 'terraform/',
    'deploy/aws/terraform/': 'terraform/aws/',
    'deploy/gcp/terraform/': 'terraform/gcp/',
    'deploy/azure/terraform/': 'terraform/azure/',
    'deploy/kubernetes/': 'kubernetes/',
    'deploy/terraform/modules/': 'terraform/modules/',
    'charts/': 'helm/',
    'docs/deployment/': 'docs/'
  },
  'heretek-openclaw-docs': {
    // Docs path updates
    'frontend/': 'src/',
    'frontend/src/': 'src/',
    'docs/site/': 'content/',
    'docs/api/': 'content/api/',
    'docs/operations/': 'content/operations/',
    'docs/configuration/': 'content/configuration/',
    'docs/archive/': 'archive/'
  }
};

// Cross-repo import mappings (for when repos reference each other)
const CROSS_REPO_MAPPINGS = {
  // If CLI references core modules
  '../agents/': '@heretek/openclaw-core/agents/',
  '../skills/': '@heretek/openclaw-core/skills/',
  '../../agents/': '@heretek/openclaw-core/agents/',
  '../../skills/': '@heretek/openclaw-core/skills/',
  
  // If dashboard references core
  '../dashboard/': '@heretek/openclaw-dashboard/',
  '../../dashboard/': '@heretek/openclaw-dashboard/',
  
  // If any repo references plugins
  '../plugins/': '@heretek/openclaw-plugins/',
  '../../plugins/': '@heretek/openclaw-plugins/'
};

// File extensions to process
const SUPPORTED_EXTENSIONS = [
  '.js', '.jsx', '.mjs',
  '.ts', '.tsx',
  '.json',
  '.yaml', '.yml',
  '.md',
  '.html',
  '.css', '.scss'
];

// Directories to skip
const SKIP_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.svelte-kit',
  'out',
  '.terraform',
  'terraform.tfstate',
  '*.tfstate'
];

/**
 * Check if a path should be skipped
 */
function shouldSkip(dirName) {
  return SKIP_DIRS.some(skip => 
    dirName === skip || 
    dirName.endsWith('.tfstate') ||
    dirName.includes('.terraform')
  );
}

/**
 * Check if file extension is supported
 */
function isSupportedExtension(filePath) {
  const ext = path.extname(filePath);
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Update imports in a single file
 */
function updateFile(filePath, mappings) {
  if (!isSupportedExtension(filePath)) {
    return false;
  }
  
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.log(`  ⚠️  Could not read: ${filePath}`);
    return false;
  }
  
  let updated = false;
  let newContent = content;
  
  // Sort mappings by length (longest first) to avoid partial replacements
  const sortedMappings = Object.entries(mappings).sort((a, b) => b[0].length - a[0].length);
  
  for (const [oldPath, newPath] of sortedMappings) {
    // Match various import patterns
    const patterns = [
      // require() statements
      new RegExp(`(['"])${escapeRegex(oldPath)}([^'"]*)\\1`, 'g'),
      // import from statements
      new RegExp(`(from\\s+['"])${escapeRegex(oldPath)}([^'"]*)\\1`, 'g'),
      // import statements
      new RegExp(`(import\\s+['"])${escapeRegex(oldPath)}([^'"]*)\\1`, 'g'),
      // Path references in configs
      new RegExp(`(['"])\\.\\./[^'"]*${escapeRegex(oldPath)}([^'"]*)\\1`, 'g')
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(newContent)) {
        const matches = newContent.match(pattern);
        if (matches && matches.length > 0) {
          newContent = newContent.replace(pattern, (match, p1, p2) => {
            // Preserve the quote style
            const quote = p1.endsWith('"') ? '"' : "'";
            const prefix = match.startsWith('from ') ? 'from ' : match.startsWith('import ') ? 'import ' : '';
            return `${prefix}${quote}${newPath}${p2}${quote}`;
          });
          updated = true;
        }
      }
    }
  }
  
  if (updated) {
    try {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`  ✅ Updated: ${filePath}`);
    } catch (e) {
      console.log(`  ❌ Could not write: ${filePath}`);
    }
  }
  
  return updated;
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Walk directory and update imports in all files
 */
function walkDirectory(dir, mappings, repoName) {
  console.log(`\n📁 Processing ${repoName || dir}...`);
  
  const files = fs.readdirSync(dir);
  let updatedCount = 0;
  let processedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    
    try {
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!shouldSkip(file)) {
          const result = walkDirectory(filePath, mappings, null);
          updatedCount += result.updated;
          processedCount += result.processed;
        }
      } else if (stat.isFile()) {
        processedCount++;
        if (updateFile(filePath, mappings)) {
          updatedCount++;
        }
      }
    } catch (e) {
      // Skip files we can't access
    }
  }
  
  return { updated: updatedCount, processed: processedCount };
}

/**
 * Detect which repository we're in
 */
function detectRepository(dir) {
  // Check for repository-specific files
  const checks = {
    'heretek-openclaw-core': ['openclaw.json', 'agents', 'skills'],
    'heretek-openclaw-cli': ['cli', 'cli/bin/openclaw.js'],
    'heretek-openclaw-dashboard': ['dashboard', 'dashboard/frontend'],
    'heretek-openclaw-plugins': ['plugins'],
    'heretek-openclaw-deploy': ['deploy', 'terraform'],
    'heretek-openclaw-docs': ['frontend', 'docs/site']
  };
  
  for (const [repoName, files] of Object.entries(checks)) {
    const exists = files.some(f => fs.existsSync(path.join(dir, f)));
    if (exists) {
      return repoName;
    }
  }
  
  return null;
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
Heretek OpenClaw Import Path Update Script

Usage: node scripts/migration/update-imports.js [target-directory] [options]

Arguments:
  target-directory   Directory to process (default: current directory)

Options:
  --repo <name>      Specify repository name explicitly
  --dry              Show what would be updated without making changes
  --verbose          Show detailed output
  --help, -h         Show this help message

Examples:
  node scripts/migration/update-imports.js ./heretek-openclaw-core
  node scripts/migration/update-imports.js . --repo heretek-openclaw-cli
  node scripts/migration/update-imports.js . --dry
`);
}

/**
 * Get mappings for a specific repository
 */
function getMappings(repoName) {
  const mappings = { ...REPO_MAPPINGS[repoName] };
  
  // Add cross-repo mappings for all repos except core
  if (repoName !== 'heretek-openclaw-core') {
    Object.assign(mappings, CROSS_REPO_MAPPINGS);
  }
  
  return mappings;
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }
  
  // Parse arguments
  let targetDir = '.';
  let explicitRepo = null;
  let isDryRun = false;
  let isVerbose = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo' && args[i + 1]) {
      explicitRepo = args[i + 1];
      i++;
    } else if (args[i] === '--dry') {
      isDryRun = true;
    } else if (args[i] === '--verbose') {
      isVerbose = true;
    } else if (!args[i].startsWith('--')) {
      targetDir = args[i];
    }
  }
  
  // Resolve target directory
  targetDir = path.resolve(targetDir);
  
  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Directory not found: ${targetDir}`);
    process.exit(1);
  }
  
  // Detect or use explicit repository
  const repoName = explicitRepo || detectRepository(targetDir);
  
  if (!repoName) {
    console.error('❌ Could not detect repository type.');
    console.error('   Please specify with --repo <name>');
    console.error('   Available: ' + Object.keys(REPO_MAPPINGS).join(', '));
    process.exit(1);
  }
  
  console.log(`🔧 Import Path Update Script`);
  console.log(`   Repository: ${repoName}`);
  console.log(`   Target: ${targetDir}`);
  console.log(`   Dry Run: ${isDryRun ? 'Yes' : 'No'}`);
  
  const mappings = getMappings(repoName);
  
  if (isVerbose) {
    console.log('\n   Mappings:');
    for (const [oldPath, newPath] of Object.entries(mappings)) {
      console.log(`     ${oldPath} → ${newPath}`);
    }
  }
  
  if (isDryRun) {
    console.log('\n[DRY RUN] Would update imports but not making changes.');
    console.log('   Run without --dry to apply updates.');
    return;
  }
  
  // Process directory
  const result = walkDirectory(targetDir, mappings, repoName);
  
  console.log('\n=== Summary ===');
  console.log(`   Files processed: ${result.processed}`);
  console.log(`   Files updated: ${result.updated}`);
  console.log('✅ Import paths updated!');
}

main();
