<script lang="ts">
	import type { ChannelEvent, AgentActivity } from '../types';
	import { onMount, onDestroy } from 'svelte';

	export let selectedChannel: string | null = null;
	export let maxEvents: number = 50;

	let events: ChannelEvent[] = [];
	let activities: AgentActivity[] = [];
	let ws: WebSocket | null = null;
	let isConnected = false;

	function getWsUrl(): string {
		if (typeof window !== 'undefined') {
			return (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + 
				(window.location.hostname || 'localhost') + ':3002/channels';
		}
		return 'ws://localhost:3002/channels';
	}

	function connectChannelWS() {
		if (ws?.readyState === WebSocket.OPEN) return;
		try {
			ws = new WebSocket(getWsUrl());
			ws.onopen = () => {
				console.log('[ChannelEventFeed] WebSocket connected');
				isConnected = true;
				ws?.send(JSON.stringify({ action: 'list_channels' }));
			};
			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					handleEvent(data);
				} catch (error) {
					console.warn('[ChannelEventFeed] Non-JSON message:', error);
				}
			};
			ws.onclose = () => {
				isConnected = false;
				setTimeout(connectChannelWS, 5000);
			};
			ws.onerror = (error) => {
				console.error('[ChannelEventFeed] WebSocket error:', error);
				isConnected = false;
			};
		} catch (error) {
			console.warn('[ChannelEventFeed] WebSocket connection failed:', error);
		}
	}

	function handleEvent(data: any) {
		const timestamp = data.timestamp || new Date().toISOString();
		switch (data.type) {
			case 'channel_message':
			case 'channel_activity':
				const event: ChannelEvent = {
					type: data.type,
					channel: data.channel,
					timestamp,
					data: data.message || data
				};
				events = [event, ...events.slice(0, maxEvents - 1)];
				if (data.message) {
					const activity: AgentActivity = {
						agentId: data.message.from || 'unknown',
						agentName: data.message.from || 'Unknown Agent',
						channel: data.channel,
						action: data.message.content?.substring(0, 50) || 'Activity',
						timestamp: new Date(timestamp),
						type: 'message'
					};
					activities = [activity, ...activities.slice(0, maxEvents - 1)];
				}
				break;
			case 'agent_subscribed':
				const subEvent: ChannelEvent = {
					type: 'agent_subscribed',
					agentId: data.agentId,
					channel: data.channel,
					timestamp
				};
				events = [subEvent, ...events.slice(0, maxEvents - 1)];
				const subActivity: AgentActivity = {
					agentId: data.agentId,
					agentName: data.agentId,
					channel: data.channel,
					action: 'Joined channel',
					timestamp: new Date(timestamp),
					type: 'subscription'
				};
				activities = [subActivity, ...activities.slice(0, maxEvents - 1)];
				break;
			case 'agent_unsubscribed':
				const unsubEvent: ChannelEvent = {
					type: 'agent_unsubscribed',
					agentId: data.agentId,
					channel: data.channel,
					timestamp
				};
				events = [unsubEvent, ...events.slice(0, maxEvents - 1)];
				const unsubActivity: AgentActivity = {
					agentId: data.agentId,
					agentName: data.agentId,
					channel: data.channel,
					action: 'Left channel',
					timestamp: new Date(timestamp),
					type: 'subscription'
				};
				activities = [unsubActivity, ...activities.slice(0, maxEvents - 1)];
				break;
			case 'manager_status':
				const statusEvent: ChannelEvent = {
					type: 'manager_status',
					timestamp,
					data: data
				};
				events = [statusEvent, ...events.slice(0, maxEvents - 1)];
				break;
		}
	}

	function getEventIcon(type: string): string {
		switch (type) {
			case 'channel_message': return '💬';
			case 'channel_activity': return '📡';
			case 'agent_subscribed': return '✅';
			case 'agent_unsubscribed': return '👋';
			case 'manager_status': return '⚙️';
			default: return '📟';
		}
	}

	function getEventColor(type: string): string {
		switch (type) {
			case 'channel_message': return 'text-blue-400';
			case 'channel_activity': return 'text-green-400';
			case 'agent_subscribed': return 'text-emerald-400';
			case 'agent_unsubscribed': return 'text-orange-400';
			case 'manager_status': return 'text-purple-400';
			default: return 'text-gray-400';
		}
	}

	function formatTime(timestamp: string | Date): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}

	$: filteredEvents = selectedChannel 
		? events.filter(e => e.channel === selectedChannel)
		: events;

	onMount(() => {
		connectChannelWS();
	});

	onDestroy(() => {
		if (ws) {
			ws.close();
			ws = null;
		}
	});
</script>

<div class="bg-collective-dark rounded-lg shadow-xl p-4">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-bold text-white flex items-center gap-2">
			<svg class="w-5 h-5 text-collective-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
			</svg>
			Event Feed
		</h3>
		<div class="flex items-center gap-2">
			<span class="px-2 py-0.5 text-xs bg-collective-primary/20 text-collective-primary rounded-full">
				{filteredEvents.length} events
			</span>
			<span class="w-2 h-2 rounded-full {isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}"></span>
		</div>
	</div>

	<div class="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
		{#if filteredEvents.length === 0}
			<div class="text-center py-8 text-gray-400">
				<svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
				</svg>
				<p class="text-sm">No events yet</p>
				<p class="text-xs mt-1">Channel activity will appear here</p>
			</div>
		{:else}
			{#each filteredEvents as event (event.timestamp + event.type)}
				<div class="p-2 rounded bg-collective-dark/30 border border-gray-800/50 hover:border-collective-primary/30 transition-colors">
					<div class="flex items-start gap-2">
						<span class="text-lg">{getEventIcon(event.type)}</span>
						<div class="flex-1 min-w-0">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium text-white capitalize">
									{event.type.replace(/_/g, ' ')}
								</span>
								<span class="text-xs text-gray-500">
									{formatTime(event.timestamp)}
								</span>
							</div>
							{#if event.channel}
								<div class="text-xs {getEventColor(event.type)}">
									<span class="px-1.5 py-0.5 bg-gray-800/50 rounded mr-1">{event.channel}</span>
								</div>
							{/if}
							{#if event.agentId}
								<div class="text-xs text-gray-400 mt-1">
									Agent: {event.agentId}
								</div>
							{/if}
							{#if event.data && typeof event.data === 'object' && 'content' in event.data}
								<p class="text-xs text-gray-300 mt-1 truncate">
									{event.data.content}
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	{#if activities.length > 0}
		<div class="mt-4 pt-4 border-t border-gray-700/50">
			<h4 class="text-sm font-medium text-gray-400 mb-2">Recent Activity</h4>
			<div class="grid grid-cols-2 gap-2 text-xs">
				<div class="p-2 bg-collective-dark/30 rounded">
					<div class="text-gray-500">Messages</div>
					<div class="text-lg font-bold text-white">{activities.filter(a => a.type === 'message').length}</div>
				</div>
				<div class="p-2 bg-collective-dark/30 rounded">
					<div class="text-gray-500">Subscriptions</div>
					<div class="text-lg font-bold text-white">{activities.filter(a => a.type === 'subscription').length}</div>
				</div>
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
	.scrollbar-thin::-webkit-scrollbar-thumb:hover {
		background: rgba(156, 163, 175, 0.5);
	}
</style>
