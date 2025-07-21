import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

interface HealthStatus {
	status: 'healthy' | 'warning' | 'error';
	timestamp: string;
	categories: {
		core: CategoryHealth;
		extended: CategoryHealth;
		experimental: CategoryHealth;
	};
	summary: {
		totalEndpoints: number;
		healthyEndpoints: number;
		warningEndpoints: number;
		errorEndpoints: number;
		avgResponseTime: number;
	};
}

interface CategoryHealth {
	total: number;
	healthy: number;
	warning: number;
	error: number;
	avgResponseTime: number;
}

interface HealthIndicator {
	status: 'healthy' | 'warning' | 'error' | 'loading';
	label: string;
	tooltip: string;
	color: string;
	badgeColor: string;
}

// Health data store
const healthData = writable<HealthStatus | null>(null);
const isLoading = writable<boolean>(false);
const lastUpdated = writable<Date | null>(null);

// Derived health indicators for each category
export const coreHealth = derived(healthData, ($health): HealthIndicator => {
	if (!$health) return createLoadingIndicator('Core');

	const core = $health.categories.core;
	const status = getOverallStatus(core);

	return {
		status,
		label: 'Core',
		tooltip: `Core API: ${core.healthy}/${core.total} healthy (${core.avgResponseTime}ms avg)`,
		color: getStatusColor(status),
		badgeColor: getStatusBadgeColor(status)
	};
});

export const extendedHealth = derived(healthData, ($health): HealthIndicator => {
	if (!$health) return createLoadingIndicator('Extended');

	const extended = $health.categories.extended;
	const status = getOverallStatus(extended);

	return {
		status,
		label: 'Extended',
		tooltip: `Extended API: ${extended.healthy}/${extended.total} healthy (${extended.avgResponseTime}ms avg)`,
		color: getStatusColor(status),
		badgeColor: getStatusBadgeColor(status)
	};
});

export const experimentalHealth = derived(healthData, ($health): HealthIndicator => {
	if (!$health) return createLoadingIndicator('Experimental');

	const experimental = $health.categories.experimental;
	const status = getOverallStatus(experimental);

	return {
		status,
		label: 'Experimental',
		tooltip: `Experimental API: ${experimental.healthy}/${experimental.total} healthy (${experimental.avgResponseTime}ms avg)`,
		color: getStatusColor(status),
		badgeColor: getStatusBadgeColor(status)
	};
});

export const overallHealth = derived(healthData, ($health): HealthIndicator => {
	if (!$health) return createLoadingIndicator('Overall');

	const summary = $health.summary;
	const status = $health.status;

	return {
		status,
		label: 'Overall',
		tooltip: `Overall API: ${summary.healthyEndpoints}/${summary.totalEndpoints} healthy (${summary.avgResponseTime}ms avg)`,
		color: getStatusColor(status),
		badgeColor: getStatusBadgeColor(status)
	};
});

// Helper functions
function createLoadingIndicator(label: string): HealthIndicator {
	return {
		status: 'loading',
		label,
		tooltip: `${label} status loading...`,
		color: 'text-gray-400',
		badgeColor: 'bg-gray-400/20 text-gray-400'
	};
}

function getOverallStatus(category: CategoryHealth): 'healthy' | 'warning' | 'error' {
	if (category.error > 0) return 'error';
	if (category.warning > 0) return 'warning';
	return 'healthy';
}

function getStatusColor(status: 'healthy' | 'warning' | 'error' | 'loading'): string {
	switch (status) {
		case 'healthy':
			return 'text-emerald-400';
		case 'warning':
			return 'text-yellow-400';
		case 'error':
			return 'text-red-400';
		case 'loading':
			return 'text-gray-400';
		default:
			return 'text-gray-400';
	}
}

function getStatusBadgeColor(status: 'healthy' | 'warning' | 'error' | 'loading'): string {
	switch (status) {
		case 'healthy':
			return 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30';
		case 'warning':
			return 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30';
		case 'error':
			return 'bg-red-500/20 text-red-400 ring-red-500/30';
		case 'loading':
			return 'bg-gray-500/20 text-gray-400 ring-gray-500/30';
		default:
			return 'bg-gray-500/20 text-gray-400 ring-gray-500/30';
	}
}

// Health service functions
async function fetchHealthData(): Promise<HealthStatus | null> {
	if (!browser) return null;

	try {
		isLoading.set(true);
		const response = await fetch('/api/health');

		if (!response.ok) {
			throw new Error(`Health check failed: ${response.status}`);
		}

		const data = await response.json();
		healthData.set(data);
		lastUpdated.set(new Date());
		return data;
	} catch (error) {
		console.error('Failed to fetch health data:', error);
		return null;
	} finally {
		isLoading.set(false);
	}
}

// Auto-refresh health data
let refreshInterval: NodeJS.Timeout | null = null;

export function startHealthMonitoring(intervalMs: number = 30000) {
	if (!browser) return;

	// Initial fetch
	fetchHealthData();

	// Set up auto-refresh
	if (refreshInterval) clearInterval(refreshInterval);
	refreshInterval = setInterval(fetchHealthData, intervalMs);
}

export function stopHealthMonitoring() {
	if (refreshInterval) {
		clearInterval(refreshInterval);
		refreshInterval = null;
	}
}

// Manual refresh function
export async function refreshHealth(): Promise<void> {
	await fetchHealthData();
}

// Export stores for external use
export { healthData, isLoading, lastUpdated };
