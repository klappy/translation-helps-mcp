// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// Minimal Cloudflare R2 types to satisfy TypeScript during UI build
interface R2ObjectBody {
	body: ReadableStream | null;
	arrayBuffer(): Promise<ArrayBuffer>;
	text(): Promise<string>;
	writeHttpMetadata?: (headers: Headers) => void;
}
interface R2Bucket {
	get(key: string): Promise<R2ObjectBody | null>;
	put(
		key: string,
		value: string | ArrayBuffer | ReadableStream,
		options?: {
			httpMetadata?: { contentType?: string; cacheControl?: string };
			customMetadata?: Record<string, string>;
		}
	): Promise<void>;
}

// AI Search types for Cloudflare AI Search (AutoRAG)
// API: env.AI.autorag(indexName).aiSearch({ query })
interface AutoRAGSearchResult {
	id: string;
	score: number;
	metadata?: Record<string, string>;
	content?: string;
	filename?: string;
}

interface AutoRAGResponse {
	response: string;
	data: AutoRAGSearchResult[];
}

interface AutoRAGSearchOptions {
	query: string;
	filter?: Record<string, string | string[]>; // Metadata filters
	rewrite_query?: boolean; // Whether to rewrite query using AI
	max_num_results?: number; // Limit results (default varies)
}

interface AutoRAGInstance {
	// Search with AI-generated response
	aiSearch(options: AutoRAGSearchOptions): Promise<AutoRAGResponse>;
	// Direct search without AI generation (if available)
	search?(options: AutoRAGSearchOptions): Promise<{ data: AutoRAGSearchResult[] }>;
}

// Workers AI Native Tool Calling Types
interface WorkersAIMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
	tool_calls?: WorkersAIToolCall[];
	tool_call_id?: string;
}

interface WorkersAIToolCall {
	id: string;
	type: 'function';
	function: {
		name: string;
		arguments: string; // JSON string
	};
}

interface WorkersAIToolDefinition {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>; // JSON Schema
	};
}

interface WorkersAIResponse {
	response?: string;
	tool_calls?: WorkersAIToolCall[];
}

interface WorkersAIRunOptions {
	messages: WorkersAIMessage[];
	tools?: WorkersAIToolDefinition[];
	tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
	stream?: boolean;
	max_tokens?: number;
	temperature?: number;
}

interface AIBinding {
	// AutoRAG - returns an instance for a specific AI Search index
	autorag(indexName: string): AutoRAGInstance;
	// Workers AI model inference
	run(model: string, inputs: WorkersAIRunOptions): Promise<WorkersAIResponse>;
}

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				// KV Namespace binding
				TRANSLATION_HELPS_CACHE?: KVNamespace;
				// R2 bucket for ZIPs and extracted files
				ZIP_FILES?: R2Bucket;
				// AI binding for Workers AI / AI Search
				AI?: AIBinding;
				// Secrets
				OPENAI_API_KEY?: string;
				ANTHROPIC_API_KEY?: string;
				PERPLEXITY_API_KEY?: string;
				GOOGLE_API_KEY?: string;
				MISTRAL_API_KEY?: string;
				AZURE_OPENAI_API_KEY?: string;
				AZURE_OPENAI_ENDPOINT?: string;
				OPENROUTER_API_KEY?: string;
				XAI_API_KEY?: string;
				// Environment variables from wrangler.toml
				NODE_ENV?: string;
			};
			context?: {
				waitUntil(promise: Promise<any>): void;
			};
			caches?: CacheStorage;
		}
	}
}

export {};
