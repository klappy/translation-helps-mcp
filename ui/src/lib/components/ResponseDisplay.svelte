<script>
	import {
		Copy,
		Check,
		Eye,
		Code2,
		BookOpen,
		MessageSquare,
		Hash,
		Clock,
		Database
	} from 'lucide-svelte';

	export let response = null;
	export let loading = false;
	export let error = null;

	let copied = false;
	let viewMode = 'visual'; // 'visual' or 'raw'

	function copyToClipboard() {
		if (response) {
			navigator.clipboard.writeText(JSON.stringify(response, null, 2));
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}

	function formatJson(obj) {
		return JSON.stringify(obj, null, 2);
	}

	function formatJsonWithSyntaxHighlighting(obj) {
		const json = JSON.stringify(obj, null, 2);

		// Apply syntax highlighting with more careful regex patterns
		let highlighted = json
			// Escape HTML first
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			// Apply highlighting
			.replace(
				/"([^"]+)"(\s*:)/g,
				'<span class="text-blue-400 font-semibold">"$1"</span><span class="text-gray-400">$2</span>'
			) // Keys with colons
			.replace(/"([^"]+)"(?!\s*:)/g, '<span class="text-green-400">"$1"</span>') // String values (not keys)
			.replace(/\b(true|false)\b/g, '<span class="text-purple-400 font-semibold">$1</span>') // Booleans
			.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-yellow-400">$1</span>') // Numbers
			.replace(/\b(null)\b/g, '<span class="text-red-400 font-semibold">$1</span>') // null
			.replace(/([{}])/g, '<span class="text-gray-500 text-lg font-bold">$1</span>') // Braces
			.replace(/([[\\]])/g, '<span class="text-gray-500 text-lg font-bold">$1</span>') // Brackets
			.replace(/(,)$/gm, '<span class="text-gray-500">$1</span>'); // Commas at end of lines

		// Split into lines and add formatting
		return highlighted
			.split('\n')
			.map((line, index) => {
				const indent = (line.match(/^(\s*)/) || ['', ''])[1].length;
				const paddingClass = indent > 0 ? `style="padding-left: ${indent * 0.75}rem"` : '';
				return `<div class="font-mono text-sm leading-relaxed hover:bg-gray-800/20 transition-colors py-0.5" ${paddingClass}>${line}</div>`;
			})
			.join('');
	}

	function toggleViewMode() {
		viewMode = viewMode === 'visual' ? 'raw' : 'visual';
	}

	// Helper functions to detect data types
	function hasScripture(data) {
		return data?.data?.some?.((item) => item.verses || item.text || item.usfm);
	}

	function hasTranslationNotes(data) {
		return data?.data?.some?.((item) => item.note || item.occurrence || item.gl);
	}

	function hasTranslationWords(data) {
		return data?.data?.some?.((item) => item.definition || item.term || item.forms);
	}

	function hasLanguages(data) {
		return data?.data?.some?.((item) => item.lc && item.ln);
	}

	function hasMetadata(data) {
		return data?.metadata || data?.cached !== undefined;
	}
</script>

