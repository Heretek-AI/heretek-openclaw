<script lang="ts">
	import type { Channel } from '../types';
	import { onMount, onDestroy } from 'svelte';

	export let channels: Channel[] = [];
	export let selectedChannel: string | null = null;
	export let onSelect: (channel: string) => void = () => {};

	// WebSocket connection for channel updates
	let ws: WebSocket | null = null;
	let isConnected = false;
	let channelEvents: { channel: string; type: string; message: string; timestamp: Date }[] = [];

	// Get WebSocket URL based on current location
	function getWsUrl(): string {
		if (typeof window !== 'undefined') {
			return (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + 
				(window.location.hostname || 'localhost') + ':3002/channels';
		}
		return 'ws://localhost:3002/channels';
	}

	// Connect to channel WebSocket - disabled since no WS server
	// Now fetches from /api/channels REST API instead
	async function connectChannelWS() {
		try {
			// Fetch channels from REST API
			const response = await fetch('/api/channels');
			const data = await response.json();
			if (data.success && data.channels) {
				channels = data.channels;
				isConnected = true;
				console.log('[ChannelSelector] Loaded channels:', channels.length);
			}
		} catch (e) {
			console.log('[ChannelSelector] WebSocket disabled - using REST API for channel list');
			isConnected = false;
		}
	}

	// Handle channel events
	function handleChannelEvent(data: any) {
		if (data.type === 'channel_list') {
			channels = data.channels;
		} else if (data.type === 'connected') {
			channels = data.channels || [];
		} else if (data.type === 'channel_activity' || data.type === 'channel_message') {
			channelEvents = [
				{
					channel: data.channel,
					type: data.type,
					message: data.message?.content || 'Activity',
					timestamp: new Date(data.timestamp)
				},
				...channelEvents.slice(0, 49)
			];
		} else if (data.type === 'agent_subscribed' || data.type === 'agent_unsubscribed') {
			const channelIndex = channels.findIndex(c => c.name === data.channel);
			if (channelIndex >= 0) {
				channels[channelIndex].subscriberCount += data.type === 'agent_subscribed' ? 1 : -1;
			}
		}
	}

	// Handle channel selection
	function handleChannelSelect(channelName: string) {
		selectedChannel = channelName;
		onSelect(channelName);

		if (ws?.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify({ action: 'subscribe', channel: channelName }));
		}
	}

	// Get channel icon based on name
	function getChannelIcon(channelName: string): string {
		switch (channelName) {
			case 'global': return '🌐';
			case 'triad': return '⚖️';
			case 'governance': return '🏛️';
			case 'explorer': return '🧭';
			case 'sentinel': return '🛡️';
			default: return '📢';
		}
	}

	// Get recent activity count for channel
	function getRecentActivity(channelName: string): number {
		return channelEvents.filter(e => e.channel === channelName).length;
	}

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
	<!-- Header -->
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-bold text-white flex items-center gap-2">
			<svg class="w-5 h-5 text-collective-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
			</svg>
			Channels
		</h3>
		<div class="flex items-center gap-1">
			<span class="w-2 h-2 rounded-full {isConnected ? 'bg-green-500' : 'bg-red-500'}"></span>
			<span class="text-xs text-gray-400">{isConnected ? 'Live' : 'Offline'}</span>
		</div>
	</div>

	<!-- Channel List -->
	<div class="space-y-2">
		{#if channels.length === 0}
			<div class="text-center py-4 text-gray-400 text-sm">
				No channels available
			</div>
		{:else}
			{#each channels as channel (channel.name)}
				{@const recentActivity = getRecentActivity(channel.name)}
				<button
					on:click={() => handleChannelSelect(channel.name)}
					class="w-full p-3 rounded-lg transition-all duration-200 text-left
						{selectedChannel === channel.name 
							? 'bg-collective-primary/20 border border-collective-primary/50' 
							: 'bg-collective-dark/50 border border-transparent hover:border-collective-primary/30'}"
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<span class="text-xl">{getChannelIcon(channel.name)}</span>
							<div>
								<div class="text-white font-medium capitalize">{channel.name}</div>
								<div class="text-xs text-gray-400">{channel.description}</div>
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if recentActivity > 0}
								<span class="px-2 py-0.5 text-xs bg-collective-primary/20 text-collective-primary rounded-full">
									{recentActivity}
								</span>
							{/if}
							<div class="flex items-center gap-1">
								<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
								</svg>
								<span class="text-xs text-gray-400">{channel.subscriberCount}</span>
							</div>
						</div>
					</div>
				</button>
			{/each}
		{/if}
	</div>

	<!-- Connection Status -->
	<div class="mt-4 pt-4 border-t border-gray-700/50">
		<div class="flex items-center justify-between text-xs text-gray-500">
			<span>Channel WS: {isConnected ? 'Connected' : 'Disconnected'}</span>
			{#if selectedChannel}
				<span class="text-collective-primary">Selected: {selectedChannel}</span>
			{/if}
		</div>
	</div>
</div>