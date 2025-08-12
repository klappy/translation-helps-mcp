/**
 * Simple Circuit Breaker Implementation
 *
 * Prevents cascading failures by stopping requests to failing services.
 * States: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
 */

import { logger } from '../../../src/utils/logger.js';

export interface CircuitBreakerOptions {
	/** Number of failures before opening circuit */
	failureThreshold: number;
	/** Time in ms to wait before trying again */
	resetTimeout: number;
	/** Optional timeout for requests */
	requestTimeout?: number;
	/** Name for logging */
	name: string;
}

export class CircuitBreaker {
	private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
	private failureCount = 0;
	private lastFailureTime?: number;
	private nextAttemptTime?: number;

	constructor(private options: CircuitBreakerOptions) {}

	async execute<T>(fn: () => Promise<T>): Promise<T> {
		// Check if circuit is open
		if (this.state === 'OPEN') {
			if (Date.now() < this.nextAttemptTime!) {
				throw new Error(`Circuit breaker is OPEN for ${this.options.name}. Service unavailable.`);
			}
			// Time to try again
			this.state = 'HALF_OPEN';
			logger.info(`Circuit breaker ${this.options.name} entering HALF_OPEN state`);
		}

		try {
			// Execute with optional timeout
			const result = await (this.options.requestTimeout
				? this.withTimeout(fn(), this.options.requestTimeout)
				: fn());

			// Success - reset on HALF_OPEN or reduce failure count
			if (this.state === 'HALF_OPEN') {
				this.state = 'CLOSED';
				this.failureCount = 0;
				logger.info(`Circuit breaker ${this.options.name} recovered to CLOSED state`);
			} else if (this.failureCount > 0) {
				this.failureCount--;
			}

			return result;
		} catch (error) {
			this.recordFailure();
			throw error;
		}
	}

	private recordFailure() {
		this.failureCount++;
		this.lastFailureTime = Date.now();

		if (this.failureCount >= this.options.failureThreshold) {
			this.state = 'OPEN';
			this.nextAttemptTime = Date.now() + this.options.resetTimeout;
			logger.warn(
				`Circuit breaker ${this.options.name} opened after ${this.failureCount} failures. ` +
					`Will retry at ${new Date(this.nextAttemptTime).toISOString()}`
			);
		}
	}

	private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
		return Promise.race([
			promise,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
			)
		]);
	}

	getState() {
		return {
			state: this.state,
			failureCount: this.failureCount,
			lastFailureTime: this.lastFailureTime,
			nextAttemptTime: this.nextAttemptTime
		};
	}
}

// Factory function for common circuit breakers
export function createCircuitBreaker(
	name: string,
	options?: Partial<CircuitBreakerOptions>
): CircuitBreaker {
	return new CircuitBreaker({
		name,
		failureThreshold: 5,
		resetTimeout: 60000, // 1 minute
		requestTimeout: 30000, // 30 seconds
		...options
	});
}

// Shared circuit breakers for external services
export const circuitBreakers = {
	dcs: createCircuitBreaker('DCS API', {
		failureThreshold: 3,
		resetTimeout: 30000, // 30 seconds
		requestTimeout: 15000 // 15 seconds
	}),

	zip: createCircuitBreaker('ZIP Fetcher', {
		failureThreshold: 5,
		resetTimeout: 60000, // 1 minute
		requestTimeout: 30000 // 30 seconds
	})
};
