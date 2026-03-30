<script lang="ts">
	import type { A2AMessage } from '../types';
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';

	export let messages: A2AMessage[] = [];

	const dispatch = createEventDispatcher();
	
	// WebSocket configuration
	let ws: WebSocket | null = null;
	let reconnectTimer: NodeJS.Timeout | null = null;
	let reconnectAttempts = 0;
	const maxReconnectAttempts = 10;
	const reconnectInterval = 5000;
	
	// Connection status
	let isConnected = false;
	let connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
	
	// Message status tracking
	let messageStatuses: Map<string, 'sending' | 'sent' | 'delivered' | 'read'> = new Map();
	
	// Typing indicators
	let typingAgents: Set<string> = new Set();

	onMount(() => {
		connectWebSocket();
	});

	onDestroy(() => {
		disconnectWebSocket();
	});

	function connectWebSocket() {
		if (ws?.readyState === WebSocket.OPEN) {
			return;
		}

		connectionStatus = 'connecting';
		console.log('[MessageFlow] Connecting to WebSocket...');

		try {
			// Use environment variable for WebSocket URL, fallback to localhost:3001
			const wsUrl = typeof window !== 'undefined' 
				? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + (window.location.hostname || 'localhost') + ':3001'
				: 'ws://localhost:3001';
			
			ws = new WebSocket(wsUrl);

			ws.onopen = () => {
				console.log('[MessageFlow] WebSocket connected');
				isConnected = true;
				connectionStatus = 'connected';
				reconnectAttempts = 0;
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					
					// Handle different message types
					if (data.type === 'a2a' && data.data) {
						// Add new A2A message to the list
						const newMessage: A2AMessage = {
							from: data.data.from || data.data.fromAgent,
							to: data.data.to || data.data.toAgent,
							content: data.data.content || data.data.message,
							timestamp: new Date(data.timestamp || data.data.timestamp)
						};
						
						// Add to beginning of array (newest first)
						messages = [newMessage, ...messages];
						
						// Limit to 100 messages
						if (messages.length > 100) {
							messages = messages.slice(0, 100);
						}
						
						// Dispatch message event for external handlers
						dispatch('message', newMessage);
					} else if (data.type === 'ack') {
						// Handle acknowledgment
						if (data.success) {
							messageStatuses.set(data.messageId, 'delivered');
							messageStatuses = messageStatuses; // Trigger reactivity
						}
						dispatch('ack', { messageId: data.messageId, success: data.success });
					} else if (data.type === 'typing') {
						// Handle typing indicator
						if (data.agent) {
							if (data.isTyping) {
								typingAgents.add(data.agent);
							} else {
								typingAgents.delete(data.agent);
							}
							typingAgents = typingAgents; // Trigger reactivity
							dispatch('typing', { agent: data.agent, isTyping: data.isTyping });
						}
					} else if (data.type === 'connected') {
						console.log('[MessageFlow] Received connection confirmation');
					}
				} catch (error) {
					// Non-JSON message, ignore
					console.warn('[MessageFlow] Non-JSON message received');
				}
			};

			ws.onclose = (event) => {
				console.log(`[MessageFlow] WebSocket disconnected (code: ${event.code})`);
				isConnected = false;
				connectionStatus = 'disconnected';
				scheduleReconnect();
			};

			ws.onerror = (error) => {
				console.error('[MessageFlow] WebSocket error:', error);
				isConnected = false;
				connectionStatus = 'disconnected';
			};
		} catch (error) {
			console.error('[MessageFlow] Failed to create WebSocket:', error);
			scheduleReconnect();
		}
	}

	function disconnectWebSocket() {
		clearReconnectTimer();
		
		if (ws) {
			ws.close();
			ws = null;
		}
		
		isConnected = false;
		connectionStatus = 'disconnected';
	}

	function scheduleReconnect() {
		if (reconnectAttempts >= maxReconnectAttempts) {
			console.error('[MessageFlow] Max reconnect attempts reached');
			return;
		}

		clearReconnectTimer();
		reconnectAttempts++;
		
		// Exponential backoff, max 30 seconds
		const delay = Math.min(reconnectInterval * reconnectAttempts, 30000);
		console.log(`[MessageFlow] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`);
		
		reconnectTimer = setTimeout(() => {
			connectWebSocket();
		}, delay);
	}

	function clearReconnectTimer() {
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
	}

	/**
	 * Send a message through WebSocket to an agent
	 */
	export function sendMessage(toAgent: string, content: string, fromAgent: string = 'user'): string | null {
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			console.warn('[MessageFlow] Cannot send - not connected');
			return null;
		}

		const messageId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			const r = Math.random() * 16 | 0;
			const v = c === 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});

		const message = {
			type: 'a2a',
			action: 'send',
			messageId,
			from: fromAgent,
			to: toAgent,
			content,
			timestamp: new Date().toISOString()
		};

		try {
			ws.send(JSON.stringify(message));
			messageStatuses.set(messageId, 'sending');
			messageStatuses = messageStatuses;
			console.log(`[MessageFlow] Sent message to ${toAgent}`);
			return messageId;
		} catch (error) {
			console.error('[MessageFlow] Failed to send message:', error);
			return null;
		}
	}

	/**
	 * Send typing indicator
	 */
	export function sendTyping(isTyping: boolean): void {
		if (!ws || ws.readyState !== WebSocket.OPEN) return;

		const message = {
			type: 'typing',
			isTyping
		};

		try {
			ws.send(JSON.stringify(message));
		} catch (error) {
			console.warn('[MessageFlow] Failed to send typing indicator');
		}
	}

	/**
	 * Get message status
	 */
	export function getMessageStatus(messageId: string): 'sending' | 'sent' | 'delivered' | 'read' | undefined {
		return messageStatuses.get(messageId);
	}

	/**
	 * Check if any agent is typing
	 */
	export function isAnyAgentTyping(): boolean {
		return typingAgents.size > 0;
	}

	/**
	 * Get typing agents
	 */
	export function getTypingAgents(): string[] {
		return Array.from(typingAgents);
	}

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

	function getStatusIndicator(): string {
		switch (connectionStatus) {
			case 'connected': return 'bg-green-500';
			case 'connecting': return 'bg-yellow-500 animate-pulse';
			default: return 'bg-gray-500';
		}
	}
</script>

<div class="bg-collective-dark rounded-lg shadow-xl p-4">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-bold text-white">Agent Communication Flow</h3>
		<div class="flex items-center gap-2">
			<span class="w-2 h-2 rounded-full {getStatusIndicator()}"></span>
			<span class="text-xs text-gray-400 capitalize">{connectionStatus}</span>
		</div>
	</div>

	{#if messages.length === 0}
		<div class="text-center py-8 text-gray-500">
			<svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
			</svg>
			{#if connectionStatus === 'connected'}
				<p>Waiting for agent communications...</p>
			{:else if connectionStatus === 'connecting'}
				<p>Connecting to message stream...</p>
			{:else}
				<p>Real-time connection unavailable</p>
			{/if}
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
