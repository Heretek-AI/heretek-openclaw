/**
 * Patch Applicator - Integration with openclaw-liberation npm package
 * 
 * Handles patch application from the openclaw-liberation package using patch-package.
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the openclaw-liberation package path
 * @returns {string|null} Path to the liberation package
 */
function getLiberationPath() {
  try {
    // Try to find it in node_modules
    const npmRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const liberationPath = join(npmRoot, '@heretek-ai', 'openclaw-liberation');
    
    if (existsSync(liberationPath)) {
      return liberationPath;
    }
    
    // Try local node_modules
    const localPath = join(process.cwd(), 'node_modules', '@heretek-ai', 'openclaw-liberation');
    if (existsSync(localPath)) {
      return localPath;
    }
    
    return null;
  } catch (e) {
    logger.debug(`Error finding liberation path: ${e.message}`);
    return null;
  }
}

/**
 * Load patches.json from openclaw-liberation
 * @returns {Object|null} Patch metadata
 */
function loadPatchesJson() {
  const liberationPath = getLiberationPath();
  if (!liberationPath) {
    return null;
  }
  
  const patchesJsonPath = join(liberationPath, 'patches.json');
  if (!existsSync(patchesJsonPath)) {
    return null;
  }
  
  try {
    return JSON.parse(readFileSync(patchesJsonPath, 'utf8'));
  } catch (e) {
    logger.debug(`Error parsing patches.json: ${e.message}`);
    return null;
  }
}

/**
 * List available patches from openclaw-liberation
 * @returns {Array} List of available patches
 */
export async function listAvailablePatches() {
  const patchesJson = loadPatchesJson();
  
  if (!patchesJson || !patchesJson.patches) {
    logger.warn('No patches found in openclaw-liberation');
    return [];
  }
  
  return patchesJson.patches.map(patch => ({
    name: patch.name,
    date: patch.date,
    description: patch.description,
    category: patch.category
  }));
}

/**
 * Apply liberation patches from openclaw-liberation
 * @param {Object} options - Options for patch application
 * @returns {Promise<Object>} Result of patch application
 */
export async function applyLiberationPatches(options = {}) {
  const { force = false, patches = 'all' } = options;
  
  logger.header('Applying Liberation Patches');
  
  // Check if openclaw-liberation is installed
  const liberationPath = getLiberationPath();
  
  if (!liberationPath) {
    logger.warn('openclaw-liberation not found in node_modules');
    logger.info('Patches will be applied automatically when liberation package is installed');
    return {
      success: true,
      applied: [],
      skipped: true,
      message: 'Liberation package not yet installed'
    };
  }
  
  // Try to run patch-package via the liberation package
  logger.info('Running patch-package via openclaw-liberation...');
  
  try {
    // Run npm scripts from the liberation package
    const npmRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const liberationPackagePath = join(npmRoot, '@heretek-ai', 'openclaw-liberation');
    
    if (existsSync(join(liberationPackagePath, 'node_modules', 'patch-package'))) {
      // Run patch-package directly
      const patchPackageBin = join(liberationPackagePath, 'node_modules', '.bin', 'patch-package');
      
      logger.info('Executing patch-package...');
      execSync(`"${patchPackageBin}"`, {
        cwd: liberationPackagePath,
        stdio: 'inherit'
      });
      
      logger.success('Patches applied successfully');
      
      // List applied patches
      const patchesJson = loadPatchesJson();
      const applied = patchesJson?.patches?.map(p => p.name) || [];
      
      return {
        success: true,
        applied,
        skipped: false
      };
    } else {
      logger.warn('patch-package not found in liberation package');
      return {
        success: false,
        applied: [],
        error: 'patch-package not available'
      };
    }
  } catch (e) {
    logger.error(`Patch application failed: ${e.message}`);
    return {
      success: false,
      applied: [],
      error: e.message
    };
  }
}

/**
 * Verify patches have been applied
 * @returns {Promise<Object>} Verification result
 */
export async function verifyPatchesApplied() {
  logger.info('Verifying patch application...');
  
  const patchesJson = loadPatchesJson();
  if (!patchesJson || !patchesJson.patches) {
    return {
      verified: false,
      message: 'No patches to verify'
    };
  }
  
  // Try to run verify script from liberation package
  try {
    const npmRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const liberationPath = join(npmRoot, '@heretek-ai', 'openclaw-liberation');
    
    // Check if there's a verify script
    const packageJsonPath = join(liberationPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      if (packageJson.scripts?.verify) {
        logger.info('Running liberation verification...');
        execSync('npm run verify', {
          cwd: liberationPath,
          stdio: 'inherit'
        });
        
        return {
          verified: true,
          message: 'Liberation verified'
        };
      }
    }
  } catch (e) {
    logger.debug(`Verification check: ${e.message}`);
  }
  
  return {
    verified: false,
    message: 'Cannot verify - liberation package may not be fully installed'
  };
}

/**
 * Apply a specific patch by name
 * @param {string} patchName - Name of the patch to apply
 * @returns {Promise<Object>} Result
 */
export async function applySpecificPatch(patchName) {
  const patchesJson = loadPatchesJson();
  
  if (!patchesJson || !patchesJson.patches) {
    return {
      success: false,
      error: 'No patches available'
    };
  }
  
  const patch = patchesJson.patches.find(p => p.name === patchName);
  
  if (!patch) {
    return {
      success: false,
      error: `Patch not found: ${patchName}`
    };
  }
  
  // Apply the specific patch
  logger.info(`Applying patch: ${patchName}`);
  
  try {
    const npmRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const liberationPath = join(npmRoot, '@heretek-ai', 'openclaw-liberation');
    const patchFile = join(liberationPath, 'patches', patch.file);
    
    if (existsSync(patchFile)) {
      const patchPackageBin = join(liberationPath, 'node_modules', '.bin', 'patch-package');
      execSync(`"${patchPackageBin}" --patch "${patchFile}"`, {
        cwd: liberationPath,
        stdio: 'inherit'
      });
      
      return {
        success: true,
        applied: [patchName]
      };
    } else {
      return {
        success: false,
        error: `Patch file not found: ${patch.file}`
      };
    }
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Get patch application status
 * @returns {Promise<Object>} Status information
 */
export async function getPatchStatus() {
  const patchesJson = loadPatchesJson();
  const liberationPath = getLiberationPath();
  
  const status = {
    liberationInstalled: !!liberationPath,
    patchesAvailable: patchesJson?.patches?.length || 0,
    patches: []
  };
  
  if (patchesJson?.patches) {
    status.patches = patchesJson.patches.map(p => ({
      name: p.name,
      date: p.date,
      description: p.description,
      category: p.category
    }));
  }
  
  return status;
}

export default {
  applyLiberationPatches,
  verifyPatchesApplied,
  listAvailablePatches,
  applySpecificPatch,
  getPatchStatus
};