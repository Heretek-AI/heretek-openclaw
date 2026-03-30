<script lang="ts">
	import type { A2AMessage } from '../types';
	import { onMount, onDestroy } from 'svelte';

	export let messages: A2AMessage[] = [];

	// WebSocket configuration
	let ws: WebSocket | null = null;
	let reconnectTimer: NodeJS.Timeout | null = null;
	let reconnectAttempts = 0;
	const maxReconnectAttempts = 10;
	const reconnectInterval = 5000;
	
	// Connection status
	let isConnected = false;
	let connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';

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
