#!/usr/bin/env node
/**
 * Delta Detector - Detects what changed since last cycle
 * 
 * Checks:
 * - File system changes (workspace files)
 * - Database changes (consensus ledger, curiosity metrics)
 * - External changes (upstream, GitHub, CVE feeds)
 * - Agent state changes (heartbeat status)
 * - Memory updates (new entries)
 * 
 * Usage:
 *   node delta-detector.js [--json]    # Output as JSON
 *   node delta-detector.js              # Human-readable output
 * 
 * Environment Variables:
 *   WORKSPACE_ROOT   - Root directory to monitor (default: /workspace)
 *   CURIOSITY_DIR   - Curiosity engine directory (default: /workspace/.curiosity)
 *   AGENT_NAME      - Current agent name
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const STATE_DIR = process.env.WORKSPACE_ROOT || '/workspace';
const CURIOUSITY_DIR = process.env.CURIOSITY_DIR || '/workspace/.curiosity';
const LAST_STATE_FILE = process.env.DELTA_STATE_FILE || '/tmp/delta-detector-state.json';

// File patterns to monitor
const FILE_PATTERNS = ['*.md', '*.json', '*.js', '*.sh', '*.yaml', '*.yml'];

// Directories to monitor
const IMPORTANT_DIRS = ['', '/memory', '/skills', '/.curiosity', '/triad'];

/**
 * DeltaDetector class - Detects changes from baseline
 */
class DeltaDetector {
    constructor() {
        this.lastState = this.loadLastState();
        this.currentState = {
            timestamp: null,
            files: {},
            db_hashes: {},
            external: {},
            agents: {}
        };
    }
    
