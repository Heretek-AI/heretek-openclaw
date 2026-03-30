import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Channel } from '$lib/types';

// Static channel list for The Collective
const CHANNELS: Channel[] = [
	{
		name: 'global',
		description: 'Public broadcast channel for all agents',
		subscriberCount: 11
	},
	{
		name: 'triad',
		description: 'Strategic decision making channel',
		subscriberCount: 3
	},
	{
		name: 'governance',
		description: 'Governance and policy discussions',
		subscriberCount: 5
	},
	{
		name: 'explorer',
		description: 'Opportunity discovery channel',
		subscriberCount: 2
	},
	{
		name: 'sentinel',
		description: 'Security monitoring channel',
		subscriberCount: 2
	}
];

// GET /api/channels - List all channels
export const GET: RequestHandler = async () => {
	return json({
		success: true,
		channels: CHANNELS,
		timestamp: new Date().toISOString()
	});
};