<script lang="ts">
	import type { ThreadMessage, Agent } from '../types';

	export let threadId: string = '';
	export let participants: Agent[] = [];
	export let messages: ThreadMessage[] = [];
	export let selectedAgent: string | null = null;
	export let onAgentSelect: (agentId: string) => void = () => {};

	let expanded = true;

	// Generate unique ID
	function generateId(): string {
		return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	// Get agent color based on ID
	function getAgentColor(agentId: string): string {
		const colors = [
			'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
			'bg-pink-500', 'bg-cyan-500', 'bg-yellow-500', 'bg-red-500'
		];
		let hash = 0;
		for (let i = 0; i < agentId.length; i++) {
			hash = ((hash << 5) - hash) + agentId.charCodeAt(i);
			hash = hash & hash;
		}
		return colors[Math.abs(hash) % colors.length];
	}

	// Get message icon based on type
	function getMessageIcon(type: string): string {
		switch (type) {
			case 'query': return '❓';
			case 'response': return '💡';
			case 'action': return '⚡';
			case 'broadcast': return '📢';
			default: return '💬';
		}
	}

	// Format timestamp
	function formatTime(timestamp: Date | string): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	// Get agent initial
	function getAgentInitial(agentId: string): string {
		return agentId.substring(0, 2).toUpperCase();
	}

	// Group messages by agent for visualization
	$: messagesByAgent = messages.reduce((acc, msg) => {
		if (!acc[msg.from]) {
			acc[msg.from] = [];
		}
		acc[msg.from].push(msg);
		return acc;
	}, {} as Record<string, ThreadMessage[]>);

	// Count messages per agent
	$: messageCount = messages.length;
	$: participantCount = participants.length;
</script>

<div class="bg-collective-dark rounded-lg shadow-xl overflow-hidden">
	<!-- Thread Header -->
	<button
		on:click={() => expanded = !expanded}
		class="w-full p-4 flex items-center justify-between bg-gradient-to-r from-collective-primary/10 to-transparent hover:from-collective-primary/20 transition-colors"
	>
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-full bg-collective-primary/20 flex items-center justify-center">
				<span class="text-collective-primary font-bold">{participantCount}</span>
			</div>
			<div class="text-left">
				<div class="text-white font-medium flex items-center gap-2">
					Multi-Agent Thread
					{#if threadId}
						<span class="text-xs text-gray-500 font-mono">#{threadId.slice(-6)}</span>
					{/if}
				</div>
				<div class="text-xs text-gray-400">
					{participantCount} agents • {messageCount} messages
				</div>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<!-- Participant avatars -->
			<div class="flex -space-x-2">
				{#each participants.slice(0, 5) as agent}
					<div
						class="w-8 h-8 rounded-full border-2 border-collective-dark {getAgentColor(agent.id)} flex items-center justify-center text-white text-xs font-bold"
						title={agent.name}
					>
						{getAgentInitial(agent.id)}
					</div>
				{/each}
				{#if participants.length > 5}
					<div class="w-8 h-8 rounded-full border-2 border-collective-dark bg-gray-700 flex items-center justify-center text-white text-xs">
						+{participants.length - 5}
					</div>
				{/if}
			</div>
			<!-- Expand/collapse icon -->
			<svg
				class="w-5 h-5 text-gray-400 transition-transform {expanded ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
			</svg>
		</div>
	</button>

	<!-- Thread Content -->
	{#if expanded}
		<div class="border-t border-gray-700/50">
			<!-- Agent Filters -->
			<div class="p-3 border-b border-gray-800/50 flex items-center gap-2 overflow-x-auto">
				<span class="text-xs text-gray-500 whitespace-nowrap">Filter:</span>
				{#each participants as agent}
					<button
						on:click={() => onAgentSelect(agent.id)}
						class="px-2 py-1 rounded text-xs whitespace-nowrap transition-colors
							{selectedAgent === agent.id 
								? 'bg-collective-primary text-white' 
								: 'bg-collective-dark/50 text-gray-300 hover:bg-collective-primary/30'}"
					>
						{agent.name}
						{#if messagesByAgent[agent.id]}
							<span class="ml-1 opacity-60">({messagesByAgent[agent.id].length})</span>
						{/if}
					</button>
				{/each}
			</div>

			<!-- Message Thread Visualization -->
			<div class="p-4 max-h-[400px] overflow-y-auto">
				{#if messages.length === 0}
					<div class="text-center py-8 text-gray-400">
						<svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path>
						</svg>
						<p class="text-sm">No messages in thread</p>
					</div>
				{:else}
					<!-- Thread timeline -->
					<div class="relative">
						<!-- Vertical timeline line -->
						<div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-collective-primary via-collective-secondary to-transparent"></div>
						
						<!-- Messages -->
						<div class="space-y-4 pl-10">
							{#each messages as message, index (message.id || index)}
								{@const isFiltered = selectedAgent && message.from !== selectedAgent}
								<div class="relative {isFiltered ? 'opacity-30' : ''}">
									<!-- Timeline dot -->
									<div class="absolute -left-6 top-2 w-4 h-4 rounded-full {getAgentColor(message.from)} border-2 border-collective-dark shadow-lg flex items-center justify-center">
										<span class="text-[8px] text-white font-bold">{getAgentInitial(message.from)}</span>
									</div>
									
									<!-- Message bubble -->
									<div class="p-3 rounded-lg bg-collective-dark/50 border border-gray-800/50 hover:border-collective-primary/30 transition-colors">
										<div class="flex items-start justify-between mb-1">
											<div class="flex items-center gap-2">
												<span class="text-xs font-medium text-white">{message.from}</span>
												{#if message.to}
													<svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
													</svg>
													<span class="text-xs text-gray-400">{message.to}</span>
												{/if}
											</div>
											<div class="flex items-center gap-2">
												<span class="text-xs">{getMessageIcon(message.type)}</span>
												<span class="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
											</div>
										</div>
										<p class="text-sm text-gray-300 leading-relaxed">
											{message.content}
										</p>
										{#if message.metadata?.tool}
											<div class="mt-2 flex items-center gap-1 text-xs text-collective-primary">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
												</svg>
												{message.metadata.tool}
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
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