    /**
     * Load last known state from file
     */
    loadLastState() {
        try {
            if (fs.existsSync(LAST_STATE_FILE)) {
                const data = fs.readFileSync(LAST_STATE_FILE, 'utf8');
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load last state:', e.message);
        }
        return {
            timestamp: null,
            files: {},
            db_hashes: {},
            external: {},
            agents: {}
        };
    }
    
    /**
     * Save current state for next cycle
     */
    saveState() {
        try {
            // Ensure directory exists
            const dir = path.dirname(LAST_STATE_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(LAST_STATE_FILE, JSON.stringify(this.currentState, null, 2));
        } catch (e) {
            console.error('Failed to save state:', e.message);
        }
    }
    
    /**
     * Main detection function - runs all detectors
     */
    async detect() {
        const deltas = [];
        
        console.error('Detecting changes...');
        
        // 1. Detect file system changes
        const fileDeltas = this.detectFileChanges();
        deltas.push(...fileDeltas);
        
        // 2. Detect database changes
        const dbDeltas = this.detectDbChanges();
        deltas.push(...dbDeltas);
        
        // 3. Detect external changes
        const externalDeltas = await this.detectExternalChanges();
        deltas.push(...externalDeltas);
        
        // 4. Detect agent state changes
        const agentDeltas = await this.detectAgentChanges();
        deltas.push(...agentDeltas);
        
        // Save current state
        this.currentState.timestamp = new Date().toISOString();
        this.saveState();
        
        return deltas;
    }
    
    /**
     * Detect file system changes
     */
    detectFileChanges() {
        const deltas = [];
        
        for (const dir of IMPORTANT_DIRS) {
            const dirPath = path.join(STATE_DIR, dir);
            if (!fs.existsSync(dirPath)) continue;
            
            try {
                // Use find to get files (works on both Unix and Windows with Git Bash)
                let files = [];
                try {
                    const findOutput = execSync(
                        `find "${dirPath}" -type f \\( -name "*.md" -o -name "*.json" -o -name "*.js" -o -name "*.sh" -o -name "*.yaml" -o -name "*.yml" \\) 2>/dev/null`,
                        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
                    );
                    files = findOutput.split('\n').filter(Boolean);
                } catch (e) {
                    // Fallback: use recursive file listing
                    files = this.getFilesRecursive(dirPath);
                }
                
                for (const file of files) {
                    try {
                        if (!file || !fs.existsSync(file)) continue;
                        
                        const stat = fs.statSync(file);
                        const content = fs.readFileSync(file, 'utf8');
                        const hash = this.hash(content);
                        const lastHash = this.lastState.files?.[file]?.hash;
                        
                        if (!lastHash) {
                            // New file
                            deltas.push({
                                type: 'file_created',
                                path: file,
                                timestamp: stat.mtime.toISOString(),
                                size: stat.size
                            });
                        } else if (lastHash !== hash) {
                            // Modified file
                            deltas.push({
                                type: 'file_modified',
                                path: file,
                                timestamp: stat.mtime.toISOString(),
                                size: stat.size
                            });
                        }
                        
                        // Update current state
                        this.currentState.files = this.currentState.files || {};
                        this.currentState.files[file] = {
                            hash,
                            mtime: stat.mtime.toISOString(),
                            size: stat.size
                        };
                    } catch (e) {
                        // Skip inaccessible files
                    }
                }
                
                // Check for deleted files
                for (const lastFile of Object.keys(this.lastState.files || {})) {
                    if (!files.includes(lastFile) && fs.existsSync(path.dirname(lastFile))) {
                        deltas.push({
                            type: 'file_deleted',
                            path: lastFile,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
                
            } catch (e) {
                // Directory not accessible - skip
            }
        }
        
        return deltas;
    }
    
    /**
     * Get files recursively (fallback for Windows)
     */
    getFilesRecursive(dirPath) {
        const files = [];
        
        try {
            const items = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const item of items) {
                const fullPath = path.join(dirPath, item.name);
                if (item.isDirectory() && !item.name.startsWith('.')) {
                    files.push(...this.getFilesRecursive(fullPath));
                } else if (item.isFile()) {
                    const ext = path.extname(item.name);
                    if (['.md', '.json', '.js', '.sh', '.yaml', '.yml'].includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (e) {
            // Ignore permission errors
        }
        
        return files;
    }
    
    /**
     * Detect database changes
     */
    detectDbChanges() {
        const deltas = [];
        const dbFiles = [
            'curiosity_metrics.db',
            'consensus_ledger.db',
            'anomalies.db',
            'knowledge.db'
        ];
        
        for (const db of dbFiles) {
            const dbPath = path.join(CURIOSITY_DIR, db);
            if (!fs.existsSync(dbPath)) continue;
            
            try {
                const stat = fs.statSync(dbPath);
                const content = fs.readFileSync(dbPath);
                const hash = this.hash(content.toString('utf8'));
                const lastHash = this.lastState.db_hashes?.[db];
                
                if (lastHash !== hash) {
                    deltas.push({
                        type: 'db_modified',
                        database: db,
                        timestamp: stat.mtime.toISOString()
                    });
                }
                
                this.currentState.db_hashes = this.currentState.db_hashes || {};
                this.currentState.db_hashes[db] = hash;
            } catch (e) {
                // Skip inaccessible databases
            }
        }
        
        return deltas;
    }
    
    /**
     * Detect external changes (API endpoints, feeds)
     */
    async detectExternalChanges() {
        const deltas = [];
        
        try {
            const lastCheck = this.lastState.external?.last_check || '1970-01-01';
            const now = new Date().toISOString();
            
            // Check for GitHub releases (if configured)
            if (process.env.GITHUB_REPO) {
                try {
                    const response = execSync(
                        `curl -s "https://api.github.com/repos/${process.env.GITHUB_REPO}/releases" 2>/dev/null | head -100`,
                        { encoding: 'utf8' }
                    );
                    const releases = JSON.parse(response);
                    if (Array.isArray(releases) && releases.length > 0) {
                        const latest = releases[0];
                        if (this.lastState.external?.latest_release !== latest.tag_name) {
                            deltas.push({
                                type: 'external_release',
                                source: 'github',
                                repository: process.env.GITHUB_REPO,
                                release: latest.tag_name,
                                timestamp: latest.created_at
                            });
                        }
                        this.currentState.external = this.currentState.external || {};
                        this.currentState.external.latest_release = latest.tag_name;
                    }
                } catch (e) {
                    // GitHub API not available
                }
            }
            
            this.currentState.external = this.currentState.external || {};
            this.currentState.external.last_check = now;
            
        } catch (e) {
            // External check failed
        }
        
        return deltas;
    }
    
    /**
     * Detect agent state changes via triad-sync
     */
    async detectAgentChanges() {
        const deltas = [];
        
        // Check agent heartbeats via triad-sync HTTP API
        try {
            const response = execSync(
                'curl -s http://localhost:8765/agents 2>/dev/null || echo "{}"',
                { encoding: 'utf8' }
            );
            const agents = JSON.parse(response);
            
            for (const [agent, state] of Object.entries(agents)) {
                const lastHeartbeat = this.lastState.agents?.[agent]?.last_heartbeat;
                const currentHeartbeat = state.last_heartbeat;
                
                if (lastHeartbeat !== currentHeartbeat) {
                    if (state.status === 'offline' && lastHeartbeat) {
                        deltas.push({
                            type: 'agent_offline',
                            agent: agent,
                            status: 'offline',
                            timestamp: currentHeartbeat || new Date().toISOString()
                        });
                    } else if (state.status === 'online' && !lastHeartbeat) {
                        deltas.push({
                            type: 'agent_online',
                            agent: agent,
                            status: 'online',
                            timestamp: currentHeartbeat || new Date().toISOString()
                        });
                    } else {
                        deltas.push({
                            type: 'agent_heartbeat',
                            agent: agent,
                            status: state.status,
                            timestamp: currentHeartbeat || new Date().toISOString()
                        });
                    }
                }
            }
            
            this.currentState.agents = agents;
        } catch (e) {
            // Triad-sync not available - this is normal in standalone mode
        }
        
        return deltas;
    }
    
    /**
     * Simple hash function for content comparison
     */
    hash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const detector = new DeltaDetector();
    
    if (args.includes('--json') || args.includes('-j')) {
        const deltas = await detector.detect();
        console.log(JSON.stringify(deltas));
    } else {
        const deltas = await detector.detect();
        console.error(`Detected ${deltas.length} deltas`);
        for (const delta of deltas) {
            console.error(`  - ${delta.type}: ${delta.path || delta.database || delta.agent || delta.timestamp}`);
        }
    }
}

// Run if called directly
main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
