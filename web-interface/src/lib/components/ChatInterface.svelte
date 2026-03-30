<script lang="ts">
	import type { Agent, Message, ConnectionStatus, Channel } from '../types';
	import { onDestroy, onMount } from 'svelte';
	import MessageList from './MessageList.svelte';
	import AgentSelector from './AgentSelector.svelte';

	export let agents: Agent[] = [];
	export let selectedAgent: Agent | null = null;
	export let messages: Message[] = [];
	export let isLoading = false;
	export let selectedChannel: string | null = null;
	export let onChannelChange: (channel: string | null) => void = () => {};

	// Connection state
	let inputMessage = '';
	let ws: WebSocket | null = null;
	let isConnected = false;
	let connectionMethod: 'websocket' | 'http' | 'offline' = 'offline';
	let isAgentTyping = false;
	let pendingMessages: Map<string, { resolve: Function; reject: Function }> = new Map();
	
	// Conversation management
	let conversationId: string | null = null;
	let conversationHistory: Message[] = [];

	// Generate UUID compatible with non-secure contexts (HTTP)
	function generateUUID(): string {
		if (typeof crypto !== 'undefined' && crypto.randomUUID) {
			return crypto.randomUUID();
		}
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			const r = Math.random() * 16 | 0;
			const v = c === 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}

	// Connect to WebSocket with automatic reconnection
	function connectWebSocket() {
		if (ws?.readyState === WebSocket.OPEN) return;
		
		const wsUrl = typeof window !== 'undefined' 
			? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + (window.location.hostname || 'localhost') + ':3001'
			: 'ws://localhost:3001';
		
		try {
			ws = new WebSocket(wsUrl);

			ws.onopen = () => {
				console.log('[ChatInterface] WebSocket connected');
				isConnected = true;
				connectionMethod = 'websocket';
				
				// Subscribe to agent responses for selected agent
				if (selectedAgent) {
					if (ws) { ws.send(JSON.stringify({
						type: 'subscribe',
						agent: selectedAgent.id
					}));
				}
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					
					if (data.type === 'a2a' && data.data) {
						// Check if this message is for the current conversation
						if (data.conversationId && data.conversationId !== conversationId) {
							return; // Ignore messages for other conversations
						}
						
						// Agent response received via WebSocket
						const agentMessage: Message = {
							id: data.messageId || generateUUID(),
							from: data.data.from || selectedAgent?.id || 'agent',
							to: 'user',
							content: data.data.content || data.data.message,
							timestamp: new Date(data.timestamp || data.data.timestamp),
							type: 'agent'
						};
						
						messages = [...messages, agentMessage];
						conversationHistory = [...conversationHistory, agentMessage];
						isAgentTyping = false;
						isLoading = false;
						
						// Resolve pending promise if exists
						const pending = pendingMessages.get(data.messageId);
						if (pending) {
							pending.resolve(true);
							pendingMessages.delete(data.messageId);
						}
					} else if (data.type === 'typing') {
						// Agent typing indicator
						isAgentTyping = data.agent === selectedAgent?.id;
					} else if (data.type === 'ack') {
						// Handle acknowledgment for sent message
						const pending = pendingMessages.get(data.messageId);
						if (pending) {
							pending.resolve(data.success);
							pendingMessages.delete(data.messageId);
						}
					} else if (data.type === 'error') {
						console.error('[ChatInterface] WebSocket error:', data.message);
						isLoading = false;
						isAgentTyping = false;
					}
				} catch (error) {
					console.warn('[ChatInterface] Non-JSON message:', error);
				}
			};

			ws.onclose = (event) => {
				console.log('[ChatInterface] WebSocket disconnected');
				isConnected = false;
				connectionMethod = 'http';
				
				// Attempt reconnection after delay
				if (!event.wasClean) {
					setTimeout(() => {
						if (!isConnected) {
							connectWebSocket();
						}
					}, 3000);
				}
			};

			ws.onerror = (error) => {
				console.error('[ChatInterface] WebSocket error:', error);
				connectionMethod = 'http';
			};
		} catch (error) {
			console.warn('[ChatInterface] WebSocket connection failed:', error);
			connectionMethod = 'http';
		}
	}

	function handleAgentSelect(agent: Agent) {
		selectedAgent = agent;
		
		// Create new conversation for this agent
		conversationId = generateUUID();
		conversationHistory = [];
		
		// Reconnect WebSocket when agent is selected
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			connectWebSocket();
		} else {
			// Subscribe to this agent
			if (ws) { ws.send(JSON.stringify({
				type: 'subscribe',
				agent: agent.id
			}));
		}
	}

	async function sendMessage() {
		if (!inputMessage.trim() || !selectedAgent) return;

		const messageText = inputMessage.trim();
		inputMessage = '';

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
		conversationHistory = [...conversationHistory, userMessage];
		isLoading = true;
		isAgentTyping = true;

		// Try WebSocket first, fall back to HTTP
		if (ws && ws.readyState === WebSocket.OPEN) {
			const messageId = generateUUID();
			
			// Send via WebSocket with channel info
			if (ws) { ws.send(JSON.stringify({
				type: 'a2a',
				action: 'send',
				messageId,
				conversationId,
				channel: selectedChannel,
				from: 'user',
				to: selectedAgent.id,
				content: messageText,
				timestamp: new Date().toISOString()
			}));

			// Wait for response with timeout
			try {
				const response = await new Promise<boolean>((resolve, reject) => {
					const timer = setTimeout(() => reject(new Error('Timeout')), 30000);
					pendingMessages.set(messageId, { 
						resolve: (success: boolean) => { 
							clearTimeout(timer); 
							resolve(success); 
						}, 
						reject 
					});
				});
				
				// Response will come via onmessage handler
				return;
			} catch (error) {
				console.warn('[ChatInterface] WebSocket failed, falling back to HTTP');
				isAgentTyping = false;
			}
		}

		// Fallback to HTTP
		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					agent: selectedAgent.id,
					message: messageText,
					conversationId,
					channel: selectedChannel,
					fromUser: 'user'
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
				conversationHistory = [...conversationHistory, agentMessage];
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
			connectionMethod = 'offline';
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
			isAgentTyping = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}

	// Clear conversation
	function clearConversation() {
		if (conversationId) {
			fetch(`/api/chat?conversationId=${conversationId}`, {
				method: 'DELETE'
			}).catch(() => {});
		}
		messages = [];
		conversationHistory = [];
		conversationId = generateUUID();
	}

	// Initialize WebSocket on mount
	onMount(() => {
		connectWebSocket();
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (ws) {
			ws.close();
			ws = null;
		}
	});

	// Connection status helper
	$: connectionStatus = {
		connected: isConnected || connectionMethod === 'http',
		method: connectionMethod
	};
</script>

<div class="flex flex-col h-full bg-collective-dark rounded-lg shadow-xl">
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-collective-primary/30">
		<h2 class="text-xl font-bold text-white">Chat with The Collective</h2>
		{#if selectedAgent}
			<div class="flex items-center gap-3">
				<!-- Connection status -->
				<span class="flex items-center gap-1">
					<span class="w-2 h-2 rounded-full {
						connectionMethod === 'websocket' ? 'bg-green-500' : 
						connectionMethod === 'http' ? 'bg-yellow-500' : 'bg-red-500'
					}"></span>
					<span class="text-xs text-gray-400 uppercase">{connectionMethod}</span>
				</span>
				<span class="text-sm text-gray-300">Talking to {selectedAgent.name}</span>
				{#if selectedChannel}
					<span class="px-2 py-0.5 text-xs bg-collective-primary/20 text-collective-primary rounded">
						{selectedChannel}
					</span>
				{/if}
				
				<!-- Clear conversation -->
				<button 
					on:click={clearConversation}
					class="p-1 text-gray-400 hover:text-white transition-colors"
					title="Clear conversation"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
					</svg>
				</button>
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
				{#if selectedChannel}
					<p class="text-sm mt-2 text-collective-primary">Channel: {selectedChannel}</p>
				{/if}
			</div>
		{:else}
			<MessageList {messages} />
		{/if}
		
		<!-- Agent typing indicator -->
		{#if isAgentTyping && selectedAgent}
			<div class="flex items-center gap-2 mt-4 text-gray-400">
				<div class="flex gap-1">
					<span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
					<span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
					<span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
				</div>
				<span class="text-sm">{selectedAgent.name} is thinking...</span>
			</div>
		{/if}
	</div>

	<!-- Input Area -->
	<div class="p-4 border-t border-collective-primary/30">
		<div class="flex gap-2">
			<textarea
				bind:value={inputMessage}
				on:keydown={handleKeydown}
				placeholder={selectedAgent ? `Message ${selectedAgent.name}${selectedChannel ? ` on ${selectedChannel}` : ''}...` : 'Select an agent first...'}
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
		<div class="text-xs text-gray-500 mt-2">
			Press Enter to send, Shift+Enter for new line
			{#if selectedChannel}
				<span class="ml-2 text-collective-primary">• Channel: {selectedChannel}</span>
			{/if}
		</div>
	</div>
</div>
