/**
 * Health Checker
 * 
 * Comprehensive health checking for OpenClaw services.
 */

import { execa } from 'execa';
import axios from 'axios';
import log from './logger.js';

class HealthChecker {
  constructor(options = {}) {
    this.timeout = options.timeout || 5000;
    this.gatewayUrl = options.gatewayUrl || 'http://localhost:18789';
    this.litellmUrl = options.litellmUrl || 'http://localhost:4000';
    this.postgresHost = options.postgresHost || 'localhost';
    this.postgresPort = options.postgresPort || 5432;
    this.redisHost = options.redisHost || 'localhost';
    this.redisPort = options.redisPort || 6379;
    this.ollamaUrl = options.ollamaUrl || 'http://localhost:11434';
    this.langfuseUrl = options.langfuseUrl || 'http://localhost:3000';
  }

  /**
   * Run all health checks
   */
  async checkAll() {
    const checks = {
      gateway: await this.checkGateway(),
      litellm: await this.checkLiteLLM(),
      postgres: await this.checkPostgres(),
      redis: await this.checkRedis(),
      ollama: await this.checkOllama(),
      langfuse: await this.checkLangfuse(),
      agents: await this.checkAgents(),
    };

    const allHealthy = Object.values(checks).every(c => c.healthy);
    
    return {
      healthy: allHealthy,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  /**
   * Check Gateway health
   */
  async checkGateway() {
    try {
      const response = await axios.get(`${this.gatewayUrl}/health`, {
        timeout: this.timeout,
      });

      return {
        healthy: true,
        status: response.status,
        responseTime: response.headers['x-response-time'] || 'unknown',
        data: response.data,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        status: error.response?.status,
      };
    }
  }

  /**
   * Check LiteLLM health
   */
  async checkLiteLLM() {
    try {
      const response = await axios.get(`${this.litellmUrl}/health`, {
        timeout: this.timeout,
        headers: {
          'Authorization': `Bearer ${process.env.LITELLM_MASTER_KEY || 'heretek-master-key-change-me'}`,
        },
      });

      // Get model count
      const modelsResponse = await axios.get(`${this.litellmUrl}/v1/models`, {
        timeout: this.timeout,
        headers: {
          'Authorization': `Bearer ${process.env.LITELLM_MASTER_KEY || 'heretek-master-key-change-me'}`,
        },
      });

      return {
        healthy: true,
        status: response.status,
        modelCount: modelsResponse.data?.data?.length || 0,
        responseTime: response.headers['x-response-time'] || 'unknown',
        version: response.data?.version || 'unknown',
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        status: error.response?.status,
      };
    }
  }

  /**
   * Check PostgreSQL health
   */
  async checkPostgres() {
    try {
      // Try pg_isready
      try {
        await execa('pg_isready', [
          '-h', this.postgresHost,
          '-p', this.postgresPort.toString(),
        ], { timeout: this.timeout / 1000 });

        // Check pgvector extension
        try {
          const { stdout } = await execa('psql', [
            '-h', this.postgresHost,
            '-p', this.postgresPort.toString(),
            '-U', process.env.POSTGRES_USER || 'openclaw',
            '-d', process.env.POSTGRES_DB || 'openclaw',
            '-t', '-c',
            "SELECT 1 FROM pg_extension WHERE extname='vector';",
          ], { timeout: this.timeout / 1000 });

          return {
            healthy: true,
            pgvector: stdout.trim() === '1',
            responseTime: 'unknown',
          };
        } catch {
          return {
            healthy: true,
            pgvector: false,
            responseTime: 'unknown',
          };
        }
      } catch {
        // Fallback: try to connect via psql
        await execa('psql', [
          '-h', this.postgresHost,
          '-p', this.postgresPort.toString(),
          '-U', process.env.POSTGRES_USER || 'openclaw',
          '-d', process.env.POSTGRES_DB || 'openclaw',
          '-c', 'SELECT 1;',
        ], { timeout: this.timeout / 1000 });

        return {
          healthy: true,
          responseTime: 'unknown',
        };
      }
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Check Redis health
   */
  async checkRedis() {
    try {
      const { stdout } = await execa('redis-cli', [
        '-h', this.redisHost,
        '-p', this.redisPort.toString(),
        'ping',
      ], { timeout: this.timeout / 1000 });

      if (stdout.trim() === 'PONG') {
        // Get memory info
        try {
          const infoOutput = await execa('redis-cli', [
            '-h', this.redisHost,
            '-p', this.redisPort.toString(),
            'info', 'memory',
          ], { timeout: this.timeout / 1000 });

          const usedMemory = infoOutput.stdout.match(/used_memory_human:([^\r\n]+)/)?.[1]?.trim() || 'unknown';

          return {
            healthy: true,
            memoryUsed: usedMemory,
            responseTime: 'unknown',
          };
        } catch {
          return {
            healthy: true,
            responseTime: 'unknown',
          };
        }
      }

      return {
        healthy: false,
        error: 'Redis returned unexpected response',
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Check Ollama health
   */
  async checkOllama() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, {
        timeout: this.timeout,
      });

      const models = response.data?.models || [];

      return {
        healthy: true,
        modelCount: models.length,
        models: models.map(m => m.name),
        responseTime: 'unknown',
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Check Langfuse health
   */
  async checkLangfuse() {
    try {
      const response = await axios.get(`${this.langfuseUrl}/api/health`, {
        timeout: this.timeout,
      });

      return {
        healthy: true,
        status: response.status,
        responseTime: 'unknown',
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Check registered agents
   */
  async checkAgents() {
    try {
      const response = await axios.get(`${this.litellmUrl}/v1/agents`, {
        timeout: this.timeout,
        headers: {
          'Authorization': `Bearer ${process.env.LITELLM_MASTER_KEY || 'heretek-master-key-change-me'}`,
        },
      });

      const agents = response.data?.agents || [];

      return {
        healthy: true,
        agentCount: agents.length,
        agents: agents.map(a => a.agent_name || a.name),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Check specific service
   */
  async checkService(service) {
    const checkers = {
      gateway: () => this.checkGateway(),
      litellm: () => this.checkLiteLLM(),
      postgres: () => this.checkPostgres(),
      redis: () => this.checkRedis(),
      ollama: () => this.checkOllama(),
      langfuse: () => this.checkLangfuse(),
      agents: () => this.checkAgents(),
    };

    const checker = checkers[service];
    if (!checker) {
      return {
        healthy: false,
        error: `Unknown service: ${service}`,
      };
    }

    return await checker();
  }

  /**
   * Generate health report
   */
  async generateReport() {
    const results = await this.checkAll();
    
    const report = {
      summary: {
        healthy: results.healthy,
        timestamp: results.timestamp,
        totalChecks: Object.keys(results.checks).length,
        healthyChecks: Object.values(results.checks).filter(c => c.healthy).length,
      },
      details: results.checks,
      recommendations: [],
    };

    // Generate recommendations
    for (const [service, check] of Object.entries(results.checks)) {
      if (!check.healthy) {
        report.recommendations.push({
          service,
          issue: check.error || 'Service unhealthy',
          action: this.getRecommendation(service),
        });
      }
    }

    return report;
  }

  /**
   * Get recommendation for a service
   */
  getRecommendation(service) {
    const recommendations = {
      gateway: 'Check if Gateway is running and port 18789 is accessible',
      litellm: 'Verify LiteLLM is running and API key is correct',
      postgres: 'Ensure PostgreSQL is running and credentials are correct',
      redis: 'Ensure Redis is running and accessible',
      ollama: 'Start Ollama service and verify it is accessible',
      langfuse: 'Check Langfuse deployment and configuration',
      agents: 'Verify agents are deployed and connected to Gateway',
    };

    return recommendations[service] || 'Check service logs for more information';
  }

  /**
   * Print health status
   */
  printStatus(results) {
    console.log('\n');
    log.section('OpenClaw Health Status');
    
    const overallStatus = results.healthy 
      ? chalk.green('HEALTHY') 
      : chalk.red('UNHEALTHY');
    
    console.log(`Overall Status: ${overallStatus}`);
    console.log(`Timestamp: ${results.timestamp}`);
    console.log('');

    const chalk = (await import('chalk')).default;

    for (const [service, check] of Object.entries(results.checks)) {
      const status = check.healthy 
        ? chalk.green('✓') 
        : chalk.red('✗');
      
      console.log(`${status} ${service.toUpperCase()}`);
      
      if (check.healthy) {
        if (check.modelCount !== undefined) {
          console.log(`   Models: ${check.modelCount}`);
        }
        if (check.agentCount !== undefined) {
          console.log(`   Agents: ${check.agentCount}`);
        }
        if (check.pgvector !== undefined) {
          console.log(`   pgvector: ${check.pgvector ? 'enabled' : 'disabled'}`);
        }
        if (check.memoryUsed !== undefined) {
          console.log(`   Memory: ${check.memoryUsed}`);
        }
      } else {
        console.log(`   Error: ${check.error}`);
      }
    }

    console.log('');
  }
}

export default HealthChecker;
