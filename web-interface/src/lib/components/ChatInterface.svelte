<script lang="ts">
	import type { Agent, Message } from '../types';
	import MessageList from './MessageList.svelte';
	import AgentSelector from './AgentSelector.svelte';

	export let agents: Agent[] = [];
	export let selectedAgent: Agent | null = null;
	export let messages: Message[] = [];
	export let isLoading = false;

	// Debug: log when agents are received
	$: if (agents.length > 0) {
		console.log('[ChatInterface] Received agents:', agents.length);
	}

	let inputMessage = '';

	function handleAgentSelect(agent: Agent) {
		selectedAgent = agent;
	}

	async function sendMessage() {
		if (!inputMessage.trim() || !selectedAgent) return;

		const messageText = inputMessage.trim();
		inputMessage = '';

		// Generate UUID compatible with all environments
		function generateUUID(): string {
			if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
				return crypto.randomUUID();
			}
			// Fallback for older browsers or Node.js
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				const r = Math.random() * 16 | 0;
				const v = c === 'x' ? r : (r & 0x3 | 0x8);
				return v.toString(16);
			});
		}

		// Add user message to list
		const userMessage: Message = {
			id: generateUUID(),
			from: 'user',
			to: selectedAgent.id,
			content: messageText,
			timestamp: new Date(),
			type: 'user'
		};
		messages = [...messages, userMessage];
		isLoading = true;

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					agent: selectedAgent.id,
					message: messageText
				})
			});

			const data = await response.json();

			if (data.success) {
				const agentMessage: Message = {
					id: generateUUID(),
					from: selectedAgent.id,
					to: 'user',
					content: data.response,
					timestamp: new Date(),
					type: 'agent'
				};
				messages = [...messages, agentMessage];
			} else {
				const errorMessage: Message = {
					id: generateUUID(),
					from: 'system',
					to: 'user',
					content: `Error: ${data.error}`,
					timestamp: new Date(),
					type: 'system'
				};
				messages = [...messages, errorMessage];
			}
		} catch (error) {
			const errorMessage: Message = {
				id: generateUUID(),
				from: 'system',
				to: 'user',
				content: `Failed to send message: ${error}`,
				timestamp: new Date(),
				type: 'system'
			};
			messages = [...messages, errorMessage];
		} finally {
			isLoading = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}
</script>

<div class="flex flex-col h-full bg-collective-dark rounded-lg shadow-xl">
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-collective-primary/30">
		<h2 class="text-xl font-bold text-white">Chat with The Collective</h2>
		{#if selectedAgent}
			<div class="flex items-center gap-2">
				<span class="w-2 h-2 rounded-full bg-green-500"></span>
				<span class="text-sm text-gray-300">Talking to {selectedAgent.name}</span>
			</div>
		{/if}
	</div>

	<!-- Agent Selector -->
	<div class="p-4 border-b border-collective-primary/30">
		<AgentSelector {agents} {selectedAgent} onSelect={handleAgentSelect} />
	</div>

	<!-- Messages Area -->
	<div class="flex-1 overflow-y-auto p-4">
		{#if messages.length === 0}
			<div class="flex flex-col items-center justify-center h-full text-gray-400">
				<svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
				</svg>
				<p>Select an agent and start a conversation</p>
			</div>
		{:else}
			<MessageList {messages} />
		{/if}
	</div>

	<!-- Input Area -->
	<div class="p-4 border-t border-collective-primary/30">
		<div class="flex gap-2">
			<textarea
				bind:value={inputMessage}
				on:keydown={handleKeydown}
				placeholder={selectedAgent ? `Message ${selectedAgent.name}...` : 'Select an agent first...'}
				disabled={!selectedAgent || isLoading}
				rows="1"
				class="flex-1 bg-collective-dark/50 border border-collective-primary/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-collective-primary resize-none disabled:opacity-50"
			></textarea>
			<button
				on:click={sendMessage}
				disabled={!selectedAgent || !inputMessage.trim() || isLoading}
				class="px-6 py-2 bg-collective-primary text-white rounded-lg hover:bg-collective-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
			>
				{#if isLoading}
					<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
					</svg>
				{/if}
				Send
			</button>
		</div>
	</div>
</div>
