<script lang="ts">
  /**
   * ClawPanel - Production Dashboard Component
   * ===========================================
   * 
   * Implements production-grade monitoring dashboard inspired by ClawPanel.
   * Features:
   * - Agent topology DAG visualization
   * - Real-time metrics and health status
   * - Workflow center with templates
   * - System resource monitoring
   * - Alert and notification panel
   */
  
  import { onMount, onDestroy } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  
  // Types
  interface Agent {
    id: string;
    name: string;
    role: string;
    status: 'online' | 'offline' | 'busy' | 'error';
    model: string;
    lastHeartbeat: string;
    tasksCompleted: number;
    tasksFailed: number;
    avgResponseTime: number;
  }
  
  interface Metric {
    name: string;
    value: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
    status: 'good' | 'warning' | 'critical';
  }
  
  interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    steps: number;
  }
  
  interface Alert {
    id: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: string;
    agent?: string;
    acknowledged: boolean;
  }
  
  // State
  let agents: Agent[] = [];
  let metrics: Metric[] = [];
  let workflows: WorkflowTemplate[] = [];
  let alerts: Alert[] = [];
  let selectedAgent: Agent | null = null;
  let activeTab: 'overview' | 'agents' | 'workflows' | 'alerts' | 'settings' = 'overview';
  let isLoading = true;
  let lastRefresh = new Date();
  let refreshInterval: number;
  
  // Computed values
  $: onlineAgents = agents.filter(a => a.status === 'online').length;
  $: totalAgents = agents.length;
  $: criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  $: systemHealth = calculateSystemHealth();
  
  function calculateSystemHealth(): number {
    if (agents.length === 0) return 0;
    const onlineRatio = onlineAgents / totalAgents;
    const errorRatio = agents.filter(a => a.status === 'error').length / totalAgents;
    return Math.round((onlineRatio - errorRatio * 0.5) * 100);
  }
  
  // Fetch data from backend
  async function fetchDashboardData() {
    try {
      // Fetch agents
      const agentsRes = await fetch('/api/agents');
      if (agentsRes.ok) {
        agents = await agentsRes.json();
      }
      
      // Fetch metrics
      const metricsRes = await fetch('/api/metrics');
      if (metricsRes.ok) {
        metrics = await metricsRes.json();
      }
      
      // Fetch alerts
      const alertsRes = await fetch('/api/alerts');
      if (alertsRes.ok) {
        alerts = await alertsRes.json();
      }
      
      // Fetch workflows
      const workflowsRes = await fetch('/api/workflows');
      if (workflowsRes.ok) {
        workflows = await workflowsRes.json();
      }
      
      lastRefresh = new Date();
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Initialize with mock data for development
  function initializeMockData() {
    agents = [
      { id: 'steward', name: 'Steward', role: 'orchestrator', status: 'online', model: 'MiniMax-M2.1', lastHeartbeat: new Date().toISOString(), tasksCompleted: 156, tasksFailed: 3, avgResponseTime: 245 },
      { id: 'alpha', name: 'Alpha', role: 'triad', status: 'online', model: 'MiniMax-M2.1', lastHeartbeat: new Date().toISOString(), tasksCompleted: 89, tasksFailed: 1, avgResponseTime: 312 },
      { id: 'beta', name: 'Beta', role: 'triad', status: 'online', model: 'MiniMax-M2.1', lastHeartbeat: new Date().toISOString(), tasksCompleted: 92, tasksFailed: 2, avgResponseTime: 298 },
      { id: 'charlie', name: 'Charlie', role: 'triad', status: 'busy', model: 'MiniMax-M2.1', lastHeartbeat: new Date().toISOString(), tasksCompleted: 78, tasksFailed: 0, avgResponseTime: 287 },
      { id: 'examiner', name: 'Examiner', role: 'interrogator', status: 'online', model: 'MiniMax-M2.1', lastHeartbeat: new Date().toISOString(), tasksCompleted: 134, tasksFailed: 5, avgResponseTime: 456 },
      { id: 'explorer', name: 'Explorer', role: 'scout', status: 'online', model: 'MiniMax-M2.1', lastHeartbeat: new Date().toISOString(), tasksCompleted: 67, tasksFailed: 1, avgResponseTime: 523 },
      { id: 'sentinel', name: 'Sentinel', role: 'guardian', status: 'online', model: 'MiniMax-M2.1', lastHeartbeat: new Date().toISOString(), tasksCompleted: 201, tasksFailed: 0, avgResponseTime: 189 },
      { id: 'historian', name: 'Historian', role: 'archivist', status: 'online', model: 'MiniMax-M2.1', lastHeartbeat: new Date().toISOString(), tasksCompleted: 45, tasksFailed: 0, avgResponseTime: 234 },
      { id: 'dreamer', name: 'Dreamer', role: 'visionary', status: 'idle', model: 'MiniMax-M2.1', lastHeartbeat: new Date(Date.now() - 300000).toISOString(), tasksCompleted: 23, tasksFailed: 0, avgResponseTime: 678 },
      { id: 'empath', name: 'Empath', role: 'diplomat', status: 'online', model: 'MiniMax-M2.1', lastHeartbeat: new Date().toISOString(), tasksCompleted: 56, tasksFailed: 1, avgResponseTime: 345 },
    ];
    
    metrics = [
      { name: 'CPU Usage', value: 45, unit: '%', trend: 'stable', status: 'good' },
      { name: 'Memory Usage', value: 62, unit: '%', trend: 'up', status: 'good' },
      { name: 'Redis Connections', value: 23, unit: '', trend: 'stable', status: 'good' },
      { name: 'A2A Messages/min', value: 156, unit: '', trend: 'up', status: 'good' },
      { name: 'Avg Response Time', value: 312, unit: 'ms', trend: 'down', status: 'good' },
      { name: 'Error Rate', value: 1.2, unit: '%', trend: 'down', status: 'good' },
    ];
    
    workflows = [
      { id: 'wf-1', name: 'Research & Report', description: 'Research a topic and generate a comprehensive report', category: 'research', steps: 4 },
      { id: 'wf-2', name: 'Code Review Pipeline', description: 'Analyze code quality, security, and suggest improvements', category: 'development', steps: 5 },
      { id: 'wf-3', name: 'Triad Deliberation', description: 'Run a triad voting process on a decision', category: 'governance', steps: 3 },
      { id: 'wf-4', name: 'Security Audit', description: 'Comprehensive security scan and vulnerability assessment', category: 'security', steps: 6 },
      { id: 'wf-5', name: 'Memory Consolidation', description: 'Consolidate and archive old memories', category: 'maintenance', steps: 4 },
    ];
    
    alerts = [
      { id: 'alert-1', severity: 'info', message: 'Dreamer agent has been idle for 5 minutes', timestamp: new Date().toISOString(), agent: 'dreamer', acknowledged: false },
      { id: 'alert-2', severity: 'warning', message: 'Memory usage approaching 70%', timestamp: new Date(Date.now() - 60000).toISOString(), acknowledged: false },
      { id: 'alert-3', severity: 'info', message: 'Weekly backup completed successfully', timestamp: new Date(Date.now() - 3600000).toISOString(), acknowledged: true },
    ];
    
    isLoading = false;
  }
  
  // Lifecycle
  onMount(() => {
    initializeMockData();
    // Refresh every 30 seconds
    refreshInterval = setInterval(fetchDashboardData, 30000);
  });
  
  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });
  
  // Helper functions
  function getStatusColor(status: string): string {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-500';
      case 'busy': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  }
  
  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'critical': return 'bg-red-200 text-red-900 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }
  
  function getMetricStatusColor(status: string): string {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }
  
  function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  }
  
  function acknowledgeAlert(alertId: string) {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }
  
  function selectAgent(agent: Agent) {
    selectedAgent = agent;
  }
