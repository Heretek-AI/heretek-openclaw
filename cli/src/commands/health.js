/**
 * Health Command
 * 
 * Run health checks on OpenClaw services.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import log from '../lib/logger.js';
import HealthChecker from '../lib/health-checker.js';

const command = new Command('health');

command
  .description('Run health checks')
  .addCommand(new Command('check')
    .description('Run all health checks')
    .option('--service <name>', 'Check specific service only')
    .option('--json', 'Output as JSON')
    .action((options) => handleHealthCheck(options))
  )
  .addCommand(new Command('watch')
    .description('Continuously monitor health')
    .option('--interval <seconds>', 'Check interval in seconds', '30')
    .action((options) => handleHealthWatch(options))
  )
  .addCommand(new Command('report')
    .description('Generate health report')
    .option('--output <file>', 'Save report to file')
    .action((options) => handleHealthReport(options))
  );

/**
 * Handle health check
 */
async function handleHealthCheck(options) {
  const checker = new HealthChecker();

  try {
    let results;

    if (options.service) {
      // Check specific service
      results = {
        checks: {
          [options.service]: await checker.checkService(options.service),
        },
      };
      results.healthy = Object.values(results.checks).every(c => c.healthy);
    } else {
      // Check all services
      results = await checker.checkAll();
    }

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    printHealthResults(results);
  } catch (error) {
    log.error(`Health check failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Print health results
 */
function printHealthResults(results) {
  log.section('OpenClaw Health Status');

  const overallStatus = results.healthy
    ? chalk.green('● HEALTHY')
    : chalk.red('● UNHEALTHY');

  console.log(`\n  Overall Status: ${overallStatus}`);
  console.log(`  Timestamp: ${results.timestamp || new Date().toISOString()}`);
  console.log('');

  // Service status table
  console.log('  ┌─────────────────┬─────────────────┬─────────────────────────────────┐');
  console.log('  │ Service         │ Status          │ Details                         │');
  console.log('  ├─────────────────┼─────────────────┼─────────────────────────────────┤');

  for (const [service, check] of Object.entries(results.checks || {})) {
    const serviceName = service.padEnd(15);
    const statusSymbol = check.healthy ? chalk.green('✓') : chalk.red('✗');
    const statusText = check.healthy ? 'Healthy' : 'Unhealthy';
    const status = `${statusSymbol} ${statusText}`.padEnd(15);

    // Build details string
    let details = [];
    if (check.modelCount !== undefined) details.push(`Models: ${check.modelCount}`);
    if (check.agentCount !== undefined) details.push(`Agents: ${check.agentCount}`);
    if (check.pgvector !== undefined) details.push(`pgvector: ${check.pgvector ? 'yes' : 'no'}`);
    if (check.memoryUsed !== undefined) details.push(`Memory: ${check.memoryUsed}`);
    if (check.responseTime !== undefined) details.push(`Response: ${check.responseTime}`);
    if (check.error) details.push(chalk.red(check.error));

    const detailsText = details.join(', ').substring(0, 31).padEnd(31);

    console.log(`  │ ${serviceName} │ ${status} │ ${detailsText} │`);
  }

  console.log('  └─────────────────┴─────────────────┴─────────────────────────────────┘');

  // Print recommendations for unhealthy services
  const unhealthyServices = Object.entries(results.checks || {})
    .filter(([, check]) => !check.healthy);

  if (unhealthyServices.length > 0) {
    console.log('\n');
    log.subheader('Recommendations');

    for (const [service, check] of unhealthyServices) {
      const recommendation = getRecommendation(service, check);
      console.log(`  ${chalk.yellow('→')} ${service.toUpperCase()}: ${recommendation}`);
    }
  }

  // Exit with error if unhealthy
  if (!results.healthy) {
    process.exit(1);
  }
}

/**
 * Get recommendation for unhealthy service
 */
function getRecommendation(service, check) {
  const recommendations = {
    gateway: 'Check if Gateway is running on port 18789',
    litellm: 'Verify LiteLLM is running and API key is correct',
    postgres: 'Ensure PostgreSQL is running and credentials are correct',
    redis: 'Ensure Redis is running on port 6379',
    ollama: 'Start Ollama service: ollama serve',
    langfuse: 'Check Langfuse deployment and configuration',
    agents: 'Verify agents are deployed and connected to Gateway',
  };

  return recommendations[service] || `Check ${service} logs for more information`;
}

/**
 * Handle health watch
 */
async function handleHealthWatch(options) {
  const interval = parseInt(options.interval, 10) * 1000;
  const checker = new HealthChecker();

  log.section('Health Monitor');
  log.info(`Watching services (interval: ${options.interval}s)`);
  log.info('Press Ctrl+C to stop\n');

  const watch = async () => {
    try {
      const results = await checker.checkAll();
      
      // Clear screen and print status
      process.stdout.write('\x1Bc');
      console.log(`Health Monitor (Ctrl+C to stop) - ${new Date().toISOString()}`);
      console.log('');
      
      printHealthResults(results);
    } catch (error) {
      log.error(`Health check failed: ${error.message}`);
    }
  };

  // Initial check
  await watch();

  // Interval checks
  setInterval(watch, interval);
}

/**
 * Handle health report
 */
async function handleHealthReport(options) {
  const checker = new HealthChecker();

  try {
    const report = await checker.generateReport();

    if (options.output) {
      const fs = await import('fs-extra');
      await fs.writeFile(options.output, JSON.stringify(report, null, 2));
      log.success(`Report saved to: ${options.output}`);
    } else {
      printHealthReport(report);
    }
  } catch (error) {
    log.error(`Failed to generate report: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Print health report
 */
function printHealthReport(report) {
  log.section('Health Report');

  const summary = report.summary;
  
  console.log(`
  Generated: ${summary.timestamp}
  Status: ${summary.healthy ? chalk.green('HEALTHY') : chalk.red('UNHEALTHY')}
  
  Checks: ${summary.healthyChecks}/${summary.totalChecks} passed
`);

  if (report.recommendations.length > 0) {
    log.subheader('Issues & Recommendations');

    for (const rec of report.recommendations) {
      console.log(`
  ${chalk.yellow(rec.service.toUpperCase())}
    Issue: ${rec.issue}
    Action: ${rec.action}
`);
    }
  } else {
    log.success('All services are healthy - no issues found');
  }
}

export default command;
