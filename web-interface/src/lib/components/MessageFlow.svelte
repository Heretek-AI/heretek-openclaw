<script lang="ts">
	import type { A2AMessage } from '../types';

	export let messages: A2AMessage[] = [];

	function formatTime(date: Date): string {
		return new Date(date).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function getAgentColor(agentName: string): string {
		const colors: Record<string, string> = {
			steward: 'bg-purple-600',
			alpha: 'bg-blue-600',
			beta: 'bg-blue-500',
			charlie: 'bg-blue-400',
			examiner: 'bg-red-600',
			explorer: 'bg-green-600',
			sentinel: 'bg-orange-600',
			coder: 'bg-pink-600',
			dreamer: 'bg-indigo-600',
			empath: 'bg-teal-600',
			historian: 'bg-amber-600'
		};
		return colors[agentName.toLowerCase()] || 'bg-gray-600';
	}
</script>

<div class="bg-collective-dark rounded-lg shadow-xl p-4">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-bold text-white">Agent Communication Flow</h3>
		<span class="text-xs text-gray-400">Real-time A2A Messages</span>
	</div>

	{#if messages.length === 0}
		<div class="text-center py-8 text-gray-500">
			<svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
			</svg>
			<p>No agent communications yet</p>
		</div>
	{:else}
		<div class="space-y-2 max-h-96 overflow-y-auto">
			{#each messages as message, index (index)}
				<div class="flex items-center gap-2 p-2 rounded bg-collective-dark/50 border border-gray-700">
					<!-- From Agent -->
					<span class="px-2 py-1 rounded text-xs text-white {getAgentColor(message.from)}">
						{message.from}
					</span>
					
					<!-- Arrow -->
					<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
					</svg>
					
					<!-- To Agent -->
					<span class="px-2 py-1 rounded text-xs text-white {getAgentColor(message.to)}">
						{message.to}
					</span>
					
					<!-- Message Preview -->
					<span class="flex-1 text-sm text-gray-300 truncate">
						{message.content}
					</span>
					
					<!-- Timestamp -->
					<span class="text-xs text-gray-500">
						{formatTime(message.timestamp)}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
