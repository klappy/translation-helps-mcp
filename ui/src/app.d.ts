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