</script>

<div class="clawpanel min-h-screen bg-gray-900 text-gray-100">
  <!-- Header -->
  <header class="bg-gray-800 border-b border-gray-700 px-6 py-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <h1 class="text-2xl font-bold text-blue-400">🧠 ClawPanel</h1>
        <span class="text-sm text-gray-400">Production Dashboard</span>
      </div>
      
      <div class="flex items-center space-x-6">
        <!-- System Health -->
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-400">System Health:</span>
          <span class="text-lg font-bold" class:text-green-400={systemHealth >= 80} class:text-yellow-400={systemHealth >= 50 && systemHealth < 80} class:text-red-400={systemHealth < 50}>
            {systemHealth}%
          </span>
        </div>
        
        <!-- Critical Alerts Badge -->
        {#if criticalAlerts > 0}
          <div class="flex items-center space-x-1 bg-red-900 px-3 py-1 rounded-full">
            <span class="text-red-300">⚠️</span>
            <span class="text-red-200 font-medium">{criticalAlerts} Critical</span>
          </div>
        {/if}
        
        <!-- Last Refresh -->
        <span class="text-xs text-gray-500">
          Last refresh: {lastRefresh.toLocaleTimeString()}
        </span>
      </div>
    </div>
    
    <!-- Navigation Tabs -->
    <nav class="mt-4 flex space-x-4">
      <button on:click={() => activeTab = 'overview'} class:bg-gray-700={activeTab === 'overview'} class="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-700">
        📊 Overview
      </button>
      <button on:click={() => activeTab = 'agents'} class:bg-gray-700={activeTab === 'agents'} class="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-700">
        🤖 Agents
      </button>
      <button on:click={() => activeTab = 'workflows'} class:bg-gray-700={activeTab === 'workflows'} class="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-700">
        ⚡ Workflows
      </button>
      <button on:click={() => activeTab = 'alerts'} class:bg-gray-700={activeTab === 'alerts'} class="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-700">
        🚨 Alerts {#if criticalAlerts > 0}({criticalAlerts}){/if}
      </button>
      <button on:click={() => activeTab = 'settings'} class:bg-gray-700={activeTab === 'settings'} class="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-700">
        ⚙️ Settings
      </button>
    </nav>
  </header>
  
  <!-- Main Content -->
  <main class="p-6">
    {#if isLoading}
      <div class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    {:else if activeTab === 'overview'}
      <!-- Overview Tab -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Agent Status Summary -->
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 class="text-lg font-semibold mb-4 flex items-center">
            <span class="mr-2">🤖</span> Agent Status
          </h2>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Online</span>
              <span class="text-green-400 font-bold">{onlineAgents}/{totalAgents}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2">
              <div class="bg-green-500 h-2 rounded-full" style="width: {(onlineAgents / totalAgents) * 100}%"></div>
            </div>
            
            <div class="mt-4 space-y-2">
              {#each agents.slice(0, 5) as agent}
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center space-x-2">
                    <div class="w-2 h-2 rounded-full {getStatusColor(agent.status)}"></div>
                    <span>{agent.name}</span>
                  </div>
                  <span class="text-gray-500">{agent.role}</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
        
        <!-- System Metrics -->
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 class="text-lg font-semibold mb-4 flex items-center">
            <span class="mr-2">📈</span> System Metrics
          </h2>
          <div class="space-y-4">
            {#each metrics as metric}
              <div class="flex items-center justify-between">
                <span class="text-gray-400">{metric.name}</span>
                <div class="flex items-center space-x-2">
                  <span class="font-mono {getMetricStatusColor(metric.status)}">{metric.value}{metric.unit}</span>
                  {#if metric.trend === 'up'}
                    <span class="text-green-400">↑</span>
                  {:else if metric.trend === 'down'}
                    <span class="text-red-400">↓</span>
                  {:else}
                    <span class="text-gray-500">→</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
        
        <!-- Recent Alerts -->
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 class="text-lg font-semibold mb-4 flex items-center">
            <span class="mr-2">🚨</span> Recent Alerts
          </h2>
          <div class="space-y-3">
            {#each alerts.slice(0, 4) as alert}
              <div class="p-3 rounded-lg border {getSeverityColor(alert.severity)}" transition:fade>
                <div class="flex items-start justify-between">
                  <p class="text-sm font-medium">{alert.message}</p>
                  {#if !alert.acknowledged}
                    <button on:click={() => acknowledgeAlert(alert.id)} class="text-xs hover:underline">Ack</button>
                  {/if}
                </div>
                <p class="text-xs mt-1 opacity-70">{formatTime(alert.timestamp)}</p>
              </div>
            {/each}
          </div>
        </div>
      </div>
      
      <!-- Agent Topology DAG -->
      <div class="mt-6 bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 class="text-lg font-semibold mb-4 flex items-center">
          <span class="mr-2">🔗</span> Agent Topology
        </h2>
        <div class="relative h-64 flex items-center justify-center">
          <!-- Simplified DAG visualization -->
          <div class="absolute top-4 left-1/2 transform -translate-x-1/2">
            <div class="bg-blue-600 rounded-lg px-4 py-2 text-center">
              <span class="font-medium">Steward</span>
              <span class="block text-xs text-blue-200">Orchestrator</span>
            </div>
          </div>
          
          <!-- Triad -->
          <div class="absolute top-24 left-1/4 transform -translate-x-1/2 flex space-x-8">
            <div class="bg-purple-600 rounded-lg px-4 py-2 text-center">
              <span class="font-medium">Alpha</span>
              <span class="block text-xs text-purple-200">Triad</span>
            </div>
            <div class="bg-purple-600 rounded-lg px-4 py-2 text-center">
              <span class="font-medium">Beta</span>
              <span class="block text-xs text-purple-200">Triad</span>
            </div>
            <div class="bg-purple-600 rounded-lg px-4 py-2 text-center">
              <span class="font-medium">Charlie</span>
              <span class="block text-xs text-purple-200">Triad</span>
            </div>
          </div>
          
          <!-- Workers -->
          <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
            <div class="bg-green-600 rounded-lg px-3 py-1 text-center text-sm">
              <span>Examiner</span>
            </div>
            <div class="bg-green-600 rounded-lg px-3 py-1 text-center text-sm">
              <span>Explorer</span>
            </div>
            <div class="bg-green-600 rounded-lg px-3 py-1 text-center text-sm">
              <span>Sentinel</span>
            </div>
            <div class="bg-green-600 rounded-lg px-3 py-1 text-center text-sm">
              <span>Historian</span>
            </div>
            <div class="bg-green-600 rounded-lg px-3 py-1 text-center text-sm">
              <span>Dreamer</span>
            </div>
            <div class="bg-green-600 rounded-lg px-3 py-1 text-center text-sm">
              <span>Empath</span>
            </div>
          </div>
          
          <!-- Connection lines (simplified) -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: -1;">
            <line x1="50%" y1="60" x2="25%" y2="120" stroke="#4B5563" stroke-width="2" stroke-dasharray="4"/>
            <line x1="50%" y1="60" x2="50%" y2="120" stroke="#4B5563" stroke-width="2" stroke-dasharray="4"/>
            <line x1="50%" y1="60" x2="75%" y2="120" stroke="#4B5563" stroke-width="2" stroke-dasharray="4"/>
            <line x1="50%" y1="180" x2="50%" y2="200" stroke="#4B5563" stroke-width="2" stroke-dasharray="4"/>
          </svg>
        </div>
      </div>
      
    {:else if activeTab === 'agents'}
      <!-- Agents Tab -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Agent List -->
        <div class="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 class="text-lg font-semibold mb-4">All Agents</h2>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-gray-400 text-sm border-b border-gray-700">
                  <th class="pb-3">Status</th>
                  <th class="pb-3">Name</th>
                  <th class="pb-3">Role</th>
                  <th class="pb-3">Model</th>
                  <th class="pb-3">Completed</th>
                  <th class="pb-3">Failed</th>
                  <th class="pb-3">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {#each agents as agent}
                  <tr class="border-b border-gray-700 hover:bg-gray-750 cursor-pointer" on:click={() => selectAgent(agent)}>
                    <td class="py-3">
                      <div class="w-3 h-3 rounded-full {getStatusColor(agent.status)}"></div>
                    </td>
                    <td class="py-3 font-medium">{agent.name}</td>
                    <td class="py-3 text-gray-400">{agent.role}</td>
                    <td class="py-3 text-gray-400 text-sm">{agent.model}</td>
                    <td class="py-3 text-green-400">{agent.tasksCompleted}</td>
                    <td class="py-3 text-red-400">{agent.tasksFailed}</td>
                    <td class="py-3 text-gray-400">{agent.avgResponseTime}ms</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Agent Details -->
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          {#if selectedAgent}
            <h2 class="text-lg font-semibold mb-4">{selectedAgent.name} Details</h2>
            <div class="space-y-4">
              <div class="flex items-center space-x-3">
                <div class="w-4 h-4 rounded-full {getStatusColor(selectedAgent.status)}"></div>
                <span class="text-xl font-medium">{selectedAgent.name}</span>
              </div>
              
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-400">Role:</span>
                  <span class="ml-2">{selectedAgent.role}</span>
                </div>
                <div>
                  <span class="text-gray-400">Model:</span>
                  <span class="ml-2">{selectedAgent.model}</span>
                </div>
                <div>
                  <span class="text-gray-400">Status:</span>
                  <span class="ml-2 capitalize">{selectedAgent.status}</span>
                </div>
                <div>
                  <span class="text-gray-400">Last Heartbeat:</span>
                  <span class="ml-2">{formatTime(selectedAgent.lastHeartbeat)}</span>
                </div>
              </div>
              
              <div class="pt-4 border-t border-gray-700">
                <h3 class="text-sm font-medium text-gray-400 mb-2">Performance</h3>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span>Tasks Completed</span>
                    <span class="text-green-400 font-mono">{selectedAgent.tasksCompleted}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Tasks Failed</span>
                    <span class="text-red-400 font-mono">{selectedAgent.tasksFailed}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Success Rate</span>
                    <span class="font-mono">{((selectedAgent.tasksCompleted / (selectedAgent.tasksCompleted + selectedAgent.tasksFailed)) * 100).toFixed(1)}%</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Avg Response Time</span>
                    <span class="font-mono">{selectedAgent.avgResponseTime}ms</span>
                  </div>
                </div>
              </div>
              
              <div class="pt-4 flex space-x-2">
                <button class="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Send Message
                </button>
                <button class="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  View Logs
                </button>
              </div>
            </div>
          {:else}
            <div class="text-center text-gray-500 py-8">
              <p>Select an agent to view details</p>
            </div>
          {/if}
        </div>
      </div>
      
    {:else if activeTab === 'workflows'}
      <!-- Workflows Tab -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold">Workflow Templates</h2>
          <button class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + Create Workflow
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each workflows as workflow}
            <div class="bg-gray-750 border border-gray-600 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer">
              <div class="flex items-start justify-between">
                <h3 class="font-medium">{workflow.name}</h3>
                <span class="text-xs bg-gray-600 px-2 py-1 rounded">{workflow.category}</span>
              </div>
              <p class="text-sm text-gray-400 mt-2">{workflow.description}</p>
              <div class="flex items-center justify-between mt-4 text-sm">
                <span class="text-gray-500">{workflow.steps} steps</span>
                <button class="text-blue-400 hover:text-blue-300">Run →</button>
              </div>
            </div>
          {/each}
        </div>
      </div>
      
    {:else if activeTab === 'alerts'}
      <!-- Alerts Tab -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold">All Alerts</h2>
          <button class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Acknowledge All
          </button>
        </div>
        
        <div class="space-y-3">
          {#each alerts as alert}
            <div class="p-4 rounded-lg border {getSeverityColor(alert.severity)} flex items-start justify-between" transition:slide>
              <div>
                <div class="flex items-center space-x-2">
                  <span class="font-medium">{alert.message}</span>
                  {#if alert.agent}
                    <span class="text-xs bg-gray-600 px-2 py-0.5 rounded">{alert.agent}</span>
                  {/if}
                </div>
                <p class="text-xs mt-1 opacity-70">{formatTime(alert.timestamp)}</p>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-xs uppercase font-medium">{alert.severity}</span>
                {#if !alert.acknowledged}
                  <button on:click={() => acknowledgeAlert(alert.id)} class="text-xs bg-gray-800 px-2 py-1 rounded hover:bg-gray-700">
                    Ack
                  </button>
                {:else}
                  <span class="text-xs text-green-600">✓ Acked</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
      
    {:else if activeTab === 'settings'}
      <!-- Settings Tab -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 class="text-lg font-semibold mb-6">Dashboard Settings</h2>
        
        <div class="space-y-6">
          <div>
            <h3 class="text-sm font-medium text-gray-400 mb-3">Refresh Interval</h3>
            <select class="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 w-full max-w-xs">
              <option value="10">10 seconds</option>
              <option value="30" selected>30 seconds</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
            </select>
          </div>
          
          <div>
            <h3 class="text-sm font-medium text-gray-400 mb-3">Alert Notifications</h3>
            <div class="space-y-2">
              <label class="flex items-center space-x-3">
                <input type="checkbox" checked class="rounded bg-gray-700 border-gray-600">
                <span>Show desktop notifications</span>
              </label>
              <label class="flex items-center space-x-3">
                <input type="checkbox" checked class="rounded bg-gray-700 border-gray-600">
                <span>Play sound for critical alerts</span>
              </label>
              <label class="flex items-center space-x-3">
                <input type="checkbox" class="rounded bg-gray-700 border-gray-600">
                <span>Send email notifications</span>
              </label>
            </div>
          </div>
          
          <div>
            <h3 class="text-sm font-medium text-gray-400 mb-3">Display</h3>
            <div class="space-y-2">
              <label class="flex items-center space-x-3">
                <input type="checkbox" checked class="rounded bg-gray-700 border-gray-600">
                <span>Show agent topology DAG</span>
              </label>
              <label class="flex items-center space-x-3">
                <input type="checkbox" checked class="rounded bg-gray-700 border-gray-600">
                <span>Compact agent list</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .bg-gray-750 {
    background-color: rgb(46, 50, 57);
  }
  
  .hover\:bg-gray-750:hover {
    background-color: rgb(46, 50, 57);
  }
</style>
