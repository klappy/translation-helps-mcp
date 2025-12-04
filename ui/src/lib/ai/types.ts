/**
 * Workers AI Type Definitions
 *
 * Types for Cloudflare Workers AI native tool calling integration.
 * These are exported for use in server routes and other modules.
 */

export interface WorkersAIMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
	tool_calls?: WorkersAIToolCall[];
	tool_call_id?: string;
}

export interface WorkersAIToolCall {
	id: string;
	type: 'function';
	function: {
		name: string;
		arguments: string; // JSON string
	};
}

export interface WorkersAIToolDefinition {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>; // JSON Schema
	};
}

export interface WorkersAIResponse {
	response?: string;
	tool_calls?: WorkersAIToolCall[];
}

export interface WorkersAIRunOptions {
	messages: WorkersAIMessage[];
	tools?: WorkersAIToolDefinition[];
	tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
	stream?: boolean;
	max_tokens?: number;
	temperature?: number;
}

/**
 * Cloudflare AI Binding interface
 * Matches the platform.env.AI binding type
 */
export interface AIBinding {
	run(model: string, inputs: WorkersAIRunOptions): Promise<WorkersAIResponse>;
}
