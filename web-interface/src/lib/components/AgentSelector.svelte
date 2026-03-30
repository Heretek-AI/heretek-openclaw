<script lang="ts">
	import type { Agent } from '../types';

	export let agents: Agent[] = [];
	export let selectedAgent: Agent | null = null;
	export let onSelect: (agent: Agent) => void = () => {};

	// Debug: log when agents arrive
	$: if (agents.length > 0) {
		console.log('[AgentSelector] Received agents:', agents.map(a => `${a.name} (${a.status})`).join(', '));
	}

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

	function getRoleColor(role: string): string {
		switch (role) {
			case 'Orchestrator':
				return 'bg-purple-600';
			case 'Triad':
				return 'bg-blue-600';
			case 'Interrogator':
				return 'bg-red-600';
			case 'Scout':
				return 'bg-green-600';
			case 'Guardian':
				return 'bg-orange-600';
			case 'Artisan':
				return 'bg-pink-600';
			case 'Visionary':
				return 'bg-indigo-600';
			case 'Diplomat':
				return 'bg-teal-600';
			case 'Archivist':
				return 'bg-amber-600';
			default:
				return 'bg-gray-600';
		}
	}
</script>

<div class="w-full">
	<span class="block text-sm font-medium text-gray-300 mb-2">Select Agent</span>
	<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
		{#each agents as agent (agent.id)}
			<button
				on:click={() => onSelect(agent)}
				class="relative p-3 rounded-lg border transition-all duration-200 {selectedAgent?.id === agent.id
					? 'border-collective-primary bg-collective-primary/20'
					: 'border-gray-700 bg-collective-dark/50 hover:border-collective-primary/50 hover:bg-collective-dark/80'}"
			>
				<!-- Status Indicator -->
				<div class="absolute top-2 right-2">
					<span class="w-2 h-2 rounded-full {getStatusColor(agent.status)} block"></span>
				</div>

				<!-- Agent Info -->
				<div class="text-center">
					<div class="text-white font-medium text-sm">{agent.name}</div>
					<div class="mt-1">
						<span class="text-xs px-2 py-0.5 rounded-full {getRoleColor(agent.role)} text-white">
							{agent.role}
						</span>
					</div>
				</div>
			</button>
		{/each}
	</div>
</div>