{#if loading}
	<div class="rounded-lg border border-white/10 bg-white/5 p-4">
		<div class="flex items-center space-x-2 text-gray-400">
			<div
				class="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"
			></div>
			<span>Making request...</span>
		</div>
	</div>
{:else if error}
	<div class="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
		<h5 class="mb-2 text-sm font-medium text-red-400">Error:</h5>
		<pre
			class="scrollbar-thin scrollbar-track-red-800 scrollbar-thumb-red-600 max-h-96 overflow-auto rounded bg-red-900/20 p-3 text-sm text-red-300">{error}</pre>
	</div>
{:else if response}
	<div class="rounded-lg border border-white/10 bg-black/20 p-4">
		<div class="mb-4 flex items-center justify-between">
			<h5 class="text-sm font-medium text-gray-300">Response:</h5>
			<div class="flex items-center space-x-2">
				<button
					on:click={toggleViewMode}
					class="flex items-center space-x-1 rounded bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-700"
				>
					{#if viewMode === 'visual'}
						<Code2 class="h-3 w-3" />
						<span>Raw Data</span>
					{:else}
						<Eye class="h-3 w-3" />
						<span>Visual View</span>
					{/if}
				</button>
				<button
					on:click={copyToClipboard}
					class="flex items-center space-x-1 rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700"
				>
					{#if copied}
						<Check class="h-3 w-3" />
						<span>Copied!</span>
					{:else}
						<Copy class="h-3 w-3" />
						<span>Copy</span>
					{/if}
				</button>
			</div>
		</div>

		{#if viewMode === 'raw'}
			<div
				class="scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 max-h-96 overflow-auto rounded bg-gray-900/50"
			>
				<div class="p-3">
					{@html formatJsonWithSyntaxHighlighting(response)}
				</div>
			</div>
		{:else}
			<!-- Visual View -->
			<div
				class="scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 max-h-96 overflow-auto"
			>
				{#if hasScripture(response)}
					<!-- Scripture Display -->
					<div class="space-y-3">
						{#each response.data as item, i}
							{#if item.verses || item.text || item.usfm}
								<div
									class="overflow-hidden rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-900/20 to-yellow-900/20"
								>
									<!-- Header -->
									<div class="border-b border-amber-500/20 bg-amber-900/30 px-4 py-3">
										<div class="flex items-center justify-between">
											<div class="flex items-center space-x-2">
												<BookOpen class="h-5 w-5 text-amber-400" />
												<span class="text-base font-semibold text-amber-200">Scripture Passage</span
												>
											</div>
											{#if item.reference}
												<span
													class="rounded bg-amber-800/50 px-2 py-1 font-mono text-xs text-amber-300"
													>{item.reference}</span
												>
											{/if}
										</div>
										{#if item.book || item.chapter}
											<div class="mt-2 text-xs text-amber-400">
												{#if item.book}Book: {item.book}{/if}
												{#if item.chapter}
													• Chapter: {item.chapter}{/if}
											</div>
										{/if}
									</div>

									<!-- Content -->
									<div class="p-4">
										{#if item.verses && Array.isArray(item.verses)}
											<div class="space-y-3">
												{#each item.verses as verse, vIndex}
													<div
														class="rounded-r border-l-3 border-amber-500/40 bg-amber-900/10 py-2 pl-4"
													>
														<div class="flex items-start space-x-3">
															<span
																class="min-w-[2rem] rounded bg-amber-700/50 px-2 py-1 text-center text-xs font-bold text-amber-200"
															>
																{verse.verse || vIndex + 1}
															</span>
															<p class="flex-1 leading-relaxed text-gray-100">{verse.text}</p>
														</div>
													</div>
												{/each}
											</div>
										{:else if item.text}
											<div
												class="rounded-r border-l-3 border-amber-500/40 bg-amber-900/10 py-3 pl-4"
											>
												<p class="leading-relaxed text-gray-100 italic">{item.text}</p>
											</div>
										{:else if item.usfm}
											<div
												class="rounded-r border-l-3 border-amber-500/40 bg-amber-900/10 py-3 pl-4"
											>
												<div class="mb-2 text-xs text-amber-400">USFM Format:</div>
												<pre
													class="font-mono text-xs whitespace-pre-wrap text-gray-100">{item.usfm}</pre>
											</div>
										{/if}
									</div>
								</div>
							{/if}
						{/each}
					</div>
				{:else if hasTranslationNotes(response)}
					<!-- Translation Notes Display -->
					<div class="space-y-3">
						{#each response.data as item, i}
							{#if item.note || item.occurrence || item.gl}
								<div
									class="overflow-hidden rounded-lg border border-green-500/20 bg-gradient-to-r from-green-900/20 to-emerald-900/20"
								>
									<!-- Header -->
									<div class="border-b border-green-500/20 bg-green-900/30 px-4 py-3">
										<div class="flex items-center justify-between">
											<div class="flex items-center space-x-2">
												<MessageSquare class="h-5 w-5 text-green-400" />
												<span class="text-base font-semibold text-green-200">Translation Note</span>
											</div>
											{#if item.reference}
												<span
													class="rounded bg-green-800/50 px-2 py-1 font-mono text-xs text-green-300"
													>{item.reference}</span
												>
											{/if}
										</div>
									</div>

									<!-- Content -->
									<div class="space-y-3 p-4">
										{#if item.occurrence}
											<div class="rounded-lg border border-green-700/30 bg-green-900/20 p-3">
												<div class="mb-2 flex items-center space-x-2">
													<div class="h-2 w-2 rounded-full bg-green-400"></div>
													<span class="text-xs font-semibold tracking-wide text-green-400 uppercase"
														>Original Text</span
													>
												</div>
												<p class="font-medium text-green-100">{item.occurrence}</p>
											</div>
										{/if}

										{#if item.gl}
											<div class="rounded-lg border border-green-700/30 bg-green-900/20 p-3">
												<div class="mb-2 flex items-center space-x-2">
													<div class="h-2 w-2 rounded-full bg-green-400"></div>
													<span class="text-xs font-semibold tracking-wide text-green-400 uppercase"
														>Gateway Language</span
													>
												</div>
												<p class="font-medium text-green-100">{item.gl}</p>
											</div>
										{/if}

										{#if item.note}
											<div
												class="rounded-r border-l-4 border-green-500/50 bg-green-900/10 py-2 pl-4"
											>
												<div
													class="mb-2 text-xs font-semibold tracking-wide text-green-400 uppercase"
												>
													Translation Note
												</div>
												<p class="leading-relaxed text-gray-100">{item.note}</p>
											</div>
										{/if}
									</div>
								</div>
							{/if}
						{/each}
					</div>
				{:else if hasTranslationWords(response)}
					<!-- Translation Words Display -->
					{#each response.data as item, i}
						{#if item.definition || item.term || item.forms}
							<div
								class="mb-4 rounded-lg border border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-violet-900/20 p-4"
							>
								<div class="mb-2 flex items-center space-x-2">
									<Hash class="h-4 w-4 text-purple-400" />
									<span class="text-sm font-medium text-purple-300">Translation Word</span>
								</div>
								{#if item.term}
									<h3 class="mb-2 text-lg font-bold text-purple-200">{item.term}</h3>
								{/if}
								{#if item.forms && item.forms.length > 0}
									<div class="mb-3 flex flex-wrap gap-1">
										{#each item.forms as form}
											<span class="rounded-full bg-purple-900/50 px-2 py-1 text-xs text-purple-300"
												>{form}</span
											>
										{/each}
									</div>
								{/if}
								{#if item.definition}
									<p class="border-l-2 border-purple-500/30 pl-3 text-gray-200">
										{item.definition}
									</p>
								{/if}
							</div>
						{/if}
					{/each}
				{:else if hasLanguages(response)}
					<!-- Languages Display -->
					<div class="grid gap-3">
						{#each response.data as lang, i}
							{#if lang.lc && lang.ln}
								<div
									class="rounded-lg border border-cyan-500/20 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-3"
								>
									<div class="flex items-center justify-between">
										<div class="flex items-center space-x-2">
											<Database class="h-4 w-4 text-cyan-400" />
											<span class="font-medium text-cyan-200">{lang.ln}</span>
										</div>
										<span class="rounded bg-cyan-900/50 px-2 py-1 font-mono text-xs text-cyan-300"
											>{lang.lc}</span
										>
									</div>
									{#if lang.direction}
										<div class="mt-2 text-xs text-cyan-400">Direction: {lang.direction}</div>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				{:else}
					<!-- Generic Data Display -->
					<div class="space-y-3">
						{#if Array.isArray(response.data)}
							{#each response.data as item, i}
								<div
									class="rounded-lg border border-blue-500/20 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 p-3"
								>
									<div class="mb-2 flex items-center space-x-2">
										<Database class="h-4 w-4 text-blue-400" />
										<span class="text-sm font-medium text-blue-300">Data Item {i + 1}</span>
									</div>
									<div class="grid gap-2">
										{#each Object.entries(item) as [key, value]}
											<div class="flex flex-col space-y-1">
												<span class="text-xs font-medium text-blue-400">{key}:</span>
												<span class="text-sm text-gray-200"
													>{typeof value === 'object' ? JSON.stringify(value) : value}</span
												>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						{:else}
							<div
								class="rounded-lg border border-blue-500/20 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 p-3"
							>
								<div class="mb-2 flex items-center space-x-2">
									<Database class="h-4 w-4 text-blue-400" />
									<span class="text-sm font-medium text-blue-300">Response Data</span>
								</div>
								<div class="grid gap-2">
									{#each Object.entries(response.data || response) as [key, value]}
										<div class="flex flex-col space-y-1">
											<span class="text-xs font-medium text-blue-400">{key}:</span>
											<span class="text-sm text-gray-200"
												>{typeof value === 'object' ? JSON.stringify(value) : value}</span
											>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Metadata Section -->
				{#if hasMetadata(response)}
					<div
						class="mt-4 rounded-lg border border-gray-500/20 bg-gradient-to-r from-gray-900/20 to-slate-900/20 p-3"
					>
						<div class="mb-2 flex items-center space-x-2">
							<Clock class="h-4 w-4 text-gray-400" />
							<span class="text-sm font-medium text-gray-300">Response Metadata</span>
						</div>
						<div class="grid grid-cols-2 gap-2 text-xs">
							{#if response.metadata?.cached !== undefined}
								<div class="flex items-center space-x-1">
									<span class="text-gray-400">Cached:</span>
									<span class="text-{response.metadata.cached ? 'green' : 'red'}-400">
										{response.metadata.cached ? 'Yes' : 'No'}
									</span>
								</div>
							{/if}
							{#if response.metadata?.cacheType}
								<div class="flex items-center space-x-1">
									<span class="text-gray-400">Cache Type:</span>
									<span class="text-gray-300">{response.metadata.cacheType}</span>
								</div>
							{/if}
							{#if response.metadata?.responseTime}
								<div class="flex items-center space-x-1">
									<span class="text-gray-400">Response Time:</span>
									<span class="text-gray-300">{response.metadata.responseTime}ms</span>
								</div>
							{/if}
							{#if response.metadata?.resultCount !== undefined}
								<div class="flex items-center space-x-1">
									<span class="text-gray-400">Results:</span>
									<span class="text-gray-300">{response.metadata.resultCount}</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
