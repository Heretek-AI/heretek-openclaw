/**
 * Kubernetes Deployer
 * 
 * Handles Kubernetes deployment for OpenClaw using Helm or Kustomize.
 */

import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import log from './logger.js';

class KubernetesDeployer {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.namespace = options.namespace || 'openclaw';
    this.releaseName = options.releaseName || 'openclaw';
    this.chartDir = options.chartDir || path.join(this.rootDir, 'charts', 'openclaw');
    this.kustomizeDir = options.kustomizeDir || path.join(this.rootDir, 'deploy', 'k8s');
  }

  /**
   * Check if kubectl is available
   */
  async checkKubectl() {
    try {
      await execa('kubectl', ['version', '--client']);
      return { available: true };
    } catch (error) {
      return { 
        available: false, 
        error: 'kubectl is not installed or not in PATH' 
      };
    }
  }

  /**
   * Check cluster connectivity
   */
  async checkCluster() {
    try {
      const kubectl = await this.checkKubectl();
      if (!kubectl.available) {
        return { connected: false, error: kubectl.error };
      }

      await execa('kubectl', ['cluster-info']);
      return { connected: true };
    } catch (error) {
      return { 
        connected: false, 
        error: `Cannot connect to cluster: ${error.message}` 
      };
    }
  }

  /**
   * Check if Helm is available
   */
  async checkHelm() {
    try {
      await execa('helm', ['version']);
      return { available: true };
    } catch (error) {
      return { 
        available: false, 
        error: 'Helm is not installed or not in PATH' 
      };
    }
  }

  /**
   * Check if Kustomize is available
   */
  async checkKustomize() {
    try {
      await execa('kustomize', ['version']);
      return { available: true };
    } catch {
      try {
        // kubectl has built-in kustomize
        await execa('kubectl', ['version', '--client']);
        return { available: true, builtin: true };
      } catch (error) {
        return { 
          available: false, 
          error: 'Kustomize is not installed' 
        };
      }
    }
  }

  /**
   * Create namespace if not exists
   */
  async createNamespace() {
    log.info(`Ensuring namespace '${this.namespace}' exists...`);

    try {
      await execa('kubectl', ['create', 'namespace', this.namespace, '--dry-run=client', '-o', 'yaml']);
      await execa('kubectl', ['apply', '-f', '-'], {
        input: `apiVersion: v1\nkind: Namespace\nmetadata:\n  name: ${this.namespace}\n`,
      });
      log.success(`Namespace '${this.namespace}' ready`);
      return true;
    } catch (error) {
      log.error(`Failed to create namespace: ${error.message}`);
      return false;
    }
  }

  /**
   * Deploy using Helm
   */
  async deployHelm(options = {}) {
    const { 
      values = [], 
      set = {}, 
      wait = true, 
      timeout = '5m',
      upgrade = false,
    } = options;

    const helm = await this.checkHelm();
    if (!helm.available) {
      throw new Error(helm.error);
    }

    log.info(`Deploying with Helm to namespace '${this.namespace}'...`);

    try {
      const args = upgrade ? ['upgrade', '--install'] : ['install'];
      
      args.push(
        this.releaseName,
        this.chartDir,
        '--namespace', this.namespace,
        '--create-namespace'
      );

      if (wait) args.push('--wait');
      if (timeout) args.push('--timeout', timeout);

      for (const valueFile of values) {
        args.push('-f', valueFile);
      }

      for (const [key, value] of Object.entries(set)) {
        args.push('--set', `${key}=${value}`);
      }

      await execa('helm', args, { stdio: 'inherit' });

      log.success(`Helm deployment complete: ${this.releaseName}`);
      return true;
    } catch (error) {
      log.error(`Helm deployment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deploy using Kustomize
   */
  async deployKustomize(options = {}) {
    const { overlay = 'default', dryRun = false } = options;

    const kustomize = await this.checkKustomize();
    if (!kustomize.available) {
      throw new Error(kustomize.error);
    }

    log.info(`Deploying with Kustomize to namespace '${this.namespace}'...`);

    try {
      const overlayDir = path.join(this.kustomizeDir, 'overlays', overlay);
      
      if (!await fs.pathExists(overlayDir)) {
        throw new Error(`Overlay not found: ${overlayDir}`);
      }

      let manifest;
      
      if (kustomize.builtin) {
        const { stdout } = await execa('kubectl', ['kustomize', overlayDir]);
        manifest = stdout;
      } else {
        const { stdout } = await execa('kustomize', ['build', overlayDir]);
        manifest = stdout;
      }

      if (dryRun) {
        log.info('Dry run mode - manifest generated but not applied');
        console.log(manifest);
        return true;
      }

      // Apply to cluster
      await execa('kubectl', ['apply', '-f', '-'], {
        input: manifest,
      });

      log.success('Kustomize deployment complete');
      return true;
    } catch (error) {
      log.error(`Kustomize deployment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply raw manifests
   */
  async applyManifests(manifestDir) {
    log.info(`Applying manifests from ${manifestDir}...`);

    try {
      await execa('kubectl', ['apply', '-R', '-f', manifestDir], {
        cwd: this.rootDir,
        stdio: 'inherit',
      });

      log.success('Manifests applied');
      return true;
    } catch (error) {
      log.error(`Failed to apply manifests: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get deployment status
   */
  async status() {
    try {
      // Get pods
      const podsResult = await execa('kubectl', [
        'get', 'pods', '-n', this.namespace, '-o', 'json'
      ]);
      const pods = JSON.parse(podsResult.stdout);

      // Get deployments
      const deploymentsResult = await execa('kubectl', [
        'get', 'deployments', '-n', this.namespace, '-o', 'json'
      ]);
      const deployments = JSON.parse(deploymentsResult.stdout);

      // Get services
      const servicesResult = await execa('kubectl', [
        'get', 'services', '-n', this.namespace, '-o', 'json'
      ]);
      const services = JSON.parse(servicesResult.stdout);

      // Get statefulsets
      const statefulsetsResult = await execa('kubectl', [
        'get', 'statefulsets', '-n', this.namespace, '-o', 'json'
      ]);
      const statefulsets = JSON.parse(statefulsetsResult.stdout);

      return {
        namespace: this.namespace,
        pods: pods.items.map(p => ({
          name: p.metadata.name,
          status: p.status.phase,
          ready: p.status.containerStatuses?.every(cs => cs.ready) || false,
          restarts: p.status.containerStatuses?.reduce((acc, cs) => acc + cs.restartCount, 0) || 0,
        })),
        deployments: deployments.items.map(d => ({
          name: d.metadata.name,
          ready: d.status.readyReplicas || 0,
          replicas: d.status.replicas || 0,
        })),
        services: services.items.map(s => ({
          name: s.metadata.name,
          type: s.spec.type,
          clusterIP: s.spec.clusterIP,
          ports: s.spec.ports?.map(p => p.port) || [],
        })),
        statefulsets: statefulsets.items.map(s => ({
          name: s.metadata.name,
          ready: s.status.readyReplicas || 0,
          replicas: s.status.replicas || 0,
        })),
      };
    } catch (error) {
      return {
        namespace: this.namespace,
        error: error.message,
      };
    }
  }

  /**
   * View logs
   */
  async logs(options = {}) {
    const { 
      selector, 
      container, 
      follow = false, 
      tail = 100,
      timestamps = false,
    } = options;

    try {
      const args = ['logs', '-n', this.namespace];

      if (selector) args.push('-l', selector);
      if (container) args.push('-c', container);
      if (follow) args.push('-f');
      if (tail) args.push('--tail', tail.toString());
      if (timestamps) args.push('--timestamps');

      const subprocess = execa('kubectl', args, {
        stdio: 'inherit',
      });

      return subprocess;
    } catch (error) {
      log.error(`Failed to view logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scale deployment
   */
  async scale(deployment, replicas) {
    log.info(`Scaling ${deployment} to ${replicas} replicas...`);

    try {
      await execa('kubectl', [
        'scale', 'deployment', deployment,
        '--replicas', replicas.toString(),
        '-n', this.namespace,
      ]);

      log.success(`Scaled ${deployment} to ${replicas} replicas`);
      return true;
    } catch (error) {
      log.error(`Failed to scale deployment: ${error.message}`);
      return false;
    }
  }

  /**
   * Rollback deployment
   */
  async rollback(deployment) {
    log.info(`Rolling back ${deployment}...`);

    try {
      await execa('kubectl', [
        'rollout', 'undo', 'deployment', deployment,
        '-n', this.namespace,
      ]);

      log.success(`Rolling back ${deployment}`);
      return true;
    } catch (error) {
      log.error(`Failed to rollback: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete deployment
   */
  async delete() {
    log.info(`Deleting OpenClaw from namespace '${this.namespace}'...`);

    try {
      // If using Helm
      const helm = await this.checkHelm();
      if (helm.available) {
        await execa('helm', ['uninstall', this.releaseName, '-n', this.namespace], {
          stdio: 'inherit',
        });
      } else {
        // Delete all resources
        await execa('kubectl', ['delete', 'all', '--all', '-n', this.namespace], {
          stdio: 'inherit',
        });
      }

      log.success('Deployment deleted');
      return true;
    } catch (error) {
      log.error(`Failed to delete deployment: ${error.message}`);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    const status = await this.status();
    
    if (status.error) {
      return { healthy: false, error: status.error };
    }

    // Check if all pods are ready
    const allPodsReady = status.pods?.every(p => p.ready) || false;
    
    // Check if all deployments have ready replicas
    const allDeploymentsReady = status.deployments?.every(d => d.ready > 0) || false;

    return {
      healthy: allPodsReady && allDeploymentsReady,
      details: status,
    };
  }

  /**
   * Port forward a service
   */
  async portForward(service, localPort, remotePort) {
    log.info(`Port forwarding ${service} to localhost:${localPort}...`);

    try {
      const subprocess = execa('kubectl', [
        'port-forward', '-n', this.namespace,
        `service/${service}`,
        `${localPort}:${remotePort}`,
      ], {
        stdio: 'inherit',
      });

      return subprocess;
    } catch (error) {
      log.error(`Failed to port forward: ${error.message}`);
      throw error;
    }
  }
}

export default KubernetesDeployer;
