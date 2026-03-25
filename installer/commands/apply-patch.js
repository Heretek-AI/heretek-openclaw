/**
 * Apply Patch Command - Manually apply a specific patch
 */

import logger from '../lib/logger.js';
import { applySpecificPatch, listAvailablePatches } from '../lib/patch-applier.js';

/**
 * Main apply-patch function
 * @param {string} patchName - Name of patch to apply
 * @param {Object} config - Configuration
 */
async function main(patchName, config) {
  // First, list available patches
  logger.header('Available Patches');
  
  const patches = await listAvailablePatches();
  
  if (patches.length === 0) {
    logger.warn('No patches available');
    return;
  }
  
  console.log('Available patches:\n');
  for (const patch of patches) {
    console.log(`  ${patch.name}`);
    console.log(`    Date: ${patch.date}`);
    console.log(`    Description: ${patch.description}`);
    console.log(`    Category: ${patch.category}`);
    console.log('');
  }
  
  // If no specific patch requested, list only
  if (!patchName || patchName === 'list') {
    return;
  }
  
  // Apply the specific patch
  logger.header(`Applying Patch: ${patchName}`);
  
  const result = await applySpecificPatch(patchName);
  
  if (result.success) {
    logger.success(`Patch applied: ${patchName}`);
  } else {
    logger.error(`Failed to apply patch: ${result.error}`);
    process.exit(1);
  }
}

export default main;