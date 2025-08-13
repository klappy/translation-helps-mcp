<script lang="ts">
	interface Endpoint {
		name: string;
		path: string;
		description: string;
		parameters: Array<{
			name: string;
			type: string;
			required: boolean;
			description: string;
		}>;
		category: string;
	}

	// Define all v2 endpoints
	const endpoints: Endpoint[] = [
		// Scripture Endpoints
		{
			name: 'Fetch Scripture',
			path: '/api/v2/fetch-scripture',
			description: 'Fetches scripture text in multiple translations',
			category: 'Scripture',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3:16")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					description: 'Language code (default: "en")'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					description: 'Organization (default: "unfoldingWord")'
				},
				{
					name: 'resource',
					type: 'string',
					required: false,
					description: 'Comma-separated resources (e.g., "ult,ust")'
				},
				{
					name: 'format',
					type: 'string',
					required: false,
					description: 'Output format: json, text, or md (default: "json")'
				}
			]
		},
		{
			name: 'Fetch ULT Scripture',
			path: '/api/v2/fetch-ult-scripture',
			description: 'Fetches unfoldingWord Literal Text scripture',
			category: 'Scripture',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3:16")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					description: 'Language code (default: "en")'
				}
			]
		},
		{
			name: 'Fetch UST Scripture',
			path: '/api/v2/fetch-ust-scripture',
			description: 'Fetches unfoldingWord Simplified Text scripture',
			category: 'Scripture',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3:16")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					description: 'Language code (default: "en")'
				}
			]
		},
		// Translation Helps
		{
			name: 'Translation Notes',
			path: '/api/v2/translation-notes',
			description: 'Fetches translation notes for a reference',
			category: 'Translation Helps',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3:16")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					description: 'Language code (default: "en")'
				}
			]
		},
		{
			name: 'Translation Questions',
			path: '/api/v2/translation-questions',
			description: 'Fetches translation questions for a reference',
			category: 'Translation Helps',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					description: 'Language code (default: "en")'
				}
			]
		},
		{
			name: 'Translation Words',
			path: '/api/v2/fetch-translation-words',
			description: 'Fetches translation words for a reference',
			category: 'Translation Helps',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3:16")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					description: 'Language code (default: "en")'
				}
			]
		},
		// Discovery Endpoints
		{
			name: 'Languages',
			path: '/api/v2/simple-languages',
			description: 'Lists available languages',
			category: 'Discovery',
			parameters: [
				{
					name: 'resource',
					type: 'string',
					required: false,
					description: 'Filter by resource (e.g., "ult")'
				},
				{
					name: 'includeMetadata',
					type: 'boolean',
					required: false,
					description: 'Include resource metadata'
				}
			]
		},
		{
			name: 'Available Books',
			path: '/api/v2/get-available-books',
			description: 'Lists available books for a language and resource',
			category: 'Discovery',
			parameters: [
				{
					name: 'language',
					type: 'string',
					required: false,
					description: 'Language code (default: "en")'
				},
				{
					name: 'resource',
					type: 'string',
					required: false,
					description: 'Resource slug (e.g., "ult")'
				}
			]
		},
		// Utility Endpoints
		{
			name: 'Health Check',
			path: '/api/v2/health',
			description: 'System health check',
			category: 'Utility',
			parameters: []
		},
		{
			name: 'Get Context',
			path: '/api/v2/get-context',
			description: 'Fetches context for a reference including scripture and helps',
			category: 'Utility',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3:16")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					description: 'Language code (default: "en")'
				}
			]
		}
	];

	// Group endpoints by category
	$: groupedEndpoints = endpoints.reduce(
		(acc, endpoint) => {
			if (!acc[endpoint.category]) {
				acc[endpoint.category] = [];
			}
			acc[endpoint.category].push(endpoint);
			return acc;
		},
		{} as Record<string, Endpoint[]>
	);

	let selectedEndpoint: Endpoint | null = null;
	let params: Record<string, any> = {};
	let responseData: any = null;
	let responseHeaders: Record<string, string> = {};
	let responseStatus: number | null = null;
	let responseTime: number | null = null;
	let error: string | null = null;
	let curlCommand: string = '';
	let loading = false;

	function selectEndpoint(endpoint: Endpoint) {
		selectedEndpoint = endpoint;
		params = {};
		responseData = null;
		responseHeaders = {};
		responseStatus = null;
		responseTime = null;
		error = null;
		curlCommand = '';

		// Initialize default values for parameters
		endpoint.parameters.forEach((param) => {
			if (param.type === 'boolean') {
				params[param.name] = false;
			} else {
				params[param.name] = '';
			}
		});

		// Generate initial cURL command
		updateCurlCommand();
	}

	async function executeRequest() {
		if (!selectedEndpoint) return;

		loading = true;
		error = null;
		responseData = null;
		responseHeaders = {};
		responseStatus = null;
		responseTime = null;

		const startTime = Date.now();

		try {
			// Build URL with query parameters
			const url = new URL(selectedEndpoint.path, window.location.origin);

			// Add non-empty parameters
			Object.entries(params).forEach(([key, value]) => {
				if (value !== '' && value !== false) {
					url.searchParams.append(key, String(value));
				}
			});

			const response = await fetch(url.toString());
			responseTime = Date.now() - startTime;
			responseStatus = response.status;

			// Get headers
			response.headers.forEach((value, key) => {
				responseHeaders[key] = value;
			});

			// Try to parse as JSON
			const contentType = response.headers.get('content-type');
			if (contentType && contentType.includes('application/json')) {
				responseData = await response.json();
			} else {
				responseData = await response.text();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred';
			responseTime = Date.now() - startTime;
		} finally {
			loading = false;
		}
	}

	function updateCurlCommand() {
		if (!selectedEndpoint) return;

		const url = new URL(selectedEndpoint.path, window.location.origin);

		// Add non-empty parameters
		Object.entries(params).forEach(([key, value]) => {
			if (value !== '' && value !== false) {
				url.searchParams.append(key, String(value));
			}
		});

		curlCommand = `curl "${url.toString()}"`;
	}

	// Update cURL command when params change
	$: if (selectedEndpoint) {
		updateCurlCommand();
	}
</script>

<svelte:head>
	<title>API Explorer - Translation Helps MCP</title>
</svelte:head>

<div class="api-explorer-page">
	<header class="api-header">
		<div class="api-header-content">
			<h1>🚀 API Explorer</h1>
			<p>Interactive documentation for Translation Helps MCP v2 endpoints</p>
		</div>
	</header>

	<div class="api-explorer-body">
		<!-- Sidebar -->
		<aside class="api-sidebar">
			<h2>Endpoints</h2>
			{#each Object.entries(groupedEndpoints) as [category, categoryEndpoints]}
				<div class="api-category">
					<h3>{category}</h3>
					<ul>
						{#each categoryEndpoints as endpoint}
							<li>
								<button
									class="api-endpoint-btn"
									class:active={selectedEndpoint === endpoint}
									on:click={() => selectEndpoint(endpoint)}
								>
									{endpoint.name}
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</aside>

		<!-- Main Content -->
		<main class="api-main">
			{#if selectedEndpoint}
				<div class="api-endpoint-details">
					<h2>{selectedEndpoint.name}</h2>
					<p class="api-description">{selectedEndpoint.description}</p>

					<div class="api-path">
						<code>{selectedEndpoint.path}</code>
					</div>

					{#if selectedEndpoint.parameters.length > 0}
						<div class="api-parameters">
							<h3>Parameters</h3>
							{#each selectedEndpoint.parameters as param}
								<div class="api-param">
									<label>
										<span class="api-param-name">
											{param.name}
											{#if param.required}
												<span class="api-required">*</span>
											{/if}
										</span>
										<span class="api-param-desc">{param.description}</span>
										{#if param.type === 'boolean'}
											<input type="checkbox" bind:checked={params[param.name]} />
										{:else}
											<input
												type="text"
												bind:value={params[param.name]}
												placeholder={param.required ? 'Required' : 'Optional'}
											/>
										{/if}
									</label>
								</div>
							{/each}
						</div>
					{/if}

					<div class="api-actions">
						<button class="api-execute-btn" on:click={executeRequest} disabled={loading}>
							{loading ? 'Loading...' : 'Execute Request'}
						</button>

						{#if curlCommand}
							<div class="api-curl">
								<h4>cURL Command</h4>
								<code>{curlCommand}</code>
							</div>
						{/if}
					</div>

					{#if responseStatus !== null || error}
						<div class="api-response">
							<h3>
								Response
								{#if responseTime !== null}
									<span class="api-response-time">({responseTime}ms)</span>
								{/if}
							</h3>

							{#if responseStatus !== null}
								<div class="api-status" class:success={responseStatus === 200}>
									Status: {responseStatus}
								</div>
							{/if}

							{#if Object.keys(responseHeaders).length > 0}
								<details class="api-headers">
									<summary>Response Headers</summary>
									<pre>{JSON.stringify(responseHeaders, null, 2)}</pre>
								</details>
							{/if}

							{#if error}
								<div class="api-error">
									Error: {error}
								</div>
							{/if}

							{#if responseData !== null}
								<div class="api-response-body">
									<h4>Response Body</h4>
									<pre>{typeof responseData === 'string'
											? responseData
											: JSON.stringify(responseData, null, 2)}</pre>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{:else}
				<div class="api-welcome">
					<h2>Welcome to the API Explorer!</h2>
					<p>Select an endpoint from the sidebar to get started.</p>
					<div class="api-stats">
						<div class="api-stat">
							<span class="api-stat-number">{endpoints.length}</span>
							<span class="api-stat-label">Endpoints</span>
						</div>
						<div class="api-stat">
							<span class="api-stat-number">{Object.keys(groupedEndpoints).length}</span>
							<span class="api-stat-label">Categories</span>
						</div>
						<div class="api-stat">
							<span class="api-stat-number">100%</span>
							<span class="api-stat-label">Consistent</span>
						</div>
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	/* Override global styles and create clean UI */
	.api-explorer-page {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: #f8f9fa;
		color: #333;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.api-header {
		background: white;
		border-bottom: 1px solid #e1e4e8;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		flex-shrink: 0;
		z-index: 10;
	}

	.api-header-content {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1.5rem 2rem;
	}

	.api-header h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 700;
		color: #24292e;
	}

	.api-header p {
		margin: 0.5rem 0 0;
		color: #586069;
		font-size: 1.1rem;
	}

	.api-explorer-body {
		flex: 1;
		display: flex;
		overflow: hidden;
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
	}

	.api-sidebar {
		width: 280px;
		background: white;
		border-right: 1px solid #e1e4e8;
		overflow-y: auto;
		padding: 1.5rem;
		flex-shrink: 0;
	}

	.api-sidebar h2 {
		margin: 0 0 1.5rem;
		font-size: 1.3rem;
		font-weight: 600;
		color: #24292e;
	}

	.api-category {
		margin-bottom: 2rem;
	}

	.api-category h3 {
		margin: 0 0 0.75rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: #586069;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.api-category ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.api-category li {
		margin-bottom: 0.25rem;
	}

	.api-endpoint-btn {
		width: 100%;
		text-align: left;
		padding: 0.75rem 1rem;
		border: none;
		background: transparent;
		color: #24292e;
		font-size: 0.95rem;
		cursor: pointer;
		border-radius: 6px;
		transition: all 0.15s ease;
		font-family: inherit;
	}

	.api-endpoint-btn:hover {
		background: #f6f8fa;
	}

	.api-endpoint-btn.active {
		background: #0366d6;
		color: white;
		font-weight: 500;
	}

	.api-main {
		flex: 1;
		background: white;
		overflow-y: auto;
		padding: 2rem;
	}

	.api-endpoint-details h2 {
		margin: 0 0 0.75rem;
		font-size: 1.75rem;
		font-weight: 600;
		color: #24292e;
	}

	.api-description {
		color: #586069;
		margin: 0 0 1.5rem;
		font-size: 1.1rem;
		line-height: 1.5;
	}

	.api-path {
		background: #f6f8fa;
		padding: 1rem 1.25rem;
		border-radius: 6px;
		margin-bottom: 2rem;
		border: 1px solid #e1e4e8;
	}

	.api-path code {
		font-family: 'SF Mono', Monaco, Consolas, monospace;
		font-size: 1rem;
		color: #032f62;
	}

	.api-parameters {
		margin-bottom: 2rem;
	}

	.api-parameters h3 {
		margin: 0 0 1rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: #24292e;
	}

	.api-param {
		margin-bottom: 1.5rem;
	}

	.api-param label {
		display: block;
	}

	.api-param-name {
		font-weight: 600;
		color: #24292e;
		display: inline-block;
		margin-bottom: 0.25rem;
		font-size: 1rem;
	}

	.api-required {
		color: #d73a49;
		margin-left: 0.25rem;
	}

	.api-param-desc {
		display: block;
		font-size: 0.9rem;
		color: #586069;
		margin-bottom: 0.5rem;
		line-height: 1.4;
	}

	.api-param input[type='text'] {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1px solid #d1d5da;
		border-radius: 6px;
		font-size: 0.95rem;
		font-family: inherit;
		background: white;
		color: #24292e;
		transition: border-color 0.15s ease;
	}

	.api-param input[type='text']:focus {
		outline: none;
		border-color: #0366d6;
		box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
	}

	.api-param input[type='checkbox'] {
		margin-top: 0.5rem;
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	.api-actions {
		margin-bottom: 2rem;
	}

	.api-execute-btn {
		background: #28a745;
		color: white;
		border: none;
		padding: 0.875rem 2rem;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease;
		font-family: inherit;
	}

	.api-execute-btn:hover:not(:disabled) {
		background: #218838;
	}

	.api-execute-btn:disabled {
		background: #6c757d;
		cursor: not-allowed;
		opacity: 0.65;
	}

	.api-curl {
		margin-top: 1.5rem;
	}

	.api-curl h4 {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: #586069;
	}

	.api-curl code {
		display: block;
		background: #f6f8fa;
		padding: 1rem;
		border-radius: 6px;
		font-size: 0.9rem;
		overflow-x: auto;
		font-family: 'SF Mono', Monaco, Consolas, monospace;
		color: #032f62;
		border: 1px solid #e1e4e8;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.api-response {
		border-top: 2px solid #e1e4e8;
		padding-top: 2rem;
		margin-top: 2rem;
	}

	.api-response h3 {
		margin: 0 0 1rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: #24292e;
	}

	.api-response-time {
		font-size: 0.9rem;
		color: #586069;
		font-weight: normal;
		margin-left: 0.5rem;
	}

	.api-status {
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		background: #ffeaa7;
		color: #d63031;
		font-weight: 500;
		border: 1px solid #fdcb6e;
	}

	.api-status.success {
		background: #d4edda;
		color: #155724;
		border-color: #c3e6cb;
	}

	.api-headers {
		margin-bottom: 1rem;
		background: #f6f8fa;
		border-radius: 6px;
		border: 1px solid #e1e4e8;
		overflow: hidden;
	}

	.api-headers summary {
		cursor: pointer;
		padding: 0.75rem 1rem;
		font-weight: 600;
		color: #24292e;
		user-select: none;
	}

	.api-headers summary:hover {
		background: #f3f4f6;
	}

	.api-headers pre {
		margin: 0;
		padding: 1rem;
		border-top: 1px solid #e1e4e8;
		font-size: 0.85rem;
		overflow-x: auto;
	}

	.api-response-body h4 {
		margin: 0 0 0.75rem;
		font-size: 1rem;
		font-weight: 600;
		color: #24292e;
	}

	.api-error {
		background: #fef2f2;
		color: #991b1b;
		padding: 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		border: 1px solid #fecaca;
		font-weight: 500;
	}

	pre {
		background: #f6f8fa;
		padding: 1.25rem;
		border-radius: 6px;
		overflow-x: auto;
		font-size: 0.875rem;
		margin: 0;
		font-family: 'SF Mono', Monaco, Consolas, monospace;
		line-height: 1.5;
		color: #032f62;
		border: 1px solid #e1e4e8;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.api-welcome {
		text-align: center;
		padding: 4rem 2rem;
		max-width: 600px;
		margin: 0 auto;
	}

	.api-welcome h2 {
		margin: 0 0 1rem;
		font-size: 2rem;
		font-weight: 600;
		color: #24292e;
	}

	.api-welcome p {
		color: #586069;
		font-size: 1.2rem;
		line-height: 1.5;
		margin-bottom: 3rem;
	}

	.api-stats {
		display: flex;
		justify-content: center;
		gap: 4rem;
		margin-top: 3rem;
	}

	.api-stat {
		text-align: center;
	}

	.api-stat-number {
		display: block;
		font-size: 3rem;
		font-weight: 700;
		color: #0366d6;
		line-height: 1;
	}

	.api-stat-label {
		display: block;
		color: #586069;
		margin-top: 0.5rem;
		font-size: 1rem;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.api-explorer-body {
			flex-direction: column;
		}

		.api-sidebar {
			width: 100%;
			border-right: none;
			border-bottom: 1px solid #e1e4e8;
			max-height: 200px;
		}

		.api-stats {
			flex-direction: column;
			gap: 2rem;
		}
	}
</style>
