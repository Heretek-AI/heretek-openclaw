<script lang="ts">
	import type { Message } from '../types';

	export let messages: Message[] = [];

	function formatTime(date: Date): string {
		return new Date(date).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getMessageStyle(message: Message): string {
		switch (message.type) {
			case 'user':
				return 'bg-collective-primary/20 border-collective-primary/30 ml-8';
			case 'agent':
				return 'bg-collective-secondary/20 border-collective-secondary/30 mr-8';
			case 'system':
				return 'bg-red-900/20 border-red-500/30';
			default:
				return 'bg-gray-800/50 border-gray-700';
		}
	}

	function getSenderColor(message: Message): string {
		switch (message.type) {
			case 'user':
				return 'text-collective-primary';
			case 'agent':
				return 'text-collective-secondary';
			case 'system':
				return 'text-red-400';
			default:
				return 'text-gray-400';
		}
	}

	function getSenderLabel(message: Message): string {
		if (message.type === 'user') {
			return 'You';
		}
		if (message.type === 'system') {
			return 'System';
		}
		// Capitalize agent name
		return message.from.charAt(0).toUpperCase() + message.from.slice(1);
	}
</script>

<div class="space-y-4">
	{#each messages as message (message.id)}
		<div class="rounded-lg border {getMessageStyle(message)} p-4">
			<div class="flex items-center justify-between mb-2">
				<span class="font-medium {getSenderColor(message)}">
					{getSenderLabel(message)}
				</span>
				<span class="text-xs text-gray-500">
					{formatTime(message.timestamp)}
				</span>
			</div>
			<div class="text-gray-200 whitespace-pre-wrap prose prose-invert max-w-none">
				{message.content}
			</div>
		</div>
	{/each}
</div>
