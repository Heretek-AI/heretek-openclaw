<script lang="ts">
	import type { Agent } from '../types';

	export let agents: Agent[] = [];
	export let onSelect: (agent: Agent) => void = () => {};

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
</script>

<div class="bg-collective-dark rounded-lg shadow-xl p-4">
	<!-- Header with Stats -->
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-bold text-white">Agent Status</h3>
		<div class="flex gap-4 text-sm">
			<div class="flex items-center gap-1">
				<span class="w-2 h-2 rounded-full bg-green-500"></span>
				<span class="text-green-400">{onlineCount} Online</span>
			</div>
			<div class="flex items-center gap-1">
				<span class="w-2 h-2 rounded-full bg-yellow-500"></span>
				<span class="text-yellow-400">{busyCount} Busy</span>
			</div>
			<div class="flex items-center gap-1">
				<span class="w-2 h-2 rounded-full bg-gray-500"></span>
				<span class="text-gray-400">{offlineCount} Offline</span>
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
</div>
