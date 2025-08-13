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
					description: 'Response format: "json", "text", "md"'
				}
			]
		},
		{
			name: 'Fetch ULT Scripture',
			path: '/api/v2/fetch-ult-scripture',
			description: 'Fetches only ULT (unfoldingWord Literal Text) translation',
			category: 'Scripture',
			parameters: [
				{ name: 'reference', type: 'string', required: true, description: 'Bible reference' },
				{ name: 'language', type: 'string', required: false, description: 'Language code' },
				{ name: 'organization', type: 'string', required: false, description: 'Organization' }
			]
		},
		{
			name: 'Fetch UST Scripture',
			path: '/api/v2/fetch-ust-scripture',
			description: 'Fetches only UST (unfoldingWord Simplified Text) translation',
			category: 'Scripture',
			parameters: [
				{ name: 'reference', type: 'string', required: true, description: 'Bible reference' },
				{ name: 'language', type: 'string', required: false, description: 'Language code' },
				{ name: 'organization', type: 'string', required: false, description: 'Organization' }
			]
		},

		// Translation Helps
		{
			name: 'Translation Notes',
			path: '/api/v2/translation-notes',
			description: 'Fetches translation notes for a reference',
			category: 'Translation Helps',
			parameters: [
				{ name: 'reference', type: 'string', required: true, description: 'Bible reference' },
				{ name: 'language', type: 'string', required: false, description: 'Language code' },
				{ name: 'organization', type: 'string', required: false, description: 'Organization' }
			]
		},
		{
			name: 'Translation Questions',
			path: '/api/v2/translation-questions',
			description: 'Fetches comprehension questions',
			category: 'Translation Helps',
			parameters: [
				{ name: 'reference', type: 'string', required: true, description: 'Bible reference' },
				{ name: 'language', type: 'string', required: false, description: 'Language code' },
				{ name: 'organization', type: 'string', required: false, description: 'Organization' }
			]
		},
		{
			name: 'Translation Words',
			path: '/api/v2/fetch-translation-words',
			description: 'Fetches key term definitions',
			category: 'Translation Helps',
			parameters: [
				{ name: 'reference', type: 'string', required: true, description: 'Bible reference' },
				{ name: 'language', type: 'string', required: false, description: 'Language code' },
				{
					name: 'includeAlignment',
					type: 'boolean',
					required: false,
					description: 'Include word alignment data'
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
					description: 'Filter by resource availability'
				},
				{
					name: 'includeMetadata',
					type: 'boolean',
					required: false,
					description: 'Include resource metadata'
				},
				{
					name: 'includeStats',
					type: 'boolean',
					required: false,
					description: 'Include coverage statistics'
				}
			]
		},
		{
			name: 'Available Books',
			path: '/api/v2/get-available-books',
			description: 'Lists available Bible books',
			category: 'Discovery',
			parameters: [
				{ name: 'language', type: 'string', required: true, description: 'Language code' },
				{ name: 'organization', type: 'string', required: false, description: 'Organization' }
			]
		},

		// Utility Endpoints
		{
			name: 'Health Check',
			path: '/api/v2/health',
			description: 'Basic health check',
			category: 'Utility',
			parameters: []
		},
		{
			name: 'Get Context',
			path: '/api/v2/get-context',
			description: 'Aggregates all resources for a reference',
			category: 'Utility',
			parameters: [
				{ name: 'reference', type: 'string', required: true, description: 'Bible reference' },
				{
					name: 'includeEmpty',
					type: 'boolean',
					required: false,
					description: 'Include empty resources'
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
	let paramValues: Record<string, any> = {};
	let response: any = null;
	let loading = false;
	let error: string | null = null;
	let responseTime = 0;

	function selectEndpoint(endpoint: Endpoint) {
		selectedEndpoint = endpoint;
		paramValues = {};
		response = null;
		error = null;

		// Set default values
		endpoint.parameters.forEach((param) => {
			if (param.name === 'reference') {
				paramValues[param.name] = 'John 3:16';
			} else if (param.name === 'language') {
				paramValues[param.name] = 'en';
			} else if (param.name === 'organization') {
				paramValues[param.name] = 'unfoldingWord';
			} else if (param.type === 'boolean') {
				paramValues[param.name] = false;
			}
		});
	}

	async function executeRequest() {
		if (!selectedEndpoint) return;

		loading = true;
		error = null;
		response = null;

		try {
			// Build URL with parameters
			const url = new URL(selectedEndpoint.path, window.location.origin);

			selectedEndpoint.parameters.forEach((param) => {
				const value = paramValues[param.name];
				if (value !== undefined && value !== '' && value !== null) {
					url.searchParams.append(param.name, String(value));
				}
			});

			const startTime = performance.now();
			const res = await fetch(url.toString());
			responseTime = Math.round(performance.now() - startTime);

			const contentType = res.headers.get('content-type');

			if (contentType?.includes('application/json')) {
				response = {
					status: res.status,
					headers: Object.fromEntries(res.headers.entries()),
					data: await res.json()
				};
			} else {
				response = {
					status: res.status,
					headers: Object.fromEntries(res.headers.entries()),
					data: await res.text()
				};
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	function getCurlCommand(): string {
		if (!selectedEndpoint) return '';

		const url = new URL(selectedEndpoint.path, window.location.origin);

		selectedEndpoint.parameters.forEach((param) => {
			const value = paramValues[param.name];
			if (value !== undefined && value !== '' && value !== null) {
				url.searchParams.append(param.name, String(value));
			}
		});

		return `curl "${url.toString()}"`;
	}
</script>

<svelte:head>
	<title>API Explorer - Translation Helps MCP</title>
</svelte:head>

<div class="container">
	<header>
		<h1>🚀 API Explorer</h1>
		<p>Interactive documentation for Translation Helps MCP v2 endpoints</p>
	</header>

	<div class="explorer">
		<!-- Endpoint List -->
		<aside class="sidebar">
			<h2>Endpoints</h2>
			{#each Object.entries(groupedEndpoints) as [category, categoryEndpoints]}
				<div class="category">
					<h3>{category}</h3>
					<ul>
						{#each categoryEndpoints as endpoint}
							<li>
								<button
									class="endpoint-button"
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

		<!-- Endpoint Details -->
		<main class="content">
			{#if selectedEndpoint}
				<div class="endpoint-details">
					<h2>{selectedEndpoint.name}</h2>
					<p class="description">{selectedEndpoint.description}</p>

					<div class="endpoint-path">
						<code>GET {selectedEndpoint.path}</code>
					</div>

					<!-- Parameters -->
					{#if selectedEndpoint.parameters.length > 0}
						<div class="parameters">
							<h3>Parameters</h3>
							{#each selectedEndpoint.parameters as param}
								<div class="parameter">
									<label>
										<span class="param-name">
											{param.name}
											{#if param.required}
												<span class="required">*</span>
											{/if}
										</span>
										<span class="param-desc">{param.description}</span>

										{#if param.type === 'boolean'}
											<input type="checkbox" bind:checked={paramValues[param.name]} />
										{:else}
											<input
												type="text"
												bind:value={paramValues[param.name]}
												placeholder={param.required ? 'Required' : 'Optional'}
											/>
										{/if}
									</label>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Execute Button -->
					<div class="actions">
						<button class="execute-button" on:click={executeRequest} disabled={loading}>
							{loading ? 'Loading...' : 'Execute Request'}
						</button>

						<div class="curl-command">
							<h4>cURL Command:</h4>
							<code>{getCurlCommand()}</code>
						</div>
					</div>

					<!-- Response -->
					{#if response || error}
						<div class="response-section">
							<h3>
								Response
								{#if responseTime}
									<span class="response-time">({responseTime}ms)</span>
								{/if}
							</h3>

							{#if error}
								<div class="error">
									Error: {error}
								</div>
							{:else if response}
								<div class="response-status" class:success={response.status === 200}>
									Status: {response.status}
								</div>

								<details class="response-headers">
									<summary>Headers</summary>
									<pre>{JSON.stringify(response.headers, null, 2)}</pre>
								</details>

								<div class="response-body">
									<h4>Body</h4>
									<pre>{typeof response.data === 'string'
											? response.data
											: JSON.stringify(response.data, null, 2)}</pre>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{:else}
				<div class="welcome">
					<h2>Welcome to the API Explorer!</h2>
					<p>Select an endpoint from the sidebar to get started.</p>

					<div class="stats">
						<div class="stat">
							<span class="number">{endpoints.length}</span>
							<span class="label">Endpoints</span>
						</div>
						<div class="stat">
							<span class="number">{Object.keys(groupedEndpoints).length}</span>
							<span class="label">Categories</span>
						</div>
						<div class="stat">
							<span class="number">100%</span>
							<span class="label">Consistent</span>
						</div>
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	.container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: #f5f5f5;
	}

	header {
		background: #1e293b;
		color: white;
		padding: 2rem;
		text-align: center;
	}

	header h1 {
		margin: 0;
		font-size: 2.5rem;
	}

	header p {
		margin: 0.5rem 0 0;
		opacity: 0.8;
	}

	.explorer {
		flex: 1;
		display: flex;
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
		gap: 2rem;
		padding: 2rem;
	}

	.sidebar {
		width: 300px;
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		max-height: calc(100vh - 200px);
		overflow-y: auto;
	}

	.sidebar h2 {
		margin: 0 0 1rem;
		font-size: 1.5rem;
	}

	.category {
		margin-bottom: 1.5rem;
	}

	.category h3 {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
		color: #64748b;
	}

	.category ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.endpoint-button {
		width: 100%;
		text-align: left;
		padding: 0.5rem 1rem;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 0.9rem;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.endpoint-button:hover {
		background: #f1f5f9;
	}

	.endpoint-button.active {
		background: #3b82f6;
		color: white;
	}

	.content {
		flex: 1;
		background: white;
		border-radius: 8px;
		padding: 2rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		overflow-y: auto;
		max-height: calc(100vh - 200px);
	}

	.endpoint-details h2 {
		margin: 0 0 0.5rem;
	}

	.description {
		color: #64748b;
		margin: 0 0 1.5rem;
	}

	.endpoint-path {
		background: #f8fafc;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 2rem;
	}

	.endpoint-path code {
		font-family: 'Fira Code', monospace;
		font-size: 1.1rem;
	}

	.parameters {
		margin-bottom: 2rem;
	}

	.parameters h3 {
		margin: 0 0 1rem;
	}

	.parameter {
		margin-bottom: 1rem;
	}

	.parameter label {
		display: block;
	}

	.param-name {
		font-weight: 600;
		display: inline-block;
		margin-bottom: 0.25rem;
	}

	.required {
		color: #ef4444;
	}

	.param-desc {
		display: block;
		font-size: 0.875rem;
		color: #64748b;
		margin-bottom: 0.5rem;
	}

	.parameter input[type='text'] {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.parameter input[type='checkbox'] {
		margin-top: 0.5rem;
	}

	.actions {
		margin-bottom: 2rem;
	}

	.execute-button {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 2rem;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.execute-button:hover {
		background: #2563eb;
	}

	.execute-button:disabled {
		background: #94a3b8;
		cursor: not-allowed;
	}

	.curl-command {
		margin-top: 1rem;
	}

	.curl-command h4 {
		margin: 0 0 0.5rem;
		font-size: 0.875rem;
	}

	.curl-command code {
		display: block;
		background: #f8fafc;
		padding: 0.75rem;
		border-radius: 4px;
		font-size: 0.875rem;
		overflow-x: auto;
	}

	.response-section {
		border-top: 2px solid #e2e8f0;
		padding-top: 2rem;
	}

	.response-section h3 {
		margin: 0 0 1rem;
	}

	.response-time {
		font-size: 0.875rem;
		color: #64748b;
		font-weight: normal;
	}

	.response-status {
		padding: 0.5rem 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		background: #fee2e2;
		color: #dc2626;
	}

	.response-status.success {
		background: #dcfce7;
		color: #16a34a;
	}

	.response-headers {
		margin-bottom: 1rem;
	}

	.response-headers summary {
		cursor: pointer;
		padding: 0.5rem;
		background: #f8fafc;
		border-radius: 4px;
	}

	.response-body h4 {
		margin: 0 0 0.5rem;
	}

	.error {
		background: #fee2e2;
		color: #dc2626;
		padding: 1rem;
		border-radius: 4px;
	}

	pre {
		background: #f8fafc;
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		font-size: 0.875rem;
		margin: 0;
	}

	.welcome {
		text-align: center;
		padding: 4rem 2rem;
	}

	.welcome h2 {
		margin: 0 0 1rem;
	}

	.stats {
		display: flex;
		justify-content: center;
		gap: 3rem;
		margin-top: 3rem;
	}

	.stat {
		text-align: center;
	}

	.stat .number {
		display: block;
		font-size: 3rem;
		font-weight: bold;
		color: #3b82f6;
	}

	.stat .label {
		display: block;
		color: #64748b;
		margin-top: 0.5rem;
	}
</style>
