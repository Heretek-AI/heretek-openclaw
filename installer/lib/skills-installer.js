/**
 * Skills Installer - Manage heretek-skills installation
 * 
 * Handles cloning, updating, and configuring skills from heretek-skills repository.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Install skills from heretek-skills repository
 * @param {Object} options - Options for skills installation
 * @returns {Promise<Object>} Installation result
 */
export async function installSkills(options = {}) {
  const {
    skillsDir = '/home/openclaw/.openclaw/skills',
    repository = 'https://github.com/Heretek-AI/heretek-skills.git',
    branch = 'main',
    autoUpdate = true
  } = options;

  logger.header('Installing Skills');

  // Create skills directory if needed
  if (!existsSync(skillsDir)) {
    mkdirSync(skillsDir, { recursive: true });
    logger.info(`Created skills directory: ${skillsDir}`);
  }

  // Check if already installed
  const gitDir = join(skillsDir, '.git');
  const isInstalled = existsSync(gitDir);

  if (isInstalled) {
    logger.info('Skills already installed');
    
    if (autoUpdate) {
      return await updateSkills({ skillsDir, branch });
    }
    
    return {
      success: true,
      updated: false,
      message: 'Skills already installed'
    };
  }

  // Clone the repository
  logger.info(`Cloning ${repository}...`);
  
  try {
    execSync(`git clone --depth 1 -b ${branch} "${repository}" "${skillsDir}"`, {
      stdio: 'inherit'
    });
    
    logger.success('Skills cloned successfully');
    
    // List available skills
    const skills = listInstalledSkills(skillsDir);
    
    return {
      success: true,
      updated: false,
      skills,
      count: skills.length
    };
  } catch (e) {
    logger.error(`Failed to clone skills: ${e.message}`);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Update installed skills
 * @param {Object} options - Options for update
 * @returns {Promise<Object>} Update result
 */
export async function updateSkills(options = {}) {
  const {
    skillsDir = '/home/openclaw/.openclaw/skills',
    branch = 'main'
  } = options;

  logger.info('Updating skills...');

  const gitDir = join(skillsDir, '.git');
  
  if (!existsSync(gitDir)) {
    return {
      success: false,
      error: 'Skills not installed'
    };
  }

  try {
    // Check current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: skillsDir,
      encoding: 'utf8'
    }).trim();

    if (currentBranch === branch) {
      // Pull latest changes
      logger.info(`Pulling latest changes on ${branch}...`);
      execSync('git pull origin ' + branch, {
        cwd: skillsDir,
        stdio: 'inherit'
      });
    } else {
      // Switch branch and pull
      logger.info(`Switching to ${branch} and pulling...`);
      execSync(`git fetch origin && git checkout ${branch} && git pull origin ${branch}`, {
        cwd: skillsDir,
        stdio: 'inherit'
      });
    }

    const skills = listInstalledSkills(skillsDir);
    
    logger.success('Skills updated successfully');
    
    return {
      success: true,
      updated: true,
      skills,
      count: skills.length
    };
  } catch (e) {
    logger.error(`Failed to update skills: ${e.message}`);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * List installed skills
 * @param {string} skillsDir - Skills directory
 * @returns {Array} List of skill names
 */
export function listInstalledSkills(skillsDir = '/home/openclaw/.openclaw/skills') {
  if (!existsSync(skillsDir)) {
    return [];
  }

  const entries = readdirSync(skillsDir);
  const skills = [];

  for (const entry of entries) {
    // Skip non-directory entries
    const skillPath = join(skillsDir, entry);
    
    // Skip hidden files and common non-skill directories
    if (entry.startsWith('.') || entry === 'README.md' || entry === 'package.json') {
      continue;
    }

    // Check if it looks like a skill (has SKILL.md or similar)
    if (existsSync(join(skillPath, 'SKILL.md'))) {
      skills.push({
        name: entry,
        path: skillPath
      });
    }
  }

  return skills;
}

/**
 * Install a specific skill
 * @param {string} skillName - Name of the skill to install
 * @param {Object} options - Installation options
 * @returns {Promise<Object>} Installation result
 */
export async function installSkill(skillName, options = {}) {
  const {
    skillsDir = '/home/openclaw/.openclaw/skills'
  } = options;

  logger.info(`Installing skill: ${skillName}`);

  const skillPath = join(skillsDir, skillName);

  if (existsSync(skillPath)) {
    logger.info(`Skill '${skillName}' already installed`);
    return {
      success: true,
      installed: false,
      message: 'Skill already exists'
    };
  }

  // Check if skills repo is available
  const gitDir = join(skillsDir, '.git');
  if (!existsSync(gitDir)) {
    // Install all skills first
    const result = await installSkills(options);
    if (!result.success) {
      return result;
    }
  }

  // Check if skill exists in the repo
  if (!existsSync(skillPath)) {
    return {
      success: false,
      error: `Skill not found: ${skillName}`
    };
  }

  return {
    success: true,
    installed: true,
    name: skillName
  };
}

/**
 * Get skill configuration
 * @param {string} skillName - Name of the skill
 * @param {string} skillsDir - Skills directory
 * @returns {Object|null} Skill configuration
 */
export function getSkillConfig(skillName, skillsDir = '/home/openclaw/.openclaw/skills') {
  const skillPath = join(skillsDir, skillName);
  const configPath = join(skillPath, 'SKILL.md');

  if (!existsSync(configPath)) {
    return null;
  }

  // Simple parsing of SKILL.md - get first heading and description
  try {
    const content = readFileSync(configPath, 'utf8');
    const lines = content.split('\n');
    
    let name = skillName;
    let description = '';
    let readingDescription = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('# ')) {
        name = line.replace('# ', '').trim();
        readingDescription = true;
      } else if (readingDescription && line.trim()) {
        description = line.trim();
        break;
      }
    }

    return {
      name,
      description: description || 'No description',
      path: skillPath
    };
  } catch (e) {
    logger.debug(`Error reading skill config: ${e.message}`);
    return null;
  }
}

/**
 * Get skills status
 * @param {string} skillsDir - Skills directory
 * @returns {Object} Status information
 */
export function getSkillsStatus(skillsDir = '/home/openclaw/.openclaw/skills') {
  const isInstalled = existsSync(join(skillsDir, '.git'));
  
  if (!isInstalled) {
    return {
      installed: false,
      count: 0,
      skills: []
    };
  }

  const skills = listInstalledSkills(skillsDir);
  
  // Try to get git info
  let gitInfo = {};
  
  if (isInstalled) {
    try {
      const commit = execSync('git rev-parse HEAD', { cwd: skillsDir, encoding: 'utf8' }).trim();
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: skillsDir, encoding: 'utf8' }).trim();
      
      gitInfo = {
        commit: commit.substring(0, 7),
        branch
      };
    } catch (e) {
      // Ignore git errors
    }
  }

  return {
    installed: true,
    count: skills.length,
    skills,
    ...gitInfo
  };
}

export default {
  installSkills,
  updateSkills,
  listInstalledSkills,
  installSkill,
  getSkillConfig,
  getSkillsStatus
};