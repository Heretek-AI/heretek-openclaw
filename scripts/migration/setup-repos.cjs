#!/usr/bin/env node

/**
 * Post-Migration Repository Setup Script
 * 
 * Sets up CI/CD workflows, CODEOWNERS, README, and CONTRIBUTING
 * for all 6 extracted repositories.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_CONFIGS = {
  'heretek-openclaw-core': {
    readmeTemplate: 'README-core.md',
    hasTests: true,
    hasTypescript: false,
    publishType: 'docker'
  },
  'heretek-openclaw-cli': {
    readmeTemplate: 'README-cli.md',
    hasTests: true,
    hasTypescript: false,
    publishType: 'npm'
  },
  'heretek-openclaw-dashboard': {
    readmeTemplate: 'README-dashboard.md',
    hasTests: true,
    hasTypescript: true,
    publishType: 'none'
  },
  'heretek-openclaw-plugins': {
    readmeTemplate: 'README-plugins.md',
    hasTests: true,
    hasTypescript: false,
    publishType: 'npm'
  },
  'heretek-openclaw-deploy': {
    readmeTemplate: 'README-deploy.md',
    hasTests: false,
    hasTypescript: false,
    publishType: 'none'
  },
  'heretek-openclaw-docs': {
    readmeTemplate: 'README-docs.md',
    hasTests: true,
    hasTypescript: true,
    publishType: 'none'
  }
};

const TEMPLATES_DIR = path.join(__dirname, 'templates');
const BASE_DIR = path.join(__dirname, '..', '..');

/**
 * Read template file
 */
function readTemplate(filename) {
  const filepath = path.join(TEMPLATES_DIR, filename);
  return fs.readFileSync(filepath, 'utf-8');
}

/**
 * Customize CI workflow for a specific repository
 */
function customizeCIWorkflow(repoName, config) {
  let workflow = readTemplate('workflow-ci.yml');
  
  // Customize based on repo
  if (!config.hasTests) {
    // Remove test job for repos without tests
    workflow = workflow.replace(/  test:\n[\s\S]*?    needs: \[lint, typecheck, test\]/g, '  build:');
    workflow = workflow.replace(/needs: \[lint, typecheck, test\]/g, 'needs: [lint, typecheck]');
  }
  
  if (!config.hasTypescript) {
    // Remove typecheck job for non-TS repos
    workflow = workflow.replace(/  typecheck:\n[\s\S]*?  test:/g, '  test:');
    workflow = workflow.replace(/needs: \[lint, typecheck\]/g, 'needs: [lint]');
  }
  
  return workflow;
}

/**
 * Customize CODEOWNERS for a specific repository
 */
function customizeCODEOWNERS(repoName) {
  let codeowners = readTemplate('CODEOWNERS');
  
  // Customize based on repo
  const repoSpecific = repoName.replace('heretek-openclaw-', '');
  codeowners = codeowners.replace(/@heretek\/core-team/g, `@heretek/${repoSpecific}-team`);
  codeowners = codeowners.replace(/@heretek\/agent-team/g, `@heretek/${repoSpecific}-team`);
  codeowners = codeowners.replace(/@heretek\/research-team/g, `@heretek/${repoSpecific}-team`);
  codeowners = codeowners.replace(/@heretek\/safety-team/g, `@heretek/${repoSpecific}-team`);
  codeowners = codeowners.replace(/@heretek\/skill-team/g, `@heretek/${repoSpecific}-team`);
  codeowners = codeowners.replace(/@heretek\/memory-team/g, `@heretek/${repoSpecific}-team`);
  codeowners = codeowners.replace(/@heretek\/plugin-team/g, `@heretek/${repoSpecific}-team`);
  codeowners = codeowners.replace(/@heretek\/qa-team/g, `@heretek/${repoSpecific}-team`);
  codeowners = codeowners.replace(/@heretek\/docs-team/g, `@heretek/${repoSpecific}-team`);
  codeowners = codeowners.replace(/@heretek\/devops-team/g, `@heretek/${repoSpecific}-team`);
  
  return codeowners;
}

/**
 * Set up a single repository
 */
