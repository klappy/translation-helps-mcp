<script lang="ts">
	import { onMount } from 'svelte';
	import { HTTPMCPClient } from '$lib/mcp/http-client';

	let client: HTTPMCPClient;
	let tools: any[] = [];
	let selectedTool = '';
	let toolArgs: Record<string, any> = {};
	let result: any = null;
	let loading = false;
	let error = '';
	let connected = false;

	onMount(async () => {
		try {
			client = new HTTPMCPClient('/api/mcp');
			await client.initialize();
			tools = client.getTools();
			connected = true;

			// Test ping
			const isAlive = await client.ping();
			console.log('MCP Server ping:', isAlive);
		} catch (err) {
			error = `Failed to connect: ${err}`;
		}
	});

	function selectTool(toolName: string) {
		selectedTool = toolName;
		const tool = tools.find((t) => t.name === toolName);
		if (tool) {
			// Initialize args based on schema
			toolArgs = {};
			const props = tool.inputSchema?.properties || {};
			Object.keys(props).forEach((key) => {
				toolArgs[key] = props[key].default || '';
			});
		}
	}

	async function callTool() {
		if (!selectedTool || !client) return;

		loading = true;
		error = '';
		result = null;

		try {
			result = await client.callTool(selectedTool, toolArgs);
		} catch (err) {
			error = `Error: ${err}`;
		} finally {
			loading = false;
		}
	}
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">HTTP-based MCP Test</h1>

	{#if !connected}
		<div class="alert alert-warning">Connecting to MCP server...</div>
	{:else}
		<div class="alert alert-success mb-4">✅ Connected to MCP server via HTTP</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Tool Selection -->
			<div class="card bg-base-200">
				<div class="card-body">
					<h2 class="card-title">Available Tools</h2>
					<div class="space-y-2">
						{#each tools as tool}
							<button
								class="btn btn-sm w-full justify-start"
								class:btn-primary={selectedTool === tool.name}
								on:click={() => selectTool(tool.name)}
							>
								{tool.name}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Tool Configuration -->
			{#if selectedTool}
				<div class="card bg-base-200">
					<div class="card-body">
						<h2 class="card-title">{selectedTool}</h2>
						{#if tools.find((t) => t.name === selectedTool)}
							<p class="text-sm opacity-70">
								{tools.find((t) => t.name === selectedTool)?.description}
							</p>

							<div class="form-control space-y-2">
								{#each Object.entries(tools.find((t) => t.name === selectedTool)?.inputSchema?.properties || {}) as [key, schema]}
									<label class="label">
										<span class="label-text">{key}</span>
									</label>
									<input
										type="text"
										class="input input-bordered"
										placeholder={schema.description || key}
										bind:value={toolArgs[key]}
									/>
								{/each}
							</div>

							<button class="btn btn-primary mt-4" on:click={callTool} disabled={loading}>
								{#if loading}
									<span class="loading loading-spinner"></span>
								{/if}
								Call Tool
							</button>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Results -->
		{#if error}
			<div class="alert alert-error mt-4">
				{error}
			</div>
		{/if}

		{#if result}
			<div class="card bg-base-200 mt-4">
				<div class="card-body">
					<h2 class="card-title">Result</h2>
					<pre class="bg-base-300 overflow-auto rounded p-4 text-sm">{JSON.stringify(
							result,
							null,
							2
						)}</pre>
				</div>
			</div>
		{/if}
	{/if}
</div>
