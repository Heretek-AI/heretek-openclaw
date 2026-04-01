/**
 * Deployment Manager
 * 
 * Unified deployment manager that abstracts different deployment types.
 * Supports Docker, Bare Metal, Kubernetes, and Cloud deployments.
 */

import path from 'path';
import fs from 'fs-extra';
import log from './logger.js';
import DockerDeployer from './docker-deployer.js';
import BareMetalDeployer from './baremetal-deployer.js';
import KubernetesDeployer from './kubernetes-deployer.js';
import CloudDeployer from './cloud-deployer.js';

// Deployment types
export const DeploymentType = {
  DOCKER: 'docker',
  BARE_METAL: 'bare-metal',
  KUBERNETES: 'kubernetes',
  VM: 'vm',
  AWS: 'aws',
  GCP: 'gcp',
  AZURE: 'azure',
};

// Deployment status
export const DeploymentStatus = {
  NOT_DEPLOYED: 'not-deployed',
  DEPLOYING: 'deploying',
  RUNNING: 'running',
  STOPPED: 'stopped',
  ERROR: 'error',
  UNKNOWN: 'unknown',
};

class DeploymentManager {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.configPath = options.configPath || path.join(this.rootDir, 'openclaw.json');
    this.deploymentType = options.deploymentType || DeploymentType.DOCKER;
    this.deployer = null;
    this.config = null;
    