function setupRepository(repoName, config) {
  const repoPath = path.join(BASE_DIR, repoName);
  const workflowsPath = path.join(repoPath, '.github', 'workflows');
  
  console.log(`\n🔧 Setting up ${repoName}...`);
  
  // Ensure .github/workflows directory exists
  if (!fs.existsSync(workflowsPath)) {
    fs.mkdirSync(workflowsPath, { recursive: true });
    console.log(`  ✅ Created .github/workflows directory`);
  }
  
  // Write CI workflow
  const ciWorkflow = customizeCIWorkflow(repoName, config);
  fs.writeFileSync(path.join(workflowsPath, 'ci.yml'), ciWorkflow);
  console.log(`  ✅ Created .github/workflows/ci.yml`);
  
  // Write Release workflow
  const releaseWorkflow = readTemplate('workflow-release.yml');
  fs.writeFileSync(path.join(workflowsPath, 'release.yml'), releaseWorkflow);
  console.log(`  ✅ Created .github/workflows/release.yml`);
  
  // Write CODEOWNERS
  const codeowners = customizeCODEOWNERS(repoName);
  fs.writeFileSync(path.join(repoPath, 'CODEOWNERS'), codeowners);
  console.log(`  ✅ Created CODEOWNERS`);
  
  // Write README
  const readme = readTemplate(config.readmeTemplate);
  fs.writeFileSync(path.join(repoPath, 'README.md'), readme);
  console.log(`  ✅ Created README.md`);
  
  // Write CONTRIBUTING
  const contributing = readTemplate('CONTRIBUTING.md');
  const customizedContributing = contributing.replace(/heretek-openclaw-<repo>/g, repoName);
  fs.writeFileSync(path.join(repoPath, 'CONTRIBUTING.md'), customizedContributing);
  console.log(`  ✅ Created CONTRIBUTING.md`);
  
  return true;
}

/**
 * Commit and push changes for a repository
 */
function commitAndPush(repoName) {
  const repoPath = path.join(BASE_DIR, repoName);
  
  console.log(`\n📦 Committing changes in ${repoName}...`);
  
  try {
    execSync('git add -A', { cwd: repoPath, stdio: 'pipe' });
    
    const status = execSync('git status --porcelain', { cwd: repoPath, encoding: 'utf-8' });
    
    if (status.trim()) {
      execSync('git commit -m "chore: Add CI/CD workflows, CODEOWNERS, and documentation templates"', { 
        cwd: repoPath, 
        stdio: 'pipe' 
      });
      console.log(`  ✅ Committed changes`);
      
      console.log(`  📤 Pushing to GitHub...`);
      execSync('git push', { cwd: repoPath, stdio: 'pipe' });
      console.log(`  ✅ Pushed to GitHub`);
    } else {
      console.log(`  ⚠️  No changes to commit`);
    }
    
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Post-Migration Repository Setup\n');
  console.log('This script will set up CI/CD workflows, CODEOWNERS, README, and CONTRIBUTING.md');
  console.log('for all 6 extracted repositories.\n');
  
  const results = {};
  
  // Set up each repository
  for (const [repoName, config] of Object.entries(REPO_CONFIGS)) {
    const setupSuccess = setupRepository(repoName, config);
    results[repoName] = { setup: setupSuccess, push: false };
  }
  
  console.log('\n\n📤 Pushing changes to GitHub...\n');
  
  // Commit and push each repository
  for (const repoName of Object.keys(REPO_CONFIGS)) {
    const pushSuccess = commitAndPush(repoName);
    results[repoName].push = pushSuccess;
  }
  
  // Summary
  console.log('\n\n✅ Setup Complete!\n');
  console.log('Summary:');
  console.log('--------');
  
  let allSuccess = true;
  for (const [repoName, result] of Object.entries(results)) {
    const setupIcon = result.setup ? '✅' : '❌';
    const pushIcon = result.push ? '✅' : '❌';
    const status = result.setup && result.push ? '✅' : '⚠️';
    
    if (!result.setup || !result.push) {
      allSuccess = false;
    }
    
    console.log(`${status} ${repoName}: Setup ${setupIcon} Push ${pushIcon}`);
  }
  
  if (allSuccess) {
    console.log('\n🎉 All repositories set up successfully!');
  } else {
    console.log('\n⚠️  Some repositories had issues. Please check the output above.');
  }
}

// Run
main().catch(console.error);
