<script lang="ts">
	import type { Agent, AgentActivity } from '../types';
	import { onMount, onDestroy } from 'svelte';

	export let agents: Agent[] = [];
	export let onSelect: (agent: Agent) => void = () => {};

	let pollInterval: NodeJS.Timeout;
	
	// Real-time activity tracking
	let recentActivity: AgentActivity[] = [];
	let ws: WebSocket | null = null;
	let isConnected = false;
	let reconnectTimer: NodeJS.Timeout | null = null;
	let reconnectAttempts = 0;
	const maxReconnectAttempts = 5;
	const reconnectInterval = 5000;
	
	onMount(async () => {
		// Initial load of agent status from API
		await refreshStatus();
		// Poll every 30 seconds for status updates
		pollInterval = setInterval(refreshStatus, 30000);
		
		// Connect to WebSocket for real-time activity
		connectActivityWS();
	});
	
	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
		disconnectActivityWS();
	});
	
	async function refreshStatus() {
		try {
			const response = await fetch('/api/agents');
			if (response.ok) {
				const data = await response.json();
				agents = data.agents || data;
			}
		} catch (error) {
			console.error('Failed to refresh agent status:', error);
		}
	}

	/**
	 * Connect to WebSocket for real-time agent activity updates
	 */
	function connectActivityWS() {
		if (ws?.readyState === WebSocket.OPEN) {
			return;
		}

		console.log('[AgentStatus] Connecting to WebSocket for activity updates...');
		
		// Determine WebSocket URL - try environment variable or default to localhost
		const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';
		
		try {
			ws = new WebSocket(wsUrl);

			ws.onopen = () => {
				console.log('[AgentStatus] WebSocket connected for activity updates');
				isConnected = true;
				reconnectAttempts = 0;
			};

			ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data);
					handleActivityMessage(message);
				} catch (error) {
					console.error('[AgentStatus] Failed to parse activity message:', error);
				}
			};

			ws.onclose = (event) => {
				console.log(`[AgentStatus] WebSocket closed (code: ${event.code})`);
				isConnected = false;
				scheduleReconnect();
			};

			ws.onerror = (error) => {
				console.error('[AgentStatus] WebSocket error:', error);
				isConnected = false;
			};
		} catch (error) {
			console.error('[AgentStatus] Failed to create WebSocket connection:', error);
			isConnected = false;
			scheduleReconnect();
		}
	}

	/**
	 * Handle incoming WebSocket activity messages
	 */
	function handleActivityMessage(message: any): void {
		switch (message.type) {
			case 'status':
				// Agent status update
				if (message.data) {
					const activity: AgentActivity = {
						agentId: message.data.agentId,
						agentName: message.data.agentName || message.data.agentId,
						channel: message.data.channel || 'status',
						action: `Status changed to ${message.data.status}`,
						timestamp: new Date(message.data.timestamp || Date.now()),
						type: 'heartbeat'
					};
					addActivity(activity);
					
					// Update agent status in the list
					const agent = agents.find(a => a.id === message.data.agentId);
					if (agent) {
						agent.status = message.data.status;
						agents = [...agents];
					}
				}
				break;

			case 'a2a':
				// A2A message activity
				if (message.data) {
					const activity: AgentActivity = {
						agentId: message.data.from,
						agentName: message.data.from,
						channel: 'a2a',
						action: `Message to ${message.data.to}`,
						timestamp: new Date(message.data.timestamp || Date.now()),
						type: 'message'
					};
					addActivity(activity);
				}
				break;

			case 'message':
				// General message activity
				if (message.data) {
					const activity: AgentActivity = {
						agentId: message.data.from || 'unknown',
						agentName: message.data.from || 'unknown',
						channel: message.data.channel || 'general',
						action: 'Sent message',
						timestamp: new Date(message.data.timestamp || Date.now()),
						type: 'message'
					};
					addActivity(activity);
				}
				break;

			case 'channel_activity':
			case 'agent_subscribed':
			case 'agent_unsubscribed':
				// Channel events
				if (message.data) {
					const activity: AgentActivity = {
						agentId: message.data.agentId || 'unknown',
						agentName: message.data.agentId || 'unknown',
						channel: message.data.channel || 'unknown',
						action: message.type.replace('_', ' '),
						timestamp: new Date(message.data.timestamp || Date.now()),
						type: 'subscription'
					};
					addActivity(activity);
				}
				break;
		}
	}

	/**
	 * Add activity to recent activity list
	 */
	function addActivity(activity: AgentActivity): void {
		console.log(`[AgentStatus] Activity: ${activity.agentName} - ${activity.action}`);
		recentActivity = [activity, ...recentActivity].slice(0, 20); // Keep last 20 activities
	}

	/**
	 * Disconnect from WebSocket
	 */
	function disconnectActivityWS() {
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		
		if (ws) {
			ws.close();
			ws = null;
		}
		
		isConnected = false;
	}

	/**
	 * Schedule reconnection attempt
	 */
	function scheduleReconnect() {
		if (reconnectAttempts >= maxReconnectAttempts) {
			console.error('[AgentStatus] Max reconnect attempts reached');
			return;
		}

		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
		}
		
		reconnectAttempts++;
		const delay = Math.min(reconnectInterval * reconnectAttempts, 30000);
		
		console.log(`[AgentStatus] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`);
		
		reconnectTimer = setTimeout(() => {
			connectActivityWS();
		}, delay);
	}

	$: onlineCount = agents.filter(a => a.status === 'online').length;
	$: busyCount = agents.filter(a => a.status === 'busy').length;
	$: offlineCount = agents.filter(a => a.status === 'offline').length;

	function getStatusColor(status: string): string {
		switch (status) {
			case 'online':
				return 'bg-green-500';
			case 'busy':
				return 'bg-yellow-500';
			default:
				return 'bg-gray-500';
		}
	}

	function getStatusText(status: string): string {
		switch (status) {
			case 'online':
				return 'text-green-400';
			case 'busy':
				return 'text-yellow-400';
			default:
				return 'text-gray-400';
		}
	}

	function getRoleIcon(role: string): string {
		switch (role) {
			case 'Orchestrator':
				return '🎯';
			case 'Triad':
				return '⚖️';
			case 'Interrogator':
				return '🔍';
			case 'Scout':
				return '🧭';
			case 'Guardian':
				return '🛡️';
			case 'Artisan':
				return '🔧';
			case 'Visionary':
				return '💭';
			case 'Diplomat':
				return '🤝';
			case 'Archivist':
				return '📚';
			default:
				return '🤖';
		}
	}

	// Format timestamp for activity
	function formatActivityTime(timestamp: Date): string {
		const now = new Date();
		const diff = now.getTime() - timestamp.getTime();
		if (diff < 60000) return 'Just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="bg-collective-dark rounded-lg shadow-xl p-4">
	<!-- Header with Stats -->
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-bold text-white flex items-center gap-2">
			<svg class="w-5 h-5 text-collective-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
			</svg>
			Agent Status
		</h3>
		<div class="flex items-center gap-2">
			<span class="w-2 h-2 rounded-full {isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}"></span>
			<div class="flex gap-3 text-sm">
				<div class="flex items-center gap-1">
					<span class="w-2 h-2 rounded-full bg-green-500"></span>
					<span class="text-green-400">{onlineCount}</span>
				</div>
				<div class="flex items-center gap-1">
					<span class="w-2 h-2 rounded-full bg-yellow-500"></span>
					<span class="text-yellow-400">{busyCount}</span>
				</div>
				<div class="flex items-center gap-1">
					<span class="w-2 h-2 rounded-full bg-gray-500"></span>
					<span class="text-gray-400">{offlineCount}</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Agent List -->
	<div class="space-y-2">
		{#each agents as agent (agent.id)}
			<button
				on:click={() => onSelect(agent)}
				class="w-full flex items-center justify-between p-3 rounded-lg bg-collective-dark/50 border border-gray-700 hover:border-collective-primary/50 transition-colors"
			>
				<div class="flex items-center gap-3">
					<span class="text-2xl">{getRoleIcon(agent.role)}</span>
					<div class="text-left">
						<div class="text-white font-medium">{agent.name}</div>
						<div class="text-xs text-gray-400">{agent.role}</div>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-xs {getStatusText(agent.status)} capitalize">{agent.status}</span>
					<span class="w-2 h-2 rounded-full {getStatusColor(agent.status)}"></span>
				</div>
			</button>
		{/each}
	</div>

	<!-- Real-time Activity Feed -->
	{#if recentActivity.length > 0}
		<div class="mt-4 pt-4 border-t border-gray-700/50">
			<h4 class="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
				</svg>
				Live Activity
			</h4>
			<div class="space-y-1 max-h-[120px] overflow-y-auto scrollbar-thin">
				{#each recentActivity.slice(0, 5) as activity}
					<div class="text-xs p-2 bg-collective-dark/30 rounded flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="px-1.5 py-0.5 bg-collective-primary/20 text-collective-primary rounded text-[10px]">
								{activity.channel}
							</span>
							<span class="text-gray-300">{activity.agentName}</span>
						</div>
						<span class="text-gray-500">{formatActivityTime(activity.timestamp)}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.scrollbar-thin::-webkit-scrollbar {
		width: 4px;
	}
	.scrollbar-thin::-webkit-scrollbar-track {
		background: transparent;
	}
	.scrollbar-thin::-webkit-scrollbar-thumb {
		background: rgba(156, 163, 175, 0.3);
		border-radius: 2px;
	}
</style>