    this.initializeDeployer();
  }

  /**
   * Initialize the appropriate deployer based on deployment type
   */
  initializeDeployer() {
    const commonOptions = { rootDir: this.rootDir };

    switch (this.deploymentType) {
      case DeploymentType.DOCKER:
        this.deployer = new DockerDeployer(commonOptions);
        break;
      case DeploymentType.BARE_METAL:
      case DeploymentType.VM:
        this.deployer = new BareMetalDeployer(commonOptions);
        break;
      case DeploymentType.KUBERNETES:
        this.deployer = new KubernetesDeployer(commonOptions);
        break;
      case DeploymentType.AWS:
      case DeploymentType.GCP:
      case DeploymentType.AZURE:
        this.deployer = new CloudDeployer({
          ...commonOptions,
          provider: this.deploymentType,
        });
        break;
      default:
        throw new Error(`Unknown deployment type: ${this.deploymentType}`);
    }

    log.debug(`Initialized ${this.deploymentType} deployer`);
  }

  /**
   * Set deployment type
   */
  setDeploymentType(type) {
    if (this.deploymentType !== type) {
      this.deploymentType = type;
      this.initializeDeployer();
    }
  }

  /**
   * Load configuration
   */
  async loadConfig() {
    try {
      if (!await fs.pathExists(this.configPath)) {
        log.warn(`Configuration file not found: ${this.configPath}`);
        return null;
      }

      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      return this.config;
    } catch (error) {
      log.error(`Failed to load configuration: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check prerequisites for deployment
   */
  async checkPrerequisites() {
    log.info('Checking deployment prerequisites...');

    const results = {
      config: false,
      deployer: false,
      environment: false,
    };

    // Check configuration
    try {
      await this.loadConfig();
      results.config = this.config !== null;
      if (results.config) {
        log.success('Configuration loaded');
      } else {
        log.warn('Configuration not found');
      }
    } catch (error) {
      log.error(`Configuration check failed: ${error.message}`);
    }

    // Check deployer-specific prerequisites
    try {
      if (this.deployer instanceof DockerDeployer) {
        const dockerCheck = await this.deployer.checkDocker();
        const composeCheck = await this.deployer.checkDockerCompose();
        results.deployer = dockerCheck.available && composeCheck.available;
        
        if (!dockerCheck.available) log.warn('Docker not available');
        if (!composeCheck.available) log.warn('Docker Compose not available');
      } else if (this.deployer instanceof BareMetalDeployer) {
        const checks = await this.deployer.checkPrerequisites();
        results.deployer = checks.node;
        log.info(`Node.js: ${checks.node ? checks.nodeVersion : 'not installed'}`);
      } else if (this.deployer instanceof KubernetesDeployer) {
        const kubectlCheck = await this.deployer.checkKubectl();
        const clusterCheck = await this.deployer.checkCluster();
        results.deployer = kubectlCheck.available && clusterCheck.connected;
      } else if (this.deployer instanceof CloudDeployer) {
        const terraformCheck = await this.deployer.checkTerraform();
        const providerCheck = await this.deployer.checkProviderCLI();
        results.deployer = terraformCheck.available && providerCheck.available;
      }

      if (results.deployer) {
        log.success('Deployer prerequisites met');
      }
    } catch (error) {
      log.error(`Deployer check failed: ${error.message}`);
    }

    // Check environment
    results.environment = true;
    log.success('Environment check passed');

    const allPassed = Object.values(results).every(r => r);
    return {
      passed: allPassed,
      results,
    };
  }

  /**
   * Deploy OpenClaw
   */
  async deploy(options = {}) {
    log.section('Deploying OpenClaw');

    // Check prerequisites
    const prereqs = await this.checkPrerequisites();
    if (!prereqs.passed) {
      log.error('Prerequisites check failed. Cannot proceed with deployment.');
      return false;
    }

    try {
      if (this.deployer instanceof DockerDeployer) {
        return await this.deployDocker(options);
      } else if (this.deployer instanceof BareMetalDeployer) {
        return await this.deployBareMetal(options);
      } else if (this.deployer instanceof KubernetesDeployer) {
        return await this.deployKubernetes(options);
      } else if (this.deployer instanceof CloudDeployer) {
        return await this.deployCloud(options);
      }
    } catch (error) {
      log.error(`Deployment failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Deploy using Docker
   */
  async deployDocker(options = {}) {
    const { build = false, forceRecreate = false, pull = true } = options;

    log.info('Starting Docker deployment...');

    // Pull images
    if (pull) {
      await this.deployer.pull();
    }

    // Validate compose file
    const validation = await this.deployer.validateComposeFile();
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Start deployment
    const success = await this.deployer.up({ build, forceRecreate });
    
    if (success) {
      log.success('Docker deployment complete');
    }

    return success;
  }

  /**
   * Deploy to Bare Metal
   */
  async deployBareMetal(options = {}) {
    const { installDeps = true, configureServices = true } = options;

    log.info('Starting Bare Metal deployment...');

    // Install system dependencies
    if (installDeps) {
      await this.deployer.installDependencies();
    }

    // Setup PostgreSQL
    const pgConfig = await this.deployer.setupPostgres();

    // Setup Redis
    await this.deployer.setupRedis();

    // Install application
    await this.deployer.installApp();

    // Create and start services
    if (configureServices) {
      await this.deployer.startServices();
    }

    log.success('Bare Metal deployment complete');
    return true;
  }

  /**
   * Deploy to Kubernetes
   */
  async deployKubernetes(options = {}) {
    const { 
      method = 'helm', 
      values = [], 
      set = {},
      overlay = 'default',
    } = options;

    log.info('Starting Kubernetes deployment...');

    // Create namespace
    await this.deployer.createNamespace();

    if (method === 'helm') {
      await this.deployer.deployHelm({ values, set });
    } else if (method === 'kustomize') {
      await this.deployer.deployKustomize({ overlay });
    } else {
      throw new Error(`Unknown Kubernetes deployment method: ${method}`);
    }

    log.success('Kubernetes deployment complete');
    return true;
  }

  /**
   * Deploy to Cloud
   */
  async deployCloud(options = {}) {
    const { autoApprove = false, generateConfig = true, configOptions = {} } = options;

    log.info('Starting Cloud deployment...');

    // Authenticate
    const authenticated = await this.deployer.authenticate();
    if (!authenticated) {
      throw new Error('Cloud authentication failed');
    }

    // Generate config if needed
    if (generateConfig) {
      await this.deployer.generateConfig(configOptions);
    }

    // Initialize Terraform
    await this.deployer.init();

    // Validate
    const valid = await this.deployer.validate();
    if (!valid) {
      throw new Error('Terraform validation failed');
    }

    // Plan and apply
    const planFile = await this.deployer.plan();
    await this.deployer.apply({ autoApprove, planFile });

    log.success('Cloud deployment complete');
    return true;
  }

  /**
   * Stop deployment
   */
  async stop(options = {}) {
    log.info('Stopping deployment...');

    try {
      if (this.deployer instanceof DockerDeployer) {
        return await this.deployer.down(options);
      } else if (this.deployer instanceof BareMetalDeployer) {
        return await this.deployer.stopServices();
      } else if (this.deployer instanceof KubernetesDeployer) {
        return await this.deployer.delete();
      } else if (this.deployer instanceof CloudDeployer) {
        return await this.deployer.destroy(options);
      }
    } catch (error) {
      log.error(`Failed to stop deployment: ${error.message}`);
      return false;
    }
  }

  /**
   * Get deployment status
   */
  async status() {
    try {
      if (this.deployer instanceof DockerDeployer) {
        return await this.deployer.status();
      } else if (this.deployer instanceof BareMetalDeployer) {
        return await this.deployer.status();
      } else if (this.deployer instanceof KubernetesDeployer) {
        return await this.deployer.status();
      } else if (this.deployer instanceof CloudDeployer) {
        return await this.deployer.status();
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * View logs
   */
  async logs(options = {}) {
    if (this.deployer instanceof DockerDeployer) {
      return await this.deployer.logs(options);
    } else if (this.deployer instanceof KubernetesDeployer) {
      return await this.deployer.logs(options);
    } else {
      log.warn('Logs command not available for this deployment type');
      return null;
    }
  }

  /**
   * Run health check
   */
  async healthCheck() {
    if (this.deployer) {
      return await this.deployer.healthCheck();
    }
    return { healthy: false, error: 'No deployer initialized' };
  }

  /**
   * Get deployment info
   */
  async info() {
    return {
      type: this.deploymentType,
      status: await this.status(),
      health: await this.healthCheck(),
      config: this.config,
    };
  }
}

export default DeploymentManager;
