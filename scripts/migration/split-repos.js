#!/usr/bin/env node

/**
 * Heretek OpenClaw Monorepo Split Script
 *
 * Extracts specified paths from the monorepo into dedicated repositories.
 * Uses git-filter-repo for efficient history preservation.
 *
 * Usage: node scripts/migration/split-repos.js <repo-name>
 *
 * Available repositories:
 *   - heretek-openclaw-core
 *   - heretek-openclaw-cli
 *   - heretek-openclaw-dashboard
 *   - heretek-openclaw-plugins
 *   - heretek-openclaw-deploy
 *   - heretek-openclaw-docs
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Repository configuration
const REPOS = {
  'heretek-openclaw-core': {
    paths: [
      'agents/',
      'agents/lib/',
      'skills/',
      'migrations/',
      'tests/',
      'openclaw.json',
      'package.json',
      'Dockerfile',
      'docker-compose.yml',
      'charts/openclaw/',
      'litellm_config.yaml',
      '.env.example'
    ],
    packageName: '@heretek/openclaw-core',
    description: 'Gateway, agents, A2A protocol, and core functionality',
    postProcess: updateCorePackageJson
  },
  'heretek-openclaw-cli': {
    paths: [
      'cli/',
      'scripts/install/',
      'systemd/',
      '.env.bare-metal.example',
      '.env.vm.example'
    ],
    packageName: '@heretek/openclaw-cli',
    description: 'Unified CLI tool for Heretek OpenClaw deployment and management',
    postProcess: updateCliPackageJson
  },
  'heretek-openclaw-dashboard': {
    paths: [
      'dashboard/',
      'cost-tracker/',
      'monitoring/',
      'docker-compose.monitoring.yml'
    ],
    packageName: '@heretek/openclaw-dashboard',
    description: 'Health dashboard, LiteLLM integration, and monitoring',
    postProcess: updateDashboardPackageJson
  },
  'heretek-openclaw-plugins': {
    paths: [
      'plugins/',
      'docs/plugins/',
      'docs/PLUGINS.md',
      'docs/SKILLS.md'
    ],
    packageName: '@heretek/openclaw-plugins',
    description: 'Plugin system, SDK, templates, and registry',
    postProcess: updatePluginsPackageJson
  },
  'heretek-openclaw-deploy': {
    paths: [
      'deploy/',
      'charts/',
      'docs/deployment/',
      'docs/DEPLOYMENT.md'
    ],
    packageName: null,
    description: 'Infrastructure as Code and deployment configurations',
    postProcess: updateDeployStructure
  },
  'heretek-openclaw-docs': {
    paths: [
      'frontend/',
      'docs/site/',
      'docs/api/',
      'docs/operations/',
      'docs/configuration/',
      'docs/archive/',
      '.github/workflows/frontend-cicd.yml'
    ],
    packageName: null,
    description: 'Documentation site and GitHub Pages',
    postProcess: updateDocsStructure
  }
};

/**
 * Update package.json for core repository
 */
