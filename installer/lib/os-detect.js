/**
 * OS Detection - Detect operating system and provide OS-specific utilities
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import logger from './logger.js';

export const OS = {
  DEBIAN: 'debian',
  UBUNTU: 'ubuntu',
  CENTOS: 'centos',
  RHEL: 'rhel',
  ROCKY: 'rocky',
  ALMA: 'alma',
  FEDORA: 'fedora',
  ALPINE: 'alpine',
  UNKNOWN: 'unknown'
};

export const DISTRO_NAMES = {
  debian: 'Debian',
  ubuntu: 'Ubuntu',
  centos: 'CentOS',
  rhel: 'Red Hat Enterprise Linux',
  rocky: 'Rocky Linux',
  alma: 'AlmaLinux',
  fedora: 'Fedora',
  alpine: 'Alpine Linux'
};

/**
 * Detect the current operating system
 * @returns {Object} OS information
 */
export function detectOS() {
  logger.info('Detecting operating system...');
  
  let distro = OS.UNKNOWN;
  let distroName = 'Unknown Linux';
  let distroVersion = 'unknown';
  
  // Try /etc/os-release first (most common)
  if (existsSync('/etc/os-release')) {
    try {
      const content = readFileSync('/etc/os-release', 'utf8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('ID=')) {
          distro = line.split('=')[1].replace(/['"]/g, '').toLowerCase();
        } else if (line.startsWith('NAME=')) {
          distroName = line.split('=')[1].replace(/['"]/g, '');
        } else if (line.startsWith('VERSION_ID=')) {
          distroVersion = line.split('=')[1].replace(/['"]/g, '');
        }
      }
      
      // Normalize distro names
      if (distro === 'rocky') distro = OS.ROCKY;
      if (distro === 'alma') distro = OS.ALMA;
      if (distro === 'rhel') distro = OS.RHEL;
    } catch (e) {
      logger.debug(`Error reading /etc/os-release: ${e.message}`);
    }
  }
  
  // Try /etc/alpine-release
  if (distro === OS.UNKNOWN && existsSync('/etc/alpine-release')) {
    distro = OS.ALPINE;
    distroName = 'Alpine Linux';
    distroVersion = readFileSync('/etc/alpine-release', 'utf8').trim();
  }
  
  // Try /etc/centos-release
  if (distro === OS.UNKNOWN && existsSync('/etc/centos-release')) {
    distro = OS.CENTOS;
    distroName = 'CentOS';
    const content = readFileSync('/etc/centos-release', 'utf8');
    const match = content.match(/\d+\.\d+/);
    if (match) {
      distroVersion = match[0];
    }
  }
  
  logger.info(`  Distribution: ${distroName} (${distro} ${distroVersion})`);
  
  return {
    distro,
    distroName,
    distroVersion,
    isDebianBased: [OS.DEBIAN, OS.UBUNTU].includes(distro),
    isRhelBased: [OS.CENTOS, OS.RHEL, OS.ROCKY, OS.ALMA, OS.FEDORA].includes(distro),
    isAlpine: distro === OS.ALPINE
  };
}

/**
 * Check if running as root
 * @returns {boolean}
 */
export function isRoot() {
  return process.getuid && process.getuid() === 0;
}

/**
 * Require root privileges
 */
export function requireRoot() {
  if (!isRoot()) {
    logger.fatal('This operation requires root privileges. Please run with sudo.', 'E001');
  }
}

/**
 * Get package manager for current OS
 * @param {Object} os - OS information from detectOS()
 * @returns {string} Package manager name
 */
export function getPackageManager(os) {
  if (os.isDebianBased) return 'apt';
  if (os.isRhelBased) {
    if (os.distro === OS.FEDORA) return 'dnf';
    return 'yum';
  }
  if (os.isAlpine) return 'apk';
  return 'unknown';
}

/**
 * Get install command for current OS
 * @param {Object} os - OS information from detectOS()
 * @returns {Object} Commands for different package managers
 */
export function getInstallCommands(os) {
  const pm = getPackageManager(os);
  
  const commands = {
    apt: {
      update: 'apt-get update -qq',
      install: 'apt-get install -y -qq',
      installNoQuiet: 'apt-get install -y',
      clean: 'apt-get clean'
    },
    yum: {
      update: 'yum check-update -q',
      install: 'yum install -y -q',
      installNoQuiet: 'yum install -y',
      clean: 'yum clean all'
    },
    dnf: {
      update: 'dnf check-update -q',
      install: 'dnf install -y -q',
      installNoQuiet: 'dnf install -y',
      clean: 'dnf clean all'
    },
    apk: {
      update: 'apk update',
      install: 'apk add --no-cache',
      installNoQuiet: 'apk add',
      clean: 'rm -rf /var/cache/apk/*'
    }
  };
  
  return commands[pm] || commands.apt;
}

/**
 * Check if a command exists
 * @param {string} cmd - Command to check
 * @returns {boolean}
 */
export function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd} >/dev/null 2>&1`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check Node.js version
 * @returns {Object} Node version info
 */
export function checkNode() {
  try {
    const version = execSync('node -v', { encoding: 'utf8' }).trim();
    const major = parseInt(version.replace('v', '').split('.')[0]);
    return {
      installed: true,
      version,
      major,
      meetsRequirement: major >= 20
    };
  } catch {
    return {
      installed: false,
      version: null,
      major: 0,
      meetsRequirement: false
    };
  }
}

/**
 * Get npm global bin directory
 * @returns {string} Path to npm global bin
 */
export function getNpmGlobalBin() {
  try {
    return execSync('npm config get prefix', { encoding: 'utf8' }).trim() + '/bin';
  } catch {
    return '/usr/local/bin';
  }
}

export default {
  detectOS,
  isRoot,
  requireRoot,
  getPackageManager,
  getInstallCommands,
  commandExists,
  checkNode,
  getNpmGlobalBin,
  OS,
  DISTRO_NAMES
};