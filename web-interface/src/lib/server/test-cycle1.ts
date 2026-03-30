/**
 * Heretek OpenClaw — Cycle 1 Validation Test
 * ==============================================================================
 * Tests the agent-registry port fix and health check service
 * ==============================================================================
 */

import { AGENTS, getAgentById, getAgentHealthUrl } from './agent-registry';
import { HealthCheckService } from './health-check-service';

async function runValidation() {
    console.log('='.repeat(60));
    console.log('CYCLE 1 VALIDATION: Agent Registry Port Fix & Health Service');
    console.log('='.repeat(60));
    console.log();

    let allPassed = true;

    // Test 1: Verify all 11 agents have correct port mapping
    console.log('TEST 1: Port Mapping Verification');
    console.log('-'.repeat(40));
    
    const expectedPorts: Record<string, number> = {
        steward: 8001,
        alpha: 8002,
        beta: 8003,
        charlie: 8004,
        examiner: 8005,
        explorer: 8006,
        sentinel: 8007,
        coder: 8008,
        dreamer: 8009,
        empath: 8010,
        historian: 8011
    };

    for (const agent of AGENTS) {
        const expectedPort = expectedPorts[agent.id];
        if (agent.port === expectedPort) {
            console.log(`  ✓ ${agent.id}: port ${agent.port} (correct)`);
        } else {
            console.log(`  ✗ ${agent.id}: port ${agent.port} (expected ${expectedPort})`);
            allPassed = false;
        }
    }
    console.log();

    // Test 2: Verify getAgentById works
    console.log('TEST 2: getAgentById Function');
    console.log('-'.repeat(40));
    
    const steward = getAgentById('steward');
    if (steward && steward.id === 'steward' && steward.name === 'Steward') {
        console.log('  ✓ getAgentById("steward") returns correct agent');
    } else {
        console.log('  ✗ getAgentById("steward") failed');
        allPassed = false;
    }
    console.log();

    // Test 3: Verify HealthCheckService can be instantiated
    console.log('TEST 3: HealthCheckService Instantiation');
    console.log('-'.repeat(40));
    
    try {
        const healthService = new HealthCheckService();
        console.log('  ✓ HealthCheckService instantiated successfully');
        
        // Test 4: Verify getAgentsWithStatus returns array
        console.log();
        console.log('TEST 4: HealthCheckService.getAgentsWithStatus()');
        console.log('-'.repeat(40));
        
        const agentsWithStatus = await healthService.getAgentsWithStatus();
        
        if (Array.isArray(agentsWithStatus) && agentsWithStatus.length === 11) {
            console.log(`  ✓ Returns array of ${agentsWithStatus.length} agents`);
            
            // Check structure of first agent
            const firstAgent = agentsWithStatus[0];
            if ('id' in firstAgent && 'name' in firstAgent && 'status' in firstAgent && 'port' in firstAgent) {
                console.log('  ✓ Agent objects have correct structure');
            } else {
                console.log('  ✗ Agent objects missing required properties');
                allPassed = false;
            }
        } else {
            console.log('  ✗ getAgentsWithStatus() did not return expected array');
            allPassed = false;
        }
    } catch (error) {
        console.log(`  ✗ HealthCheckService error: ${error}`);
        allPassed = false;
    }
    console.log();

    // Summary
    console.log('='.repeat(60));
    if (allPassed) {
        console.log('✓ ALL TESTS PASSED - Cycle 1 validation successful!');
    } else {
        console.log('✗ SOME TESTS FAILED - Review implementation');
    }
    console.log('='.repeat(60));

    return allPassed;
}

// Run validation
runValidation().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Validation error:', error);
    process.exit(1);
});