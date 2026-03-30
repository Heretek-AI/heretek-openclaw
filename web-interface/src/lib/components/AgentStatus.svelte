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
	
	onMount(async () => {
		// Initial load of agent status from API
		await refreshStatus();
		// Poll every 30 seconds
		pollInterval = setInterval(refreshStatus, 30000);
		
		// Connect to channel WS for real-time activity
		connectActivityWS();
	});
	
	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
		if (ws) ws.close();
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

	// Connect to channel WebSocket for activity updates
	function connectActivityWS() {
		const wsUrl = typeof window !== 'undefined'
			? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + (window.location.hostname || 'localhost') + ':3002/channels'
			: 'ws://localhost:3002/channels';
		
		try {
			ws = new WebSocket(wsUrl);
			ws.onopen = () => {
				isConnected = true;
				console.log('[AgentStatus] Activity WS connected');
			};
			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					if (data.type === 'channel_message' || data.type === 'channel_activity') {
						if (data.message) {
							const activity: AgentActivity = {
								agentId: data.message.from || 'unknown',
								agentName: data.message.from || 'Unknown',
								channel: data.channel,
								action: data.message.content?.substring(0, 30) || 'Activity',
								timestamp: new Date(data.timestamp),
								type: 'message'
							};
							recentActivity = [activity, ...recentActivity.slice(0, 19)];
						}
					} else if (data.type === 'agent_subscribed') {
						const activity: AgentActivity = {
							agentId: data.agentId,
							agentName: data.agentId,
							channel: data.channel,
							action: 'Joined channel',
							timestamp: new Date(data.timestamp),
							type: 'subscription'
						};
						recentActivity = [activity, ...recentActivity.slice(0, 19)];
					}
				} catch (e) {
					// Ignore non-JSON messages
				}
			};
			ws.onclose = () => {
				isConnected = false;
				setTimeout(connectActivityWS, 5000);
			};
		} catch (error) {
			console.warn('[AgentStatus] Activity WS connection failed');
		}
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
