// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
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
