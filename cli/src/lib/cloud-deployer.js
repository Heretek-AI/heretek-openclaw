/**
 * Cloud Deployer
 * 
 * Handles cloud deployment for OpenClaw using Terraform.
 * Supports AWS, GCP, and Azure.
 */

import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import log from './logger.js';

class CloudDeployer {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.provider = options.provider || 'aws';
    this.terraformDir = options.terraformDir || path.join(this.rootDir, 'terraform', this.provider);
    this.stateDir = options.stateDir || path.join(this.rootDir, '.terraform', this.provider);
    this.projectName = options.projectName || 'openclaw';
    this.region = options.region || this.getDefaultRegion();
  }

  /**
   * Get default region based on provider
   */
  getDefaultRegion() {
    const defaults = {
      aws: 'us-east-1',
      gcp: 'us-central1',
      azure: 'eastus',
    };
    return defaults[this.provider] || 'us-east-1';
  }

  /**
   * Check if Terraform is available
   */
  async checkTerraform() {
    try {
      await execa('terraform', ['version']);
      return { available: true };
    } catch (error) {
      return { 
        available: false, 
        error: 'Terraform is not installed or not in PATH' 
      };
    }
  }

  /**
   * Check cloud provider CLI
   */
  async checkProviderCLI() {
    const cliCommands = {
      aws: { command: 'aws', args: ['--version'] },
      gcp: { command: 'gcloud', args: ['--version'] },
      azure: { command: 'az', args: ['--version'] },
    };

    const cli = cliCommands[this.provider];
    if (!cli) {
      return { available: false, error: `Unknown provider: ${this.provider}` };
    }

    try {
      await execa(cli.command, cli.args);
      return { available: true };
    } catch (error) {
      return { 
        available: false, 
        error: `${cli.command} CLI is not installed or not in PATH` 
      };
    }
  }

  /**
   * Authenticate with cloud provider
   */
  async authenticate() {
    log.info(`Authenticating with ${this.provider.toUpperCase()}...`);

    const authChecks = {
      aws: async () => {
        try {
          await execa('aws', ['sts', 'get-caller-identity']);
          return true;
        } catch {
          return false;
        }
      },
      gcp: async () => {
        try {
          await execa('gcloud', ['auth', 'list']);
          return true;
        } catch {
          return false;
        }
      },
      azure: async () => {
        try {
          await execa('az', ['account', 'show']);
          return true;
        } catch {
          return false;
        }
      },
    };

    const isAuthenticated = await authChecks[this.provider]?.();
    
    if (!isAuthenticated) {
      log.warn(`Not authenticated with ${this.provider.toUpperCase()}`);
      log.info('Run the following command to authenticate:');
      
      const authCommands = {
        aws: 'aws configure',
        gcp: 'gcloud auth login',
        azure: 'az login',
      };
      
      console.log(`  ${authCommands[this.provider]}`);
      return false;
    }

    log.success(`Authenticated with ${this.provider.toUpperCase()}`);
    return true;
  }

  /**
   * Initialize Terraform
   */
  async init() {
    log.info('Initializing Terraform...');

    try {
      const terraform = await this.checkTerraform();
      if (!terraform.available) {
        throw new Error(terraform.error);
      }

      // Ensure state directory exists
      await fs.ensureDir(this.stateDir);

      await execa('terraform', ['init'], {
        cwd: this.terraformDir,
        stdio: 'inherit',
      });

      log.success('Terraform initialized');
      return true;
    } catch (error) {
      log.error(`Terraform init failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate Terraform configuration
   */
  async validate() {
    log.info('Validating Terraform configuration...');

    try {
      const terraform = await this.checkTerraform();
      if (!terraform.available) {
        throw new Error(terraform.error);
      }

      await execa('terraform', ['validate'], {
        cwd: this.terraformDir,
      });

      log.success('Terraform configuration is valid');
      return true;
    } catch (error) {
      log.error(`Terraform validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Plan Terraform deployment
   */
  async plan(options = {}) {
    const { out = 'tfplan', destroy = false } = options;

    log.info(`Creating Terraform ${destroy ? 'destroy' : 'deployment'} plan...`);

    try {
      const terraform = await this.checkTerraform();
      if (!terraform.available) {
        throw new Error(terraform.error);
      }

      const args = ['plan', '-out', out];
      
      if (destroy) {
        args.push('-destroy');
      }

      args.push(
        '-var', `project_name=${this.projectName}`,
        '-var', `region=${this.region}`
      );

      await execa('terraform', args, {
        cwd: this.terraformDir,
        stdio: 'inherit',
      });

      log.success('Terraform plan created');
      return out;
    } catch (error) {
      log.error(`Terraform plan failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply Terraform deployment
   */
  async apply(options = {}) {
    const { autoApprove = false, planFile = null } = options;

    log.info('Applying Terraform deployment...');

    try {
      const terraform = await this.checkTerraform();
      if (!terraform.available) {
        throw new Error(terraform.error);
      }

      const args = ['apply'];
      
      if (autoApprove) {
        args.push('-auto-approve');
      }

      if (planFile) {
        args.push(planFile);
      }

      await execa('terraform', args, {
        cwd: this.terraformDir,
        stdio: 'inherit',
      });

      log.success('Terraform deployment applied');
      return true;
    } catch (error) {
      log.error(`Terraform apply failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Destroy Terraform deployment
   */
  async destroy(options = {}) {
    const { autoApprove = false } = options;

    log.info('Destroying Terraform deployment...');

    try {
      const terraform = await this.checkTerraform();
      if (!terraform.available) {
        throw new Error(terraform.error);
      }

      const args = ['destroy'];
      
      if (autoApprove) {
        args.push('-auto-approve');
      }

      args.push(
        '-var', `project_name=${this.projectName}`,
        '-var', `region=${this.region}`
      );

      await execa('terraform', args, {
        cwd: this.terraformDir,
        stdio: 'inherit',
      });

      log.success('Terraform deployment destroyed');
      return true;
    } catch (error) {
      log.error(`Terraform destroy failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get deployment outputs
   */
  async getOutputs() {
    try {
      const terraform = await this.checkTerraform();
      if (!terraform.available) {
        throw new Error(terraform.error);
      }

      const { stdout } = await execa('terraform', ['output', '-json'], {
        cwd: this.terraformDir,
      });

      return JSON.parse(stdout);
    } catch (error) {
      log.error(`Failed to get outputs: ${error.message}`);
      return {};
    }
  }

  /**
   * Get deployment status
   */
  async status() {
    try {
      const outputs = await this.getOutputs();
      
      const status = {
        provider: this.provider,
        projectName: this.projectName,
        region: this.region,
        resources: {},
      };

      // Parse outputs based on provider
      if (this.provider === 'aws') {
        status.resources = {
          eksCluster: outputs.eks_cluster_endpoint?.value,
          rdsInstance: outputs.rds_endpoint?.value,
          elasticacheCluster: outputs.elasticache_endpoint?.value,
          loadBalancer: outputs.load_balancer_dns?.value,
        };
      } else if (this.provider === 'gcp') {
        status.resources = {
          gkeCluster: outputs.gke_cluster_endpoint?.value,
          cloudSqlInstance: outputs.cloud_sql_connection_name?.value,
          memorystoreInstance: outputs.memorystore_host?.value,
          loadBalancer: outputs.load_balancer_ip?.value,
        };
      } else if (this.provider === 'azure') {
        status.resources = {
          aksCluster: outputs.aks_fqdn?.value,
          cosmosDB: outputs.cosmosdb_endpoint?.value,
          redisCache: outputs.redis_host?.value,
          loadBalancer: outputs.load_balancer_ip?.value,
        };
      }

      return status;
    } catch (error) {
      return {
        provider: this.provider,
        projectName: this.projectName,
        error: error.message,
      };
    }
  }

  /**
   * Generate Terraform configuration
   */
  async generateConfig(options = {}) {
    const { 
      instanceType, 
      nodeCount, 
      storageSize,
      enableMonitoring,
      enableBackup,
    } = options;

    log.info('Generating Terraform configuration...');

    // Create terraform directory structure
    const modulesDir = path.join(this.terraformDir, 'modules');
    await fs.ensureDir(modulesDir);
    await fs.ensureDir(path.join(modulesDir, 'kubernetes'));
    await fs.ensureDir(path.join(modulesDir, 'database'));
    await fs.ensureDir(path.join(modulesDir, 'cache'));

    // Generate main.tf
    const mainTf = this.generateMainTf({ instanceType, nodeCount, storageSize, enableMonitoring, enableBackup });
    await fs.writeFile(path.join(this.terraformDir, 'main.tf'), mainTf);

    // Generate variables.tf
    const variablesTf = this.generateVariablesTf();
    await fs.writeFile(path.join(this.terraformDir, 'variables.tf'), variablesTf);

    // Generate outputs.tf
    const outputsTf = this.generateOutputsTf();
    await fs.writeFile(path.join(this.terraformDir, 'outputs.tf'), outputsTf);

    log.success('Terraform configuration generated');
    return true;
  }

  /**
   * Generate main.tf for AWS
   */
  generateMainTf(options = {}) {
    const { instanceType = 't3.medium', nodeCount = 2, storageSize = 100 } = options;

    return `# OpenClaw AWS Terraform Configuration
# Generated by openclaw CLI

terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# VPC
module "vpc" {
  source = "./modules/vpc"
  
  cidr_block = "10.0.0.0/16"
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
  
  tags = {
    Name        = "\${var.project_name}-vpc"
    Project     = var.project_name
    Environment = var.environment
  }
}

# EKS Cluster
module "eks" {
  source = "./modules/eks"
  
  cluster_name    = var.project_name
  cluster_version = "1.28"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  node_groups = {
    default = {
      instance_types = ["${instanceType}"]
      capacity_type  = "ON_DEMAND"
      desired_size   = ${nodeCount}
      max_size       = ${nodeCount + 2}
      min_size       = ${nodeCount}
    }
  }
}

# RDS PostgreSQL
module "rds" {
  source = "./modules/rds"
  
  identifier   = "\${var.project_name}-postgres"
  engine       = "postgres"
  engine_version = "15"
  instance_class = "db.t3.medium"
  
  allocated_storage     = ${storageSize}
  max_allocated_storage = ${storageSize * 2}
  
  db_name  = "openclaw"
  username = "openclaw"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  tags = {
    Project = var.project_name
  }
}

# ElastiCache Redis
module "elasticache" {
  source = "./modules/elasticache"
  
  cluster_id   = "\${var.project_name}-redis"
  engine       = "redis"
  engine_version = "7.0"
  node_type    = "cache.t3.medium"
  num_nodes    = 1
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  tags = {
    Project = var.project_name
  }
}

# ECR Repository
resource "aws_ecr_repository" "openclaw" {
  name                 = var.project_name
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  tags = {
    Project = var.project_name
  }
}
`;
  }

  /**
   * Generate variables.tf
   */
  generateVariablesTf() {
    return `# OpenClaw Variables

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "openclaw"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "instance_type" {
  description = "EC2 instance type for EKS nodes"
  type        = string
  default     = "t3.medium"
}

variable "node_count" {
  description = "Number of EKS nodes"
  type        = number
  default     = 2
}

variable "storage_size" {
  description = "RDS storage size in GB"
  type        = number
  default     = 100
}

variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "enable_backup" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}
`;
  }

  /**
   * Generate outputs.tf
   */
  generateOutputsTf() {
    return `# OpenClaw Outputs

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "elasticache_endpoint" {
  description = "ElastiCache endpoint"
  value       = module.elasticache.endpoint
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.openclaw.repository_url
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}
`;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const status = await this.status();
      
      if (status.error) {
        return { healthy: false, error: status.error };
      }

      // Check if all resources are available
      const allResourcesAvailable = Object.values(status.resources).every(r => r);

      return {
        healthy: allResourcesAvailable,
        details: status,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }
}

export default CloudDeployer;