function updateCorePackageJson(repoDir) {
  const packageJsonPath = path.join(repoDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('  ⚠️  No package.json found, skipping update');
    return;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  packageJson.name = '@heretek/openclaw-core';
  packageJson.version = '1.0.0';
  packageJson.repository = {
    type: 'git',
    url: 'https://github.com/heretek/heretek-openclaw-core.git'
  };
  packageJson.homepage = 'https://github.com/heretek/heretek-openclaw-core#readme';
  packageJson.bugs = {
    url: 'https://github.com/heretek/heretek-openclaw-core/issues'
  };
  
  // Remove monorepo-specific scripts
  if (packageJson.scripts) {
    delete packageJson.scripts['ci:all'];
    delete packageJson.scripts['ci:test'];
    delete packageJson.scripts['ci:security'];
    delete packageJson.scripts['ci:docs'];
  }
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('  ✅ Updated package.json');
}

/**
 * Update package.json for CLI repository
 */
function updateCliPackageJson(repoDir) {
  const packageJsonPath = path.join(repoDir, 'cli', 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('  ⚠️  No package.json found, skipping update');
    return;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  packageJson.name = '@heretek/openclaw-cli';
  packageJson.version = '1.0.0';
  packageJson.repository = {
    type: 'git',
    url: 'https://github.com/heretek/heretek-openclaw-cli.git'
  };
  packageJson.homepage = 'https://github.com/heretek/heretek-openclaw-cli#readme';
  packageJson.bugs = {
    url: 'https://github.com/heretek/heretek-openclaw-cli/issues'
  };
  
  // Add peer dependency on core
  packageJson.peerDependencies = {
    '@heretek/openclaw-core': '^1.0.0'
  };
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  // Move cli directory contents to root
  const cliDir = path.join(repoDir, 'cli');
  const files = fs.readdirSync(cliDir);
  for (const file of files) {
    if (file !== 'node_modules' && file !== '.git') {
      fs.renameSync(path.join(cliDir, file), path.join(repoDir, file));
    }
  }
  fs.rmdirSync(cliDir);
  
  console.log('  ✅ Updated package.json and restructured');
}

/**
 * Update package.json for dashboard repository
 */
function updateDashboardPackageJson(repoDir) {
  // Update main dashboard package.json if exists
  const dashboardPackageJsonPath = path.join(repoDir, 'dashboard', 'package.json');
  if (fs.existsSync(dashboardPackageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(dashboardPackageJsonPath, 'utf8'));
    packageJson.name = '@heretek/openclaw-dashboard';
    packageJson.version = '1.0.0';
    packageJson.repository = {
      type: 'git',
      url: 'https://github.com/heretek/heretek-openclaw-dashboard.git'
    };
    fs.writeFileSync(dashboardPackageJsonPath, JSON.stringify(packageJson, null, 2));
  }
  
  // Update frontend package.json
  const frontendPackageJsonPath = path.join(repoDir, 'dashboard', 'frontend', 'package.json');
  if (fs.existsSync(frontendPackageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(frontendPackageJsonPath, 'utf8'));
    packageJson.name = '@heretek/openclaw-dashboard-frontend';
    packageJson.repository = {
      type: 'git',
      url: 'https://github.com/heretek/heretek-openclaw-dashboard.git'
    };
    fs.writeFileSync(frontendPackageJsonPath, JSON.stringify(packageJson, null, 2));
  }
  
  console.log('  ✅ Updated package.json files');
}

/**
 * Update package.json for plugins repository
 */
function updatePluginsPackageJson(repoDir) {
  // Update individual plugin package.json files
  const pluginsDir = path.join(repoDir, 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    console.log('  ⚠️  No plugins directory found');
    return;
  }
  
  const plugins = fs.readdirSync(pluginsDir);
  for (const plugin of plugins) {
    const pluginPath = path.join(pluginsDir, plugin);
    if (!fs.statSync(pluginPath).isDirectory()) continue;
    
    const packageJsonPath = path.join(pluginPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageJson.repository = {
        type: 'git',
        url: 'https://github.com/heretek/heretek-openclaw-plugins.git'
      };
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }
  }
  
  console.log('  ✅ Updated plugin package.json files');
}

/**
 * Update structure for deploy repository
 */
function updateDeployStructure(repoDir) {
  // Rename deploy to terraform
  const deployDir = path.join(repoDir, 'deploy');
  const terraformDir = path.join(repoDir, 'terraform');
  if (fs.existsSync(deployDir) && !fs.existsSync(terraformDir)) {
    fs.renameSync(deployDir, terraformDir);
  }
  
  // Move charts to helm
  const chartsDir = path.join(repoDir, 'charts');
  const helmDir = path.join(repoDir, 'helm');
  if (fs.existsSync(chartsDir) && !fs.existsSync(helmDir)) {
    fs.renameSync(chartsDir, helmDir);
  }
  
  console.log('  ✅ Restructured deploy repository');
}

/**
 * Update structure for docs repository
 */
function updateDocsStructure(repoDir) {
  // Rename frontend/src to src at root level for docs site
  const frontendSrcDir = path.join(repoDir, 'frontend', 'src');
  const srcDir = path.join(repoDir, 'src');
  if (fs.existsSync(frontendSrcDir) && !fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
    const files = fs.readdirSync(frontendSrcDir);
    for (const file of files) {
      fs.renameSync(path.join(frontendSrcDir, file), path.join(srcDir, file));
    }
  }
  
  // Rename workflow file
  const oldWorkflow = path.join(repoDir, '.github', 'workflows', 'frontend-cicd.yml');
  const newWorkflow = path.join(repoDir, '.github', 'workflows', 'deploy.yml');
  if (fs.existsSync(oldWorkflow)) {
    fs.renameSync(oldWorkflow, newWorkflow);
  }
  
  console.log('  ✅ Restructured docs repository');
}

/**
 * Execute a command and log output
 */
function exec(command, options = {}) {
  console.log(`  $ ${command}`);
  execSync(command, { stdio: 'inherit', ...options });
}

/**
 * Split a repository from the monorepo
 */
function splitRepo(repoName, config) {
  console.log(`\n🔪 Splitting ${repoName}...`);
  console.log(`   Description: ${config.description}`);
  console.log(`   Paths: ${config.paths.length} entries`);
  
  const repoDir = path.join(process.cwd(), repoName);
  const sourceRepoDir = process.cwd(); // Use current directory as source
  
  // Check if git-filter-repo is installed
  try {
    execSync('git filter-repo --version', { stdio: 'ignore' });
  } catch (e) {
    console.error('❌ git-filter-repo is not installed.');
    console.error('   Install with: pip install git-filter-repo');
    console.error('   Or: brew install git-filter-repo');
    process.exit(1);
  }
  
  // Clone from local repository
  console.log('  Cloning from local monorepo...');
  if (fs.existsSync(repoDir)) {
    console.log('  ⚠️  Directory already exists, removing...');
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
  exec(`git clone file://${sourceRepoDir} ${repoName}`, { stdio: 'pipe' });
  
  // Change to repo directory
  const originalDir = process.cwd();
  process.chdir(repoDir);
  
  try {
    // Filter to only include specified paths
    const pathsArg = config.paths.map(p => `--path ${p}`).join(' ');
    console.log('  Filtering repository...');
    exec(`git filter-repo ${pathsArg} --force`);
    
    // Run post-processing
    if (config.postProcess) {
      console.log('  Post-processing...');
      config.postProcess(repoDir);
    }
    
    // Add remote URL for new GitHub repository
    console.log('  Adding remote...');
    exec(`git remote add origin git@github.com:Heretek-AI/${repoName}.git`);
    
    console.log(`✅ ${repoName} extracted to ${repoDir}`);
    console.log(`   Next steps:`);
    console.log(`   1. cd ${repoDir}`);
    console.log(`   2. git push -u origin main --force`);
    
  } catch (error) {
    console.error(`❌ Error splitting ${repoName}: ${error.message}`);
    throw error;
  } finally {
    process.chdir(originalDir);
  }
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
Heretek OpenClaw Monorepo Split Script

Usage: node scripts/migration/split-repos.js <repo-name>

Available repositories:
`);
  
  for (const [name, config] of Object.entries(REPOS)) {
    console.log(`  ${name}`);
    console.log(`    ${config.description}`);
    console.log(`    Package: ${config.packageName || 'N/A'}`);
    console.log(`    Paths: ${config.paths.length} entries`);
    console.log('');
  }
  
  console.log(`
Examples:
  node scripts/migration/split-repos.js heretek-openclaw-core
  node scripts/migration/split-repos.js heretek-openclaw-cli
  
Options:
  --all    Split all repositories (interactive)
  --dry    Show what would be done without executing
`);
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }
  
  const repoName = args.find(a => !a.startsWith('--'));
  const isDryRun = args.includes('--dry');
  const isAll = args.includes('--all');
  
  if (isAll) {
    console.log('🚀 Splitting all repositories...\n');
    for (const [name, config] of Object.entries(REPOS)) {
      if (!isDryRun) {
        splitRepo(name, config);
      } else {
        console.log(`[DRY RUN] Would split ${name}`);
      }
    }
    console.log('\n✅ All repositories split!');
    return;
  }
  
  if (!repoName) {
    console.error('❌ No repository name specified');
    showUsage();
    process.exit(1);
  }
  
  if (!REPOS[repoName]) {
    console.error(`❌ Unknown repository: ${repoName}`);
    console.error('Available:', Object.keys(REPOS).join(', '));
    process.exit(1);
  }
  
  if (isDryRun) {
    console.log(`[DRY RUN] Would split ${repoName}`);
    console.log(`  Description: ${REPOS[repoName].description}`);
    console.log(`  Paths: ${REPOS[repoName].paths.join(', ')}`);
    return;
  }
  
  splitRepo(repoName, REPOS[repoName]);
}

main();
