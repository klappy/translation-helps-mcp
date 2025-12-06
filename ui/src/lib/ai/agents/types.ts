/**
 * Multi-Agent Orchestration Type Definitions
 *
 * Types for the orchestrated multi-agent system where specialized
 * sub-agents handle specific tools/resources, coordinated by an orchestrator.
 */

import type { AIBinding, WorkersAIToolDefinition } from '../types.js';

/**
 * Task assigned to a sub-agent by the orchestrator
 */
export interface AgentTask {
	agent: AgentName;
	task: string;
	priority: 'high' | 'normal' | 'low';
	context?: unknown;
}

/**
 * Response from a sub-agent after completing its task
 */
export interface AgentResponse {
	agent: AgentName;
	success: boolean;
	findings: unknown;
	summary: string;
	citations: Citation[];
	confidence: number;
	suggestedFollowup?: string[];
	error?: string;
}

/**
 * Citation for sourced information
 */
export interface Citation {
	source: string;
	reference?: string;
	content: string;
}

/**
 * Validation status for a citation
 */
export type CitationValidationStatus = 'verified' | 'uncertain' | 'invalid';

/**
 * Result of validating a single citation
 */
export interface CitationValidation {
	/** Superscript number from the response (1, 2, 3...) */
	number: number;
	/** The full citation string, e.g., "[[John 3:16|ULT]]" */
	citation: string;
	/** The article/reference part, e.g., "John 3:16" */
	article: string;
	/** The resource type, e.g., "ULT", "Translation Words" */
	resource: string;
	/** The quoted text associated with this citation number */
	quotedText?: string;
	/** Validation status */
	status: CitationValidationStatus;
	/** Emoji indicator: ✅, ⚠️, or ❌ */
	emoji: string;
	/** Reason for uncertain/invalid status */
	reason?: string;
	/** Time taken to validate in ms */
	duration: number;
}

/**
 * Result of validating all citations in a response
 */
export interface ValidationResult {
	/** Individual citation validations */
	validations: CitationValidation[];
	/** Summary counts */
	summary: {
		verified: number;
		uncertain: number;
		invalid: number;
		total: number;
	};
	/** Response with emoji annotations injected */
	annotatedResponse: string;
	/** Total validation time in ms */
	totalTime: number;
}

/**
 * Available agent names
 */
export type AgentName = 'scripture' | 'notes' | 'words' | 'academy' | 'search' | 'prompt';

/**
 * Tool executor function type
 */
export type ToolExecutor = (name: string, args: Record<string, unknown>) => Promise<unknown>;

/**
 * Emit function for streaming events
 */
export type StreamEmitter = (event: string, data: unknown) => void;

/**
 * Sub-agent definition
 */
export interface SubAgent {
	name: AgentName;
	displayName: string;
	icon: string;
	description: string;
	systemPrompt: string;
	tools: string[];
	execute: (
		ai: AIBinding,
		task: AgentTask,
		availableTools: WorkersAIToolDefinition[],
		executeToolFn: ToolExecutor,
		emit: StreamEmitter
	) => Promise<AgentResponse>;
}

/**
 * Orchestrator's plan for handling a user query
 */
export interface OrchestratorPlan {
	reasoning: string;
	agents: AgentTask[];
	needsIteration: boolean;
}

/**
 * UI state for tracking agent progress
 */
export interface AgentUIState {
	name: string;
	icon: string;
	task: string;
	status: 'pending' | 'thinking' | 'tool-calling' | 'complete' | 'error';
	thoughts: string;
	toolCalls: AgentToolCall[];
	summary?: string;
	error?: string;
}

/**
 * Tool call tracking for UI
 */
export interface AgentToolCall {
	name: string;
	args?: string;
	status: 'pending' | 'running' | 'complete' | 'error';
	preview?: string;
	duration?: number;
}

/**
 * Streaming events for orchestration
 */
export type OrchestrationEvent =
	// Orchestrator events
	| { type: 'orchestrator:thinking'; delta: string }
	| { type: 'orchestrator:plan'; plan: OrchestratorPlan }
	| { type: 'orchestrator:iterating'; reason: string }
	// Agent events
	| { type: 'agent:start'; agent: AgentName; task: string }
	| { type: 'agent:thinking'; agent: AgentName; delta: string }
	| { type: 'agent:tool:start'; agent: AgentName; tool: string; args: unknown }
	| { type: 'agent:tool:result'; agent: AgentName; tool: string; preview: string }
	| { type: 'agent:summary'; agent: AgentName; summary: string; success: boolean }
	| { type: 'agent:error'; agent: AgentName; error: string }
	// Synthesis events
	| { type: 'synthesis:start' }
	| { type: 'synthesis:delta'; delta: string }
	// Validation events
	| { type: 'validation:start'; citationCount: number }
	| { type: 'validation:progress'; validated: number; total: number; current: CitationValidation }
	| { type: 'validation:complete'; result: ValidationResult }
	// Completion events
	| { type: 'done'; success: boolean }
	| { type: 'error'; message: string };

/**
 * Configuration for orchestrated chat
 */
export interface OrchestrationConfig {
	maxIterations: number;
	confidenceThreshold: number;
	enableStreaming: boolean;
	parallelExecution: boolean;
	baseUrl?: string;
}

/**
 * Default orchestration configuration
 */
export const DEFAULT_ORCHESTRATION_CONFIG: OrchestrationConfig = {
	maxIterations: 2,
	confidenceThreshold: 0.5,
	enableStreaming: true,
	parallelExecution: true,
	baseUrl: ''
};

/**
 * Agent display metadata
 */
export const AGENT_DISPLAY_INFO: Record<AgentName, { displayName: string; icon: string }> = {
	scripture: { displayName: 'Scripture Agent', icon: '📖' },
	notes: { displayName: 'Translation Notes Agent', icon: '📝' },
	words: { displayName: 'Translation Words Agent', icon: '📚' },
	academy: { displayName: 'Translation Academy Agent', icon: '🎓' },
	search: { displayName: 'Search Agent', icon: '🔍' },
	prompt: { displayName: 'MCP Prompt Workflow', icon: '⚡' }
};

/**
 * Get display name for an agent
 */
export function getAgentDisplayName(agent: AgentName): string {
	return AGENT_DISPLAY_INFO[agent]?.displayName || agent;
}

/**
 * Get icon for an agent
 */
export function getAgentIcon(agent: AgentName): string {
	return AGENT_DISPLAY_INFO[agent]?.icon || '🤖';
}
