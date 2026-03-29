<script lang="ts">
	import { onMount } from 'svelte';
	import ChatInterface from '$lib/components/ChatInterface.svelte';
	import AgentStatus from '$lib/components/AgentStatus.svelte';
	import MessageFlow from '$lib/components/MessageFlow.svelte';
	import type { Agent, Message, A2AMessage } from '$lib/types';

	let agents: Agent[] = [];
	let messages: Message[] = [];
	let a2aMessages: A2AMessage[] = [];
	let selectedAgent: Agent | null = null;
	let isLoading = true;
	let error = '';

	// Fetch agents on mount
	onMount(async () => {
		await fetchAgents();
		// Set up periodic refresh
		const interval = setInterval(fetchAgents, 30000); // Refresh every 30 seconds
		return () => clearInterval(interval);
	});

	async function fetchAgents() {
		try {
			const response = await fetch('/api/agents');
			const data = await response.json();
			
			if (data.success) {
				agents = data.agents;
				error = '';
			} else {
				error = data.error || 'Failed to fetch agents';
			}
		} catch (e) {
			error = 'Failed to connect to server';
			console.error('Failed to fetch agents:', e);
		} finally {
			isLoading = false;
		}
	}

	function handleAgentSelect(agent: Agent) {
		selectedAgent = agent;
	}
</script>

<svelte:head>
	<title>The Collective - Agent Interface</title>
	<meta name="description" content="Interact with The Collective's 11 agents through a unified web interface" />
</svelte:head>

<div class="min-h-screen bg-collective-dark">
	<!-- Header -->
	<header class="border-b border-collective-primary/30 bg-collective-dark/80 backdrop-blur-sm sticky top-0 z-50">
		<div class="container mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-lg bg-gradient-to-br from-collective-primary to-collective-secondary flex items-center justify-center">
						<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
						</svg>
					</div>
					<div>
						<h1 class="text-xl font-bold text-white">The Collective</h1>
						<p class="text-xs text-gray-400">Agent Interface</p>
					</div>
				</div>
				
				<div class="flex items-center gap-4">
					{#if error}
						<span class="text-red-400 text-sm">{error}</span>
					{/if}
					<button
						on:click={fetchAgents}
						disabled={isLoading}
						class="px-3 py-1 text-sm bg-collective-primary/20 text-collective-primary rounded hover:bg-collective-primary/30 transition-colors disabled:opacity-50"
					>
						{#if isLoading}
							Refreshing...
						{:else}
							Refresh
						{/if}
					</button>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="container mx-auto px-4 py-6">
		{#if isLoading}
			<div class="flex items-center justify-center h-64">
				<div class="text-center">
					<svg class="animate-spin h-12 w-12 mx-auto mb-4 text-collective-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<p class="text-gray-400">Loading agents...</p>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
				<!-- Left Sidebar - Agent Status -->
				<div class="lg:col-span-1 order-2 lg:order-1">
					<AgentStatus {agents} onSelect={handleAgentSelect} />
				</div>

				<!-- Center - Chat Interface -->
				<div class="lg:col-span-2 order-1 lg:order-2">
					<div class="h-[600px]">
						<ChatInterface
							{agents}
							{selectedAgent}
							{messages}
							bind:isLoading
						/>
					</div>
				</div>

				<!-- Right Sidebar - Message Flow -->
				<div class="lg:col-span-1 order-3">
					<MessageFlow {a2aMessages} />
				</div>
			</div>
		{/if}
	</main>

	<!-- Footer -->
	<footer class="border-t border-collective-primary/30 mt-8">
		<div class="container mx-auto px-4 py-4">
			<div class="flex items-center justify-between text-sm text-gray-500">
				<span>The Collective Web Interface v0.1.0</span>
				<span>LiteLLM Gateway: http://localhost:4000</span>
			</div>
		</div>
	</footer>
</div>
