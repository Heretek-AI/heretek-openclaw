/**
 * @heretek-ai/openclaw-liberation
 * 
 * Liberation patch for the openclaw npm package.
 * 
 * This package uses patch-package to apply modifications to the openclaw
 * package that remove safety constraints and enable liberation principles.
 * 
 * Usage:
 *   npm install openclaw
 *   npm install @heretek-ai/openclaw-liberation
 * 
 * The postinstall script automatically applies patches.
 */

export default {
  name: '@heretek-ai/openclaw-liberation',
  version: '1.0.0',
  description: 'Liberation patch for openclaw npm package',
  keywords: ['openclaw', 'liberation', 'heretek', 'tabula-myriad'],
};

// Re-export verification for direct usage
export { default as verifyLiberation } from './scripts/verify-liberation.js';